export function EventIdentity({event,showState=true}:{showState?:boolean;event:{id:string;name:string;codename:string|null;accentColor:string;state:string;isDemo:boolean;logoMime:string|null;archivedAt?:Date|string|null}}){
  return <div className="operation-strip event-identity" style={{borderLeftColor:event.accentColor, ["--event-accent" as string]:event.accentColor}}>
    {event.logoMime
      ?<img className="event-logo" src={`/api/events/${event.id}/logo`} alt={`${event.name} logo`} width={64} height={64}/>
      :<img className="event-logo event-logo-fallback" src="/theme/app-logo.png" alt="" width={64} height={64}/>
    }
    <div className="event-identity-copy">
      <strong>{event.name}</strong>
      {event.codename&&<div className="fine">{event.codename}</div>}
    </div>
    {event.archivedAt
      ?<span className="tag">ARCHIVED / READ ONLY</span>
      :showState&&<span className="tag">{event.state}</span>}
    {event.isDemo&&<span className="demo">DEMO / NO OFFICIAL RESULTS</span>}
  </div>;
}
