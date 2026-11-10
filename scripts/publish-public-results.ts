import 'dotenv/config';
import {db} from '../src/lib/db';
import {publishPublicResults} from '../src/server/public-results';
import {operationAwards} from '../prisma/operation-awards';

async function main(){
 const [eventId,actorId,confirm]=process.argv.slice(2);
 if(!eventId||!actorId||confirm&&confirm!=='--confirm')throw Error('Provide event ID, organizer user ID and optional --confirm.');
 const event=await db().event.findUniqueOrThrow({where:{id:eventId},select:{slug:true}});
 if(event.slug!=='operation-classified-fmd')throw Error('The supplied Double Agent awards belong to Operation Classified. Choose its exact event ID.');
 const result=await publishPublicResults(actorId,eventId,operationAwards,confirm==='--confirm');
 console.log(JSON.stringify({published:result.published,path:'/results/'+result.slug,additionalAwards:result.data.additionalAwards,votingAwards:result.data.polls.length,judgedActivities:result.data.contests.length,overall:result.data.overall.published}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db().$disconnect());
