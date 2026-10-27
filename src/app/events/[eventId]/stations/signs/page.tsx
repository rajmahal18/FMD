import Link from "next/link";
import QRCode from "qrcode";
import {requireOrganizer} from "@/lib/organizer";
import {db} from "@/lib/db";
import {Shell} from "@/components/Shell";
import {PrintStationSign} from "@/components/PrintStationSign";

export default async function StationSigns({params}:{params:Promise<{eventId:string}>}){
 const {eventId}=await params;
 const {user,m}=await requireOrganizer(eventId);
 const stations=await db().station.findMany({where:{eventId},select:{id:true,name:true,location:true,arrivalCode:true},orderBy:{name:"asc"}});
 const missing=stations.filter(s=>!s.arrivalCode).length;
 const origin=process.env.APP_ORIGIN;
 const signs=origin?await Promise.all(stations.filter(s=>s.arrivalCode).map(async station=>{
  const link=new URL(`/events/${eventId}/check-in?code=${station.arrivalCode}`,origin).toString();
  const svg=await QRCode.toString(link,{type:"svg",errorCorrectionLevel:"M",margin:4,width:320,color:{dark:"#000000ff",light:"#ffffffff"}});
  return {...station,image:`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`};
 })):[];
 return <Shell name={user.name} title="All station signs" role="ORGANIZER" eventId={eventId}>
  <div className="print-controls"><Link href={`/events/${eventId}/stations`} className="text-action">Return to stations →</Link><p>Print all issued station signs together, one station per page.</p>{missing>0&&<p className="notice">{missing} stations still need arrival codes. Generate missing codes in Stations.</p>}{!origin&&<p className="notice">Set the event website address before printing station QR codes.</p>}</div>
  {signs.length>0?<><PrintStationSign label="Print all station signs"/><div className="station-signs">{signs.map(station=><section className="station-sign" key={station.id}>
   <div className="eyebrow">TEAM CHECK-IN</div><h2>{m.event.codename??m.event.name}</h2><h3>{station.name}</h3><p>{station.location}</p>
   <img src={station.image} width={320} height={320} alt={`Arrival QR for ${station.name}`}/>
   <p>Captain: scan this sign, sign in and confirm your team’s arrival.</p>
   <div className="sign-code"><span>MANUAL STATION CODE</span><strong>{station.arrivalCode!.slice(0,4)}-{station.arrivalCode!.slice(4)}</strong></div>
   <p>Arrival does not award points. Your facilitator confirms the physical challenge result.</p>
  </section>)}</div></>:<p>No printable station signs available.</p>}
 </Shell>;
}
