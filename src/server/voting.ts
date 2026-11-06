import {meetingConnections,meetingVotingEvent} from './meeting-voting';
import {passwordSetupRequired} from './password-setup';
import {snapshotShared} from './result-sharing-policy';
import {avatarUrl} from "@/lib/avatar";
import 'server-only';
import {db} from '@/lib/db';
import {InputError} from '@/lib/validation';
import {tokenHash} from '@/lib/password';
import {completeCandidatePool,profileVotingCategory,votingStandings,eligibleCandidate,eligibleVoter,parseVotingInput,validateBallot,votingStatus,type VotingConfig,type VotingData,type VotingPerson,type VotingPoll} from '@/lib/voting';
import type {Prisma} from '@/generated/prisma/client';
type Tx=Prisma.TransactionClient;
async function scope(tx:Tx,actorId:string,eventId:string){
 const m=await tx.eventMembership.findUnique({where:{eventId_userId:{eventId,userId:actorId}},include:{user:{select:{active:true,mustChangePassword:true}},event:true}});
 if(!m?.active||!m.user.active||(await passwordSetupRequired(tx,actorId,eventId,m.user.mustChangePassword)))throw new InputError('Active event membership is required.',403);return m;
}
async function roster(tx:Tx,eventId:string):Promise<VotingPerson[]>{
 const people=await tx.eventMembership.findMany({where:{eventId},select:{id:true,role:true,teamId:true,active:true,user:{select:{name:true,avatarKey:true,active:true,sex:true}},team:{select:{name:true}},handledSquad:{select:{teamId:true,team:{select:{name:true}}}}},orderBy:{user:{name:'asc'}}});
 const connections=await meetingConnections(tx,eventId);
 return people.map(p=>({metAgentIds:connections.get(p.id)??[],id:p.id,name:p.user.name,sex:p.user.sex,avatarUrl:avatarUrl(p.user.avatarKey),role:p.role,squadHandlerTeamId:p.active&&p.user.active&&p.role==='FACILITATOR'?p.handledSquad?.teamId??null:null,squadHandlerTeamName:p.active&&p.user.active&&p.role==='FACILITATOR'?p.handledSquad?.team.name??null:null,teamId:p.teamId,teamName:p.team?.name??null,active:p.active&&p.user.active}));
}
export async function readVoting(actorId:string,eventId:string):Promise<VotingData>{return db().$transaction(async tx=>{
 const m=await scope(tx,actorId,eventId),organizer=m.role==='ORGANIZER',people=await roster(tx,eventId),voter=people.find(p=>p.id===m.id)!;
 const polls=await tx.votingEvent.findMany({where:{eventId},include:{ballots:{include:{choices:true}}},orderBy:{createdAt:'desc'}});
 const visiblePeople=new Set<string>();
 const rows=await Promise.all(polls.map(async p=>{
  const shared=!!p.publishedAt&&(organizer||await snapshotShared(tx,eventId,'voting:'+p.id,p.revision,m.role));
  const c=p.config as VotingConfig,own=p.ballots.find(b=>b.voterMembershipId===m.id),candidates=people.filter(person=>eligibleCandidate(c,voter,person));
  for(const person of candidates)visiblePeople.add(person.id);for(const choice of own?.choices??[])visiblePeople.add(choice.candidateMembershipId);
  return {id:p.id,revision:p.revision,name:p.name,instructions:p.instructions,opensAt:p.opensAt.toISOString(),closesAt:p.closesAt.toISOString(),enabled:p.enabled,publishedAt:shared?p.publishedAt!.toISOString():null,config:organizer?c:null,status:!organizer&&p.publishedAt&&!shared?'Closed':votingStatus(p,m.event),eligible:eligibleVoter(c,voter),maxChoices:c.maxChoices,allowSelf:c.allowSelf,allowSameTeam:c.allowSameTeam,candidateIds:candidates.map(a=>a.id),...(c.metAgentsOnly?{metAgentsOnly:true}:{}),...(c.categories?{categories:c.categories.map(group=>({...group,candidateIds:group.candidateIds.filter(id=>candidates.some(p=>p.id===id)||own?.choices.some(choice=>choice.candidateMembershipId===id))}))}:{}),ownChoices:own?own.choices.map(v=>v.candidateMembershipId):null,ballotCount:organizer||shared?p.ballots.length:null,results:shared?p.publishedResults as VotingPoll['results']:organizer?votingStandings(c,people,p.ballots.flatMap(b=>b.choices)):null};
 }));
 return {eventId,actorId,membershipId:m.id,organizer,timezone:m.event.timezone,archived:!!m.event.archivedAt,eventState:m.event.state,people:organizer?people.map(({metAgentIds,...person})=>person):people.filter(p=>visiblePeople.has(p.id)).map(({sex,metAgentIds,...person})=>person),teams:organizer?await tx.team.findMany({where:{eventId},select:{id:true,name:true},orderBy:{name:'asc'}}):[],polls:rows,checkedAt:new Date().toISOString()};
 },{isolationLevel:'RepeatableRead',timeout:20000});}
export async function votingAction(actorId:string,eventId:string,value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new InputError('Choose a voting action.');
 const v=value as Record<string,unknown>;
 if(typeof v.requestKey!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.requestKey)||!['create','update','setEnabled','publish','cast'].includes(String(v.operation)))throw new InputError('Refresh and retry the voting action.');
 const operation=String(v.operation),requestKey=v.requestKey,requestHash=tokenHash(JSON.stringify({eventId,...v}));
 return db().$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "User" WHERE id=${actorId} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "Event" WHERE id=${eventId} FOR UPDATE`;
  const m=await scope(tx,actorId,eventId);
  if(operation!=='cast'&&m.role!=='ORGANIZER')throw new InputError('Organizer access is required.',403);
  const old=await tx.managementReceipt.findUnique({where:{actorId_requestKey:{actorId,requestKey}}});
  if(old){if(old.operation!==`voting:${operation}`||old.requestHash!==requestHash)throw new InputError('This request key was used with different details.',409);return {...old.responseJson as {message:string;id:string},replayed:true};}
  if(m.event.archivedAt)throw new InputError('This event is archived and read-only.',409);
  const people=await roster(tx,eventId),now=new Date();let id=typeof v.id==='string'?v.id:'',message='';let details:Prisma.InputJsonValue={};
  const p=id?await tx.votingEvent.findFirst({where:{id,eventId},include:{ballots:{include:{choices:true}}}}):null;
  if(operation!=='create'&&!p)throw new InputError('Voting event not found.',404);
  if(operation==='create'||operation==='update'){
   const input=parseVotingInput(v.input),c=input.config;
   if(c.metAgentsOnly){
    const existing=await meetingVotingEvent(tx,eventId);if(existing&&existing.id!==p?.id)throw new InputError('An Agents I met ballot already exists. Edit that event instead.',409);
    const policy=await tx.contactPolicy.findUnique({where:{eventId}});if(!policy||policy.mode!=='INTERACTION')throw new InputError('Configure an Interaction contact policy and QR collection window first.',409);
    if(await tx.contactRecord.count({where:{eventId,state:'PENDING'}}))throw new InputError('Resolve existing pending contact requests before enabling scan-then-vote.',409);
    const participants=people.filter(person=>person.active&&person.role==='PARTICIPANT');
    if(participants.some(person=>!profileVotingCategory(person.sex)))throw new InputError('Set the Male/Female profile for every active participant before creating this ballot.');
    c.categories=(['MALE','FEMALE'] as const).map(category=>({id:category,name:category==='MALE'?'Male':'Female',candidateIds:participants.filter(person=>profileVotingCategory(person.sex)===category).map(person=>person.id)}));
    if(c.categories.some(group=>group.candidateIds.length<2))throw new InputError('At least two Male and two Female participants are needed for voting without self-votes.');
    c.candidateIds=c.categories.flatMap(group=>group.candidateIds);
    await tx.contactPolicy.update({where:{eventId},data:{mutualConfirmation:false,visibility:'SELF',revision:{increment:1}}});
   }
   if((p?.config as VotingConfig|null)?.metAgentsOnly&&!c.metAgentsOnly)throw new InputError('Keep the Agents I met format to preserve this event workflow.',409);
   if(c.squadAward){
    const squads=await tx.team.findMany({where:{eventId},select:{id:true,name:true},orderBy:{name:'asc'}});
    c.squadGroups=squads.map(t=>({...t,candidateIds:people.filter(person=>person.active&&person.role==='PARTICIPANT'&&person.teamId===t.id).map(person=>person.id)}));
    if(!c.squadGroups.length||c.squadGroups.some(g=>g.candidateIds.length<2))throw new InputError('Each squad needs at least two active participants for voting without self-votes.');
    c.candidateIds=c.squadGroups.flatMap(g=>g.candidateIds);
   }
   if(p&&(p.ballots.length||p.publishedAt||p.enabled))throw new InputError('Close voting before editing. Rules are locked after the first ballot.',409);
   if(p&&v.revision!==p.revision)throw new InputError('The voting configuration changed. Refresh before editing.',409);
   if(new Date(input.closesAt)<=now)throw new InputError('Choose a voting window that has not ended.');
   for(const memberId of [...c.candidateIds,...c.voterMembershipIds])if(!people.some(person=>person.id===memberId&&person.active))throw new InputError('Choose active people from this event.');
   const teams=await tx.team.findMany({where:{eventId},select:{id:true}});if(c.voterTeamIds.some(teamId=>!teams.some(t=>t.id===teamId)))throw new InputError('Choose teams from this event.');
   const voters=people.filter(person=>eligibleVoter(c,person));if(!voters.length)throw new InputError('The selected voter rules match no active members.');
   if(!c.metAgentsOnly&&voters.some(voter=>!completeCandidatePool(c,voter,people)))throw new InputError('Some eligible voters have no eligible candidate in a required category. Review self-voting, same-team voting and candidate assignments.');
   const data={name:input.name,instructions:input.instructions,config:c as unknown as Prisma.InputJsonValue,opensAt:new Date(input.opensAt),closesAt:new Date(input.closesAt)};
   const saved=p?await tx.votingEvent.update({where:{id:p.id},data:{...data,revision:{increment:1}}}):await tx.votingEvent.create({data:{eventId,...data}});id=saved.id;if(c.metAgentsOnly)await tx.auditEntry.create({data:{eventId,actorId,action:'CONTACT_MEETING_VOTING_CONFIGURED',targetId:id,detailsJson:{summary:'Mutual Agents I met; private lists; no recipient acceptance; scans are not award votes. Existing QR window, limits and enabled setting preserved.'}}});message=p?'Voting configuration saved.':'Voting event created. Enable it in Live operations when ready.';details={summary:message,before:p?{name:p.name,config:p.config,opensAt:p.opensAt.toISOString(),closesAt:p.closesAt.toISOString()}:null,after:JSON.parse(JSON.stringify(data))};
  }else if(operation==='cast'){
   const c=p!.config as VotingConfig,voter=people.find(person=>person.id===m.id)!;
   const choices=validateBallot(v.choices,c,voter,people),previous=p!.ballots.find(b=>b.voterMembershipId===m.id);
   if(previous){if(JSON.stringify(previous.choices.map(c=>c.candidateMembershipId).sort())!==JSON.stringify(choices))throw new InputError('Your final ballot has already been recorded. Votes cannot be changed.',409);message='Your ballot was already recorded.';}
   else{
    if(votingStatus(p!,m.event,now)!=='Open')throw new InputError('Voting is not open. Refresh to check the schedule.',409);
    const ballot=await tx.votingBallot.create({data:{eventId,votingEventId:p!.id,voterMembershipId:m.id}});
    await tx.votingChoice.createMany({data:choices.map(candidateMembershipId=>({eventId,ballotId:ballot.id,candidateMembershipId}))});message='Your final ballot has been recorded.';
   }
   details={summary:`Ballot recorded for ${p!.name}`,choices:choices.length};
  }else{
   if(v.revision!==p!.revision)throw new InputError('The voting state changed. Refresh before continuing.',409);
   if(p!.publishedAt)throw new InputError('Published voting results are locked.',409);
   if(operation==='setEnabled'){
    if(typeof v.enabled!=='boolean')throw new InputError('Choose whether voting is enabled.');
    if(v.enabled&&new Date(p!.closesAt)<=now)throw new InputError('This voting window has ended.',409);
    if(v.enabled){const c=p!.config as VotingConfig;const voters=people.filter(person=>eligibleVoter(c,person));if(!voters.length||!c.metAgentsOnly&&voters.some(voter=>!completeCandidatePool(c,voter,people)))throw new InputError('Review voter and candidate eligibility before enabling voting.',409);}
    await tx.votingEvent.update({where:{id},data:{enabled:v.enabled,revision:{increment:1}}});message=v.enabled?'Voting enabled within its scheduled window.':'Voting closed. Recorded ballots are preserved.';
   }else{
    if(p!.enabled&&now<p!.closesAt)throw new InputError('Close voting or wait until its window ends before publishing.',409);
    const results=votingStandings(p!.config as VotingConfig,people,p!.ballots.flatMap(b=>b.choices));
    await tx.votingEvent.update({where:{id},data:{enabled:false,publishedAt:now,publishedResults:results,revision:{increment:1}}});message='Voting results approved. Share them from Results when ready.';
   }
   details={summary:message,name:p!.name};
  }
  await tx.auditEntry.create({data:{eventId,actorId,action:`VOTING_${operation.toUpperCase()}`,targetId:id,detailsJson:details}});
  const result={id,message};await tx.managementReceipt.create({data:{actorId,requestKey,operation:`voting:${operation}`,requestHash,responseJson:result}});return result;
 },{timeout:20000,maxWait:15000});
}
