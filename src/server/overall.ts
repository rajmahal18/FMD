import {passwordSetupRequired} from './password-setup';
import {snapshotShared} from './result-sharing-policy';
import 'server-only';
import {judgingResultsVisible,judgingStandings,type JudgingConfig} from '@/lib/judging';
import {db} from '@/lib/db';
import {InputError} from '@/lib/validation';
import {Prisma} from '@/generated/prisma/client';
import {defaultOverall,resolveOverallJudging,overallStandings,validateOverall,weightStatus,type OverallConfig,type OverallJudgingSource} from '@/lib/overall';
import {teamTotal} from './score';
type Tx=Prisma.TransactionClient;
async function scope(tx:Tx,actorId:string,eventId:string){const m=await tx.eventMembership.findUnique({where:{eventId_userId:{eventId,userId:actorId}},include:{user:true,event:true}});if(!m?.active||!m.user.active||(await passwordSetupRequired(tx,actorId,eventId,m.user.mustChangePassword))||m.role!=='ORGANIZER')throw new InputError('Active organizer access is required.',403);return m;}
export async function overallSnapshot(tx:Tx,eventId:string){
 const record=await tx.overallRanking.findUnique({where:{eventId}});const event=await tx.event.findUniqueOrThrow({where:{id:eventId},select:{state:true}});
 const race=await tx.resultRevision.findFirst({where:{eventId},orderBy:{revision:'desc'},select:{revision:true,teamStandingsJson:true}});
 const roster=await tx.team.findMany({where:{eventId},orderBy:{name:'asc'}});
 const raceRows=(race?.teamStandingsJson??[]) as {id:string;rank:number;value?:number;rule?:string;pending?:boolean}[];
 const teams=await Promise.all(roster.map(async t=>({id:t.id,name:t.name,color:t.color,points:await teamTotal(tx,eventId,t.id),raceScore:event.state==='FINALIZED'?raceRows.find(r=>r.id===t.id&&!r.pending&&r.rule==='STATION_PLACEMENTS')?.value??null:null,raceRank:event.state==='FINALIZED'?raceRows.find(r=>r.id===t.id&&!r.pending)?.rank||null:null})));
 const config=resolveOverallJudging((record?.config??{...defaultOverall(teams.length),...(event.state!=='PREPARING'?{raceRule:'POINTS'}:{})}) as OverallConfig);
 const contests=await tx.judgingContest.findMany({where:{eventId},select:{id:true,name:true,state:true,revision:true,config:true,publishedAt:true,publishedResults:true,facilitatorVisibility:true,participantVisibility:true,assignments:{where:{active:true},select:{membershipId:true}},scores:{where:{submittedAt:{not:null}},select:{candidateId:true,judgeMembershipId:true,totalHundredths:true,submittedAt:true}}}});
 const judgingSources:OverallJudgingSource[]=contests.filter(c=>(c.config as {target?:string}).target==='TEAM').map(c=>{const published=c.state==='PUBLISHED'&&!!c.publishedAt;const snapshot=c.publishedResults as {rows?:OverallJudgingSource['rows']}|null;const rules=c.config as JudgingConfig;const liveRows=judgingStandings(rules.candidateIds.map(id=>({id,name:roster.find(t=>t.id===id)?.name??'Unavailable team',active:roster.some(t=>t.id===id)})),c.assignments.map(a=>a.membershipId),rules.criteria,c.scores);return {id:c.id,name:c.name,revision:c.revision,published,liveRows,facilitatorVisibility:c.facilitatorVisibility as 'HIDDEN'|'PUBLISHED'|'LIVE',participantVisibility:c.participantVisibility as 'HIDDEN'|'PUBLISHED'|'LIVE',rows:published&&Array.isArray(snapshot?.rows)?snapshot.rows.map(r=>({id:r.id,rank:r.rank,average:r.average,maximum:r.maximum})):[]};});
 const savedRaceRule=(record?.config as OverallConfig|undefined)?.raceRule??'POINTS';
 const final=record?.finalized as {raceContributionMethod?:string;stale?:boolean;sourceRevision?:number|null;judgingRevisions?:Record<string,number>}|null;
 const judgingStale=!!final&&config.events.some(e=>e.source==='JUDGING'&&!judgingSources.some(s=>s.id===e.contestId&&s.published&&s.revision===final.judgingRevisions?.[s.id]));
 const methodStale=!!final&&config.raceRule==='STATION_PLACEMENTS'&&config.events.some(e=>e.source==='SPY')&&final.raceContributionMethod!=='PLACEMENT';
 const stale=!!final&&(methodStale||judgingStale||!!final.stale||(config.events.some(e=>e.source==='SPY')&&(event.state!=='FINALIZED'||!race||final.sourceRevision!==race.revision)));
 return {revision:record?.revision??0,config,finalized:record?.finalized??null,teams,judgingSources,stale,raceState:event.state,savedRaceRule,sourceRevision:race?.revision??null};
}
export async function readOverall(actorId:string,eventId:string){return db().$transaction(async tx=>{await scope(tx,actorId,eventId);return overallSnapshot(tx,eventId);},{isolationLevel:'RepeatableRead'});}
export async function readPublishedOverall(actorId:string,eventId:string){return db().$transaction(async tx=>{
 const m=await tx.eventMembership.findUnique({where:{eventId_userId:{eventId,userId:actorId}},include:{user:true}});
 if(!m?.active||!m.user.active||(await passwordSetupRequired(tx,actorId,eventId,m.user.mustChangePassword)))throw new InputError('Active event membership is required.',403);
 const data=await overallSnapshot(tx,eventId);
 if(!data.finalized||data.stale||!await snapshotShared(tx,eventId,'overall',data.revision,m.role))return {published:false as const};
 const final=data.finalized as {rows:ReturnType<typeof overallStandings>;config:OverallConfig;finalizedAt:string};
 if(!Array.isArray(final.rows))return {published:false as const};
 const finalConfig=resolveOverallJudging(final.config??data.config);
 if(m.role!=='ORGANIZER'&&finalConfig.events.some(e=>e.source==='SPY')&&!await snapshotShared(tx,eventId,'race',data.sourceRevision??0,m.role))return {published:false as const};
 if(m.role!=='ORGANIZER'&&finalConfig.events.some(e=>e.source==='JUDGING'&&!data.judgingSources.some(s=>s.id===e.contestId&&judgingResultsVisible((m.role==='FACILITATOR'?s.facilitatorVisibility:s.participantVisibility)??'HIDDEN',s.published))))return {published:false as const};
 // Return only the published standings; never draft placements, actor IDs or audit history.
 return {published:true as const,rows:final.rows.map(r=>({id:r.id,name:r.name,rank:r.rank,value:r.value,contributions:r.contributions})),activities:finalConfig.events.map(e=>({id:e.id,name:e.name,weight:e.weight})),finalizedAt:final.finalizedAt};
 },{isolationLevel:'RepeatableRead'});}
export async function saveOverall(actorId:string,eventId:string,value:unknown){return db().$transaction(async tx=>{
 await tx.$queryRaw`SELECT id FROM "Event" WHERE id=${eventId} FOR UPDATE`;
 const m=await scope(tx,actorId,eventId);if(m.event.archivedAt)throw new InputError('Restore this event before changing combined results.',409);
 const v=value as {operation?:string;revision?:number;config?:unknown;expectedJudgingRevisions?:Record<string,number>};if(!v||!['save','finalize','reopen'].includes(v.operation??''))throw new InputError('Choose a valid combined-results action.');
 const before=await overallSnapshot(tx,eventId);if(v.revision!==before.revision)throw new InputError('Another organizer saved changes. Reload before editing again.',409);
 if(before.finalized&&v.operation!=='reopen')throw new InputError('Reopen combined results before making changes.',409);
 if(v.operation==='reopen'&&!before.finalized)throw new InputError('Combined results are not approved.',409);
 let config:OverallConfig;try{config=validateOverall(v.operation==='reopen'?before.config:v.config,before.teams.map(t=>t.id));}catch(e){throw new InputError((e as Error).message);}
 if(JSON.stringify(config.raceScoring??null)!==JSON.stringify(before.config.raceScoring??null)&&m.event.state!=='PREPARING')throw new InputError('Race scoring weights and regular stations are locked after Preparing.',409);
 if((config.raceRule??'POINTS')!==before.savedRaceRule&&m.event.state!=='PREPARING')throw new InputError('Choose the Amazing Race winning rule while the event is Preparing. It cannot change after the race is ready or started.',409);
 for(const component of config.events)if(component.source==='JUDGING'&&!before.judgingSources.some(c=>c.id===component.contestId))throw new InputError('Choose a team judging contest from this event.');
 const rows=overallStandings(config,before.teams,before.judgingSources);const finalizing=v.operation==='finalize';
 if(finalizing){for(const component of config.events)if(component.source==='JUDGING'&&v.expectedJudgingRevisions?.[component.contestId!]!==before.judgingSources.find(s=>s.id===component.contestId)?.revision)throw new InputError('Judging results changed after review. Refresh combined results before approval.',409);if(!weightStatus(config.events).valid)throw new InputError(weightStatus(config.events).message);if(before.teams.length<2)throw new InputError('Add at least two teams before approving combined results.');if(config.events.some(e=>e.source==='SPY')&&m.event.state!=='FINALIZED')throw new InputError('Approve Amazing Race results first so its placements are confirmed.',409);if(rows.some(r=>r.contributions.some(c=>c.rank===null)))throw new InputError('Complete and approve all activity results first.');}
 await tx.resultSharing.deleteMany({where:{eventId,key:{in:['overall','overall-breakdown']}}});
 const finalized=finalizing?{rows,config,raceContributionMethod:'PLACEMENT',finalizedAt:new Date().toISOString(),actorId,sourceRevision:before.sourceRevision,judgingRevisions:Object.fromEntries(before.judgingSources.filter(s=>config.events.some(e=>e.source==='JUDGING'&&e.contestId===s.id)).map(s=>[s.id,s.revision]))}:Prisma.DbNull;
 await tx.overallRanking.upsert({where:{eventId},create:{eventId,revision:1,config:config as unknown as Prisma.InputJsonValue,finalized},update:{revision:{increment:1},config:config as unknown as Prisma.InputJsonValue,finalized}});
 await tx.auditEntry.create({data:{eventId,actorId,action:`OVERALL_${v.operation!.toUpperCase()}`,detailsJson:{previousRevision:before.revision,previousFinal:before.finalized,config:config as unknown as Prisma.InputJsonValue}}});
 return overallSnapshot(tx,eventId);
 },{isolationLevel:'Serializable',timeout:20000});}

