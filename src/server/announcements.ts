import 'server-only';
import type {Prisma} from '@/generated/prisma/client';
export async function activeAnnouncements(tx:Prisma.TransactionClient,eventId:string){return (await tx.announcement.findMany({where:{eventId,withdrawnAt:null},select:{id:true,title:true,message:true,createdAt:true},orderBy:[{createdAt:'desc'},{id:'desc'}],take:10})).map(a=>({...a,createdAt:a.createdAt.toISOString()}));}
