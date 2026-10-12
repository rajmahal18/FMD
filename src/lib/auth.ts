import "server-only";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { db } from "./db";
import { tokenHash } from "./password";
export const sessionCookie=process.env.NODE_ENV==="production"?"__Host-spy-session":"spy-session";
export async function currentUser(){const token=(await cookies()).get(sessionCookie)?.value;if(!token)return null;const session=await db().session.findUnique({where:{tokenHash:tokenHash(token)},include:{user:true}});return session&&session.expiresAt>new Date()&&session.user.active?session.user:null;}
export async function requireUser(){const user=await currentUser();if(!user)redirect("/login");if(user.mustChangePassword)redirect("/account/password");return user;}
export async function requireMembership(eventId:string){const user=await requireUser();const m=await db().eventMembership.findUnique({where:{eventId_userId:{eventId,userId:user.id}},include:{event:true,team:true,assignments:{include:{station:true}}}});if(!m?.active)notFound();return {user,m};}
