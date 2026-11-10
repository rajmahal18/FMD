import {InputError} from './validation';
export type VotingRole='PARTICIPANT'|'FACILITATOR'|'ORGANIZER';
export type VotingCategory={id:'MALE'|'FEMALE';name:string;candidateIds:string[]};
export type SquadVotingGroup={id:string;name:string;candidateIds:string[]};
export type VotingConfig={congeniality?:boolean;metAgentsOnly?:boolean;squadAward?:boolean;squadGroups?:SquadVotingGroup[];voterMode:'PARTICIPANTS'|'ROLES'|'TEAMS'|'PEOPLE'|'SQUAD_HANDLERS';voterRoles:VotingRole[];voterTeamIds:string[];voterMembershipIds:string[];candidateIds:string[];maxChoices:number;allowSelf:boolean;allowSameTeam:boolean;categories?:VotingCategory[];resultCategories?:VotingCategory[]};
export type VotingPerson={id:string;name:string;avatarUrl?:string|null;role:VotingRole;teamId:string|null;teamName:string|null;active:boolean;sex?:string|null;metAgentIds?:string[];squadHandlerTeamId?:string|null;squadHandlerTeamName?:string|null};
export type VotingInput={name:string;instructions:string;opensAt:string;closesAt:string;config:VotingConfig};
export type VotingPoll={id:string;revision:number;name:string;instructions:string;opensAt:string;closesAt:string;enabled:boolean;publishedAt:string|null;config:VotingConfig|null;status:string;eligible:boolean;maxChoices:number;allowSelf:boolean;allowSameTeam:boolean;candidateIds:string[];metAgentsOnly?:boolean;categories?:VotingCategory[];resultCategories?:{id:'MALE'|'FEMALE';name:string}[];ownChoices:string[]|null;ballotCount:number|null;results:{id:string;name:string;votes:number;rank:number|null;category?:'MALE'|'FEMALE';squadId?:string;squadName?:string;winnerBasis?:'HANDLER_CHOICE';winner?:boolean}[]|null};
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
 if(!['PARTICIPANTS','ROLES','TEAMS','PEOPLE','SQUAD_HANDLERS'].includes(String(c.voterMode))||typeof c.allowSelf!=='boolean'||typeof c.allowSameTeam!=='boolean'||!Number.isInteger(c.maxChoices)||(c.maxChoices as number)<1||(c.maxChoices as number)>50)throw new InputError('Choose voter eligibility, voting rules and 1–50 choices per voter.');
 const candidateIds=ids(c.candidateIds),voterMembershipIds=ids(c.voterMembershipIds),voterTeamIds=ids(c.voterTeamIds),voterRoles=ids(c.voterRoles,3) as VotingRole[];
 if(candidateIds.length<2||(c.maxChoices as number)>candidateIds.length)throw new InputError('Choose at least two candidates; the choice limit cannot exceed the candidate count.');
 if(voterRoles.some(r=>!['PARTICIPANT','FACILITATOR','ORGANIZER'].includes(r))||c.voterMode==='ROLES'&&!voterRoles.length||c.voterMode==='TEAMS'&&!voterTeamIds.length||c.voterMode==='PEOPLE'&&!voterMembershipIds.length)throw new InputError('Select who may vote.');
 if(c.squadAward!==undefined&&typeof c.squadAward!=='boolean')throw new InputError('Choose a valid ballot format.');
 if(c.squadAward&&(c.categories!==undefined||c.maxChoices!==1||c.allowSelf!==false||c.allowSameTeam!==true||c.voterMode!=='PARTICIPANTS'))throw new InputError('Squad awards require one choice, no self-voting and automatic squad eligibility.');
 if(c.metAgentsOnly!==undefined&&typeof c.metAgentsOnly!=='boolean')throw new InputError('Choose a valid meeting ballot format.');
 if(c.metAgentsOnly&&(c.squadAward||!(c.categories&&c.maxChoices===2||c.resultCategories&&c.maxChoices===5)||c.allowSelf!==false||c.allowSameTeam!==true||c.voterMode!=='PARTICIPANTS'))throw new InputError('Agents I met voting requires a valid ballot, with no self-voting.');
 if(c.congeniality!==undefined&&typeof c.congeniality!=='boolean')throw new InputError('Choose a valid Congeniality format.');
 if(c.congeniality&&(c.metAgentsOnly||c.squadAward||!c.resultCategories||c.categories||c.maxChoices!==5||c.allowSelf!==false||c.allowSameTeam!==true||c.voterMode!=='PARTICIPANTS'))throw new InputError('Congeniality allows up to five distinct participants with no self-voting.');
 if(c.resultCategories&&(!(c.metAgentsOnly||c.congeniality)||c.categories||c.maxChoices!==5))throw new InputError('Five-vote Congeniality ballots use separate Male/Female result groups.');
 let categories:VotingCategory[]|undefined,resultCategories:VotingCategory[]|undefined;
 if(c.categories!==undefined||c.resultCategories!==undefined){
  if(!Array.isArray(c.categories??c.resultCategories)||((c.categories??c.resultCategories) as unknown[]).length!==2||(c.categories!==undefined?c.maxChoices!==2:c.maxChoices!==5))throw new InputError('Male & Female voting requires two categories and one choice in each.');
  const categoryInputs=(c.categories??c.resultCategories) as unknown[];
  categories=(['MALE','FEMALE'] as const).map(id=>{
   const category=categoryInputs.find((item:unknown)=>!!item&&typeof item==='object'&&(item as Record<string,unknown>).id===id) as Record<string,unknown>|undefined;
   if(!category)throw new InputError('Include both Male and Female categories.');
   const members=ids(category.candidateIds);if(!members.length)throw new InputError(`Select candidates for the ${id==='MALE'?'Male':'Female'} category.`);
   return {id,name:id==='MALE'?'Male':'Female',candidateIds:members};
  });
  const assigned=categories.flatMap(c=>c.candidateIds);
  if(new Set(assigned).size!==assigned.length||assigned.length!==candidateIds.length||assigned.some(id=>!candidateIds.includes(id)))throw new InputError('Assign every selected candidate to exactly one Male or Female category.');
  if(c.resultCategories!==undefined){resultCategories=categories;categories=undefined;}
 }
 return {name:v.name.trim(),instructions:v.instructions.trim(),opensAt:v.opensAt as string,closesAt:v.closesAt as string,config:{...(c.congeniality?{congeniality:true}:{}),...(c.metAgentsOnly?{metAgentsOnly:true}:{}),...(c.squadAward?{squadAward:true}:{}),voterMode:c.voterMode as VotingConfig['voterMode'],voterRoles,voterTeamIds,voterMembershipIds,candidateIds,maxChoices:c.maxChoices as number,allowSelf:c.allowSelf,allowSameTeam:c.allowSameTeam,...(categories?{categories}:{}),...(resultCategories?{resultCategories}:{})}};
}
export function eligibleVoter(c:VotingConfig,p:VotingPerson){return p.active&&(c.squadAward?!!votingTeam(p)&&(p.role==='PARTICIPANT'||p.role==='FACILITATOR'&&!!p.squadHandlerTeamId):c.voterMode==='SQUAD_HANDLERS'?p.role==='FACILITATOR'&&!!p.squadHandlerTeamId:c.voterMode==='PARTICIPANTS'?p.role==='PARTICIPANT':c.voterMode==='ROLES'?c.voterRoles.includes(p.role):c.voterMode==='TEAMS'?!!p.teamId&&c.voterTeamIds.includes(p.teamId):c.voterMembershipIds.includes(p.id));}
export function votingTeam(p:VotingPerson){return p.teamId??p.squadHandlerTeamId??null;}
export function eligibleCandidate(c:VotingConfig,voter:VotingPerson,candidate:VotingPerson){return candidate.active&&c.candidateIds.includes(candidate.id)&&(!c.congeniality||candidate.role==='PARTICIPANT')&&(!c.metAgentsOnly||candidate.role==='PARTICIPANT'&&!!voter.metAgentIds?.includes(candidate.id))&&(!c.squadAward||candidate.role==='PARTICIPANT'&&!!candidate.teamId&&candidate.teamId===votingTeam(voter)&&(!c.squadGroups||c.squadGroups.some(g=>g.id===candidate.teamId&&g.candidateIds.includes(candidate.id))))&&(c.allowSelf||voter.id!==candidate.id)&&(c.allowSameTeam||!votingTeam(voter)||votingTeam(voter)!==votingTeam(candidate));}
export function completeCandidatePool(c:VotingConfig,voter:VotingPerson,people:VotingPerson[]){return (c.categories??[{candidateIds:c.candidateIds}]).every(group=>people.some(p=>group.candidateIds.includes(p.id)&&eligibleCandidate(c,voter,p)));}
export function profileVotingCategory(sex:string|null|undefined){const value=sex?.trim().toUpperCase();return value==='M'||value==='MALE'?'MALE':value==='F'||value==='FEMALE'?'FEMALE':null;}
export function votingStandings(c:VotingConfig,people:VotingPerson[],choices:{candidateMembershipId:string}[]):NonNullable<VotingPoll['results']>{
 return (c.squadAward&&c.squadGroups?c.squadGroups:c.resultCategories??c.categories??[{candidateIds:c.candidateIds}]).flatMap(group=>{
  const rows=group.candidateIds.map(id=>({id,name:people.find(p=>p.id===id)?.name??'Former event member',votes:choices.filter(v=>v.candidateMembershipId===id).length,rank:null as number|null,...('id' in group?(c.squadAward?{squadId:group.id,squadName:group.name}:{category:group.id as 'MALE'|'FEMALE'}):{})})).sort((a,b)=>b.votes-a.votes||a.name.localeCompare(b.name));
  for(let i=0;i<rows.length;i++)if(rows[i].votes>0)rows[i].rank=i>0&&rows[i-1].votes===rows[i].votes?rows[i-1].rank:i+1;return rows;
 });
}
export function votingStatus(p:{enabled:boolean;publishedAt:Date|string|null;opensAt:Date|string;closesAt:Date|string},event:{archivedAt:Date|null;state:string},now=new Date()){
 if(p.publishedAt)return 'Published';if(event.archivedAt)return 'Archived';if(event.state==='PAUSED')return 'Paused';if(!p.enabled)return 'Closed';if(now<new Date(p.opensAt))return 'Scheduled';if(now>=new Date(p.closesAt))return 'Ended';return 'Open';
}
export function validateBallot(value:unknown,c:VotingConfig,voter:VotingPerson,people:VotingPerson[]){
 const choices=ids(value,50);if(!eligibleVoter(c,voter))throw new InputError('You are not eligible to vote in this event.',403);
 if(!choices.length||choices.length>c.maxChoices)throw new InputError(`Select 1 to ${c.maxChoices} candidates.`);
 if(c.categories&&(choices.length!==2||c.categories.some(group=>choices.filter(id=>group.candidateIds.includes(id)).length!==1)))throw new InputError('Choose exactly one Male and one Female candidate before submitting.');
 if(choices.some(id=>!people.some(p=>p.id===id&&eligibleCandidate(c,voter,p))))throw new InputError('One or more selected candidates are not eligible. Refresh the candidate list.',409);
 return choices.sort();
}
