const paths={
 mission:"M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Zm-4 9 3 3 5-6",
 setup:"M4 5h16v14H4zM4 10h16M9 10v9",
 people:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m8-7.87a4 4 0 0 1 0 7.75",
 station:"M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0ZM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
 route:"M5 3v12a4 4 0 0 0 4 4h10M5 3l3 3M5 3 2 6M19 19l-3-3m3 3-3 3M14 5h5v5h-5z",
 staff:"M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Zm0 5v4m-3 0h6",
 rank:"M8 21v-8H3v8m13 0V4h-5v17m13 0v-5h-5v5M1 21h22",
 contact:"M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8m-6 9v-2a6 6 0 0 1 12 0v2m3-11 2 2 4-4m-5 9h5",
 vote:"m9 9 3 3 7-8M4 5h5M4 5v16h16V11M8 16h8",
 tools:"m14 5 5 5M4 20l5-1L21 7l-4-4L5 15l-1 5Z",
 archive:"M3 4h18v5H3zM5 9v12h14V9M9 13h6",
 scan:"M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M7 7h3v3H7zm7 0h3v3h-3zm-7 7h3v3H7zm7 0h3v3h-3z",
 history:"M3 11a9 9 0 1 1 2 7M3 4v7h7m2-4v5l3 2",
} as const;
export type SpyIconName=keyof typeof paths;
export function SpyIcon({name,className=""}:{name:SpyIconName;className?:string}){return <svg className={`spy-icon ${className}`} aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]}/></svg>;}
