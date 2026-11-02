"use client";
import {useState} from "react";
import {ErrorNotice} from "./ErrorNotice";

export function EmailLogin({playerCode,returnTo=""}:{playerCode?:string;returnTo?:string}) {
 const [email,setEmail]=useState("");
 const [challenge,setChallenge]=useState("");
 const [code,setCode]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 async function submit(operation:"send"|"verify") {
  setBusy(true);setError("");
  try {
   const response=await fetch("/api/auth/otp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({operation,email,playerCode,returnTo,challenge,code}),signal:AbortSignal.timeout(20000)});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"Unable to sign in. Please try again.");
   if(data.redirect){window.location.assign(data.redirect);return;}
   setChallenge(data.challenge);setCode("");setMessage("If this account is eligible, a code has been sent to its registered email. It expires in 10 minutes. Check your spam folder too.");
  } catch(e){setError(e instanceof Error?e.message:"Connection failed. Please try again.");}
  finally{setBusy(false);}
 }
 return <div>{error&&<ErrorNotice>{error}</ErrorNotice>}{message&&<p role="status">{message}</p>}
  <form onSubmit={e=>{e.preventDefault();void submit(challenge?"verify":"send");}}>
   {!playerCode&&!challenge&&<label>Email<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={254}/></label>}
   {challenge&&<label>Email code<input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,""))} required autoFocus/><span className="fine">Enter the 6-digit code from your email.</span></label>}
   <button disabled={busy}>{busy?"Please wait…":challenge?"Verify code & sign in":"Send email code"}</button>
   {challenge&&<><button type="button" className="secondary dark-outline" disabled={busy} onClick={()=>void submit("send")}>Resend code</button>{!playerCode&&<button type="button" className="secondary dark-outline" disabled={busy} onClick={()=>{setChallenge("");setMessage("");setError("");}}>Use another email</button>}</>}
  </form>
 </div>;
}
