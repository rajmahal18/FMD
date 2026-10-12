import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const globalDb=globalThis as unknown as {db?:PrismaClient};
export function db(){
 if(!process.env.DATABASE_URL) throw new Error("Database is not configured. Follow README.md.");
 return globalDb.db ??= new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL,max:process.env.DB_POOL_SIZE === "1" ? 1 : 5})});
}
