export const metadata = {robots:{index:false,follow:false}};
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireMembership } from "@/lib/auth";
import { Shell } from "@/components/Shell";

function Insignia({sex}:{sex:string|null}){
  const male=sex==="M",female=sex==="F";
  return <span className="agent-insignia" aria-label={male?"Male":female?"Female":"Not specified"} title={male?"Male":female?"Female":"Not specified"}>
    <svg viewBox="0 0 72 72" width="76" height="76" fill="none" aria-hidden="true">
      <path d="M36 3 65 18v36L36 69 7 54V18L36 3Z" stroke="currentColor" strokeWidth="2"/>
      <path d="M36 11 57 22v28L36 61 15 50V22L36 11Z" stroke="currentColor" strokeOpacity=".4"/>
      <circle cx="33" cy="35" r="12" stroke="currentColor" strokeWidth="3"/>
      {male?<><path d="m42 26 15-15m-11 0h11v11" stroke="currentColor" strokeWidth="3" strokeLinecap="square"/></>:female?<><path d="M33 47v15m-8-7h16" stroke="currentColor" strokeWidth="3"/></>:<path d="M33 30v11" stroke="currentColor" strokeWidth="3"/>}
    </svg>
    <span>{male?"M / AGENT":female?"F / AGENT":"AGENT"}</span>
  </span>;
}
export default async function AgentDossier({params}:{params:Promise<{eventId:string;membershipId:string}>}){
 const {eventId,membershipId:requestedId}=await params;
 const {user,m}=await requireMembership(eventId);
 const membershipId=requestedId==="me"?m.id:requestedId;
 if(m.role!=="ORGANIZER"&&m.role!=="FACILITATOR"&&m.id!==membershipId)notFound();
 const agent=await db().eventMembership.findFirst({where:{id:membershipId,eventId,active:true,role:"PARTICIPANT"},include:{user:{select:{name:true,sex:true,officeSection:true}},team:{select:{name:true,color:true}}}});
 if(!agent)notFound();
 const unit=agent.team?.name??"Unassigned";
 const callsign=`${unit.replace(/\D/g,"").padStart(2,"0")}-${agent.id.slice(-5).toUpperCase()}`;
 return <Shell name={user.name} role={m.role} eventId={eventId} title="Agent dossier">
  {m.role==="PARTICIPANT"&&<Link prefetch={false} href={`/events/${eventId}`} className="button dossier-mission-action">Go to mission</Link>}
  <div className="agent-dossier-shell">
   <div className="agent-dossier-top"><span>OPERATION: CLASSIFIED</span><span>AUTHORIZED PERSONNEL FILE</span></div>
   <div className="agent-dossier-main">
    <div className="agent-monogram"><span className="agent-crosshair">＋</span><strong>{agent.user.name.split(/[\s,]+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()).join("")}</strong><small>IDENTITY VERIFIED</small></div>
    <div className="agent-biography"><div className="eyebrow">FIELD AGENT / ACTIVE DOSSIER</div><h2>{agent.user.name}</h2><div className="agent-callsign">CALLSIGN {callsign}</div><div className="agent-divider"/><dl><div><dt>Assigned unit</dt><dd><span className="team-swatch" style={{background:agent.team?.color??"#d8b96d"}}/>{unit}</dd></div><div><dt>Office / Section</dt><dd>{agent.user.officeSection??"Not recorded"}</dd></div><div><dt>Squad role</dt><dd>{agent.squadRole??"Not assigned"}</dd></div><div><dt>Clearance</dt><dd>Participant · Active</dd></div></dl></div>
    <div className="agent-gender"><span>IDENTITY MARKER</span><Insignia sex={agent.user.sex}/></div>
   </div>
   <div className="agent-dossier-bottom"><span>OUTRUN / OUTSMART / OUTLAST</span><span>PERSONNEL RECORD · PRIVATE</span></div>
  </div>
  <p className="fine">This record is visible to you and authorized event staff. Profile markers reflect event-provided roster data; no photo or sensitive background profile is required.</p>
  {m.role!=="PARTICIPANT"&&<Link href={`/events/${eventId}/people`} className="secondary button">Back to operation</Link>}
 </Shell>;
}
