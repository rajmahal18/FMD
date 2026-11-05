const roleIcons:Record<string,{path:string;color:string}>={
 'Team Commander':{path:'m12 3 3 6 6 1-4.5 4.5L18 21l-6-3-6 3 1.5-6.5L3 10l6-1Z',color:'gold'},
 Captain:{path:'m5 9 7-5 7 5M5 15l7-5 7 5M5 21l7-5 7 5',color:'gold'},
 'Intel / Radio Officer':{path:'M8 11h8v10H8zM12 11V3m5 2a7 7 0 0 1 0 7M7 5a7 7 0 0 0 0 7M11 15h2m-2 3h2',color:'cyan'},
 'Recon Specialist':{path:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',color:'green'},
 'Technical Analyst':{path:'M7 7h10v10H7zM10 10h4v4h-4zM9 3v4m6-4v4M9 17v4m6-4v4M3 9h4m-4 6h4m10-6h4m-4 6h4',color:'violet'},
 'Support Specialist':{path:'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Zm0 5v8m-4-4h8',color:'green'},
 Organizer:{path:'M4 5h16v14H4zM4 10h16M9 10v9M8 3v4m8-4v4',color:'violet'},
 Judge:{path:"M4 21h16M8 17l9-9-4-4-9 9 4 4Zm2-10 7 7M3 18l3 3",color:"gold"},
 Facilitator:{path:'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Zm-4 9 3 3 5-6',color:'cyan'},
 Participant:{path:'M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',color:'cyan'},
};
const aliases:Record<string,string>={ORGANIZER:'Organizer',FACILITATOR:'Facilitator',PARTICIPANT:'Participant',AGENT:'Participant','Team member':'Participant','No squad role':'Participant','Squad handler':'Facilitator'};
export function RoleIcon({role}:{role:string}){
 const icon=roleIcons[aliases[role]??role]??roleIcons.Participant;
 return <svg className={`role-icon role-icon-${icon.color}`} aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={icon.path}/></svg>;
}
export function RoleLabel({role}:{role:string}){return <span className="role-label"><RoleIcon role={role}/><span>{aliases[role]&&['ORGANIZER','FACILITATOR','PARTICIPANT','AGENT'].includes(role)?aliases[role]:role}</span></span>;}
