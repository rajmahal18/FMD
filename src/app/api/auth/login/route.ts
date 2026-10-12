import {safeReturnPath} from "@/lib/race";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { hashPassword,verifyPassword,tokenHash } from "@/lib/password";
import { isSameOrigin } from "@/lib/policy";
import { sessionCookie } from "@/lib/auth";
export const runtime="nodejs";
const dummy=hashPassword(randomBytes(32).toString("hex"));
export async function POST(request:NextRequest){
 const expected=process.env.APP_ORIGIN;
 if(!expected||!isSameOrigin(request.headers.get("origin"),expected))return new NextResponse("Forbidden",{status:403});
 const form=await request.formData();const email=String(form.get("email")||"").trim().toLowerCase();const password=String(form.get("password")||"");
 const returnTo=safeReturnPath(form.get("returnTo"));const fail=(code:string)=>{const url=new URL(`/login?error=${code}`,expected);if(returnTo)url.searchParams.set("returnTo",returnTo);return NextResponse.redirect(url,303);};
 if(email.length>254||!email.includes("@")||password.length>128||!password)return fail("credentials");
 const key=tokenHash(`login:${email}`);const now=new Date();const expires=new Date(now.getTime()+15*60*1000);
 // Atomic fixed-window budget. Email-scoped limit works across server instances.
 const budget=await db().$queryRaw<Array<{count:number}>>`INSERT INTO "LoginAttempt" ("key","count","expiresAt") VALUES (${key},1,${expires}) ON CONFLICT ("key") DO UPDATE SET "count"=CASE WHEN "LoginAttempt"."expiresAt" < ${now} THEN 1 ELSE "LoginAttempt"."count"+1 END, "expiresAt"=CASE WHEN "LoginAttempt"."expiresAt" < ${now} THEN EXCLUDED."expiresAt" ELSE "LoginAttempt"."expiresAt" END RETURNING "count"`;
 if(budget[0].count>10)return fail("rate");
 const user=await db().user.findUnique({where:{email}});const ok=await verifyPassword(password,user?.passwordHash??await dummy);
 if(!user?.active||!ok)return fail("credentials");
 const token=randomBytes(32).toString("base64url");const expiresAt=new Date(Date.now()+12*60*60*1000);
 await db().$transaction([db().session.create({data:{tokenHash:tokenHash(token),userId:user.id,expiresAt}}),db().auditEntry.create({data:{actorId:user.id,action:"SIGN_IN"}})]);
 const response=NextResponse.redirect(new URL(user.mustChangePassword?`/account/password${returnTo?`?returnTo=${encodeURIComponent(returnTo)}`:""}`:returnTo||"/workspace",expected),303);
 response.cookies.set(sessionCookie,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",expires:expiresAt});return response;
}
