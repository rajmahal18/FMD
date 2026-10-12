import { NextRequest,NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessionCookie } from "@/lib/auth";
import { tokenHash } from "@/lib/password";
import { isSameOrigin } from "@/lib/policy";
export async function POST(request:NextRequest){const origin=process.env.APP_ORIGIN;if(!origin||!isSameOrigin(request.headers.get("origin"),origin))return new NextResponse("Forbidden",{status:403});const token=request.cookies.get(sessionCookie)?.value;if(token)await db().session.deleteMany({where:{tokenHash:tokenHash(token)}});const response=NextResponse.redirect(new URL("/login",origin),303);response.cookies.set(sessionCookie,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:0});return response;}
