"use client";
import {useScreenPreviewPath} from './ScreenPreviewContext';
import Link from "next/link";
import {usePathname} from "next/navigation";

export function NavigationLink({href,activePaths=[],section,children}:{href:string;activePaths?:string[];section?:string;children:React.ReactNode}){
 const actualPath=usePathname(),previewPath=useScreenPreviewPath(),path=previewPath??actualPath;
 const active=path===href||activePaths.includes(path)||!!section&&path.startsWith(section);
 if(previewPath)return <span role="link" aria-disabled="true" className={`nav${active?" active":""}`}>{children}</span>;
 return <Link prefetch={false} href={href} className={`nav${active?" active":""}`} aria-current={active?"page":undefined}>{children}</Link>;
}
