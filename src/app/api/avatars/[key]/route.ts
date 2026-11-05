import {currentUser} from '@/lib/auth';
import {db} from '@/lib/db';
import {privateHeaders} from '@/server/json-request';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{key:string}>}){
 const user=await currentUser();if(!user||(user.mustChangePassword&&!user.accountSwitch))return new Response(null,{status:401,headers:privateHeaders});
 const {key}=await params;if(!/^[0-9a-f-]{36}$/.test(key))return new Response(null,{status:404,headers:privateHeaders});
 const image=await db().userAvatar.findFirst({where:{key:`uploads/${key}.webp`,user:{active:true,memberships:{some:{active:true,...(user.accountSwitch?{eventId:user.accountSwitch.eventId}:{}),event:{memberships:{some:{userId:user.id,active:true}}}}}}},select:{content:true}});
 if(!image)return new Response(null,{status:404,headers:privateHeaders});
 return new Response(new Uint8Array(image.content),{headers:{...privateHeaders,'Content-Type':'image/webp','X-Content-Type-Options':'nosniff'}});
}
