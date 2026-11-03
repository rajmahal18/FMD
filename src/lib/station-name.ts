// Keep the numbered stored name as the ordering key; expose only the real name.
const prefix=/^station\s*#?\s*(\d+[a-z]?)\s*[:.\-–—]\s*(?=\S)/i;
const collator=new Intl.Collator('en',{numeric:true,sensitivity:'base'});

export function stationDisplayName(name:string){return name.replace(prefix,'');}

export function stationStoredName(previous:string,edited:string){
 const numbered=previous.match(prefix);
 return numbered?`${numbered[0]}${stationDisplayName(edited)}`:edited;
}

export function displayStation<T extends {name:string}>(station:T):T;
export function displayStation<T extends {name:string}>(station:T|null):T|null;
export function displayStation<T extends {name:string}>(station:T|null):T|null{
 return station?{...station,name:stationDisplayName(station.name)}:null;
}

export function displayStations<T extends {name:string}>(stations:T[]):T[]{
 return [...stations].sort((a,b)=>collator.compare(a.name,b.name)).map(s=>displayStation(s));
}
