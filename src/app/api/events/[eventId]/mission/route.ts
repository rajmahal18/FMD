import {currentUser} from "@/lib/auth";
import {readMission} from "@/server/mission";
import {InputError} from "@/lib/validation";
const headers={"Cache-Control":"private, no-store","Vary":"Cookie"};
export async function GET(_:Request,{params}:{params:Promise<{eventId:string}>}){
 const user=await currentUser();if(!user)return Response.json({error:"Sign in to view your mission."},{status:401,headers});
 try{return Response.json(await readMission(user.id,(await params).eventId),{headers});}catch(error){if(error instanceof InputError)return Response.json({error:error.message},{status:error.status,headers});return Response.json({error:"Unable to refresh. Keep your last confirmed update and retry."},{status:503,headers});}
}
