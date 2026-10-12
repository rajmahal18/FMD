import "server-only";
import {Prisma} from "@/generated/prisma/client";
import {routeOrder} from "@/lib/routes";
export type ReadinessIssue={message:string;href:string};
export async function readiness(tx:Prisma.TransactionClient,eventId:string){
 const [teams,people,stations,visitCount]=await Promise.all([tx.team.findMany({where:{eventId},include:{routeAssignment:{include:{route:true}}}}),tx.eventMembership.findMany({where:{eventId,active:true,user:{active:true}},include:{user:{select:{name:true,mustChangePassword:true}},assignments:true}}),tx.station.findMany({where:{eventId}}),tx.stationVisit.count({where:{eventId}})]);
 const issues:ReadinessIssue[]=[];const issue=(message:string,page:string)=>issues.push({message,href:`/events/${eventId}/${page}`});try{const url=new URL(process.env.APP_ORIGIN??"");if(url.protocol!=="https:"&&!["localhost","127.0.0.1","[::1]"].includes(url.hostname))issue("Ask the platform operator to enable HTTPS before starting.","setup");}catch{issue("Ask the platform operator to set the event website address.","setup");}const participants=people.filter(p=>p.role==="PARTICIPANT");
 if(!teams.length)issue("Add at least one team.","people");if(!participants.length)issue("Add participants to this event.","people");
 for(const p of participants){if(!teams.some(t=>t.id===p.teamId))issue(`${p.user.name} needs a team in this event.`,"people");if(p.user.mustChangePassword)issue(`${p.user.name} must sign in and change their temporary password.`,"people");}
 const used=new Set<string>();
 for(const t of teams){const members=participants.filter(p=>p.teamId===t.id);if(!members.length)issue(`${t.name} has no active agents.`,"people");if(members.filter(p=>p.isCaptain).length!==1)issue(`${t.name} needs one active captain.`,"people");const a=t.routeAssignment;
  if(!a||a.route.eventId!==eventId){issue(`${t.name} needs an assigned route.`,"routes");continue;}
  try{const expected=routeOrder(a.route.mode,a.route.stationIds as string[],a.startStationId);if(a.mode!==a.route.mode||a.routeRevision!==a.route.revision||JSON.stringify(a.stationIds)!==JSON.stringify(expected))throw new Error();for(const id of expected)used.add(id);}catch{issue(`${t.name} needs a fresh, valid route assignment.`,"routes");}
 }
 if(!used.size)issue("Assign a route containing at least one station.","routes");
 for(const id of used){const s=stations.find(s=>s.id===id);if(!s){issue("An assigned route contains a missing station.","routes");continue;}if(!s.configured||!s.location.trim()||!s.briefing.trim()||!s.facilitatorInstructions.trim())issue(`${s.name} needs its briefing, location and handler rules.`,"stations");if(!s.available)issue(`${s.name} is unavailable but still assigned.`,"stations");if(!s.arrivalCode)issue(`${s.name} needs an arrival QR/code.`,"stations");const staff=people.filter(p=>p.role==="FACILITATOR"&&p.assignments.some(a=>a.stationId===id));if(!staff.length)issue(`${s.name} needs an assigned active facilitator.`,"staff");for(const p of staff)if(p.user.mustChangePassword)issue(`${p.user.name} must change their temporary password before handling ${s.name}.`,"staff");if(s.minimumPoints>s.maximumPoints||s.fixedPoints<0||s.maximumPoints>100000||s.maximumAdjustment<0||s.maximumAdjustment>100000||s.queueEnabled&&!s.capacity)issue(`${s.name} has invalid result or capacity rules.`,"stations");}
 if(visitCount)issue("This event already contains station visits. Ask the platform operator to review it before starting.","setup");
 const contactPolicy=await tx.contactPolicy.findUnique({where:{eventId}});if(contactPolicy?.enabled&&contactPolicy.closesAt<=new Date())issue("Agent Contact window has already ended. Update or disable collection.","contact-policy");
 return {issues,teamCount:teams.length,stationCount:used.size};
}
