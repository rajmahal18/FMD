import {invalidateOverall} from "./overall-invalidation";
import 'server-only';
import {db} from '@/lib/db';
import {Prisma} from '@/generated/prisma/client';
import {InputError} from '@/lib/validation';
import {tokenHash} from '@/lib/password';
import {judgingStandings,validateJudgingConfig,validateJudgingScores,type JudgingConfig,type JudgingData,type JudgingCandidate,type JudgingPublished} from '@/lib/judging';
import {runRevision,requireRunRevision} from './run-revision';
type Tx=Prisma.TransactionClient;
async function scope(tx:Tx,actorId:string,eventId:string){
 const m=await tx.eventMembership.findUnique({where:{eventId_userId:{eventId,userId:actorId}},include:{user:{select:{active:true,mustChangePassword:true}},event:true}});
 if(!m?.active||!m.user.active||m.user.mustChangePassword)throw new InputError('Active individual event access is required.',403);return m;
}
async function roster(tx:Tx,eventId:string){
 const [teams,people]=await Promise.all([tx.team.findMany({where:{eventId},orderBy:{name:'asc'},select:{id:true,name:true}}),tx.eventMembership.findMany({where:{eventId},select:{id:true,role:true,active:true,user:{select:{name:true,active:true,sex:true}},team:{select:{name:true}}},orderBy:{user:{name:'asc'}}})]);
 return {teams:teams.map(t=>({...t,teamName:null,active:true})),people:people.map(p=>({id:p.id,name:p.user.name,role:p.role,teamName:p.team?.name??null,active:p.active&&p.user.active,sex:p.user.sex}))};
}
function candidates(config:JudgingConfig,all:Awaited<ReturnType<typeof roster>>):JudgingCandidate[]{
 const source=config.target==='TEAM'?all.teams:all.people.filter(p=>p.role==='PARTICIPANT');
 return config.candidateIds.map(id=>{const person=source.find(p=>p.id===id);return person?{id:person.id,name:person.name,teamName:'teamName' in person?person.teamName:null,active:person.active}:{id,name:'Unavailable entrant',active:false};});
}
export async function readJudging(actorId:string,eventId:string):Promise<JudgingData>{return db().$transaction(async tx=>{
 const m=await scope(tx,actorId,eventId),organizer=m.role==='ORGANIZER',all=await roster(tx,eventId);
 const contests=await tx.judgingContest.findMany({where:{eventId,...(!organizer?{OR:[{state:'PUBLISHED'},{assignments:{some:{membershipId:m.id,active:true}},...(m.role==='FACILITATOR'?{}:{id:'__no_judge__'})}]}:{})},include:{assignments:true,scores:true},orderBy:{createdAt:'asc'}});
 const rows=contests.map(c=>{
  const config=c.config as JudgingConfig,assigned=m.role==='FACILITATOR'&&c.assignments.some(a=>a.membershipId===m.id&&a.active),entrants=candidates(config,all),judgeIds=c.assignments.filter(a=>a.active).map(a=>a.membershipId);
  const published=c.state==='PUBLISHED'?c.publishedResults as JudgingPublished|null:null;
  return {id:c.id,name:c.name,instructions:c.instructions,state:c.state,revision:c.revision,config:organizer||assigned?config:{...config,candidateIds:[],criteria:published?.criteria??[]},candidates:organizer||assigned?entrants:[],judgeIds:organizer?judgeIds:undefined,judgeCount:judgeIds.length,assigned,locked:c.scores.length>0,
   ownSheets:assigned?c.scores.filter(s=>s.judgeMembershipId===m.id).map(s=>({candidateId:s.candidateId,scores:s.scores as Record<string,number>,version:s.version,submittedAt:s.submittedAt?.toISOString()??null})):[],
   results:organizer?judgingStandings(entrants,judgeIds,config.criteria,c.scores):published?.rows??[],published,
   breakdown:organizer?c.scores.filter(s=>s.submittedAt).map(s=>({judgeId:s.judgeMembershipId,judgeName:all.people.find(p=>p.id===s.judgeMembershipId)?.name??'Former judge',candidateId:s.candidateId,scores:s.scores as Record<string,number>,total:s.totalHundredths/100,submittedAt:s.submittedAt!.toISOString()})):undefined};
 });
 return {eventId,actorMembershipId:m.id,role:m.role,eventState:m.event.state,archived:!!m.event.archivedAt,runRevision:await runRevision(tx,eventId),contests:rows,teams:organizer?all.teams:[],people:organizer?all.people:[]};
},{isolationLevel:'RepeatableRead',timeout:20000});}

function string(value:unknown,label:string,max:number,required=true){if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw new InputError(`Enter ${label} (${required?'1–':'up to '}${max} characters).`);return value.trim();}
export async function judgingCommand(actorId:string,eventId:string,value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new InputError('Choose a judging action.');
 const v=value as Record<string,unknown>,operation=string(v.operation,'an action',40),requestKey=string(v.requestKey,'a request key',40);
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestKey))throw new InputError('Refresh the form and retry.');
 const allowed=['createContest','saveContest','open','close','publish','unpublish','reopenScore','saveDraft','submitScore'];
 if(!allowed.includes(operation))throw new InputError('Unknown judging action.');
 const requestHash=tokenHash(JSON.stringify({eventId,...v,requestKey:undefined}));
 return db().$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "User" WHERE id=${actorId} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "Event" WHERE id=${eventId} FOR UPDATE`;
  const m=await scope(tx,actorId,eventId);await requireRunRevision(tx,eventId,v.runRevision);
  if(m.event.archivedAt)throw new InputError('Restore this event before changing judging data.',409);
  const scoring=operation==='saveDraft'||operation==='submitScore';
  if(scoring?m.role!=='FACILITATOR':m.role!=='ORGANIZER')throw new InputError(scoring?'Assigned facilitator judge access is required.':'Organizer access is required.',403);
  const contest=operation==='createContest'?null:await tx.judgingContest.findFirst({where:{id:string(v.contestId,'a contest',120),eventId},include:{assignments:true,scores:true}});
  if(operation!=='createContest'&&!contest)throw new InputError('Choose a judging contest from this event.',404);
  if(scoring&&!contest!.assignments.some(a=>a.membershipId===m.id&&a.active))throw new InputError('You are not assigned to judge this contest.',403);
  const receipt=await tx.managementReceipt.findUnique({where:{actorId_requestKey:{actorId,requestKey}}});
  if(receipt){if(receipt.requestHash!==requestHash||receipt.operation!==`judging:${operation}`)throw new InputError('This request key was already used with different details.',409);return {...receipt.responseJson as {message:string;targetId:string},replayed:true};}
  if(contest&&v.revision!==contest.revision)throw new InputError('The contest changed. Refresh and review before saving.',409);
  const all=await roster(tx,eventId);let targetId=contest?.id??'',message='',details:unknown={};
  if(operation==='createContest'||operation==='saveContest'){
   if(contest&&(contest.state==='OPEN'||contest.state==='PUBLISHED'||contest.scores.length))throw new InputError('Close scoring before editing. Criteria, entrants and judges lock after the first draft or score.',409);
   let config:JudgingConfig;try{config=validateJudgingConfig(v.config);}catch(e){throw new InputError((e as Error).message);}
   const entrants=candidates(config,all);if(entrants.some(c=>!c.active))throw new InputError('Choose active teams or participant nominees from this event.');
   const judges=v.judgeIds;if(!Array.isArray(judges)||judges.length>100||judges.some(id=>typeof id!=='string'||!all.people.some(p=>p.id===id&&p.active&&p.role==='FACILITATOR'))||new Set(judges).size!==judges.length)throw new InputError('Assign distinct active facilitators from this event as judges.');
   const data={name:string(v.name,'a contest name',120),instructions:string(v.instructions??'','instructions',2000,false),config:config as unknown as Prisma.InputJsonValue};
   const saved=contest?await tx.judgingContest.update({where:{id:contest.id},data:{...data,state:'DRAFT',revision:{increment:1}}}):await tx.judgingContest.create({data:{...data,eventId}});targetId=saved.id;
   await tx.judgingAssignment.updateMany({where:{contestId:targetId},data:{active:false}});
   for(const membershipId of judges as string[])await tx.judgingAssignment.upsert({where:{contestId_membershipId:{contestId:targetId,membershipId}},create:{eventId,contestId:targetId,membershipId},update:{active:true}});
   message='Judging contest saved. Open scoring when the judges and entrants are ready.';details={before:contest?{name:contest.name,config:contest.config,judges:contest.assignments.filter(a=>a.active).map(a=>a.membershipId)}:null,after:{...data,judges}};
  }else if(scoring){
   if(contest!.state!=='OPEN'||m.event.state==='PAUSED')throw new InputError('Scoring is closed or the event is paused. Your input is kept.',409);
   const config=contest!.config as JudgingConfig,candidateId=string(v.candidateId,'an entrant',120);
   if(!candidates(config,all).some(c=>c.id===candidateId&&c.active))throw new InputError('This entrant is not eligible for this contest.',403);
   const existing=contest!.scores.find(s=>s.judgeMembershipId===m.id&&s.candidateId===candidateId);
   if(!Number.isSafeInteger(v.version)||v.version!==(existing?.version??0))throw new InputError('This score sheet changed on another screen. Reload before saving.',409);
   if(existing?.submittedAt)throw new InputError('This score is submitted. Ask the organizer to reopen it with a reason.',409);
   let checked;try{checked=validateJudgingScores(v.scores,config.criteria,operation==='submitScore');}catch(e){throw new InputError((e as Error).message);}
   const data={scores:checked.scores,totalHundredths:checked.totalHundredths,submittedAt:operation==='submitScore'?new Date():null};
   if(existing)await tx.judgingScore.update({where:{id:existing.id},data:{...data,version:{increment:1}}});else await tx.judgingScore.create({data:{...data,eventId,contestId:contest!.id,judgeMembershipId:m.id,candidateId}});
   details={candidateId,judgeMembershipId:m.id,before:existing?{scores:existing.scores,submittedAt:existing.submittedAt?.toISOString()??null}:null,after:{scores:checked.scores,submitted:operation==='submitScore'}};
   message=operation==='submitScore'?'Score submitted. It counts once in the equal-weight judge average.':'Draft saved. It does not count until submitted.';
  }else{
   const c=contest!,config=c.config as JudgingConfig;
   if(operation==='open'){
    if(c.state==='PUBLISHED'||m.event.state==='PAUSED')throw new InputError('Unpublish first, or resume the paused event before opening scoring.',409);
    const active=c.assignments.filter(a=>a.active);if(!active.length||active.some(a=>!all.people.some(p=>p.id===a.membershipId&&p.role==='FACILITATOR'&&p.active))||candidates(config,all).some(p=>!p.active))throw new InputError('Assign active facilitator judges and eligible entrants before opening.');
    await tx.judgingContest.update({where:{id:c.id},data:{state:'OPEN',revision:{increment:1}}});message='Scoring is open for assigned judges.';
   }else if(operation==='close'){
    if(c.state!=='OPEN')throw new InputError('Only open scoring can be closed.',409);
    await tx.judgingContest.update({where:{id:c.id},data:{state:'CLOSED',revision:{increment:1}}});message='Scoring closed. Judges can review their own submitted sheets.';
   }else if(operation==='publish'){
    if(c.state!=='CLOSED')throw new InputError('Close scoring and review all entries before publishing.',409);
    const ids=c.assignments.filter(a=>a.active).map(a=>a.membershipId),entrants=candidates(config,all),rows=judgingStandings(entrants,ids,config.criteria,c.scores);
    if(!ids.length||entrants.some(p=>!p.active)||ids.some(id=>!all.people.some(p=>p.id===id&&p.active&&p.role==='FACILITATOR'))||rows.some(r=>r.submitted!==ids.length||r.rank===null))throw new InputError('Every assigned judge must submit every entrant’s complete score before publishing.',409);
    const snapshot={name:c.name,rows,criteria:config.criteria,publishedAt:new Date().toISOString()};
    await tx.judgingContest.update({where:{id:c.id},data:{state:'PUBLISHED',revision:{increment:1},publishedAt:new Date(snapshot.publishedAt),publishedResults:snapshot as unknown as Prisma.InputJsonValue}});message='Judging results published to event members.';details={snapshot};
   }else if(operation==='unpublish'){
    if(c.state!=='PUBLISHED')throw new InputError('This contest has no published results.',409);
    const reason=string(v.reason,'a reason',500);if(reason.length<5)throw new InputError('Give a reason of at least five characters.');
    details={reason,previousPublication:c.publishedResults};await tx.judgingContest.update({where:{id:c.id},data:{state:'CLOSED',publishedAt:null,publishedResults:Prisma.DbNull,revision:{increment:1}}});message='Publication withdrawn for review. The previous result is preserved in the audit.';
   }else if(operation==='reopenScore'){
    if(c.state!=='CLOSED')throw new InputError('Close scoring and withdraw publication before reopening a score.',409);
    const reason=string(v.reason,'a reason',500);if(reason.length<5)throw new InputError('Give a reason of at least five characters.');
    const sheet=c.scores.find(s=>s.judgeMembershipId===v.judgeId&&s.candidateId===v.candidateId&&s.submittedAt);if(!sheet)throw new InputError('Choose a submitted judge score.',404);
    await tx.judgingScore.update({where:{id:sheet.id},data:{submittedAt:null,version:{increment:1}}});await tx.judgingContest.update({where:{id:c.id},data:{revision:{increment:1}}});details={reason,previousScore:{...sheet,updatedAt:sheet.updatedAt.toISOString(),submittedAt:sheet.submittedAt!.toISOString()}};message='Score reopened as a draft. Open scoring so that judge can correct and resubmit.';
   }
  }
  if(operation==='unpublish'||operation==='publish')await invalidateOverall(tx,eventId,actorId,'A linked judging publication changed. Review and finalize the overall results again.',targetId);
  await tx.auditEntry.create({data:{eventId,actorId,action:`JUDGING_${operation.toUpperCase()}`,targetId,detailsJson:JSON.parse(JSON.stringify(details))}});
  const response={message,targetId};await tx.managementReceipt.create({data:{actorId,requestKey,requestHash,operation:`judging:${operation}`,responseJson:response}});return response;
 },{timeout:20000,maxWait:10000});
}
