export const sessionCookie=process.env.NODE_ENV==='production'?'__Host-spy-session':'spy-session';
export const organizerCookie=process.env.NODE_ENV==='production'?'__Host-spy-organizer':'spy-organizer';
export const switchedTokenPrefix='act_';
export function isSwitchedToken(token:string){return /^act_[A-Za-z0-9_-]{43}$/.test(token);}
export const accountUserHeader='x-spy-account-user';
export const cookieOptions={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/'};
