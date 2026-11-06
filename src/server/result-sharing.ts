import {buildOverallBreakdown} from './overall-breakdown';
import {formatScore} from '@/lib/score-format';
import {passwordSetupRequired} from './password-setup';
import 'server-only';
import {db} from '@/lib/db';
import type {Prisma} from '@/generated/prisma/client';
import {InputError} from '@/lib/validation';
import {tokenHash} from '@/lib/password';
import {judgingNumber,judgingResultsVisible,judgingStandings,type JudgingConfig} from '@/lib/judging';
import {judgingStateLabel,type ResultCenterData,type ResultItem,type SharingMode,type SharingPreview} from '@/lib/result-sharing';
import {overallSnapshot} from './overall';
import {runRevision,requireRunRevision} from './run-revision';
import {hideDependentSharing} from './result-sharing-policy';
type Tx=Prisma.TransactionClient;
async function scope(tx:Tx,actorId:string,eventId:string,organizer=false){
 const m=await tx.eventMembership.findUnique({where:{eventId_userId:{eventId,userId:actorId}},include:{user:{select:{active:true,mustChangePassword:true}},event:true}});
 if(!m?.active||!m.user.active||(await passwordSetupRequired(tx,actorId,eventId,m.user.mustChangePassword))||organizer&&m.role!=='ORGANIZER')throw new InputError('Active event access with the required role is needed.',403);
 return m;
}
async function items(tx:Tx,eventId:string,state:string):Promise<ResultItem[]>{
 const [releases,race,overall,contests,polls,people,teams]=await Promise.all([
  tx.resultSharing.findMany({where:{eventId}}),tx.resultRevision.findFirst({where:{eventId},orderBy:{revision:'desc'}}),overallSnapshot(tx,eventId),
  tx.judgingContest.findMany({where:{eventId},include:{assignments:true,scores:true},orderBy:{createdAt:'asc'}}),tx.votingEvent.findMany({where:{eventId},orderBy:{createdAt:'asc'}}),
  tx.eventMembership.findMany({where:{eventId},select:{id:true,user:{select:{name:true}}}}),tx.team.findMany({where:{eventId},select:{id:true,name:true}})
 ]);
 const base=`/events/${eventId}`;
 function release(key:string,sourceRevision:number,approved:boolean){const r=releases.find(r=>r.key===key);return {sharingRevision:r?.revision??0,facilitators:approved&&r?.sourceRevision===sourceRevision?r.facilitators as SharingMode:'HIDDEN' as const,participants:approved&&r?.sourceRevision===sourceRevision?r.participants as SharingMode:'HIDDEN' as const};}
 const raceApproved=state==='FINALIZED'&&!!race,combinedApproved=!!overall.finalized&&!overall.stale;
 const result:ResultItem[]=[{key:'race',name:'Amazing Race',kind:'race',status:raceApproved?'Approved':state==='ENDED'?'Ready for review':'In progress',approved:raceApproved,sourceRevision:race?.revision??0,...release('race',race?.revision??0,raceApproved),href:base+'/results?section=race',rows:((race?.teamStandingsJson??[]) as {name:string;value:number}[]).map(r=>({name:r.name,value:formatScore(r.value)})),fingerprint:tokenHash(JSON.stringify([state,race?.id,race?.teamStandingsJson]))},
  {key:'overall',name:'Combined results',kind:'overall',status:overall.stale?'Needs review':combinedApproved?'Approved':'Draft',approved:combinedApproved,sourceRevision:overall.revision,...release('overall',overall.revision,combinedApproved),href:base+'/overall',rows:((overall.finalized as {rows?:{name:string;value:number}[]}|null)?.rows??[]).map(r=>({name:r.name,value:formatScore(r.value)+'%'})),fingerprint:tokenHash(JSON.stringify([overall.revision,overall.stale,overall.finalized]))}];
 const breakdown=await buildOverallBreakdown(tx,eventId,overall);
 result.push({key:'overall-breakdown',name:'Detailed overall breakdown',kind:'overall',status:overall.stale?'Needs review':combinedApproved?'Approved':'Organizer preview',approved:combinedApproved,sourceRevision:overall.revision,...release('overall-breakdown',overall.revision,combinedApproved),href:base+'/overall/breakdown',rows:(breakdown.rows??[]).flatMap(r=>[{name:r.name,value:formatScore(r.total)+' overall points'},...(breakdown.activities??[]).flatMap(a=>a.judges.map((j,i)=>({name:r.name+' / '+a.name+' / '+j.name,value:r.values.find(v=>v.id===a.id)?.judgeScores[i]===null?'Not submitted':formatScore(r.values.find(v=>v.id===a.id)!.judgeScores[i]!)+' / '+a.maximum})))]),fingerprint:tokenHash(JSON.stringify([overall.revision,overall.stale,breakdown.activities,breakdown.rows]))});
 for(const c of contests){
  const config=c.config as JudgingConfig,approved=c.state==='PUBLISHED'&&!!c.publishedAt;
  const rows=approved?(c.publishedResults as {rows:{name:string;average:number|null;maximum:number}[]}).rows:judgingStandings(config.candidateIds.map(id=>({id,name:teams.find(t=>t.id===id)?.name??people.find(p=>p.id===id)?.user.name??'Unavailable entrant',active:true})),c.assignments.filter(a=>a.active).map(a=>a.membershipId),config.criteria,c.scores);
  result.push({key:'judging:'+c.id,name:c.name,kind:'judging',status:judgingStateLabel(c.state),approved,sourceRevision:c.revision,sharingRevision:c.visibilityRevision,facilitators:judgingResultsVisible(c.facilitatorVisibility as SharingMode,approved)?c.facilitatorVisibility as SharingMode:'HIDDEN',participants:judgingResultsVisible(c.participantVisibility as SharingMode,approved)?c.participantVisibility as SharingMode:'HIDDEN',href:base+'/judging?view=results&contest='+encodeURIComponent(c.id),rows:rows.map(r=>({name:r.name,value:r.average===null?'Not scored':`${judgingNumber(r.average)} / ${r.maximum}`})),fingerprint:tokenHash(JSON.stringify([c.revision,c.visibilityRevision,c.facilitatorVisibility,c.participantVisibility,c.scores.map(s=>[s.id,s.version,s.submittedAt]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])))]))});
 }
 for(const p of polls){const approved=!!p.publishedAt;result.push({key:'voting:'+p.id,name:p.name,kind:'voting',status:approved?'Approved':p.enabled?'Voting open':'Voting closed',approved,sourceRevision:p.revision,...release('voting:'+p.id,p.revision,approved),href:base+'/results?section=voting&poll='+encodeURIComponent(p.id),rows:((p.publishedResults??[]) as {name:string;votes:number;category?:string;squadName?:string}[]).map(r=>({name:r.squadName?`${r.squadName}: ${r.name}`:r.category?`${r.category}: ${r.name}`:r.name,value:r.votes+' votes'})),fingerprint:tokenHash(JSON.stringify([p.revision,p.publishedAt,p.publishedResults]))});}
 // Combined results must never reveal a hidden judging component through its contributions.
 const combined=result.find(r=>r.key==='overall')!;
 for(const audience of ['facilitators','participants'] as const){
  if(overall.config.events.some(e=>(e.source==='JUDGING'&&result.find(r=>r.key==='judging:'+e.contestId)?.[audience]==='HIDDEN')||(e.source==='SPY'&&result.find(r=>r.key==='race')?.[audience]==='HIDDEN'))){
   if(combined[audience]!=='HIDDEN')combined.blocked='A judged activity is hidden from this audience.';
   combined[audience]='HIDDEN';
  }
 }
 const detailed=result.find(r=>r.key==='overall-breakdown')!;
 for(const audience of ['facilitators','participants'] as const)if(combined[audience]==='HIDDEN'){detailed[audience]='HIDDEN';detailed.blocked='Share the combined summary and included activity results with this audience first.';}
 return result;
}
export async function readResultCenter(actorId:string,eventId:string):Promise<ResultCenterData>{return db().$transaction(async tx=>{
 const m=await scope(tx,actorId,eventId),organizer=m.role==='ORGANIZER';
 const rows=await items(tx,eventId,m.event.state);
 return {eventId,organizer,archived:!!m.event.archivedAt,runRevision:await runRevision(tx,eventId),checkedAt:new Date().toISOString(),items:organizer?rows:rows.filter(r=>(m.role==='FACILITATOR'?r.facilitators:r.participants)!=='HIDDEN').map(r=>({...r,rows:[],fingerprint:'',sharingRevision:0,facilitators:'HIDDEN',participants:'HIDDEN'}))};
},{isolationLevel:'RepeatableRead',timeout:20000});}
type Command={operation:'preview'|'confirm';key:string;facilitators:SharingMode;participants:SharingMode;sourceRevision:number;sharingRevision:number;runRevision:number;requestKey?:string;token?:string};
function parse(value:unknown):Command{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new InputError('Choose results to share.');
 const v=value as Command;
 if(!['preview','confirm'].includes(v.operation)||typeof v.key!=='string'||v.key.length>160||![v.facilitators,v.participants].every(s=>['HIDDEN','PUBLISHED','LIVE'].includes(s))||![v.sourceRevision,v.sharingRevision,v.runRevision].every(n=>Number.isSafeInteger(n)&&n>=0))throw new InputError('Choose the result and audience settings.');
 if(v.operation==='confirm'&&(typeof v.token!=='string'||!/^[a-f0-9]{64}$/.test(v.token)||typeof v.requestKey!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.requestKey)))throw new InputError('Review sharing before confirming.');
 return v;
}
export async function changeResultSharing(actorId:string,eventId:string,value:unknown){const v=parse(value);return db().$transaction(async tx=>{
 await tx.$queryRaw`SELECT id FROM "Event" WHERE id=${eventId} FOR UPDATE`;
 const m=await scope(tx,actorId,eventId,true);await requireRunRevision(tx,eventId,v.runRevision);
 if(m.event.archivedAt)throw new InputError('Archived events are read-only.',409);
 const requestHash=tokenHash(JSON.stringify({eventId,key:v.key,facilitators:v.facilitators,participants:v.participants,token:v.token}));
 if(v.operation==='confirm'){const receipt=await tx.managementReceipt.findUnique({where:{actorId_requestKey:{actorId,requestKey:v.requestKey!}}});if(receipt){if(receipt.operation!=='results:sharing'||receipt.requestHash!==requestHash)throw new InputError('This request key was used with different details.',409);return {...receipt.responseJson as {message:string},replayed:true};}}
 const all=await items(tx,eventId,m.event.state),item=all.find(r=>r.key===v.key);
 if(!item)throw new InputError('Choose a result from this event.',404);
 if(item.sourceRevision!==v.sourceRevision||item.sharingRevision!==v.sharingRevision)throw new InputError('Results or sharing changed. Refresh and review again.',409);
 const exposing=v.facilitators!=='HIDDEN'||v.participants!=='HIDDEN';
 if(item.kind!=='judging'&&[v.facilitators,v.participants].includes('LIVE'))throw new InputError('Live scores are available only for judged activities.');
 if(!item.approved&&[v.facilitators,v.participants].includes('PUBLISHED'))throw new InputError('Approve these results before sharing them.');
 if(item.kind==='overall'&&exposing){const overall=await overallSnapshot(tx,eventId);for(const audience of ['facilitators','participants'] as const)if(v[audience]!=='HIDDEN'&&overall.config.events.some(e=>(e.source==='JUDGING'&&all.find(r=>r.key==='judging:'+e.contestId)?.[audience]==='HIDDEN')||(e.source==='SPY'&&all.find(r=>r.key==='race')?.[audience]==='HIDDEN')))throw new InputError(`Share the included activity results with ${audience} first. Combined results include their scores.`,409);}
 if(item.key==='overall-breakdown'&&exposing)for(const audience of ['facilitators','participants'] as const)if(v[audience]!=='HIDDEN'&&all.find(r=>r.key==='overall')?.[audience]==='HIDDEN')throw new InputError(`Share combined results with ${audience} first. Detailed breakdown includes judge names and individual scores.`,409);
 const token=tokenHash(JSON.stringify({actorId,eventId,runRevision:v.runRevision,key:item.key,source:item.fingerprint,sharingRevision:item.sharingRevision,before:[item.facilitators,item.participants],after:[v.facilitators,v.participants],rows:item.rows}));
 const effects=[v.participants==='HIDDEN'?'Participants will not see these results.':v.participants==='LIVE'?'Participants will see submitted scores immediately, including partial results and future updates.':'Participants will see the approved results shown below.',v.facilitators==='HIDDEN'?'Facilitators will not see shared standings. Assigned judges keep access to their own score sheets.':v.facilitators==='LIVE'?'Facilitators will see submitted scores immediately, including partial results and future updates.':'Facilitators will see these approved results.', 'Scoring rules, saved scores and result approval stay unchanged.'];
 if(item.key==='overall-breakdown')effects.unshift("This detailed sheet includes judge names and each judge's submitted score for every squad. Sharing the summary alone does not share these details.");
 if(v.operation==='preview')return {token,key:item.key,name:item.name,facilitators:v.facilitators,participants:v.participants,previous:{facilitators:item.facilitators,participants:item.participants},rows:item.rows,effects} satisfies SharingPreview;
 if(v.token!==token)throw new InputError('Results changed after review. Review sharing again; nothing was shared.',409);
 if(item.kind==='judging'){
  await tx.judgingContest.update({where:{id:item.key.slice(8)},data:{facilitatorVisibility:v.facilitators,participantVisibility:v.participants,visibilityRevision:{increment:1}}});
 }else await tx.resultSharing.upsert({where:{eventId_key:{eventId,key:item.key}},create:{eventId,key:item.key,sourceRevision:item.sourceRevision,facilitators:v.facilitators,participants:v.participants},update:{sourceRevision:item.sourceRevision,facilitators:v.facilitators,participants:v.participants,revision:{increment:1}}});
 if(item.key==='overall')for(const audience of ['facilitators','participants'] as const)if(v[audience]==='HIDDEN')await tx.resultSharing.updateMany({where:{eventId,key:'overall-breakdown'},data:{[audience]:'HIDDEN',revision:{increment:1}}});
 if(item.kind==='judging'||item.kind==='race')await hideDependentSharing(tx,eventId,item.key,(['facilitators','participants'] as const).filter(a=>v[a]==='HIDDEN'));
 const response={message:`${item.name}: participants ${v.participants==='HIDDEN'?'hidden':v.participants==='LIVE'?'can see live scores':'can see approved results'}; facilitators ${v.facilitators==='HIDDEN'?'hidden':v.facilitators==='LIVE'?'can see live scores':'can see approved results'}.`};
 await tx.auditEntry.create({data:{eventId,actorId,action:'RESULTS_SHARING_CHANGED',targetId:item.key,detailsJson:{before:{facilitators:item.facilitators,participants:item.participants},after:{facilitators:v.facilitators,participants:v.participants},sourceRevision:item.sourceRevision,effects}}});
 await tx.managementReceipt.create({data:{actorId,requestKey:v.requestKey!,requestHash,operation:'results:sharing',responseJson:response}});
 return response;
},{timeout:20000,maxWait:15000});}
