import {InputError} from './validation';
export const inboxFileLimit=3*1024*1024;
export const inboxTotalFileLimit=10*1024*1024;
export const inboxMaxFiles=5;
export const inboxFileAccept='.pdf,.docx,.pptx,.xlsx,.txt,.png,.jpg,.jpeg';
export type InboxFile={id:string;name:string;mime:string;size:number};
export function fileSize(size:number){return size<1024*1024?`${Math.max(1,Math.ceil(size/1024))} KB`:`${(size/1024/1024).toFixed(1)} MB`;}
export function inboxFileInfo(name:string,bytes:Uint8Array){
 if(!name||name.length>180||/[\x00-\x1f\x7f/\\]/.test(name)||name!==name.trim())throw new InputError('Use a file name without folders or control characters (up to 180 characters).');
 if(!bytes.length||bytes.length>inboxFileLimit)throw new InputError('Each attachment must be nonempty and no larger than 3 MB.');
 const ext=name.split('.').pop()?.toLowerCase(),starts=(values:number[])=>values.every((v,i)=>bytes[i]===v);
 let mime='';
 if(ext==='pdf'&&starts([37,80,68,70,45]))mime='application/pdf';
 if(ext==='png'&&starts([137,80,78,71,13,10,26,10]))mime='image/png';
 if((ext==='jpg'||ext==='jpeg')&&starts([255,216,255]))mime='image/jpeg';
 const office:Record<string,string>={docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
 if(ext&&office[ext]&&starts([80,75,3,4]))mime=office[ext];
 if(ext==='txt'){
  try{new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(!bytes.some(b=>b===0))mime='text/plain';}catch{}
 }
 if(!mime)throw new InputError('Use a PDF, DOCX, PPTX, XLSX, UTF-8 text, PNG or JPEG file with matching content.');
 return {name,mime,size:bytes.length};
}
