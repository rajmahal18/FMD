import {notFound} from "next/navigation";
import {requireMembership} from "@/lib/auth";
import {readField} from "@/server/field";
import {Shell} from "@/components/Shell";
import {EventIdentity} from "@/components/EventIdentity";
import {FacilitatorBoard} from "@/components/FacilitatorBoard";
export default async function Field({params,searchParams}:{params:Promise<{eventId:string}>;searchParams:Promise<{stationId?:string}>}){const {eventId}=await params;const {stationId}=await searchParams;const {user,m}=await requireMembership(eventId);if(m.role==="PARTICIPANT")notFound();return <Shell name={user.name} title="Field station" role={m.role} eventId={eventId}><EventIdentity event={m.event} showState={false}/><FacilitatorBoard initial={await readField(user.id,eventId,stationId)}/></Shell>;}
