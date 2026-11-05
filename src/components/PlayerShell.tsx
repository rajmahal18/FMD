'use client';
import {useJudgingNavigation} from './useJudgingNavigation';
import {SpyIcon} from "./SpyIcon";
import {RoleLabel} from "./RoleLabel";
import {ScreenAwakeControl} from "./ScreenAwake";
import {Avatar,PersonName} from "./Avatar";
import {ControllerAccount} from './ControllerAccount';
import {AppLink as Link} from './AppLink';
import {FieldNavigation} from './FieldNavigation';
import {NavigationLink} from './NavigationLink';
import {PlayerNavigation} from './PlayerNavigation';
import {SignOutForm} from './RaceAction';
export function PlayerShell({name,avatarUrl,title,eventId,children,mode="participant",judgingEnabled=false,judgingFocused=false,previewEnabled=true,switching=false}:{name:string;avatarUrl?:string|null;title:string;eventId?:string;mode?:"participant"|"facilitator";judgingEnabled?:boolean;judgingFocused?:boolean;previewEnabled?:boolean;switching?:boolean;children:React.ReactNode}){
 const navigation=useJudgingNavigation(eventId,mode==="facilitator",{focused:judgingFocused,judgingEnabled});
 const focused=mode==="facilitator"&&navigation.focused;
 const field=mode==="facilitator";const base=`/events/${eventId}`;
 return <div className={`player-shell controller-shell ${field?"facilitator-shell":"participant-shell"}${eventId&&!focused?" has-bottom-nav":""}`}><div className="player-topbar"><Link href={focused?`${base}/judging`:"/workspace"} className="player-brand"><img src="/theme/app-logo.png" alt="" width={38} height={38}/>{focused?"Scoring":field?"Field control":"Spy Chase"}</Link><div className="player-topbar-actions">{eventId&&!field&&<Link href={`${base}/inbox`} className="inbox-entry" aria-label="Inbox"><SpyIcon name="mail"/></Link>}<ControllerAccount><summary aria-label="Account" title="Account"><Avatar name={name} src={avatarUrl} size="small"/></summary><div className="player-account-menu"><strong><PersonName name={name} avatarUrl={avatarUrl}/></strong><RoleLabel role={focused?"Judge":field?"Facilitator":"Participant"}/>{eventId&&!field&&<NavigationLink href={`${base}/agents/me`} section={`${base}/agents/`}>My profile</NavigationLink>}{eventId&&!focused&&<NavigationLink href={`${base}/program`}>Event Program</NavigationLink>}{eventId&&!focused&&<NavigationLink href={`${base}/voting`}>Voting events</NavigationLink>}{eventId&&field&&!focused&&navigation.judgingEnabled&&<NavigationLink href={`${base}/judging`}>Scoring</NavigationLink>}{field&&eventId&&!focused&&<NavigationLink href={`${base}/results`}>Results</NavigationLink>}{!focused&&<Link prefetch={false} href="/workspace?list=1">My events</Link>}{!switching&&<Link prefetch={false} href="/account/password">Password &amp; access</Link>}<ScreenAwakeControl/><SignOutForm/></div></ControllerAccount></div></div>
 {!focused&&(eventId?field?<FieldNavigation eventId={eventId} judgingEnabled={navigation.judgingEnabled}/>:<PlayerNavigation eventId={eventId}/>:<nav className="shell-links player-navigation" aria-label="Workspace navigation"><NavigationLink href="/workspace?list=1">My events</NavigationLink></nav>)}
 <main className="player-content"><header className="player-page-heading"><h1>{focused?"Scoring":title}</h1></header><div className="player-body">{navigation.offScoring?<p role="status">Opening scoring...</p>:children}</div></main></div>;
}
