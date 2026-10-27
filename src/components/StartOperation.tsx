"use client";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useActionFeedback} from "./ActionFeedback";
import {RaceAction} from "./RaceAction";
import type {ReadinessIssue} from "@/server/readiness";

export function StartOperation({eventId,actorId,eventName,ready}:{eventId:string;actorId:string;eventName:string;ready:{issues:ReadinessIssue[];teamCount:number;stationCount:number}}){
 const feedback=useActionFeedback(),router=useRouter();
 if(ready.issues.length)return <div className="race-action"><p className="status-wait">Operation not started. Resolve {ready.issues.length} preparation {ready.issues.length===1?"issue":"issues"} before starting.</p><button type="button" onClick={()=>{
  const notice=feedback.begin("Checking start requirements");
  feedback.finish(notice,"Operation not started",<><p>The event is still in preparation. Resolve the following before starting:</p><ul className="start-operation-issues">{ready.issues.map((issue,i)=><li key={i}><span>{issue.message}</span><Link href={issue.href} className="text-action" onClick={()=>feedback.close(notice)}>Review issue →</Link></li>)}</ul><p>After making changes, use Refresh checks to load the latest requirements.</p></>,true);
 }}>Start operation</button></div>;
 return <RaceAction eventId={eventId} actorId={actorId} input={{operation:"startEvent"}} label="Start operation" description={`Start ${eventName}`} onSuccess={()=>router.refresh()} confirm={`Start ${eventName} now? ${ready.teamCount} teams and ${ready.stationCount} stations. Setup will close and captain check-in will open.`}/>;
}
