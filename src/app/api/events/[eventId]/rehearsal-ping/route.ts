import {NextResponse} from "next/server";
import {requireOrganizer} from "@/lib/organizer";
export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{eventId:string}>}){const {eventId}=await params;const {m}=await requireOrganizer(eventId);return NextResponse.json({ok:true,serverTime:new Date().toISOString(),eventState:m.event.state},{headers:{"Cache-Control":"no-store, max-age=0"}});}
