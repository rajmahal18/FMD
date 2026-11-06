"use client";
import Link from 'next/link';
import {useRef,useState} from 'react';
import {SpyIcon} from './SpyIcon';
import {ActionStatus} from './ActionFeedback';
import {Ballot} from './VotingBallot';
import {CategoryBallot,CategoryChoices,VotingResults} from './CategoryVoting';
import type {VotingData,VotingPoll} from '@/lib/voting';
function status(p:VotingPoll){return p.ownChoices?'Submitted':p.publishedAt?'Results available':p.status==='Open'?'Vote now':p.status==='Scheduled'?'Not open yet':p.status==='Paused'?'Paused':p.status==='Ended'?'Voting ended':'Not open yet';}
function instructions(p:VotingPoll){return p.categories?'Choose one Male and one Female.':p.maxChoices===1?'Choose one person.':`Choose up to ${p.maxChoices} people.`;}
export function VotingDesk({data,busy,pending,error,notice,onSubmit,onRetry,onRefresh}:{data:VotingData;busy:boolean;pending:boolean;error:string;notice:string;onSubmit:(id:string,choices:string[])=>void;onRetry:()=>void;onRefresh:()=>void}){
 const polls=data.polls.filter(p=>p.eligible||p.ownChoices||p.results),[selected,setSelected]=useState<string|null>(polls.length===1?polls[0].id:null),headings=useRef(new Map<string,HTMLHeadingElement>());
 const active=polls.find(p=>p.id===selected),submitted=polls.filter(p=>p.ownChoices).length;
 function open(id:string){setSelected(id);requestAnimationFrame(()=>{const heading=headings.current.get(id);heading?.focus({preventScroll:true});heading?.scrollIntoView({block:'start',behavior:'smooth'});});}
 return <div className="voting-workspace voting-easy"><ActionStatus busy={busy} message={notice||'Vote recorded.'} error={error} title="Submitting your vote"/>
 {error&&<p role="alert" className="notice">{error}</p>}{pending&&!busy&&<section className="voting-pending" role="status"><h2>Check your last submission</h2><p>The response was interrupted. Check it before voting again.</p><button disabled={busy} onClick={onRetry}>Check submission</button></section>}
 {data.archived&&<p className="notice">Voting is closed. Your recorded votes are kept.</p>}
 <section className="award-menu" hidden={!!active}><div className="easy-voting-heading"><h2>Your awards</h2>{submitted>0&&<span className="tag">{submitted} of {polls.length} submitted</span>}</div><p>Choose an award to continue.</p>
 {!polls.length&&<div className="easy-voting-empty"><SpyIcon name="vote"/><h3>No voting assigned to you</h3><p>Your assigned awards will appear here. You do not need to submit anything now.</p></div>}
 <div className="award-options">{[...polls].sort((a,b)=>Number(b.status==='Open'&&!b.ownChoices)-Number(a.status==='Open'&&!a.ownChoices)).map(p=><button type="button" className={`award-option ${p.ownChoices?'award-done':p.status==='Open'?'award-ready':'award-waiting'}`} key={p.id} onClick={()=>open(p.id)}><SpyIcon name={p.ownChoices?'mission':p.publishedAt?'rank':'vote'}/><span className="award-option-copy"><strong>{p.name}</strong><small>{p.ownChoices?'Your vote is saved.':instructions(p)}</small></span><span className="award-status">{status(p)}</span></button>)}</div></section>
 {polls.map(p=><section className="easy-voting-panel" key={p.id} hidden={p.id!==active?.id}>
 <button className="secondary easy-awards-back" type="button" onClick={()=>setSelected(null)}>Back to all awards</button>
 <div className="voting-event-heading"><h2 tabIndex={-1} ref={el=>{if(el)headings.current.set(p.id,el);else headings.current.delete(p.id);}}>{p.name}</h2><span className={`tag ${p.ownChoices?'easy-submitted':p.status==='Open'?'voting-open':''}`}>{status(p)}</span></div>
 {p.ownChoices?<section className="voting-receipt" role="status"><SpyIcon name="mission"/><h3>Your ballot is recorded</h3><p>You are done with this award.</p>{p.categories?<CategoryChoices poll={p} people={data.people} choices={p.ownChoices}/>:<ul>{p.ownChoices.map(id=><li key={id}>{data.people.find(person=>person.id===id)?.name??'Event member'}</li>)}</ul>}<p>This vote is final.</p><button className="secondary" onClick={()=>setSelected(null)}>View other awards</button></section>:p.status==='Open'&&p.eligible&&!data.archived?<>
 {p.instructions&&<details className="easy-award-instructions"><summary>Award details</summary><p className="preserve-lines">{p.instructions}</p></details>}
 {p.metAgentsOnly&&<div className="notice"><p>Only people in Agents I met appear here.</p><Link className="text-action" href={`/events/${data.eventId}/contact`}>Scan someone or view Agents I met</Link></div>}
 {p.categories?<CategoryBallot poll={p} people={data.people} easyMode disabled={busy||pending} onSubmit={choices=>onSubmit(p.id,choices)}/>:<Ballot poll={p} people={data.people} disabled={busy||pending} onSubmit={choices=>onSubmit(p.id,choices)}/>}
 </>:!p.publishedAt&&<div className="easy-voting-empty"><SpyIcon name="history"/><h3>{data.archived||p.status==='Ended'?'Voting has ended':p.status==='Paused'?'Voting is paused':'Please wait for voting to open'}</h3><p>{p.status==='Scheduled'?`Scheduled for ${new Intl.DateTimeFormat('en-PH',{timeZone:data.timezone,dateStyle:'medium',timeStyle:'short'}).format(new Date(p.opensAt))}.`:'The organizer controls when you can vote.'}</p></div>}
 {p.results&&<details className="voting-results" open={!!p.publishedAt}><summary>Voting results</summary><VotingResults poll={p}/></details>}
 </section>)}
 <div className="voting-footer"><button className="secondary" disabled={busy} onClick={onRefresh}>Refresh status</button></div>
 </div>;
}
