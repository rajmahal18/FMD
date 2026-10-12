import "server-only";
import { notFound } from "next/navigation";
import { requireMembership } from "./auth";
export async function requireOrganizer(eventId:string){const access=await requireMembership(eventId);if(access.m.role!=="ORGANIZER")notFound();return access;}
