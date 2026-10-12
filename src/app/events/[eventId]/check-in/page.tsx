import {redirect} from "next/navigation";
import {currentUser,requireMembership} from "@/lib/auth";
import {readMission} from "@/server/mission";
import {Shell} from "@/components/Shell";
import {CheckIn} from "@/components/CheckIn";
import {EventIdentity} from "@/components/EventIdentity";
import {safeReturnPath} from "@/lib/race";
export default async function Arrival({params,searchParams}:{params:Promise<{eventId:string}>;searchParams:Promise<{code?:string|string[]}>}){
 const {eventId}=await params;const search=await searchParams;const code=typeof search.code==="string"&&search.code.length<=1024?search.code:"";const returnTo=safeReturnPath(`/events/${eventId}/check-in${/^[A-HJ-NP-Z2-9]{8}$/.test(code)?`?code=${code}`:""}`);const account=await currentUser();if(!account)redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);if(account.mustChangePassword)redirect(`/account/password?returnTo=${encodeURIComponent(returnTo)}`);const {user,m}=await requireMembership(eventId);
 return <Shell name={user.name} title="Team arrival" role={m.role} eventId={eventId}><EventIdentity event={m.event}/><a className="text-action" href={`/events/${eventId}`}>Return to current mission ↗</a>{m.role==="PARTICIPANT"&&m.isCaptain?(await readMission(user.id,eventId)).view.status==="REVIEW_REQUIRED"?<p className="notice">Your station progress needs organizer review before another arrival.</p>:<CheckIn eventId={eventId} actorId={user.id} initialCode={code} live={m.event.state==="LIVE"}/>:<section className="panel"><h2>Your team captain handles check-in</h2><p>Stay with your team. Ask your captain to scan the station sign or enter its code.</p></section>}</Shell>;
}
