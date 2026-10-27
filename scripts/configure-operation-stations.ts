import "dotenv/config";
import {PrismaClient} from "../src/generated/prisma/client";
import {PrismaPg} from "@prisma/adapter-pg";
import {operationStations,stationInstructions} from "../prisma/operation-stations";
import {validatePenaltyButtons} from "../src/lib/time-penalties";

if(!process.env.DATABASE_URL)throw Error("DATABASE_URL required");
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
const apply=process.argv.includes("--apply");
try {
 await db.$transaction(async tx=>{
  const event=await tx.event.findUniqueOrThrow({where:{slug:"operation-classified-fmd"}});
  if(event.state!=="PREPARING")throw Error("Station configuration requires a Preparing event.");
  if(await tx.stationVisit.count({where:{eventId:event.id}}))throw Error("Existing visits require a separate reviewed configuration update.");
  const existing=await tx.station.findMany({where:{eventId:event.id}});
  const used=new Set<string>();
  for(const spec of operationStations){
   const name=`Station ${spec.number}: ${spec.name}`;
   const matches=existing.filter(s=>s.name===name||s.name===spec.name||s.name===spec.legacyName);
   if(matches.length>1)throw Error(`Ambiguous station mapping: ${name}`);
   const current=matches[0];
   if(current){if(used.has(current.id))throw Error("Duplicate mapping");used.add(current.id);}
   const data={name,codename:spec.name,location:"To be assigned",briefing:`${spec.briefing}\n\n${stationInstructions(spec)}`,facilitatorInstructions:stationInstructions(spec),timeLimitMinutes:10,timePenaltyButtons:validatePenaltyButtons(spec.penalties)};
   const changed=!current||Object.entries(data).some(([key,value])=>JSON.stringify(current[key as keyof typeof current])!==JSON.stringify(value));
   console.log(`${changed?(current?"UPDATE":"CREATE"):"UNCHANGED"}: ${name}`);
   if(apply&&changed){
    const station=current?await tx.station.update({where:{id:current.id},data:{...data,timePenaltyRevision:{increment:1}}}):await tx.station.create({data:{...data,id:`fmd-station-${spec.number.toLowerCase()}`,eventId:event.id,timePenaltyRevision:1}});
    await tx.auditEntry.create({data:{eventId:event.id,action:"STATION_CONFIGURED_BY_OPERATOR",targetId:station.id,detailsJson:{source:"Organizer-supplied station posters, 2026-10-27",before:current?JSON.parse(JSON.stringify(current)):null,after:JSON.parse(JSON.stringify(station))}}});
   }
  }
  console.log(apply?"Station configuration saved. Existing station IDs, staff assignments, route plans, and scoring policy preserved.":"Preview only. Use --apply to save.");
 },{isolationLevel:"Serializable",timeout:30000});
} finally {await db.$disconnect();}
