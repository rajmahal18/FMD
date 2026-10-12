import {contactHttp} from "@/server/contact-http";
export async function POST(request:Request,{params}:{params:Promise<{eventId:string}>}){return contactHttp(request,(await params).eventId,"preview");}
