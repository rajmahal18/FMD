import {NextRequest,NextResponse} from "next/server";
import {randomBytes,randomInt} from "node:crypto";
import {db} from "@/lib/db";
import {tokenHash} from "@/lib/password";
import {isSameOrigin} from "@/lib/policy";
import {safeReturnPath} from "@/lib/race";
import {accountQrRoles,validPlayerCode,playerAccessPath} from "@/lib/player-access";
import {sessionCookie} from "@/lib/auth";
import nodemailer from "nodemailer";

export const runtime="nodejs";
const eligible={active:true,memberships:{some:{active:true,event:{archivedAt:null}}}};
const playerEligible={...eligible,memberships:{some:{active:true,event:{archivedAt:null},role:{in:accountQrRoles}}}};
function failure(error:string,status=400){return NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});}
async function budget(scope:string,limit:number,windowMs:number){
 const key=tokenHash(scope);const now=new Date();const expires=new Date(now.getTime()+windowMs);
 const rows=await db().$queryRaw<Array<{count:number}>>`INSERT INTO "LoginAttempt" ("key","count","expiresAt") VALUES (${key},1,${expires}) ON CONFLICT ("key") DO UPDATE SET "count"=CASE WHEN "LoginAttempt"."expiresAt" < ${now} THEN 1 ELSE "LoginAttempt"."count"+1 END, "expiresAt"=CASE WHEN "LoginAttempt"."expiresAt" < ${now} THEN EXCLUDED."expiresAt" ELSE "LoginAttempt"."expiresAt" END RETURNING "count"`;
 return rows[0].count<=limit;
}
export async function POST(request:NextRequest){
 if(!process.env.APP_ORIGIN||!isSameOrigin(request.headers.get("origin"),process.env.APP_ORIGIN))return failure("Forbidden",403);
 try {
  const body=await request.json();
  if(!body||typeof body!=="object")return failure("Invalid request.");
  if(body.operation==="send"){
   if(!process.env.GMAIL_USER||!process.env.GMAIL_APP_PASSWORD)return failure("Email sign-in is not configured yet. Use your password or contact the organizer.",503);
   const playerCode=body.playerCode;
   if(playerCode!==undefined&&!validPlayerCode(playerCode))return failure("Invalid account link.");
   const email=typeof body.email==="string"?body.email.trim().toLowerCase():"";
   if(!playerCode&&(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))return failure("Enter a valid email address.");
   const user=await db().user.findFirst({where:playerCode?{id:playerCode,...playerEligible}:{email,...eligible},select:{email:true}});
   const loginEmail=user?.email??email;
   const scope=loginEmail||`player:${playerCode}`;
   if(!await budget(`otp-send:${scope}`,5,900000)||!await budget(`otp-minute:${scope}`,1,60000))return failure("Please wait before requesting another code. Maximum 5 requests every 15 minutes.",429);
   const id=randomBytes(32).toString("base64url");const code=String(randomInt(0,1000000)).padStart(6,"0");
   const returnTo=playerCode?playerAccessPath(playerCode):safeReturnPath(body.returnTo)||"/workspace";
   if(user){
    await db().emailOtp.deleteMany({where:{OR:[{email:loginEmail},{expiresAt:{lt:new Date()}}]}});
    await db().emailOtp.create({data:{id,email:loginEmail,codeHash:tokenHash(`${id}:${code}`),playerCode:playerCode??null,returnTo,expiresAt:new Date(Date.now()+600000)}});
    try {
     const smtp=nodemailer.createTransport({
      host:"smtp.gmail.com",port:465,secure:true,
      auth:{user:process.env.GMAIL_USER,pass:process.env.GMAIL_APP_PASSWORD.replace(/\s/g,"")},
      connectionTimeout:5000,greetingTimeout:5000,socketTimeout:10000,
      disableFileAccess:true,disableUrlAccess:true,
     });
     const sent=await smtp.sendMail({
      from:{name:"Spy Chase",address:process.env.GMAIL_USER},to:loginEmail,
      subject:"Your Spy Chase sign-in code",
      text:`Your sign-in code is ${code}.\n\nIt expires in 10 minutes and can be used once. Do not share this code. If you did not request it, ignore this email.`,
     });
     if(!sent.accepted.length)throw new Error("Delivery failed");
    } catch {
     await db().emailOtp.deleteMany({where:{id}});
     return failure("Unable to send the email code right now. Please try again later or use your password.",503);
    }
   }
   return NextResponse.json({challenge:id},{headers:{"Cache-Control":"no-store"}});
  }
  if(body.operation!=="verify"||typeof body.challenge!=="string"||! /^[A-Za-z0-9_-]{43}$/.test(body.challenge)||typeof body.code!=="string"||! /^\d{6}$/.test(body.code))return failure("Enter the 6-digit email code.");
  const id=body.challenge;const codeHash=tokenHash(`${id}:${body.code}`);
  const token=randomBytes(32).toString("base64url");const expiresAt=new Date(Date.now()+43200000);
  const result=await db().$transaction(async tx=>{
   // This update locks the challenge until commit, serializing retries and double taps.
   const changed=await tx.emailOtp.updateMany({where:{id,expiresAt:{gt:new Date()},attempts:{lt:5}},data:{attempts:{increment:1}}});
   if(!changed.count)return null;
   const challenge=await tx.emailOtp.findUnique({where:{id}});
   if(!challenge||challenge.codeHash!==codeHash)return null;
   const user=await tx.user.findFirst({where:challenge.playerCode?{id:challenge.playerCode,email:challenge.email,...playerEligible}:{email:challenge.email,...eligible}});
   if(!user)return null;
   await tx.emailOtp.delete({where:{id}});
   await tx.session.create({data:{tokenHash:tokenHash(token),userId:user.id,expiresAt}});
   await tx.auditEntry.create({data:{actorId:user.id,action:"SIGN_IN_EMAIL_OTP"}});
   return {redirect:user.mustChangePassword?`/account/password?returnTo=${encodeURIComponent(challenge.returnTo)}`:challenge.returnTo};
  });
  if(!result)return failure("Code is invalid, expired, or has reached its attempt limit. Request a new code.");
  const response=NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
  response.cookies.set(sessionCookie,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",expires:expiresAt});
  return response;
 } catch {return failure("Unable to sign in right now. Please try again.",500);}
}
