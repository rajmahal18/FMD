"use client";
import {useState} from "react";
import {ManagementForm} from "./ManagementForm";
import {randomStartingAssignments} from "@/lib/routes";

type Team={id:string;name:string;currentStart:string;currentRouteId:string|null;currentStartId:string|null};
type Route={id:string;name:string;setupToken:string;stations:{id:string;name:string;available:boolean}[]};
export function BulkStartingStations({eventId,teams,routes}:{eventId:string;teams:Team[];routes:Route[]}){
 const [routeId,setRouteId]=useState(routes[0]?.id??"");
 const [preview,setPreview]=useState<{routeId:string;setupToken:string;assignments:{teamId:string;startStationId:string}[]}|null>(null);
 const route=routes.find(r=>r.id===routeId);
 const current=preview?.routeId===routeId&&preview.setupToken===route?.setupToken?preview:null;
 const saved=!!preview&&!current&&preview.routeId===routeId&&teams.every(t=>t.currentRouteId===routeId&&preview.assignments.some(a=>a.teamId===t.id&&a.startStationId===t.currentStartId));
 const ready=!!teams.length&&!!route?.stations.length&&route.stations.every(s=>s.available);
 function randomize(){if(route&&ready)setPreview({routeId,setupToken:route.setupToken,assignments:randomStartingAssignments(teams.map(t=>t.id),route.stations.map(s=>s.id))});}
 return <section className="bulk-starts"><h2>First stations for all teams</h2>
 {!routes.length?<p>Create a Free roam route first.</p>:<>
 <label>Free roam route<select value={routeId} onChange={e=>{setRouteId(e.target.value);setPreview(null);}}>{routes.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
 <p>Randomize the first station for all {teams.length} teams. Starts are spread evenly across the route. After the first confirmed result, captains choose their remaining stations.</p>
 {!ready&&<p className="notice">Add teams and make sure every route station is configured and available.</p>}
 {saved&&<p role="status" className="feedback success-feedback">First stations saved for all {teams.length} teams.</p>}
 {!current&&<button type="button" disabled={!ready} onClick={randomize}>Randomize first stations</button>}
 {current&&<ManagementForm key={JSON.stringify(current)} operation="assignAllFreeRoutes" eventId={eventId} label="Save all team assignments">
 <input type="hidden" name="routeId" value={routeId}/><input type="hidden" name="setupToken" value={current.setupToken}/><input type="hidden" name="startingAssignments" value={JSON.stringify(current.assignments)}/>
 <p>This replaces the current route and first station for every team. Review before saving.</p>
 <button type="button" className="secondary" onClick={randomize}>Randomize again</button>
 <div className="bulk-start-preview" role="region" aria-label="All team starting stations" tabIndex={0}>{teams.map(team=>{const first=current.assignments.find(a=>a.teamId===team.id)?.startStationId;return <div className="bulk-start-row" key={team.id}><strong>{team.name}</strong><div><p className="fine">Current: {team.currentStart}</p><p>First station: <strong>{route?.stations.find(s=>s.id===first)?.name}</strong></p></div></div>;})}</div>
 </ManagementForm>}
 {!current&&<details open={saved}><summary>Current first stations</summary><div className="bulk-start-preview">{teams.map(team=><div className="bulk-start-row" key={team.id}><strong>{team.name}</strong><span>{team.currentStart}</span></div>)}</div></details>}
 </>}
 </section>;
}
