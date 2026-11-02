'use client';
import {useScreenPreview} from './ScreenPreviewContext';
import Link,{useLinkStatus} from 'next/link';
import type {ComponentProps} from 'react';

function PendingHint(){const {pending}=useLinkStatus();return <span className="app-link-pending" data-pending={pending} role="status">{pending?'Opening…':''}</span>;}
export function AppLink({children,className,...props}:ComponentProps<typeof Link>){
 const preview=useScreenPreview();if(preview)return <span role="link" aria-disabled="true" aria-current={props['aria-current']} aria-label={props['aria-label']} className={`app-link ${className??''}`} title="Navigation is disabled in this preview">{children}</span>;
 return <Link {...props} className={`app-link ${className??''}`}>{children}<PendingHint/></Link>;
}
