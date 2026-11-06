import 'server-only';
import {db} from '@/lib/db';
import {InputError} from '@/lib/validation';
import {overallStandings,overallComplete,type OverallConfig} from '@/lib/overall';
import {judgingResultsVisible,type JudgingConfig} from '@/lib/judging';
import type {OverallBreakdown,BreakdownActivity} from '@/lib/overall-breakdown';
import type {Prisma} from '@/generated/prisma/client';
import {passwordSetupRequired} from './password-setup';
import {overallSnapshot} from './overall';
import {snapshotShared} from './result-sharing-policy';
type Tx=Prisma.TransactionClient;
export async function buildOverallBreakdown(tx:Tx,eventId:string,provided?:Awaited<ReturnType<typeof overallSnapshot>>):Promise<OverallBreakdown>{
 const data=provided??await overallSnapshot(tx,eventId),approved=!!data.finalized&&!data.stale;
 const final=data.finalized as {rows:ReturnType<typeof overallStandings>;config:OverallConfig}|null;
 const standings=approved?final!.rows:overallStandings(data.config,data.teams,data.judgingSources,true);
 const complete=approved||overallComplete(data.config,standings);
 const contests=await tx.judgingContest.findMany({where:{eventId,id:{in:data.config.events.filter(e=>e.source==='JUDGING').map(e=>e.contestId!)}},select:{id:true,config:true,assignments:{where:{active:true},orderBy:{membership:{user:{name:'asc'}}},select:{membershipId:true,membership:{select:{user:{select:{name:true}}}}}},scores:{where:{submittedAt:{not:null}},select:{candidateId:true,judgeMembershipId:true,totalHundredths:true}}}});
 const activities:BreakdownActivity[]=data.config.events.map(e=>{const c=contests.find(c=>c.id===e.contestId);return {id:e.id,name:e.name,weight:e.weight,source:e.source,maximum:c?(c.config as JudgingConfig).criteria.reduce((n,c)=>n+c.maximum,0):null,judges:c?.assignments.map(a=>({id:a.membershipId,name:a.membership.user.name}))??[]};});
 const rows=standings.map(row=>{const team=data.teams.find(t=>t.id===row.id)!;return {id:row.id,name:row.name,color:team.color,total:row.value,rank:complete?row.rank:null,values:activities.map(a=>{const contribution=row.contributions.find(c=>c.eventId===a.id)!;const component=data.config.events.find(e=>e.id===a.id)!,contest=contests.find(c=>c.id===component.contestId);const judgeScores=a.judges.map(j=>{const score=contest?.scores.find(s=>s.candidateId===row.id&&s.judgeMembershipId===j.id);return score?score.totalHundredths/100:null;});const submitted=judgeScores.filter(s=>s!==null).length;return {id:a.id,judgeScores,judgeSum:submitted?judgeScores.reduce<number>((n,s)=>n+(s??0),0):null,average:contribution.average,rank:contribution.rank,credit:contribution.credit,contribution:contribution.contribution,raceScore:a.source==='SPY'?team.raceScore??null:null,submitted,expected:a.judges.length};})};});
 if(!complete)rows.sort((a,b)=>a.name.localeCompare(b.name));
 return {visible:true,organizer:true,eventId,checkedAt:new Date().toISOString(),approved,complete,stale:data.stale,revision:data.revision,activities,rows};
}
export async function readOverallBreakdown(actorId:string,eventId:string):Promise<OverallBreakdown>{return db().$transaction(async tx=>{
 const m=await tx.eventMembership.findUnique({where:{eventId_userId:{eventId,userId:actorId}},include:{user:{select:{active:true,mustChangePassword:true}}}});
 if(!m?.active||!m.user.active||await passwordSetupRequired(tx,actorId,eventId,m.user.mustChangePassword))throw new InputError('Active event access is required.',403);
 const organizer=m.role==='ORGANIZER',hidden:OverallBreakdown={visible:false,organizer,eventId,checkedAt:new Date().toISOString()};
 const data=await overallSnapshot(tx,eventId);
 if(!organizer){
  if(!data.finalized||data.stale||!await snapshotShared(tx,eventId,'overall-breakdown',data.revision,m.role)||!await snapshotShared(tx,eventId,'overall',data.revision,m.role))return hidden;
  for(const e of data.config.events){
   if(e.source==='SPY'&&!await snapshotShared(tx,eventId,'race',data.sourceRevision??0,m.role))return hidden;
   if(e.source==='JUDGING'&&!data.judgingSources.some(s=>s.id===e.contestId&&s.published&&judgingResultsVisible((m.role==='FACILITATOR'?s.facilitatorVisibility:s.participantVisibility)??'HIDDEN',s.published)))return hidden;
  }
 }
 return {...await buildOverallBreakdown(tx,eventId,data),organizer};
},{isolationLevel:'RepeatableRead',timeout:20000});}
