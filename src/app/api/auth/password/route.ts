import {safeReturnPath} from "@/lib/race";
import { NextRequest,NextResponse } from "next/server";
import { currentUser,sessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { isSameOrigin } from "@/lib/policy";
import { verifyPassword,hashPassword,validPassword,tokenHash } from "@/lib/password";
export async function POST(request:NextRequest){
 const origin=process.env.APP_ORIGIN;if(!origin||!isSameOrigin(request.headers.get("origin"),origin))return new NextResponse("Forbidden",{status:403});const user=await currentUser();if(!user)return new NextResponse("Unauthorized",{status:401});
 const form=await request.formData();const old=String(form.get("currentPassword")||"");const value=String(form.get("newPassword")||"");const confirmation=String(form.get("confirmation")||"");const returnTo=safeReturnPath(form.get("returnTo"));const fail=(code:string)=>{const url=new URL(`/account/password?error=${code}`,origin);if(returnTo)url.searchParams.set("returnTo",returnTo);return NextResponse.redirect(url,303);};
 if(old.length>128||!validPassword(value)||value!==confirmation||old===value)return fail("invalid");
 const key=tokenHash(`password-change:${user.id}`);const now=new Date();const expires=new Date(now.getTime()+15*60*1000);
 const budget=await db().$queryRaw<Array<{count:number}>>`INSERT INTO "LoginAttempt" ("key","count","expiresAt") VALUES (${key},1,${expires}) ON CONFLICT ("key") DO UPDATE SET "count"=CASE WHEN "LoginAttempt"."expiresAt" < ${now} THEN 1 ELSE "LoginAttempt"."count"+1 END,"expiresAt"=CASE WHEN "LoginAttempt"."expiresAt" < ${now} THEN EXCLUDED."expiresAt" ELSE "LoginAttempt"."expiresAt" END RETURNING "count"`;
 if(budget[0].count>10)return fail("rate");if(!await verifyPassword(old,user.passwordHash))return fail("current");
 const passwordHash=await hashPassword(value);
 const updated=await db().$transaction(async tx=>{const changed=await tx.user.updateMany({where:{id:user.id,active:true,passwordHash:user.passwordHash},data:{passwordHash,mustChangePassword:false}});if(changed.count!==1)return false;await tx.session.deleteMany({where:{userId:user.id}});await tx.auditEntry.create({data:{actorId:user.id,targetUserId:user.id,action:"PASSWORD_CHANGED"}});return true;});
 if(!updated)return fail("current");const response=NextResponse.redirect(new URL(`/login?changed=1${returnTo?`&returnTo=${encodeURIComponent(returnTo)}`:""}`,origin),303);response.cookies.set(sessionCookie,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:0});return response;
}
