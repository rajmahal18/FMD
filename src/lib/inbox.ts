import {InputError} from './validation';
import type {InboxFile} from './inbox-files';
export type InboxItem={id:string;subject:string;body:string;senderName:string;recipientName:string;createdAt:string;response:string|null;respondedAt:string|null;attachments:InboxFile[];deliveries:{id:string;name:string;kind:string;status:string}[]};
export type InboxData={eventId:string;actorId:string;organizer:boolean;blocked:boolean;emailConfigured:boolean;people:{id:string;name:string;teamId:string|null;team:string|null}[];messages:InboxItem[]};
export function parseInboxAction(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new InputError('Choose an inbox action.');
 const v=value as Record<string,unknown>;
 if(typeof v.requestKey!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.requestKey))throw new InputError('Refresh and retry.');
 const id=typeof v.id==='string'&&v.id.length<=120?v.id:'';
 if(v.operation==='respond'&&id&&(v.response==='YES'||v.response==='NO'))return {operation:'respond' as const,requestKey:v.requestKey,id,response:v.response};
 if(v.operation==='retry'&&id)return {operation:'retry' as const,requestKey:v.requestKey,id};
 if(v.operation==='send'){
  const subject=typeof v.subject==='string'?v.subject.trim():'',body=typeof v.body==='string'?v.body.trim():'';
  const recipientIds=v.recipientIds??(typeof v.recipientId==='string'?[v.recipientId]:[]),attachmentIds=v.attachmentIds??[];
  if(!subject||subject.length>120||/[\r\n]/.test(subject)||!body||body.length>5000)throw new InputError('Enter a subject (up to 120 characters) and a message (up to 5,000 characters).');
  if(!Array.isArray(recipientIds)||!recipientIds.length||recipientIds.length>50||recipientIds.some(id=>typeof id!=='string'||!id||id.length>120)||new Set(recipientIds).size!==recipientIds.length)throw new InputError('Choose 1–50 distinct participants.');
  if(!Array.isArray(attachmentIds)||attachmentIds.length>5||attachmentIds.some(id=>typeof id!=='string'||!id||id.length>120)||new Set(attachmentIds).size!==attachmentIds.length)throw new InputError('Choose up to 5 distinct attachments.');
  return {operation:'send' as const,requestKey:v.requestKey,recipientIds:[...recipientIds].sort() as string[],attachmentIds:[...attachmentIds].sort() as string[],subject,body};
 }
 throw new InputError('Choose a valid inbox action.');
}
export function escapeEmail(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
export function offerEmail({eventName,subject,body,url,copy,response}:{eventName:string;subject:string;body:string;url:string;copy:boolean;response:string|null}){
 const title=response?`Offer response: ${response==='YES'?'Accepted':'Declined'}`:copy?'Organizer copy':subject;
 const buttons=!copy&&!response?`<p><a href="${escapeEmail(url+'&choice=YES')}" style="display:inline-block;padding:14px 24px;background:#72d5e3;color:#071426;text-decoration:none;margin-right:12px">Yes, accept</a><a href="${escapeEmail(url+'&choice=NO')}" style="display:inline-block;padding:14px 24px;background:#eaf4f5;color:#10243a;text-decoration:none">No, decline</a></p><p>Sign in and confirm your choice in your inbox.</p>`:'';
 return {subject:`${eventName}: ${title}`,text:`${eventName}\n${title}\n\n${subject}\n\n${body}\n\n${!copy&&!response?'Yes or No: open your inbox and confirm your choice.\n':''}${url}`,html:`<div style="font:16px/1.6 Arial,sans-serif;color:#10243a;max-width:600px"><p>${escapeEmail(eventName)}</p><h1 style="font-size:24px">${escapeEmail(title)}</h1>${copy||response?`<h2 style="font-size:18px">${escapeEmail(subject)}</h2>`:''}<p style="white-space:pre-wrap">${escapeEmail(body)}</p>${buttons}<p><a href="${escapeEmail(url)}">Open inbox</a></p></div>`};
}
