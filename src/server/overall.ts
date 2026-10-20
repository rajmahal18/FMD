import 'server-only';
import {db} from '@/lib/db';
import {InputError} from '@/lib/validation';
import {Prisma} from '@/generated/prisma/client';
import {defaultOverall,overallStandings,validateOverall,weightStatus,type OverallConfig} from '@/lib/overall';
import {teamTotal} from './score';
type Tx=Prisma.TransactionClient;
async function scope(tx:Tx,actorId:string,eventId:string){const m=await tx.eventMembership.findUnique({where:{eventId_userId:{eventId,userId:actorId}},include:{user:true,event:true}});if(!m?.active||!m.user.active||m.user.mustChangePassword||m.role!=='ORGANIZER')throw new InputError('Active organizer access is required.',403);return m;}
async function snapshot(tx:Tx,eventId:string){
 const record=await tx.overallRanking.findUnique({where:{eventId}});const event=await tx.event.findUniqueOrThrow({where:{id:eventId},select:{state:true}});
 const race=await tx.resultRevision.findFirst({where:{eventId},orderBy:{revision:'desc'},select:{revision:true,teamStandingsJson:true}});
 const roster=await tx.team.findMany({where:{eventId},orderBy:{name:'asc'}});
 const raceRows=(race?.teamStandingsJson??[]) as {id:string;rank:number;pending?:boolean}[];
 const teams=await Promise.all(roster.map(async t=>({id:t.id,name:t.name,color:t.color,points:await teamTotal(tx,eventId,t.id),raceRank:event.state==='FINALIZED'?raceRows.find(r=>r.id===t.id&&!r.pending)?.rank||null:null})));
 const config=(record?.config??{...defaultOverall(teams.length),...(event.state!=='PREPARING'?{raceRule:'POINTS'}:{})}) as OverallConfig;
 const savedRaceRule=(record?.config as OverallConfig|undefined)?.raceRule??'POINTS';
 const final=record?.finalized as {stale?:boolean;sourceRevision?:number|null}|null;
 const stale=!!final&&(!!final.stale||(config.events.some(e=>e.source==='SPY')&&(event.state!=='FINALIZED'||!race||final.sourceRevision!==race.revision)));
 return {revision:record?.revision??0,config,finalized:record?.finalized??null,teams,stale,raceState:event.state,savedRaceRule,sourceRevision:race?.revision??null};
}
export async function readOverall(actorId:string,eventId:string){return db().$transaction(async tx=>{await scope(tx,actorId,eventId);return snapshot(tx,eventId);},{isolationLevel:'RepeatableRead'});}
export async function readPublishedOverall(actorId:string,eventId:string){return db().$transaction(async tx=>{
 const m=await tx.eventMembership.findUnique({where:{eventId_userId:{eventId,userId:actorId}},include:{user:true}});
 if(!m?.active||!m.user.active||m.user.mustChangePassword)throw new InputError('Active event membership is required.',403);
 const data=await snapshot(tx,eventId);
 if(!data.finalized||data.stale)return {published:false as const};
 const final=data.finalized as {rows:ReturnType<typeof overallStandings>;config:OverallConfig;finalizedAt:string};
 // Return only the published standings; never draft placements, actor IDs or audit history.
 return {published:true as const,rows:final.rows.map(r=>({id:r.id,name:r.name,rank:r.rank,value:r.value,contributions:r.contributions})),activities:final.config.events.map(e=>({id:e.id,name:e.name,weight:e.weight})),finalizedAt:final.finalizedAt};
 },{isolationLevel:'RepeatableRead'});}
export async function saveOverall(actorId:string,eventId:string,value:unknown){return db().$transaction(async tx=>{
 await tx.$queryRaw`SELECT id FROM "Event" WHERE id=${eventId} FOR UPDATE`;
 const m=await scope(tx,actorId,eventId);if(m.event.archivedAt)throw new InputError('Restore this event before changing overall rankings.',409);
 const v=value as {operation?:string;revision?:number;config?:unknown};if(!v||!['save','finalize','reopen'].includes(v.operation??''))throw new InputError('Choose a valid overall ranking action.');
 const before=await snapshot(tx,eventId);if(v.revision!==before.revision)throw new InputError('Another organizer saved changes. Reload before editing again.',409);
 if(before.finalized&&v.operation!=='reopen')throw new InputError('Reopen overall results before making changes.',409);
 if(v.operation==='reopen'&&!before.finalized)throw new InputError('Overall results are not finalized.',409);
 let config:OverallConfig;try{config=validateOverall(v.operation==='reopen'?before.config:v.config,before.teams.map(t=>t.id));}catch(e){throw new InputError((e as Error).message);}
 if((config.raceRule??'POINTS')!==before.savedRaceRule&&m.event.state!=='PREPARING')throw new InputError('Choose the Amazing Race winning rule while the event is Preparing. It cannot change after the race is ready or started.',409);
 const rows=overallStandings(config,before.teams);const finalizing=v.operation==='finalize';
 if(finalizing){if(!weightStatus(config.events).valid)throw new InputError(weightStatus(config.events).message);if(before.teams.length<2)throw new InputError('Add at least two teams before finalizing.');if(config.events.some(e=>e.source==='SPY')&&m.event.state!=='FINALIZED')throw new InputError('Finalize Amazing Race results first so its placements are confirmed.',409);if(rows.some(r=>r.contributions.some(c=>c.rank===null)))throw new InputError('Complete all activity results before finalizing.');}
 const finalized=finalizing?{rows,config,finalizedAt:new Date().toISOString(),actorId,sourceRevision:before.sourceRevision}:Prisma.DbNull;
 await tx.overallRanking.upsert({where:{eventId},create:{eventId,revision:1,config:config as unknown as Prisma.InputJsonValue,finalized},update:{revision:{increment:1},config:config as unknown as Prisma.InputJsonValue,finalized}});
 await tx.auditEntry.create({data:{eventId,actorId,action:`OVERALL_${v.operation!.toUpperCase()}`,detailsJson:{previousRevision:before.revision,previousFinal:before.finalized,config:config as unknown as Prisma.InputJsonValue}}});
 return snapshot(tx,eventId);
 },{isolationLevel:'Serializable',timeout:20000});}

