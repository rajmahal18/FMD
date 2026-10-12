import {currentUser} from "@/lib/auth";
import {isSameOrigin} from "@/lib/policy";
import {InputError} from "@/lib/validation";
import {previewArrival} from "@/server/race";
import {jsonRequest,privateHeaders as headers} from "@/server/json-request";
export async function POST(request:Request,{params}:{params:Promise<{eventId:string}>}){
 if(!process.env.APP_ORIGIN||!isSameOrigin(request.headers.get("origin"),process.env.APP_ORIGIN))return Response.json({error:"Refresh from the event website."},{status:403,headers});const user=await currentUser();if(!user)return Response.json({error:"Sign in again to check in."},{status:401,headers});
 try{const body=await jsonRequest(request) as {credential?:unknown};if(!body||typeof body.credential!=="string"||body.credential.length>1024)throw new InputError("Enter a valid station code.");return Response.json(await previewArrival(user.id,(await params).eventId,body.credential),{headers});}catch(error){if(error instanceof InputError)return Response.json({error:error.message},{status:error.status,headers});return Response.json({error:"Unable to verify this station. Keep the code and retry."},{status:503,headers});}
}
