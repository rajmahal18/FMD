import Link from 'next/link';
import {SpyIcon} from './SpyIcon';
export function LivePreviewEntry({eventId,participant=false}:{eventId:string;participant?:boolean}){
 return <section className="live-preview-entry"><div><strong>See the live screens before starting</strong><p>{participant?'Inspect participant and facilitator screens with sample progress.':'Preview your station with sample teams, timers and result states.'} No setup completion is required.</p></div><Link prefetch={false} className="button secondary" href={`/events/${eventId}/preview${participant?'?view=participant':''}`}><SpyIcon name="mission"/>Live screen preview</Link></section>;
}
