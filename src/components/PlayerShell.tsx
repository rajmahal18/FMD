import {ControllerAccount} from './ControllerAccount';
import {AppLink as Link} from './AppLink';
import {FieldNavigation} from './FieldNavigation';
import {NavigationLink} from './NavigationLink';
import {PlayerNavigation} from './PlayerNavigation';
import {SignOutForm} from './RaceAction';
export function PlayerShell({name,title,eventId,children,mode="participant"}:{name:string;title:string;eventId?:string;mode?:"participant"|"facilitator";children:React.ReactNode}){
 const field=mode==="facilitator";const base=`/events/${eventId}`;
 return <div className={`player-shell controller-shell ${field?"facilitator-shell":"participant-shell"}${eventId?" has-bottom-nav":""}`}><div className="player-topbar"><Link href="/workspace" className="player-brand"><img src="/theme/app-logo.png" alt="" width={38} height={38}/>{field?"Field control":"Spy Chase"}</Link><ControllerAccount><summary aria-label="Account" title="Account"><svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="9" r="3"/><path d="M5.5 18a7 7 0 0 1 13 0"/></svg></summary><div className="player-account-menu"><strong>{name}</strong>{eventId&&!field&&<NavigationLink href={`${base}/agents/me`} section={`${base}/agents/`}>My profile</NavigationLink>}{eventId&&<NavigationLink href={`${base}/program`}>Event Program</NavigationLink>}{eventId&&<NavigationLink href={`${base}/voting`}>Voting events</NavigationLink>}{field&&eventId&&<><NavigationLink href={`${base}/results`}>Final results</NavigationLink><NavigationLink href={`${base}/overall`}>Overall ranking</NavigationLink></>}<Link prefetch={false} href="/workspace">My events</Link><Link prefetch={false} href="/account/password">Password &amp; access</Link><SignOutForm/></div></ControllerAccount></div>
 {eventId?field?<FieldNavigation eventId={eventId}/>:<PlayerNavigation eventId={eventId}/>:<nav className="shell-links player-navigation" aria-label="Workspace navigation"><NavigationLink href="/workspace">My events</NavigationLink></nav>}
 <main className="player-content"><header className="player-page-heading"><div className="eyebrow">OPERATION / SPY CHASE</div><h1>{title}</h1></header><div className="player-body">{children}</div></main></div>;
}
