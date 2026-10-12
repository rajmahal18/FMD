import {notFound} from "next/navigation";
import QRCode from "qrcode";
import {requireMembership} from "@/lib/auth";
import {mayOperateStation} from "@/lib/policy";
import {db} from "@/lib/db";
import {Shell} from "@/components/Shell";
import {PrintStationSign} from "@/components/PrintStationSign";
export default async function Sign({params}:{params:Promise<{eventId:string;stationId:string}>}){
 const {eventId,stationId}=await params;const {user,m}=await requireMembership(eventId);if(!mayOperateStation(m.role,m.assignments.some(a=>a.stationId===stationId)))notFound();const station=await db().station.findFirst({where:{eventId,id:stationId}});if(!station)notFound();const link=station.arrivalCode&&process.env.APP_ORIGIN?new URL(`/events/${eventId}/check-in?code=${station.arrivalCode}`,process.env.APP_ORIGIN).toString():null;const svg=link?await QRCode.toString(link,{type:"svg",errorCorrectionLevel:"M",margin:4,width:320,color:{dark:"#000000ff",light:"#ffffffff"}}):null;
 return <Shell name={user.name} title="Station arrival sign" role={m.role} eventId={eventId}>{link&&svg?<><PrintStationSign/><section className="station-sign"><div className="eyebrow">TEAM CHECK-IN</div><h2>{m.event.codename??m.event.name}</h2><h3>{station.name}</h3><p>{station.location}</p><img src={`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`} width={320} height={320} alt={`Arrival QR for ${station.name}`}/><p>Captain: scan this sign, sign in and confirm your team’s arrival.</p><div className="sign-code"><span>MANUAL STATION CODE</span><strong>{station.arrivalCode!.slice(0,4)}-{station.arrivalCode!.slice(4)}</strong></div><p>Arrival does not award points. Your facilitator confirms the physical challenge result.</p></section></>:<section className="panel"><h2>Arrival sign is not issued yet</h2><p>Ask the organizer to issue this station’s arrival code while the event is Preparing.</p><a href={`/events/${eventId}/stations`} className="text-action">Station files ↗</a></section>}</Shell>;
}
