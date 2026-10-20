import Link from 'next/link';
import {NavigationLink} from './NavigationLink';
import {PlayerNavigation} from './PlayerNavigation';
import {SignOutForm} from './RaceAction';
export function PlayerShell({name,title,eventId,children}:{name:string;title:string;eventId?:string;children:React.ReactNode}){
 const base=`/events/${eventId}`;
 return <div className={`player-shell participant-shell${eventId?" has-bottom-nav":""}`}><div className="player-topbar"><Link href="/workspace" className="player-brand"><img src="/theme/app-logo.png" alt="" width={38} height={38}/>Spy Chase</Link><details className="player-account"><summary aria-label="Account" title="Account"><svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="9" r="3"/><path d="M5.5 18a7 7 0 0 1 13 0"/></svg></summary><div className="player-account-menu"><strong>{name}</strong>{eventId&&<NavigationLink href={`${base}/agents/me`} section={`${base}/agents/`}>My profile</NavigationLink>}<Link prefetch={false} href="/workspace">My events</Link><Link prefetch={false} href="/account/password">Password &amp; access</Link><SignOutForm/></div></details></div>
 {eventId?<PlayerNavigation eventId={eventId}/>:<nav className="shell-links player-navigation" aria-label="Workspace navigation"><NavigationLink href="/workspace">My events</NavigationLink></nav>}
 <main className="player-content"><header className="player-page-heading"><div className="eyebrow">OPERATION / SPY CHASE</div><h1>{title}</h1></header><div className="player-body">{children}</div></main></div>;
}
