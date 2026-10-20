"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";

export function NavigationLink({href,activePaths=[],section,children}:{href:string;activePaths?:string[];section?:string;children:React.ReactNode}){
 const path=usePathname();
 const active=path===href||activePaths.includes(path)||!!section&&path.startsWith(section);
 return <Link prefetch={false} href={href} className={`nav${active?" active":""}`} aria-current={active?"page":undefined}>{children}</Link>;
}
