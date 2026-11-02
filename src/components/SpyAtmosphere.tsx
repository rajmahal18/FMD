"use client";

import {usePathname} from "next/navigation";

/** Decorative only: short route-entry effects stay at the edges, below the UI. */
export function SpyAtmosphere(){
 const pathname=usePathname();
 return <div key={pathname} className="spy-atmosphere" aria-hidden="true">
  <div className="spy-grid"/>
  <svg className="spy-fracture spy-fracture-top" viewBox="0 0 320 320" fill="none">
   <g className="spy-fracture-lines" stroke="currentColor" strokeWidth="1">
    <path d="M46 51 18 0M46 51 0 36M46 51 0 104M46 51 84 0M46 51 141 34 215 0M46 51 98 119 182 159 218 230 320 281M46 51 39 133 66 192 24 269 32 320M46 51 127 65 174 113 260 127 320 173"/>
    <path d="m18 0 4 29 24 22 17-26M0 104l28-18 11 47 31-40 28 26 11-42 18-12 14-31M39 133l39 23 20-37M66 192l52-21 64-12-8-46M24 269l61-17 33-81M182 159l44 5 34-37M218 230l-38 48 18 42M127 65l-1-38" opacity=".5"/>
   </g>
   <g className="spy-impact" transform="translate(46 51)"><circle r="5" fill="#071426"/><circle r="10" stroke="currentColor"/><circle r="16" stroke="currentColor" strokeDasharray="2 5"/></g>
   <path className="spy-glass-shard" d="m47 54 48 64-54 13Z" fill="currentColor" opacity=".14"/>
   <path className="spy-glass-shard spy-glass-shard-second" d="m50 50 76 17 45 44-72 6Z" fill="currentColor" opacity=".08"/>
  </svg>
  <svg className="spy-fracture spy-fracture-bottom" viewBox="0 0 320 320" fill="none">
   <g className="spy-fracture-lines" stroke="currentColor" strokeWidth="1">
    <path d="m46 51-28-51M46 51 0 36M46 51 0 104M46 51 84 0M46 51l81 14 47 48 86 14 60 46M46 51l-7 82 27 59-42 77 8 51M46 51l52 68 84 40 36 71 102 51"/>
    <path d="m39 133 39 23 20-37 11-42 18-12M66 192l52-21 64-12-8-46M24 269l61-17 33-81M182 159l44 5 34-37M218 230l-38 48 18 42" opacity=".5"/>
   </g>
   <g className="spy-impact" transform="translate(46 51)"><circle r="5" fill="#071426"/><circle r="11" stroke="currentColor"/><circle r="18" stroke="currentColor" strokeDasharray="3 7"/></g>
  </svg>
  <div className="spy-tracer spy-tracer-one"/><div className="spy-tracer spy-tracer-two"/>
 </div>;
}
