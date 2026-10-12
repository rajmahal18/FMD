import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword,validPassword } from "../src/lib/password";
import { emailAddress } from "../src/lib/validation";
const email=emailAddress(process.argv[2]||"");const name=(process.argv[3]||"").trim();const password=process.env.NEW_PASSWORD||"";
if(!name||name.length>100||!validPassword(password)||!process.env.DATABASE_URL)throw new Error("Supply email and name arguments, DATABASE_URL and NEW_PASSWORD (12–128 characters). No password argument.");
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
try{await db.$transaction(async tx=>{const existing=await tx.user.findUnique({where:{email}});if(existing)throw new Error("Account already exists. Use the grant command to enable event creation without changing its password.");const user=await tx.user.create({data:{email,name,passwordHash:await hashPassword(password),canCreateEvents:true,mustChangePassword:true}});await tx.auditEntry.create({data:{targetUserId:user.id,action:"OPERATOR_CREATED"}});});console.log("Event creator account created; first-login password change required.");}finally{await db.$disconnect();}
