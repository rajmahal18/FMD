import "server-only";
import {Prisma} from "@/generated/prisma/client";
export async function teamTotal(tx:Prisma.TransactionClient,eventId:string,teamId:string){return (await tx.scoreLedgerEntry.aggregate({where:{eventId,teamId},_sum:{amount:true}}))._sum.amount??0;}
