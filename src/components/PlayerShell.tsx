import {ScreenAwakeControl} from "./ScreenAwake";
import {Avatar,PersonName} from "./Avatar";
import {ControllerAccount} from './ControllerAccount';
import {AppLink as Link} from './AppLink';
import {FieldNavigation} from './FieldNavigation';
import {NavigationLink} from './NavigationLink';
import {PlayerNavigation} from './PlayerNavigation';
import {SignOutForm} from './RaceAction';
export function PlayerShell({name,avatarUrl,title,eventId,children,mode="participant",judgingEnabled=false,previewEnabled=true}:{name:string;avatarUrl?:string|null;title:string;eventId?:string;mode?:"participant"|"facilitator";judgingEnabled?:boolean;previewEnabled?:boolean;children:React.ReactNode}){
 const field=mode==="facilitator";const base=`/events/${eventId}`;
 return <div className={`player-shell controller-shell ${field?"facilitator-shell":"participant-shell"}${eventId?" has-bottom-nav":""}`}><div className="player-topbar"><Link href="/workspace" className="player-brand"><img src="/theme/app-logo.png" alt="" width={38} height={38}/>{field?"Field control":"Spy Chase"}</Link><ControllerAccount><summary aria-label="Account" title="Account"><Avatar name={name} src={avatarUrl} size="small"/></summary><div className="player-account-menu"><strong><PersonName name={name} avatarUrl={avatarUrl}/></strong>{eventId&&!field&&<NavigationLink href={`${base}/agents/me`} section={`${base}/agents/`}>My profile</NavigationLink>}{eventId&&<NavigationLink href={`${base}/program`}>Event Program</NavigationLink>}{eventId&&<NavigationLink href={`${base}/voting`}>Voting events</NavigationLink>}{eventId&&<NavigationLink href={`${base}/judging`}>{field&&judgingEnabled?"Judge scoring":"Judging results"}</NavigationLink>}{field&&eventId&&<>{previewEnabled&&<NavigationLink href={`${base}/preview`}>Live screen preview</NavigationLink>}<NavigationLink href={`${base}/results`}>Final results</NavigationLink><NavigationLink href={`${base}/overall`}>Overall ranking</NavigationLink></>}<Link prefetch={false} href="/workspace">My events</Link><Link prefetch={false} href="/account/password">Password &amp; access</Link><ScreenAwakeControl/><SignOutForm/></div></ControllerAccount></div>
 {eventId?field?<FieldNavigation eventId={eventId} judgingEnabled={judgingEnabled}/>:<PlayerNavigation eventId={eventId}/>:<nav className="shell-links player-navigation" aria-label="Workspace navigation"><NavigationLink href="/workspace">My events</NavigationLink></nav>}
 <main className="player-content"><header className="player-page-heading"><div className="eyebrow">OPERATION / SPY CHASE</div><h1>{title}</h1></header><div className="player-body">{children}</div></main></div>;
}
