import {currentUser} from '@/lib/auth';
import {isSameOrigin} from '@/lib/policy';
import {InputError} from '@/lib/validation';
import {privateHeaders} from '@/server/json-request';
import {downloadInboxFile,removeInboxFile} from '@/server/inbox-files';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{eventId:string;attachmentId:string}>}){
 const headers={...privateHeaders,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'"};
 const user=await currentUser();if(!user)return Response.json({error:'Sign in again.'},{status:401,headers});
 try{
  const {eventId,attachmentId}=await params,file=await downloadInboxFile(user.id,eventId,attachmentId);
  const name=encodeURIComponent(file.name).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16));
  return new Response(new Uint8Array(file.content),{headers:{...headers,'Content-Type':file.mime,'Content-Length':String(file.size),'Content-Disposition':`attachment; filename="attachment"; filename*=UTF-8''${name}`}});
 }catch(e){return Response.json({error:e instanceof InputError?e.message:'Unable to download attachment.'},{status:e instanceof InputError?e.status:503,headers});}
}
export async function DELETE(request:Request,{params}:{params:Promise<{eventId:string;attachmentId:string}>}){
 const headers=privateHeaders;
 if(!process.env.APP_ORIGIN||!isSameOrigin(request.headers.get('origin'),process.env.APP_ORIGIN))return Response.json({error:'Use the event website to remove attachments.'},{status:403,headers});
 const user=await currentUser();if(!user)return Response.json({error:'Sign in again.'},{status:401,headers});
 try{const {eventId,attachmentId}=await params;return Response.json(await removeInboxFile(user.id,eventId,attachmentId),{headers});}catch(e){return Response.json({error:e instanceof InputError?e.message:'Unable to remove attachment.'},{status:e instanceof InputError?e.status:503,headers});}
}
