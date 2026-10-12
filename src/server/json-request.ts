import "server-only";
import {InputError} from "@/lib/validation";
export async function jsonRequest(request:Request){
 if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))throw new InputError("Send a JSON request.",415);
 const reader=request.body?.getReader();const chunks:Uint8Array[]=[];let size=0;if(reader)while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>16384){await reader.cancel();throw new InputError("Request is too large.",413);}chunks.push(part.value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 try{return JSON.parse(new TextDecoder().decode(bytes)) as unknown;}catch{throw new InputError("Unable to read this request. Refresh and retry.");}
}
export const privateHeaders={"Cache-Control":"private, no-store","Vary":"Cookie"};
