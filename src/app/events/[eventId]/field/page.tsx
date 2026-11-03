import {LivePreviewEntry} from '@/components/LivePreviewEntry';
import {notFound} from "next/navigation";
import {requireMembership} from "@/lib/auth";
import {readField} from "@/server/field";
import {Shell} from "@/components/Shell";
import {EventIdentity} from "@/components/EventIdentity";
import {FacilitatorBoard} from "@/components/FacilitatorBoard";
export default async function Field({params,searchParams}:{params:Promise<{eventId:string}>;searchParams:Promise<{stationId?:string}>}){const {eventId}=await params;const {stationId}=await searchParams;const {user,m}=await requireMembership(eventId);if(m.role==="PARTICIPANT")notFound();return <Shell name={user.name} title="Field station" role={m.role} eventId={eventId}>{m.role==="FACILITATOR"?<div className="controller-event-label">{m.event.name}{m.event.isDemo&&<span>Demo</span>}</div>:<EventIdentity event={m.event} showState={false}/>}{m.role==="FACILITATOR"&&["PREPARING","READY"].includes(m.event.state)&&<LivePreviewEntry enabled={m.event.screenPreviewEnabled} eventId={eventId}/>}<FacilitatorBoard controller={m.role==="FACILITATOR"} initial={await readField(user.id,eventId,stationId)}/></Shell>;}
