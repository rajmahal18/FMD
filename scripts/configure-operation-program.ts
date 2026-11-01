import 'dotenv/config';
import {isDeepStrictEqual} from 'node:util';
import {PrismaClient} from '../src/generated/prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
import {operationProgram} from '../prisma/operation-program';
import {parseEventProgram} from '../src/lib/event-program';

const database=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL!})});
async function main(){
 const content=JSON.parse(JSON.stringify(parseEventProgram(operationProgram)));
 await database.$transaction(async tx=>{
  const event=await tx.event.findUniqueOrThrow({where:{slug:'operation-classified-fmd'}});
  await tx.$queryRaw`SELECT id FROM "Event" WHERE id=${event.id} FOR UPDATE`;
  if(event.archivedAt)throw Error('Restore the event before changing its program.');
  const existing=await tx.eventProgram.findUnique({where:{eventId:event.id}});
  if(existing&&isDeepStrictEqual(parseEventProgram(existing.content),content)){console.log('Event program already matches.');return;}
  await tx.eventProgram.upsert({where:{eventId:event.id},create:{eventId:event.id,content},update:{content}});
  await tx.auditEntry.create({data:{eventId:event.id,action:'OPERATOR_PROGRAM_CONFIGURED',targetId:event.id,detailsJson:{source:'Organizer-provided November 4–6, 2026 master schedule',before:existing?.content??null,after:content}}});
  console.log('Event program saved: November 4–6, 2026. Existing race controls and schedules are unchanged.');
 },{timeout:30000});
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>database.$disconnect());
