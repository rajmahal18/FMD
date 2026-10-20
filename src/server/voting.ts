import 'server-only';
import {db} from '@/lib/db';
import {InputError} from '@/lib/validation';
import {tokenHash} from '@/lib/password';
import {eligibleCandidate,eligibleVoter,parseVotingInput,validateBallot,votingStatus,type VotingConfig,type VotingData,type VotingPerson,type VotingPoll} from '@/lib/voting';
import type {Prisma} from '@/generated/prisma/client';
type Tx=Prisma.TransactionClient;
async function scope(tx:Tx,actorId:string,eventId:string){
 const m=await tx.eventMembership.findUnique({where:{eventId_userId:{eventId,userId:actorId}},include:{user:{select:{active:true,mustChangePassword:true}},event:true}});
 if(!m?.active||!m.user.active||m.user.mustChangePassword)throw new InputError('Active event membership is required.',403);return m;
}
async function roster(tx:Tx,eventId:string):Promise<VotingPerson[]>{
 const people=await tx.eventMembership.findMany({where:{eventId},select:{id:true,role:true,teamId:true,active:true,user:{select:{name:true,active:true}},team:{select:{name:true}}},orderBy:{user:{name:'asc'}}});
 return people.map(p=>({id:p.id,name:p.user.name,role:p.role,teamId:p.teamId,teamName:p.team?.name??null,active:p.active&&p.user.active}));
}
function standings(candidateIds:string[],people:VotingPerson[],choices:{candidateMembershipId:string}[]):NonNullable<VotingPoll['results']>{
 const rows=candidateIds.map(id=>({id,name:people.find(p=>p.id===id)?.name??'Former event member',votes:choices.filter(v=>v.candidateMembershipId===id).length,rank:null as number|null})).sort((a,b)=>b.votes-a.votes||a.name.localeCompare(b.name));
 for(let i=0;i<rows.length;i++)if(rows[i].votes>0)rows[i].rank=i>0&&rows[i-1].votes===rows[i].votes?rows[i-1].rank:i+1;return rows;
}
export async function readVoting(actorId:string,eventId:string):Promise<VotingData>{return db().$transaction(async tx=>{
 const m=await scope(tx,actorId,eventId),organizer=m.role==='ORGANIZER',people=await roster(tx,eventId),voter=people.find(p=>p.id===m.id)!;
 const polls=await tx.votingEvent.findMany({where:{eventId},include:{ballots:{include:{choices:true}}},orderBy:{createdAt:'desc'}});
 const visiblePeople=new Set<string>();
 const rows=polls.map(p=>{
  const c=p.config as VotingConfig,own=p.ballots.find(b=>b.voterMembershipId===m.id),candidates=people.filter(person=>eligibleCandidate(c,voter,person));
  for(const person of candidates)visiblePeople.add(person.id);for(const choice of own?.choices??[])visiblePeople.add(choice.candidateMembershipId);
  return {id:p.id,revision:p.revision,name:p.name,instructions:p.instructions,opensAt:p.opensAt.toISOString(),closesAt:p.closesAt.toISOString(),enabled:p.enabled,publishedAt:p.publishedAt?.toISOString()??null,config:organizer?c:null,status:votingStatus(p,m.event),eligible:eligibleVoter(c,voter),maxChoices:c.maxChoices,allowSelf:c.allowSelf,allowSameTeam:c.allowSameTeam,candidateIds:candidates.map(a=>a.id),ownChoices:own?own.choices.map(v=>v.candidateMembershipId):null,ballotCount:organizer||p.publishedAt?p.ballots.length:null,results:p.publishedAt?p.publishedResults as VotingPoll['results']:organizer?standings(c.candidateIds,people,p.ballots.flatMap(b=>b.choices)):null};
 });
 return {eventId,actorId,membershipId:m.id,organizer,timezone:m.event.timezone,archived:!!m.event.archivedAt,eventState:m.event.state,people:organizer?people:people.filter(p=>visiblePeople.has(p.id)),teams:organizer?await tx.team.findMany({where:{eventId},select:{id:true,name:true},orderBy:{name:'asc'}}):[],polls:rows,checkedAt:new Date().toISOString()};
 },{isolationLevel:'RepeatableRead',timeout:20000});}
export async function votingAction(actorId:string,eventId:string,value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new InputError('Choose a voting action.');
 const v=value as Record<string,unknown>;
 if(typeof v.requestKey!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.requestKey)||!['create','update','setEnabled','publish','cast'].includes(String(v.operation)))throw new InputError('Refresh and retry the voting action.');
 const operation=String(v.operation),requestKey=v.requestKey,requestHash=tokenHash(JSON.stringify({eventId,...v}));
 return db().$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "User" WHERE id=${actorId} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "Event" WHERE id=${eventId} FOR UPDATE`;
  const m=await scope(tx,actorId,eventId);
  if(operation!=='cast'&&m.role!=='ORGANIZER')throw new InputError('Organizer access is required.',403);
  const old=await tx.managementReceipt.findUnique({where:{actorId_requestKey:{actorId,requestKey}}});
  if(old){if(old.operation!==`voting:${operation}`||old.requestHash!==requestHash)throw new InputError('This request key was used with different details.',409);return {...old.responseJson as {message:string;id:string},replayed:true};}
  if(m.event.archivedAt)throw new InputError('This event is archived and read-only.',409);
  const people=await roster(tx,eventId),now=new Date();let id=typeof v.id==='string'?v.id:'',message='';let details:Prisma.InputJsonValue={};
  const p=id?await tx.votingEvent.findFirst({where:{id,eventId},include:{ballots:{include:{choices:true}}}}):null;
  if(operation!=='create'&&!p)throw new InputError('Voting event not found.',404);
  if(operation==='create'||operation==='update'){
   const input=parseVotingInput(v.input),c=input.config;
   if(p&&(p.ballots.length||p.publishedAt||p.enabled))throw new InputError('Close voting before editing. Rules are locked after the first ballot.',409);
   if(p&&v.revision!==p.revision)throw new InputError('The voting configuration changed. Refresh before editing.',409);
   if(new Date(input.closesAt)<=now)throw new InputError('Choose a voting window that has not ended.');
   for(const memberId of [...c.candidateIds,...c.voterMembershipIds])if(!people.some(person=>person.id===memberId&&person.active))throw new InputError('Choose active people from this event.');
   const teams=await tx.team.findMany({where:{eventId},select:{id:true}});if(c.voterTeamIds.some(teamId=>!teams.some(t=>t.id===teamId)))throw new InputError('Choose teams from this event.');
   const voters=people.filter(person=>eligibleVoter(c,person));if(!voters.length)throw new InputError('The selected voter rules match no active members.');
   if(voters.some(voter=>!people.some(candidate=>eligibleCandidate(c,voter,candidate))))throw new InputError('Some eligible voters have no eligible candidate. Review self-voting, same-team voting or the candidate list.');
   const data={name:input.name,instructions:input.instructions,config:c as unknown as Prisma.InputJsonValue,opensAt:new Date(input.opensAt),closesAt:new Date(input.closesAt)};
   const saved=p?await tx.votingEvent.update({where:{id:p.id},data:{...data,revision:{increment:1}}}):await tx.votingEvent.create({data:{eventId,...data}});id=saved.id;message=p?'Voting configuration saved.':'Voting event created. Enable it in Live operations when ready.';details={summary:message,before:p?{name:p.name,config:p.config,opensAt:p.opensAt.toISOString(),closesAt:p.closesAt.toISOString()}:null,after:JSON.parse(JSON.stringify(data))};
  }else if(operation==='cast'){
   const c=p!.config as VotingConfig,voter=people.find(person=>person.id===m.id)!;
   const choices=validateBallot(v.choices,c,voter,people),previous=p!.ballots.find(b=>b.voterMembershipId===m.id);
   if(previous){if(JSON.stringify(previous.choices.map(c=>c.candidateMembershipId).sort())!==JSON.stringify(choices))throw new InputError('Your final ballot has already been recorded. Votes cannot be changed.',409);message='Your ballot was already recorded.';}
   else{
    if(votingStatus(p!,m.event,now)!=='Open')throw new InputError('Voting is not open. Refresh to check the schedule.',409);
    const ballot=await tx.votingBallot.create({data:{eventId,votingEventId:p!.id,voterMembershipId:m.id}});
    await tx.votingChoice.createMany({data:choices.map(candidateMembershipId=>({eventId,ballotId:ballot.id,candidateMembershipId}))});message='Your final ballot has been recorded.';
   }
   details={summary:`Ballot recorded for ${p!.name}`,choices:choices.length};
  }else{
   if(v.revision!==p!.revision)throw new InputError('The voting state changed. Refresh before continuing.',409);
   if(p!.publishedAt)throw new InputError('Published voting results are locked.',409);
   if(operation==='setEnabled'){
    if(typeof v.enabled!=='boolean')throw new InputError('Choose whether voting is enabled.');
    if(v.enabled&&new Date(p!.closesAt)<=now)throw new InputError('This voting window has ended.',409);
    if(v.enabled){const c=p!.config as VotingConfig;const voters=people.filter(person=>eligibleVoter(c,person));if(!voters.length||voters.some(voter=>!people.some(candidate=>eligibleCandidate(c,voter,candidate))))throw new InputError('Review voter and candidate eligibility before enabling voting.',409);}
    await tx.votingEvent.update({where:{id},data:{enabled:v.enabled,revision:{increment:1}}});message=v.enabled?'Voting enabled within its scheduled window.':'Voting closed. Recorded ballots are preserved.';
   }else{
    if(p!.enabled&&now<p!.closesAt)throw new InputError('Close voting or wait until its window ends before publishing.',409);
    const results=standings((p!.config as VotingConfig).candidateIds,people,p!.ballots.flatMap(b=>b.choices));
    await tx.votingEvent.update({where:{id},data:{enabled:false,publishedAt:now,publishedResults:results,revision:{increment:1}}});message='Final voting results published. Equal vote counts share rank.';
   }
   details={summary:message,name:p!.name};
  }
  await tx.auditEntry.create({data:{eventId,actorId,action:`VOTING_${operation.toUpperCase()}`,targetId:id,detailsJson:details}});
  const result={id,message};await tx.managementReceipt.create({data:{actorId,requestKey,operation:`voting:${operation}`,requestHash,responseJson:result}});return result;
 },{timeout:20000,maxWait:15000});
}
