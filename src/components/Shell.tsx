import {SignOutForm} from "./RaceAction";
import Link from "next/link";
import { OrganizerNav } from "./OrganizerNav";

export function Shell({name,title,role,children,eventId}:{name:string;title:string;role:string;children:React.ReactNode;eventId?:string}){
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
        {role==="ORGANIZER"&&eventId?<OrganizerNav eventId={eventId}/>:eventId?<Link prefetch={false} className="nav active" href={`/events/${eventId}`}>{role==="FACILITATOR"?"Assigned stations":"Current mission"}</Link>:null}
        {role==="PARTICIPANT"&&eventId&&<>
          <Link prefetch={false} className="nav" href={`/events/${eventId}/agents/me`}>My agent dossier</Link>
          <Link prefetch={false} className="nav" href={`/events/${eventId}/contact`}>Agent Contact</Link>
          <Link prefetch={false} className="nav" href={`/events/${eventId}/results`}>Final results</Link>
        </>}
        {role==="FACILITATOR"&&eventId&&<Link prefetch={false} className="nav" href={`/events/${eventId}/results`}>Final results</Link>}
        <Link prefetch={false} className="nav" href="/workspace">My events</Link>
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
