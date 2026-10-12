export type Role="ORGANIZER"|"FACILITATOR"|"PARTICIPANT";
export function mayOperateStation(role:Role,assigned:boolean){return role==="ORGANIZER"||(role==="FACILITATOR"&&assigned);}
export function isSameOrigin(origin:string|null,expected:string){try{return !!origin&&new URL(origin).origin===new URL(expected).origin;}catch{return false;}}
