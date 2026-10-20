import Link from 'next/link';
import {NavigationLink} from './NavigationLink';
import {PlayerNavigation} from './PlayerNavigation';
import {SignOutForm} from './RaceAction';
export function PlayerShell({name,title,eventId,children}:{name:string;title:string;eventId?:string;children:React.ReactNode}){
 const base=`/events/${eventId}`;
 return <div className={`player-shell participant-shell${eventId?" has-bottom-nav":""}`}><div className="player-topbar"><Link href="/workspace" className="player-brand"><img src="/theme/app-logo.png" alt="" width={38} height={38}/>Spy Chase</Link><details className="player-account"><summary>Account <span aria-hidden="true">▾</span></summary><div className="player-account-menu"><strong>{name}</strong>{eventId&&<NavigationLink href={`${base}/agents/me`} section={`${base}/agents/`}>My profile</NavigationLink>}<Link prefetch={false} href="/workspace">My events</Link><Link prefetch={false} href="/account/password">Password &amp; access</Link><SignOutForm/></div></details></div>
 {eventId?<PlayerNavigation eventId={eventId}/>:<nav className="shell-links player-navigation" aria-label="Workspace navigation"><NavigationLink href="/workspace">My events</NavigationLink></nav>}
 <main className="player-content"><header className="player-page-heading"><div className="eyebrow">OPERATION / SPY CHASE</div><h1>{title}</h1></header><div className="player-body">{children}</div></main></div>;
}
