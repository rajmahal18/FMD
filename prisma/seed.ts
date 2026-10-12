import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword,validPassword } from "../src/lib/password";
if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL required");
const password=process.env.SEED_PASSWORD||"";
if(!validPassword(password))throw new Error("Set SEED_PASSWORD to 12–128 characters. No built-in default password.");
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
try{await db.$transaction(async tx=>{
 const event=await tx.event.upsert({where:{slug:"classified-demo"},update:{},create:{slug:"classified-demo",name:"Operation: Classified",isDemo:true}});
 const team=await tx.team.upsert({where:{eventId_name:{eventId:event.id,name:"Delta"}},update:{},create:{eventId:event.id,name:"Delta"}});
 const station=await tx.station.upsert({where:{id:"demo-cipher-room"},update:{},create:{id:"demo-cipher-room",eventId:event.id,name:"Cipher Room",location:"East wing · Ground floor",briefing:"Meet your facilitator for the physical station challenge."}});
 for(const [email,name,role] of [["organizer@example.test","Demo Organizer","ORGANIZER"],["facilitator@example.test","Demo Facilitator","FACILITATOR"],["agent@example.test","Demo Agent","PARTICIPANT"]] as const){
 const user=await tx.user.upsert({where:{email},update:role==="ORGANIZER"?{canCreateEvents:true}:{},create:{email,name,passwordHash:await hashPassword(password),canCreateEvents:role==="ORGANIZER"}});
 const m=await tx.eventMembership.upsert({where:{eventId_userId:{eventId:event.id,userId:user.id}},update:{},create:{eventId:event.id,userId:user.id,role,teamId:role==="PARTICIPANT"?team.id:undefined}});
 if(role==="FACILITATOR")await tx.facilitatorAssignment.upsert({where:{membershipId_stationId:{membershipId:m.id,stationId:station.id}},update:{},create:{membershipId:m.id,stationId:station.id}});
 }
});console.log("Demo event and three individual role accounts ready. Existing passwords are preserved.");}finally{await db.$disconnect();}
