import {currentUser} from "@/lib/auth";
import {isSameOrigin} from "@/lib/policy";
import {InputError} from "@/lib/validation";
import {raceCommand} from "@/server/race";
import {jsonRequest,privateHeaders as headers} from "@/server/json-request";
export async function POST(request:Request,{params}:{params:Promise<{eventId:string}>}){
 if(!process.env.APP_ORIGIN||!isSameOrigin(request.headers.get("origin"),process.env.APP_ORIGIN))return Response.json({error:"Refresh this page and retry from the event website."},{status:403,headers});
 const user=await currentUser();if(!user)return Response.json({error:"Your session has ended. Sign in again."},{status:401,headers});
 try{return Response.json(await raceCommand(user.id,(await params).eventId,await jsonRequest(request)),{headers});}catch(error){if(error instanceof InputError)return Response.json({error:error.message},{status:error.status,headers});return Response.json({error:"Confirmation is uncertain. Retry this saved request to check whether it was recorded."},{status:503,headers});}
}
