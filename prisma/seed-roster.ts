import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword, validPassword } from "../src/lib/password";
import { operationRoster } from "./operation-roster";
import operationSquads from './operation-squads.json';

const connectionString=process.env.DATABASE_URL;
if(!connectionString)throw Error("Set DATABASE_URL in .env first.");
const temporaryPassword=process.env.SEED_AGENT_PASSWORD;
if(!temporaryPassword||!validPassword(temporaryPassword))throw Error("Set SEED_AGENT_PASSWORD (12–128 characters) in .env before importing roster. Share securely, then require password changes.");
const db=new PrismaClient({adapter:new PrismaPg({connectionString})});
const eventSlug="operation-classified-fmd";
async function main(temporaryPassword:string){
 const names=operationRoster.flatMap(t=>t.members.map(m=>m.name));
 if(new Set(names.map(x=>x.toLowerCase())).size!==names.length)throw Error("Duplicate full name detected. Resolve before import.");
 const event=await db.event.upsert({where:{slug:eventSlug},update:{},create:{name:"Operation: Classified — The Ultimate Mission",slug:eventSlug,codename:"OPERATION CLASSIFIED",briefing:"OUTRUN. OUTSMART. OUTLAST.",accentColor:"#d8b96d"}});
 if(event.state!=="PREPARING")throw Error("Roster seed requires event in PREPARING state; refusing to modify a live event.");
 // The organizer must be a member of the seeded event; the workspace is membership-scoped.
 const organizerEmail=process.env.SEED_ORGANIZER_EMAIL?.trim().toLowerCase()||"organizer@example.test";
 const organizer=await db.user.findUnique({where:{email:organizerEmail}});
 if(!organizer)throw Error(`Organizer account ${organizerEmail} not found. Run npm run db:seed first or set SEED_ORGANIZER_EMAIL to your login email.`);
 if(!organizer.canCreateEvents)throw Error(`Account ${organizerEmail} is not authorized to organize events.`);
 await db.eventMembership.upsert({
   where:{eventId_userId:{eventId:event.id,userId:organizer.id}},
   update:{role:"ORGANIZER",teamId:null,active:true},
   create:{eventId:event.id,userId:organizer.id,role:"ORGANIZER",active:true}
 });
 console.log(`Organizer linked: ${organizerEmail}`);

 let created=0;
 for(const [teamIndex,group] of operationRoster.entries()){
   // Poster labels stay stable import identifiers; reuse renamed squads without creating duplicate teams.
   const squadName=operationSquads[group.team as keyof typeof operationSquads];
   const existing=await db.team.findMany({where:{eventId:event.id,name:{in:[group.team,squadName]}}});
   if(existing.length>1)throw Error(`Both ${group.team} and ${squadName} exist. Resolve duplicate squads before importing.`);
   const team=existing[0]?await db.team.update({where:{id:existing[0].id},data:{color:group.color}}):await db.team.create({data:{eventId:event.id,name:group.team,color:group.color}});
   for(const [index,agent] of group.members.entries()){
      // Synthetic addresses are placeholders only; organizers must replace with real emails before issuing account access.
      const email=`classified.t${teamIndex+1}.${String(index+1).padStart(2,"0")}@agents.invalid`;
      let user=await db.user.findUnique({where:{email}});
      if(!user){user=await db.user.create({data:{email,name:agent.name,officeSection:agent.office,sex:agent.sex,passwordHash:await hashPassword(temporaryPassword),mustChangePassword:true}});created++;}
      else if(user.name!==agent.name)throw Error(`Placeholder identity collision: ${email}. Manual review required.`);
      await db.eventMembership.upsert({where:{eventId_userId:{eventId:event.id,userId:user.id}},update:{role:"PARTICIPANT",teamId:team.id,active:true},create:{eventId:event.id,userId:user.id,role:"PARTICIPANT",teamId:team.id}});
   }
   console.log(`${team.name}: ${group.members.length} agents linked`);
 }
 console.log(`\nRoster ready: ${names.length} agents; ${created} new placeholder accounts. Event slug: ${eventSlug}. Replace placeholder emails before real deployment.`);
}
main(temporaryPassword).catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>db.$disconnect());
