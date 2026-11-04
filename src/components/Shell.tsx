import {RoleLabel} from "./RoleLabel";
import {ScreenAwakeControl} from "./ScreenAwake";
import {avatarUrl} from "@/lib/avatar";
import {PersonName,Avatar} from "./Avatar";
import {ControllerAccount} from "./ControllerAccount";
import {currentUser} from '@/lib/auth';
import {db} from '@/lib/db';
import {runRevision} from '@/server/run-revision';
import {RunRevisionProvider} from './RunRevision';
import {SignOutForm} from "./RaceAction";
import Link from "next/link";
import { OrganizerNav } from "./OrganizerNav";
import {NavigationLink} from "./NavigationLink";
import {PlayerShell} from "./PlayerShell";

export async function Shell({name,title,role,children,eventId}:{name:string;title:string;role:string;children:React.ReactNode;eventId?:string}){
  const account=await currentUser();
  const photo=avatarUrl(account?.avatarKey);
  const previewEnabled=eventId?(await db().event.findUnique({where:{id:eventId},select:{screenPreviewEnabled:true}}))?.screenPreviewEnabled??true:true;
  children=<RunRevisionProvider revision={eventId?await runRevision(db(),eventId):0}>{children}</RunRevisionProvider>;
  if(role==="FACILITATOR"){const hasJudging=!!eventId&&!!account&&await db().judgingAssignment.count({where:{eventId,active:true,membership:{userId:account.id,active:true,role:"FACILITATOR"}}})>0;return <PlayerShell avatarUrl={photo} previewEnabled={previewEnabled} judgingEnabled={hasJudging} mode="facilitator" name={name} title={title} eventId={eventId}>{children}</PlayerShell>;}
  if(role==="PARTICIPANT"||role==="AGENT")return <PlayerShell avatarUrl={photo} name={name} title={title} eventId={eventId}>{children}</PlayerShell>;
  const roleLabel=role.replaceAll("_"," ");
  return <div className={`shell themed-shell ${role==="PARTICIPANT"?"participant-shell":role==="FACILITATOR"?"facilitator-shell":""}`}>
    <aside>
      <div className="sidebar-aura" aria-hidden="true"/>
      <Link prefetch={false} className="brand-lockup" href="/workspace">
        <img className="brand-emblem" src="/theme/app-logo.png" alt="" width={52} height={52}/>
        <div className="brand-copy">
          <span className="wordmark">SC / HQ</span>
          <small>Operation Spy Chase</small>
        </div>
      </Link>
      <div className="rail-label">FIELD NETWORK</div>
      <nav className={`shell-links${role==="ORGANIZER"&&eventId?" organizer-shell-links":""}`} aria-label="Event navigation">
        {role==="ORGANIZER"&&eventId?<OrganizerNav eventId={eventId} previewEnabled={previewEnabled}/>:eventId?<NavigationLink href={`/events/${eventId}`} activePaths={[`/events/${eventId}/${role==="FACILITATOR"?"field":"check-in"}`]}>{role==="FACILITATOR"?"Assigned stations":"Current mission"}</NavigationLink>:null}
        {role==="PARTICIPANT"&&eventId&&<>
          <NavigationLink href={`/events/${eventId}/agents/me`} section={`/events/${eventId}/agents/`}>My agent dossier</NavigationLink>
          <NavigationLink href={`/events/${eventId}/contact`}>Agent Contact</NavigationLink>
          <NavigationLink href={`/events/${eventId}/results`}>Amazing Race Results</NavigationLink>
        </>}
        {role==="FACILITATOR"&&eventId&&<NavigationLink href={`/events/${eventId}/people`}>Teams & agents</NavigationLink>}
        {role==="FACILITATOR"&&eventId&&<NavigationLink href={`/events/${eventId}/voting`}>Voting events</NavigationLink>}
        {role==="FACILITATOR"&&eventId&&<NavigationLink href={`/events/${eventId}/results`}>Final results</NavigationLink>}
        {eventId&&role!=="ORGANIZER"&&<NavigationLink href={`/events/${eventId}/overall`}>Team Building Overall Ranking</NavigationLink>}
        {eventId&&<NavigationLink href={`/events/${eventId}/program`}>Event Program</NavigationLink>}
        <NavigationLink href="/workspace">My events</NavigationLink>
      </nav>
      <div className="sidebar-intel-strip" aria-hidden="true">
        <img src="/theme/spy-icon-grid.png" alt="" width={280} height={210}/>
      </div>
      {role==="FACILITATOR"?<details className="staff-account"><summary aria-label="Account" title="Account"><svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="9" r="3"/><path d="M5.5 18a7 7 0 0 1 13 0"/></svg></summary><div className="staff-account-menu"><strong>{name}</strong><Link prefetch={false} href="/account/password">Password &amp; access</Link><ScreenAwakeControl/><SignOutForm/></div></details>:<ControllerAccount className="player-account organizer-account"><summary aria-label="Account"><Avatar name={name} src={photo} size="small"/><span>Account</span></summary><div className="player-account-menu">
        <PersonName name={name} avatarUrl={photo}/>
        <span className="account-role"><RoleLabel role={role}/></span>
        <Link prefetch={false} className="account-link" href="/account/password">Password & access</Link>
        <ScreenAwakeControl/><SignOutForm/>
      </div></ControllerAccount>}
    </aside>
    <main className="content">
      <div className="content-hud-layer" aria-hidden="true"/>
      <header>
        <div>
          <div className="eyebrow">CLASSIFIED / {roleLabel}</div>
          <h1>{title}</h1>
        </div>
        <span className="tag access-pill"><span className="status-dot" aria-hidden="true"/>ACCESS VERIFIED</span>
      </header>
      <div className="content-body">{children}</div>
    </main>
  </div>;
}
