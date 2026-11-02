import {notFound, redirect} from "next/navigation";
import {currentUser} from "@/lib/auth";
import {db} from "@/lib/db";
import {accountQrRoles, playerAccessPath, validPlayerCode} from "@/lib/player-access";
import {ErrorNotice} from "@/components/ErrorNotice";
import {EmailLogin} from "@/components/EmailLogin";

export default async function PlayerAccess({params, searchParams}: {
  params: Promise<{code: string}>;
  searchParams: Promise<{error?: string; changed?: string}>;
}) {
  const {code} = await params;
  if (!validPlayerCode(code)) notFound();
  const target = await db().user.findFirst({
    where: {id: code, active: true, memberships: {some: {active: true, role: {in: accountQrRoles}}}},
    select: {id: true, name: true},
  });
  if (!target) notFound();
  const account = await currentUser();
  const path = playerAccessPath(target.id);
  if (account?.id === target.id) {
    if (account.mustChangePassword) redirect(`/account/password?returnTo=${encodeURIComponent(path)}`);
    const memberships = await db().eventMembership.findMany({where: {userId: account.id, active: true, event: {archivedAt: null}}, select: {eventId: true}});
    redirect(memberships.length === 1 ? `/events/${memberships[0].eventId}` : "/workspace");
  }
  const {error, changed} = await searchParams;
  return <main className="login"><section className="dossier" style={{minWidth: 0, overflowWrap: "anywhere"}}>
    <a className="wordmark" href="/">SC / ACCOUNT ACCESS</a>
    <h1>Sign in as {target.name}</h1>
    <p>Send a sign-in code to the email registered to this account.</p>
    {account && <p>You are currently signed in as {account.name}. Signing in here will switch this device to {target.name}.</p>}
    {changed && <p role="status">Password saved. Sign in with your new password.</p>}
    {error && <ErrorNotice>{error === "rate" ? "Too many attempts. Wait 15 minutes, then try again." : "Unable to sign in. Check your password and try again."}</ErrorNotice>}
    <EmailLogin playerCode={target.id}/>
    <details open={!!error||!!changed}><summary>Sign in with password</summary>
    <form action="/api/auth/login" method="post">
      <input type="hidden" name="playerCode" value={target.id}/>
      <label>Password<input name="password" type="password" autoComplete="current-password" required maxLength={128}/></label>
      <button>Sign in</button>
    </form>
    </details>
    <p>Need a password reset? Contact your event organizer.</p>
    <a href="/login">Sign in with another account</a>
  </section></main>;
}
