'use client';
import Link,{useLinkStatus} from 'next/link';
import type {ComponentProps} from 'react';

function PendingHint(){const {pending}=useLinkStatus();return <span className="app-link-pending" data-pending={pending} role="status">{pending?'Opening…':''}</span>;}
export function AppLink({children,className,...props}:ComponentProps<typeof Link>){
 return <Link {...props} className={`app-link ${className??''}`}>{children}<PendingHint/></Link>;
}
