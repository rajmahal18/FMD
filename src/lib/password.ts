import { randomBytes, scrypt as rawScrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
const scrypt=promisify(rawScrypt);
export async function hashPassword(value:string){const salt=randomBytes(16).toString("hex");const key=await scrypt(value,salt,64) as Buffer;return `scrypt:${salt}:${key.toString("hex")}`;}
export async function verifyPassword(value:string,stored:string){const [kind,salt,hex]=stored.split(":");if(kind!=="scrypt"||!salt||!hex)return false;const candidate=await scrypt(value,salt,64) as Buffer;const expected=Buffer.from(hex,"hex");return expected.length===candidate.length&&timingSafeEqual(expected,candidate);}
export function tokenHash(token:string){return createHash("sha256").update(token).digest("hex");}
export function validPassword(value:string){return value.length>=12&&value.length<=128;}
