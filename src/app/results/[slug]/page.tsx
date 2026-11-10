import Link from 'next/link';
import {notFound} from 'next/navigation';
import {readPublicResults} from '@/server/public-results';
import {EventRecap} from '@/components/EventRecap';

export const dynamic='force-dynamic';
export default async function PublicResults({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params,release=await readPublicResults(slug);
 if(!release)notFound();
 return <div className="player-shell public-results-shell">
  <header className="player-topbar"><Link className="player-brand" href="/"><img src="/theme/app-logo.png" alt="" width={38} height={38}/>Event Results</Link><Link className="public-sign-in" href="/login">Sign in</Link></header>
  <main className="public-results-content"><header className="public-results-heading"><h1>Event Results</h1><p>{release.eventName}</p></header><EventRecap data={release.data}/></main>
 </div>;
}
