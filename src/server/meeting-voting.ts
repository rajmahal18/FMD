import 'server-only';
import type {Prisma} from '@/generated/prisma/client';
export function meetingVotingEvent(tx:Prisma.TransactionClient,eventId:string){return tx.votingEvent.findFirst({where:{eventId,OR:[{config:{path:['metAgentsOnly'],equals:true}},{config:{path:['congeniality'],equals:true}}]},select:{id:true,name:true}});}
export async function meetingConnections(tx:Prisma.TransactionClient,eventId:string){
 const pairs=await tx.contactRecord.findMany({where:{eventId,mode:'INTERACTION',state:'ACCEPTED'},select:{requesterMembershipId:true,recipientMembershipId:true}});
 const links=new Map<string,string[]>();for(const p of pairs){links.set(p.requesterMembershipId,[...(links.get(p.requesterMembershipId)??[]),p.recipientMembershipId]);links.set(p.recipientMembershipId,[...(links.get(p.recipientMembershipId)??[]),p.requesterMembershipId]);}return links;
}
