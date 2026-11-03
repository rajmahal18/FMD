'use client';

import {useState} from 'react';
import {avatarInitials} from '@/lib/avatar';

/** Decorative next to a visible name; standalone portraits must opt into a label. */
export function Avatar({name,src,size='medium',label=false}:{name:string;src?:string|null;size?:'small'|'medium'|'portrait';label?:boolean}) {
  const [failed,setFailed]=useState<string|null>(null);
  return <span className={`person-avatar person-avatar-${size}`} role={label?'img':undefined} aria-label={label?name:undefined} aria-hidden={label?undefined:true}>
    {src&&failed!==src?<img key={src} src={src} alt="" width={size==='portrait'?160:size==='small'?32:44} height={size==='portrait'?160:size==='small'?32:44} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(src)}/>:avatarInitials(name)}
  </span>;
}

export function PersonName({name,avatarUrl,size='small'}:{name:string;avatarUrl?:string|null;size?:'small'|'medium'}) {
  return <span className="person-identity"><Avatar name={name} src={avatarUrl} size={size}/><span className="person-identity-name">{name}</span></span>;
}
