
import {ErrorNotice} from '@/components/ErrorNotice';
import {safeReturnPath} from "@/lib/race";
import {EmailLogin} from "@/components/EmailLogin";
import Link from 'next/link';
import {publicResultsEntry} from '@/server/public-results';

export default async function Login({searchParams}:{searchParams:Promise<{error?:string;changed?:string;returnTo?:string}>}){
  const {error,changed,returnTo:raw}=await searchParams;
  const returnTo=safeReturnPath(raw);
  const results=await publicResultsEntry();
  return <main className="login spy-login">
    <section className="login-stage">
      <div className="login-brand-panel">
        <a className="wordmark" href="/">SC / FIELD NETWORK</a>
        <div className="login-brand-copy">
          <img className="login-emblem" src="/theme/app-logo.png" alt="" width={108} height={108}/>
          <div>
            <h2>Operation Spy Chase</h2>
            <p>Event access for organizers, facilitators, and participants.</p>
          </div>
        </div>
        <div className="login-brand-visual">
          <img src="/theme/spy-command-center.png" alt="" width={1672} height={941}/>
        </div>
      </div>
      <section className="dossier">
        <span className="eyebrow">IDENTITY CHECK / 01</span>
        <h1>Agent access</h1>
        <p>Use the individual account issued by your organizer.</p>
        {results&&<p><Link className="button secondary" href={results.href}>View results</Link></p>}
        {changed&&<div className="notice" role="status">Password saved. Sign in with your new password.</div>}
        {error&&<ErrorNotice>{error==="rate"?"Too many attempts. Wait 15 minutes, then try again.":"Unable to sign in. Check your email and password."}</ErrorNotice>}
        <EmailLogin returnTo={returnTo}/>
        <details open={!!error||!!changed}><summary>Sign in with password</summary>
        <form action="/api/auth/login" method="post">
          {returnTo&&<input type="hidden" name="returnTo" value={returnTo}/>}
          <label>Email<input name="email" type="email" autoComplete="username" required maxLength={254}/></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" required maxLength={128}/></label>
          <button>Sign in</button>
        </form>
        </details>
        <p className="fine">Need access or a password reset? Contact your event organizer. Public signup is not enabled.</p>
      </section>
    </section>
  </main>;
}
