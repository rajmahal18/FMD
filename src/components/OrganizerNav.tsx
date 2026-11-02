"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {SpyIcon,type SpyIconName} from "./SpyIcon";
const sectionIcons:Record<string,SpyIconName>={"/setup":"setup","/people":"people","/stations":"station","/routes":"route","/staff":"staff","/ranking-settings":"rank","/contact-settings":"contact","/voting-settings":"vote","/rehearsal":"tools","/lifecycle":"archive","":"mission","/field":"station","/contact-policy":"contact","/voting":"vote","/results":"rank","/overall":"rank"};
const setupLinks=[["Event details","/setup"],["Teams & agents","/people"],["Stations","/stations"],["Routes","/routes"],["Facilitators","/staff"],["Ranking rules","/ranking-settings"],["Contact policy","/contact-settings"],["Voting events","/voting-settings"],["Rehearsal","/rehearsal"],["Reset & archive","/lifecycle"]];
const liveLinks=[["Mission Control",""],["Field station","/field"],["Agent Contact","/contact-policy"],["Voting controls","/voting"],["Race results","/results"],["Overall results","/overall"]];
export function OrganizerNav({eventId}:{eventId:string}){
 const path=usePathname(),base=`/events/${eventId}`;
 const setup=setupLinks.some(([,suffix])=>path===base+suffix||path.startsWith(base+suffix+'/'));
 return <div className="organizer-navigation"><div className="organizer-mode-switch" aria-label="Event workspace"><Link prefetch={false} href={base+'/setup'} className={setup?'selected':''} aria-current={setup?'location':undefined}>Event setup</Link><Link prefetch={false} href={base} className={!setup?'selected':''} aria-current={!setup?'location':undefined}>Live operations</Link></div><div className="organizer-section-links">{(setup?setupLinks:liveLinks).map(([label,suffix])=>{const active=path===base+suffix||(!!suffix&&path.startsWith(base+suffix+'/'));return <Link prefetch={false} className={`nav${active?' active':''}`} aria-current={active?'page':undefined} href={base+suffix} key={suffix}><SpyIcon name={sectionIcons[suffix]}/><span>{label}</span></Link>;})}</div></div>;
}
