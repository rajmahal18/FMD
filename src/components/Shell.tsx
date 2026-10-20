import {SignOutForm} from "./RaceAction";
import Link from "next/link";
import { OrganizerNav } from "./OrganizerNav";
import {NavigationLink} from "./NavigationLink";
import {PlayerShell} from "./PlayerShell";

export function Shell({name,title,role,children,eventId}:{name:string;title:string;role:string;children:React.ReactNode;eventId?:string}){
  if(role==="PARTICIPANT"||role==="AGENT")return <PlayerShell name={name} title={title} eventId={eventId}>{children}</PlayerShell>;
  const roleLabel=role.replaceAll("_"," ");
  return <div className={`shell themed-shell ${role==="PARTICIPANT"?"participant-shell":""}`}>
    <aside>
      <div className="sidebar-aura" aria-hidden="true"/>
      <Link prefetch={false} className="brand-lockup" href="/workspace">
        <img className="brand-emblem" src="/theme/spy-shield-emblem.png" alt="" width={52} height={52}/>
        <div className="brand-copy">
          <span className="wordmark">SC / HQ</span>
          <small>Operation Spy Chase</small>
        </div>
      </Link>
      <div className="rail-label">FIELD NETWORK</div>
      <nav className="shell-links" aria-label="Event navigation">
        {role==="ORGANIZER"&&eventId?<OrganizerNav eventId={eventId}/>:eventId?<NavigationLink href={`/events/${eventId}`} activePaths={[`/events/${eventId}/${role==="FACILITATOR"?"field":"check-in"}`]}>{role==="FACILITATOR"?"Assigned stations":"Current mission"}</NavigationLink>:null}
        {role==="PARTICIPANT"&&eventId&&<>
          <NavigationLink href={`/events/${eventId}/agents/me`} section={`/events/${eventId}/agents/`}>My agent dossier</NavigationLink>
          <NavigationLink href={`/events/${eventId}/contact`}>Agent Contact</NavigationLink>
          <NavigationLink href={`/events/${eventId}/results`}>Amazing Race Results</NavigationLink>
        </>}
        {role==="FACILITATOR"&&eventId&&<NavigationLink href={`/events/${eventId}/results`}>Final results</NavigationLink>}
        {eventId&&role!=="ORGANIZER"&&<NavigationLink href={`/events/${eventId}/overall`}>Team Building Overall Ranking</NavigationLink>}
        <NavigationLink href="/workspace">My events</NavigationLink>
      </nav>
      <div className="sidebar-intel-strip" aria-hidden="true">
        <img src="/theme/spy-icon-grid.png" alt="" width={280} height={210}/>
      </div>
      <div className="rail-bottom">
        <span>{name}</span>
        <span className="account-role">{roleLabel}</span>
        <Link prefetch={false} className="account-link" href="/account/password">Password & access</Link>
        <SignOutForm/>
      </div>
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
