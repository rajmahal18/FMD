import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { emailAddress } from "../src/lib/validation";
const email=emailAddress(process.argv[2]||"");if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL required");
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
try{await db.$transaction(async tx=>{const user=await tx.user.findUniqueOrThrow({where:{email}});if(!user.active)throw new Error("Account disabled");await tx.user.update({where:{id:user.id},data:{canCreateEvents:true}});await tx.auditEntry.create({data:{targetUserId:user.id,action:"EVENT_CREATION_GRANTED_BY_OPERATOR"}});});console.log("Event creation permission granted. Existing password preserved.");}finally{await db.$disconnect();}
