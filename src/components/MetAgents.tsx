"use client";
import Link from 'next/link';
import {useState} from 'react';
import {PersonName} from './Avatar';
import type {ContactData} from '@/lib/contact';
export function MetAgents({data}:{data:ContactData}){
 const [search,setSearch]=useState('');const agents=data.metAgents??[],matching=agents.filter(a=>(a.name+' '+a.teamName).toLowerCase().includes(search.trim().toLowerCase()));
 return <section className="paper-file met-agent-list"><h2>Agents I met <span className="tag">{agents.length}</span></h2><p>One confirmed scan adds each of you to the other's list. Your votes are separate.</p><Link className="button" href={`/events/${data.eventId}/voting`}>Vote Most Congenial</Link>{agents.length>0&&<label>Find an agent<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name or squad"/></label>}<div className="bounded-records" role="region" aria-label="Agents I met" tabIndex={0}>{matching.map(a=><div className="list-row" key={a.id}><div><strong><PersonName name={a.name} avatarUrl={a.avatarUrl}/></strong><p>{a.teamName}</p></div><span className="tag">{a.sex==='M'||a.sex==='MALE'?'Male':a.sex==='F'||a.sex==='FEMALE'?'Female':'Profile not set'}</span></div>)}</div>{!agents.length?<p>Scan an agent's code and confirm their identity to add each other. No vote is cast.</p>:!matching.length&&<p>No agents match your search.</p>}</section>;
}
