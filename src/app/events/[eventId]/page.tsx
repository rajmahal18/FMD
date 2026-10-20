import Link from "next/link";
import {MissionControl} from "@/components/MissionControl";
import {readControl} from "@/server/control-view";
import {FacilitatorBoard} from "@/components/FacilitatorBoard";
import {readField} from "@/server/field";
import {ReadinessCard} from "@/components/ReadinessCard";
import {readiness} from "@/server/readiness";
import { ParticipantMission } from "@/components/ParticipantMission";
import { readMission } from "@/server/mission";
import { EventIdentity } from "@/components/EventIdentity";
import { requireMembership } from "@/lib/auth";
import { db } from "@/lib/db";
import { Shell } from "@/components/Shell";
export default async function EventPage({params}:{params:Promise<{eventId:string}>}){const {eventId}=await params;const {user,m}=await requireMembership(eventId);if(m.role==="PARTICIPANT"){const initial=await readMission(user.id,eventId);const votingCount=await db().votingEvent.count({where:{eventId}});return <Shell name={user.name} title="Current mission" role={m.role} eventId={eventId}><EventIdentity event={m.event} showState={false}/>{m.event.briefing&&<p className="event-briefing">{m.event.briefing}</p>}{votingCount>0&&<section className="voting-notice"><div><strong>Voting events</strong><p>Check the schedule and cast your ballot.</p></div><Link prefetch={false} href={`/events/${eventId}/voting`} className="button">Open voting</Link></section>}<ParticipantMission initial={initial}/></Shell>;}if(m.role==="FACILITATOR")return <Shell name={user.name} title="Your field station" role={m.role} eventId={eventId}><EventIdentity event={m.event} showState={false}/><FacilitatorBoard initial={await readField(user.id,eventId)}/></Shell>;return <Shell name={user.name} title="Mission Control" role="ORGANIZER" eventId={eventId}><EventIdentity event={m.event} showState={false}/><MissionControl initial={await readControl(user.id,eventId)}>{["PREPARING","READY"].includes(m.event.state)&&<ReadinessCard eventId={eventId} actorId={user.id} eventName={m.event.name} state={m.event.state} ready={await db().$transaction(tx=>readiness(tx,eventId))}/>}</MissionControl></Shell>;}
