import { NextRequest,NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { manage } from "@/server/management";
import { InputError } from "@/lib/validation";
import { isSameOrigin } from "@/lib/policy";
import { Prisma } from "@/generated/prisma/client";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 if(!process.env.APP_ORIGIN||!isSameOrigin(request.headers.get("origin"),process.env.APP_ORIGIN))return NextResponse.json({error:"This request came from another site. Refresh and try again."},{status:403});
 const user=await currentUser();if(!user)return NextResponse.json({error:"Your session expired. Sign in again."},{status:401});
 if(Number(request.headers.get("content-length")||0)>1200000)return NextResponse.json({error:"Upload is too large."},{status:413});
 try{const reader=request.body?.getReader();const chunks:Uint8Array<ArrayBuffer>[]=[];let size=0;
 if(reader){while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>1200000){await reader.cancel();return NextResponse.json({error:"Upload is too large."},{status:413});}chunks.push(new Uint8Array(part.value));}}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const form=await new Response(bytes,{headers:{"Content-Type":request.headers.get("content-type")||""}}).formData();
 const result=await manage(user.id,form);return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});}
 catch(error){if(error instanceof InputError)return NextResponse.json({error:error.message},{status:error.status});if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002")return NextResponse.json({error:"That name or assignment already exists. Review the current list."},{status:409});return NextResponse.json({error:"Unable to save right now. Your input is preserved; try again."},{status:500});}
}
