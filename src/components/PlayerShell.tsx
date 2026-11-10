'use client';
import {usePathname} from 'next/navigation';
import {FieldArrivalFocus} from './FieldArrivalFocus';
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
export function PlayerShell({name,avatarUrl,title,eventId,children,mode="participant",judgingEnabled=false,judgingFocused=false,previewEnabled=true,switching=false,votingOnly=false,resultsOnly=false}:{name:string;avatarUrl?:string|null;title:string;eventId?:string;mode?:"participant"|"facilitator";judgingEnabled?:boolean;judgingFocused?:boolean;previewEnabled?:boolean;switching?:boolean;votingOnly?:boolean;resultsOnly?:boolean;children:React.ReactNode}){
 const navigation=useJudgingNavigation(eventId,mode==="facilitator"&&!resultsOnly,{focused:judgingFocused,judgingEnabled});
 const inbox=usePathname()===`/events/${eventId}/inbox`;
 const focused=!resultsOnly&&mode==="facilitator"&&navigation.focused;
 const votingFocus=!resultsOnly&&mode==="participant"&&votingOnly;
 const field=mode==="facilitator";const base=`/events/${eventId}`;
 return <div className={`player-shell controller-shell ${field?"facilitator-shell":"participant-shell"}${eventId&&!focused?" has-bottom-nav":""}${votingFocus?" voting-focused":""}${resultsOnly?" results-focused":""}`}>{field&&eventId&&<FieldArrivalFocus eventId={eventId} enabled={!resultsOnly&&!focused&&!inbox}/>}<div className="player-topbar"><Link href={resultsOnly?`${base}/results`:votingFocus?`${base}/voting`:focused?`${base}/judging`:"/workspace"} className="player-brand"><img src="/theme/app-logo.png" alt="" width={38} height={38}/>{resultsOnly?"Event Results":votingFocus?"Voting":focused?"Scoring":field?"Field control":"Spy Chase"}</Link><div className="player-topbar-actions">{eventId&&!field&&!votingFocus&&!resultsOnly&&<Link href={`${base}/inbox`} className="inbox-entry" aria-label="Inbox"><SpyIcon name="mail"/></Link>}<ControllerAccount><summary aria-label="Account" title="Account"><Avatar name={name} src={avatarUrl} size="small"/></summary><div className="player-account-menu"><strong><PersonName name={name} avatarUrl={avatarUrl}/></strong><RoleLabel role={focused?"Judge":field?"Facilitator":"Participant"}/>{eventId&&field&&!resultsOnly&&<NavigationLink href={`${base}/inbox`}>Inbox</NavigationLink>}{eventId&&!field&&!votingFocus&&!resultsOnly&&<NavigationLink href={`${base}/agents/me`} section={`${base}/agents/`}>My profile</NavigationLink>}{eventId&&!focused&&!votingFocus&&!resultsOnly&&<NavigationLink href={`${base}/program`}>Event Program</NavigationLink>}{eventId&&!focused&&!votingFocus&&!resultsOnly&&<NavigationLink href={`${base}/voting`}>Voting events</NavigationLink>}{eventId&&field&&!focused&&!resultsOnly&&navigation.judgingEnabled&&<NavigationLink href={`${base}/judging`}>Scoring</NavigationLink>}{field&&eventId&&!focused&&!resultsOnly&&<NavigationLink href={`${base}/people`}>Team roster</NavigationLink>}{field&&eventId&&!focused&&!resultsOnly&&<NavigationLink href={`${base}/results`}>Results</NavigationLink>}{!focused&&!votingFocus&&!resultsOnly&&<Link prefetch={false} href="/workspace?list=1">My events</Link>}{!switching&&<Link prefetch={false} href="/account/password">Password &amp; access</Link>}<ScreenAwakeControl/><SignOutForm/></div></ControllerAccount></div></div>
 {!focused&&(eventId?resultsOnly?<PlayerNavigation eventId={eventId} resultsOnly/>:field?<FieldNavigation eventId={eventId} judgingEnabled={navigation.judgingEnabled}/>:<PlayerNavigation eventId={eventId} votingOnly={votingFocus}/>:<nav className="shell-links player-navigation" aria-label="Workspace navigation"><NavigationLink href="/workspace?list=1">My events</NavigationLink></nav>)}
 <main className="player-content"><header className="player-page-heading"><h1>{inbox?title:focused?"Scoring":title}</h1></header><div className="player-body">{!resultsOnly&&navigation.offScoring?<p role="status">Opening scoring...</p>:children}</div></main></div>;
}
