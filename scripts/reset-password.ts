import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword,validPassword } from "../src/lib/password";
const email=process.argv[2]?.trim().toLowerCase();const password=process.env.NEW_PASSWORD||"";
if(!email||!validPassword(password)||!process.env.DATABASE_URL)throw new Error("Supply email argument, DATABASE_URL and NEW_PASSWORD (12–128 chars) through environment. Password must not be a command argument.");
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
try{const user=await db.user.findUniqueOrThrow({where:{email}});await db.$transaction([db.user.update({where:{id:user.id},data:{passwordHash:await hashPassword(password),mustChangePassword:true}}),db.session.deleteMany({where:{userId:user.id}}),db.auditEntry.create({data:{targetUserId:user.id,action:"PASSWORD_RESET_BY_OPERATOR"}})]);console.log("Password reset; all existing sessions revoked.");}finally{await db.$disconnect();}
