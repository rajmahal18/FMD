'use client';
import {useState} from 'react';
import {stationPhotoUrl} from '@/lib/station-photo';
export function StationPhoto({eventId,stationId,photoKey,name}:{eventId:string;stationId:string;photoKey?:string|null;name:string}){
 const [failed,setFailed]=useState<string|null>(null),url=stationPhotoUrl(eventId,stationId,photoKey);
 if(!url)return null;
 if(failed===url)return <p className="fine">Station photo unavailable. Use the location above or ask the facilitator.</p>;
 return <a className="station-location-photo" href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open full location photo of ${name}`}><img src={url} alt={`Location guide for ${name}`} loading="lazy" onError={()=>setFailed(url)}/><span>View full photo ↗</span></a>;
}
