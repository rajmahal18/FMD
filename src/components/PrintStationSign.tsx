"use client";
export function PrintStationSign({label="Print station sign"}:{label?:string}){return <div className="print-controls"><button type="button" onClick={()=>window.print()}>{label}</button></div>;}
