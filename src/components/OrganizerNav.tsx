"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function OrganizerNav({eventId}:{eventId:string}){const path=usePathname();const base=`/events/${eventId}`;return <>{[["Mission Control",""],["Prepare event","/setup"],["Teams & agents","/people"],["Stations","/stations"],["Routes","/routes"],["Facilitators","/staff"],["Field station","/field"],["Agent Contact","/contact-policy"],["Results","/results"],["Rehearsal","/rehearsal"],["Lifecycle","/lifecycle"]].map(([label,suffix])=><Link prefetch={false} className={`nav ${path===base+suffix?"active":""}`} aria-current={path===base+suffix?"page":undefined} href={base+suffix} key={suffix}>{label}</Link>)}</>;}
