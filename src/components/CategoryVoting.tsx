'use client';
import {useEffect,useState} from 'react';
import {PersonName} from './Avatar';
import type {VotingPerson,VotingPoll} from '@/lib/voting';
export function CategoryChoices({poll,people,choices}:{poll:VotingPoll;people:VotingPerson[];choices:string[]}){
 return <dl className="category-choices">{poll.categories?.map(group=><div key={group.id}><dt>{group.name}</dt><dd>{choices.filter(id=>group.candidateIds.includes(id)).map(id=>people.find(p=>p.id===id)?.name??'Event member').join(', ')||'Not selected'}</dd></div>)}</dl>;
}
export function CategoryBallot({poll,people,disabled,onSubmit}:{poll:VotingPoll;people:VotingPerson[];disabled:boolean;onSubmit:(choices:string[])=>void}){
 const [choices,setChoices]=useState<string[]>([]),[review,setReview]=useState(false),[search,setSearch]=useState(''),[notice,setNotice]=useState('');
 const key=JSON.stringify(poll.categories);
 useEffect(()=>{const groups=JSON.parse(key) as NonNullable<VotingPoll['categories']>,available=groups.flatMap(g=>g.candidateIds);if(choices.some(id=>!available.includes(id))){setChoices(choices.filter(id=>available.includes(id)));setReview(false);setNotice('The candidate list changed. Review both choices again.');}},[key,choices]);
 const ready=poll.categories?.every(group=>choices.filter(id=>group.candidateIds.includes(id)).length===1);
 if(review&&ready)return <section className="voting-ballot-review"><h3>Review your ballot</h3><p>{poll.name}</p><CategoryChoices poll={poll} people={people} choices={choices}/><p>Both votes will be submitted together. Your ballot is final.</p><div className="voting-actions"><button disabled={disabled} onClick={()=>onSubmit(choices)}>Submit final ballot</button><button className="secondary" disabled={disabled} onClick={()=>setReview(false)}>Edit choices</button></div></section>;
 return <form className="voting-ballot category-ballot" onSubmit={e=>{e.preventDefault();if(ready)setReview(true);}}><fieldset disabled={disabled}><legend>Choose one Male and one Female candidate</legend>{notice&&<p className="notice" role="status">{notice}</p>}<label>Find a candidate<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name or team"/></label>
  {poll.categories?.map(group=>{
   const candidates=people.filter(p=>group.candidateIds.includes(p.id)),matching=candidates.filter(p=>(p.name+' '+(p.teamName??p.squadHandlerTeamName??'')).toLocaleLowerCase().includes(search.toLocaleLowerCase())),selected=people.find(p=>choices.includes(p.id)&&group.candidateIds.includes(p.id));
   return <section className={`voting-category voting-category-${group.id.toLowerCase()}`} key={group.id}><header><h3>{group.name}</h3><span className={selected?'category-selected':'category-needed'}>{selected?'Selected':'Choose one'}</span></header>{selected&&<p className="category-current">{selected.name}</p>}<div className="voting-candidates">{matching.map(p=><label className={`voting-candidate${choices.includes(p.id)?' selected':''}`} key={p.id}><input type="radio" name={`category-${poll.id}-${group.id}`} checked={choices.includes(p.id)} onChange={()=>setChoices(old=>[...old.filter(id=>!group.candidateIds.includes(id)),p.id])}/><span><strong><PersonName name={p.name} avatarUrl={p.avatarUrl}/></strong>{(p.teamName||p.squadHandlerTeamName)&&<small>{p.teamName??p.squadHandlerTeamName}</small>}</span></label>)}</div>{!candidates.length?<p className="notice">No eligible candidates. Ask the organizer to review this category.</p>:!matching.length&&<p>No matching candidates. <button type="button" className="secondary" onClick={()=>setSearch('')}>Clear search</button></p>}</section>;
  })}<p role="status">{choices.length} of 2 selected</p><button type="submit" disabled={!ready}>Review both votes</button></fieldset></form>;
}
export function VotingResults({poll}:{poll:VotingPoll}){
 if(!poll.results)return null;
 const squadResults=poll.results.some(r=>r.squadId);
 const groups=squadResults?[...new Map(poll.results.filter(r=>r.squadId).map(r=>[r.squadId!,{id:r.squadId!,name:r.squadName??'Squad'}])).values()]:poll.categories?.length?[{id:'MALE',name:'Male'},{id:'FEMALE',name:'Female'}]:[{id:'',name:''}];
 return <>{groups.map(group=><section className="voting-result-category" key={group.id}>{group.name&&<h3>{group.name}</h3>}<ol className="bounded-records" tabIndex={0} aria-label={group.name?`${group.name} voting results`:'Candidate voting results'}>{poll.results!.filter(r=>!group.id||(squadResults?r.squadId===group.id:r.category===group.id)).map(r=><li key={r.id}><span className="voting-rank">{r.rank===null?'—':`#${r.rank}`}</span><strong>{r.name}</strong><span>{r.votes} vote{r.votes===1?'':'s'}</span></li>)}</ol></section>)}</>;
}
