export type RouteMode="FIXED"|"CIRCULAR"|"FREE";
export function randomStartingAssignments(teamIds:string[],stationIds:string[],random:()=>number=Math.random){
 if(!teamIds.length||new Set(teamIds).size!==teamIds.length)throw new Error("Choose distinct teams.");
 routeOrder("FREE",stationIds);
 function shuffle(ids:string[]){const result=[...ids];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
 const teams=shuffle(teamIds),stations=shuffle(stationIds);
 return teams.map((teamId,i)=>({teamId,startStationId:stations[i%stations.length]}));
}
export function routeOrder(mode:RouteMode,ids:string[],start?:string|null):string[]{
 if(!ids.length||new Set(ids).size!==ids.length)throw new Error("Choose at least one station, without duplicates.");
 if(mode!=="FIXED"&&mode!=="CIRCULAR"&&mode!=="FREE")throw new Error("Choose a valid route mode.");
 if(mode!=="CIRCULAR"){if(start&&(mode!=="FREE"||!ids.includes(start)))throw new Error("Choose a valid starting station for a circular or free-roam route.");return [...ids];}
 const index=ids.indexOf(start??"");if(index<0)throw new Error("Choose a starting station from this route.");return [...ids.slice(index),...ids.slice(0,index)];
}
// Completion is supplied only by confirmed server outcomes (Phase 5), never by client arrival.
export function routeProgress(mode:RouteMode,ids:string[],completed:ReadonlySet<string>,unavailable:ReadonlySet<string>=new Set(),startStationId?:string|null){
 const remaining=ids.filter(id=>!completed.has(id));const requiredStart=mode==="FREE"&&startStationId&&!completed.has(startStationId);const eligible=requiredStart?remaining.filter(id=>id===startStationId):mode==="FREE"?remaining:remaining.slice(0,1);
 return {complete:remaining.length===0,completedCount:ids.length-remaining.length,unlocked:eligible.filter(id=>!unavailable.has(id)),paused:eligible.filter(id=>unavailable.has(id)),locked:remaining.filter(id=>!eligible.includes(id))};
}
export function admission(capacity:number|null,queueEnabled:boolean,occupancy:number,queue:string[],teamId:string):"ADMIT"|"WAIT"|"FULL"{
 if(capacity!==null&&(!Number.isInteger(capacity)||capacity<1))throw new Error("Invalid station capacity.");
 if(!Number.isInteger(occupancy)||occupancy<0)throw new Error("Invalid occupancy.");
 if(capacity===null)return "ADMIT";
 if(queueEnabled&&queue.length&&queue[0]!==teamId)return "WAIT";
 if(occupancy<capacity)return "ADMIT";
 return queueEnabled?"WAIT":"FULL";
}
