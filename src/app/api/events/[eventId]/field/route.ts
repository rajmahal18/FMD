import {currentUser} from "@/lib/auth";
import {InputError} from "@/lib/validation";
import {readField} from "@/server/field";
import {privateHeaders as headers} from "@/server/json-request";
export async function GET(request:Request,{params}:{params:Promise<{eventId:string}>}){const user=await currentUser();if(!user)return Response.json({error:"Sign in again to view the station."},{status:401,headers});try{const stationId=new URL(request.url).searchParams.get("stationId")??undefined;if(stationId&&stationId.length>120)throw new InputError("Invalid station.");return Response.json(await readField(user.id,(await params).eventId,stationId),{headers});}catch(error){if(error instanceof InputError)return Response.json({error:error.message},{status:error.status,headers});return Response.json({error:"Unable to refresh. Keep your last confirmed station view and retry."},{status:503,headers});}}
