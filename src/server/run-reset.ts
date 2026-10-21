import 'server-only';
import {Prisma} from '@/generated/prisma/client';
import type {OverallConfig} from '@/lib/overall';

// Event-scoped recovery record. Never include User/Session records or passwords.
export async function captureRun(tx:Prisma.TransactionClient,eventId:string){
 const [event,visits,outcomes,entries,corrections,penalties,contacts,credentials,announcements,reroutes,results,ballots,choices,voting,overall]=await Promise.all([
  tx.event.findUniqueOrThrow({where:{id:eventId}}),
  tx.stationVisit.findMany({where:{eventId},orderBy:{id:'asc'}}),
  tx.stationOutcome.findMany({where:{eventId},orderBy:{id:'asc'}}),
  tx.scoreLedgerEntry.findMany({where:{eventId},orderBy:{id:'asc'}}),
  tx.scoreCorrection.findMany({where:{outcome:{is:{eventId}}},orderBy:{id:'asc'}}),
  tx.timePenaltyEntry.findMany({where:{eventId},orderBy:{id:'asc'}}),
  tx.contactRecord.findMany({where:{eventId},orderBy:{id:'asc'}}),
  tx.contactCredential.findMany({where:{eventId},orderBy:{id:'asc'}}),
  tx.announcement.findMany({where:{eventId},orderBy:{id:'asc'}}),
  tx.routeChange.findMany({where:{eventId},orderBy:{id:'asc'}}),
  tx.resultRevision.findMany({where:{eventId},orderBy:{id:'asc'}}),
  tx.votingBallot.findMany({where:{eventId},orderBy:{id:'asc'}}),
  tx.votingChoice.findMany({where:{eventId},orderBy:[{ballotId:'asc'},{candidateMembershipId:'asc'}]}),
  tx.votingEvent.findMany({where:{eventId},orderBy:{id:'asc'}}),
  tx.overallRanking.findUnique({where:{eventId}}),
 ]);
 return JSON.parse(JSON.stringify({version:1,event,visits,outcomes,entries,corrections,penalties,contacts,credentials,announcements,reroutes,results,ballots,choices,voting,overall})) as Prisma.InputJsonObject;
}

export async function clearOverallRun(tx:Prisma.TransactionClient,eventId:string){
 const record=await tx.overallRanking.findUnique({where:{eventId}});
 if(!record)return;
 const config=record.config as OverallConfig;
 await tx.overallRanking.update({where:{eventId},data:{config:{...config,events:config.events.map(e=>({...e,ranks:{}}))},finalized:Prisma.DbNull,revision:{increment:1}}});
}
