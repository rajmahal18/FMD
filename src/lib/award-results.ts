import {InputError} from './validation';
import type {VotingConfig,VotingPoll} from './voting';

type Rows=NonNullable<VotingPoll['results']>;
/** Keep vote ranks intact: the handler's selection is a separate award decision. */
export function handlerAwardResults(config:VotingConfig,rows:Rows,handlers:{teamId:string;choices:string[]}[]):Rows{
 if(!config.squadAward||!config.squadGroups?.length)throw new InputError('Handler choices apply only to per-squad awards.');
 const winners=new Set<string>();
 for(const group of config.squadGroups){
  const assigned=handlers.filter(h=>h.teamId===group.id);
  if(assigned.length!==1||assigned[0].choices.length!==1||!group.candidateIds.includes(assigned[0].choices[0])||!rows.some(r=>r.id===assigned[0].choices[0]&&r.squadId===group.id))throw new InputError(`Record one valid assigned-handler choice for ${group.name} before publishing.`,409);
  winners.add(assigned[0].choices[0]);
 }
 return rows.map(row=>({...row,winnerBasis:'HANDLER_CHOICE',winner:winners.has(row.id)}));
}
export function isAwardWinner(row:Rows[number]){return row.winnerBasis==='HANDLER_CHOICE'?row.winner===true:row.rank===1;}
