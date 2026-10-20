import {InputError} from './validation';
export type VotingRole='PARTICIPANT'|'FACILITATOR'|'ORGANIZER';
export type VotingConfig={voterMode:'PARTICIPANTS'|'ROLES'|'TEAMS'|'PEOPLE';voterRoles:VotingRole[];voterTeamIds:string[];voterMembershipIds:string[];candidateIds:string[];maxChoices:number;allowSelf:boolean;allowSameTeam:boolean};
export type VotingPerson={id:string;name:string;role:VotingRole;teamId:string|null;teamName:string|null;active:boolean};
export type VotingInput={name:string;instructions:string;opensAt:string;closesAt:string;config:VotingConfig};
export type VotingPoll={id:string;revision:number;name:string;instructions:string;opensAt:string;closesAt:string;enabled:boolean;publishedAt:string|null;config:VotingConfig|null;status:string;eligible:boolean;maxChoices:number;allowSelf:boolean;allowSameTeam:boolean;candidateIds:string[];ownChoices:string[]|null;ballotCount:number|null;results:{id:string;name:string;votes:number;rank:number|null}[]|null};
export type VotingData={eventId:string;actorId:string;membershipId:string;organizer:boolean;timezone:string;archived:boolean;eventState:string;people:VotingPerson[];teams:{id:string;name:string}[];polls:VotingPoll[];checkedAt:string};
function ids(value:unknown,max=1000):string[]{if(!Array.isArray(value)||value.length>max||value.some(v=>typeof v!=='string'||!v||v.length>120)||new Set(value).size!==value.length)throw new InputError('Choose distinct people or teams from this event.');return value;}
export function parseVotingInput(value:unknown):VotingInput{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new InputError('Complete the voting configuration.');
 const v=value as Record<string,unknown>,c=v.config as Record<string,unknown>|undefined;
 if(typeof v.name!=='string'||!v.name.trim()||v.name.trim().length>120||typeof v.instructions!=='string'||v.instructions.length>1200||!c||typeof c!=='object'||Array.isArray(c))throw new InputError('Enter a voting name and instructions of up to 1,200 characters.');
 for(const k of ['opensAt','closesAt']){
  const d=v[k];if(typeof d!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(d)||!Number.isFinite(Date.parse(d))||new Date(d).toISOString()!==(d.includes('.')?d:d.replace('Z','.000Z')))throw new InputError('Choose valid opening and closing times.');
 }
 if(Date.parse(v.closesAt as string)<=Date.parse(v.opensAt as string))throw new InputError('Closing time must be after opening time.');
 if(!['PARTICIPANTS','ROLES','TEAMS','PEOPLE'].includes(String(c.voterMode))||typeof c.allowSelf!=='boolean'||typeof c.allowSameTeam!=='boolean'||!Number.isInteger(c.maxChoices)||(c.maxChoices as number)<1||(c.maxChoices as number)>50)throw new InputError('Choose voter eligibility, voting rules and 1–50 choices per voter.');
 const candidateIds=ids(c.candidateIds),voterMembershipIds=ids(c.voterMembershipIds),voterTeamIds=ids(c.voterTeamIds),voterRoles=ids(c.voterRoles,3) as VotingRole[];
 if(candidateIds.length<2||(c.maxChoices as number)>candidateIds.length)throw new InputError('Choose at least two candidates; the choice limit cannot exceed the candidate count.');
 if(voterRoles.some(r=>!['PARTICIPANT','FACILITATOR','ORGANIZER'].includes(r))||c.voterMode==='ROLES'&&!voterRoles.length||c.voterMode==='TEAMS'&&!voterTeamIds.length||c.voterMode==='PEOPLE'&&!voterMembershipIds.length)throw new InputError('Select who may vote.');
 return {name:v.name.trim(),instructions:v.instructions.trim(),opensAt:v.opensAt as string,closesAt:v.closesAt as string,config:{voterMode:c.voterMode as VotingConfig['voterMode'],voterRoles,voterTeamIds,voterMembershipIds,candidateIds,maxChoices:c.maxChoices as number,allowSelf:c.allowSelf,allowSameTeam:c.allowSameTeam}};
}
export function eligibleVoter(c:VotingConfig,p:VotingPerson){return p.active&&(c.voterMode==='PARTICIPANTS'?p.role==='PARTICIPANT':c.voterMode==='ROLES'?c.voterRoles.includes(p.role):c.voterMode==='TEAMS'?!!p.teamId&&c.voterTeamIds.includes(p.teamId):c.voterMembershipIds.includes(p.id));}
export function eligibleCandidate(c:VotingConfig,voter:VotingPerson,candidate:VotingPerson){return candidate.active&&c.candidateIds.includes(candidate.id)&&(c.allowSelf||voter.id!==candidate.id)&&(c.allowSameTeam||!voter.teamId||voter.teamId!==candidate.teamId);}
export function votingStatus(p:{enabled:boolean;publishedAt:Date|string|null;opensAt:Date|string;closesAt:Date|string},event:{archivedAt:Date|null;state:string},now=new Date()){
 if(p.publishedAt)return 'Published';if(event.archivedAt)return 'Archived';if(event.state==='PAUSED')return 'Paused';if(!p.enabled)return 'Closed';if(now<new Date(p.opensAt))return 'Scheduled';if(now>=new Date(p.closesAt))return 'Ended';return 'Open';
}
export function validateBallot(value:unknown,c:VotingConfig,voter:VotingPerson,people:VotingPerson[]){
 const choices=ids(value,50);if(!eligibleVoter(c,voter))throw new InputError('You are not eligible to vote in this event.',403);
 if(!choices.length||choices.length>c.maxChoices)throw new InputError(`Select 1 to ${c.maxChoices} candidates.`);
 if(choices.some(id=>!people.some(p=>p.id===id&&eligibleCandidate(c,voter,p))))throw new InputError('One or more selected candidates are not eligible. Refresh the candidate list.',409);
 return choices.sort();
}
