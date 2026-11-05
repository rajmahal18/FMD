export const stationPhotoLimit=5*1024*1024;
export function stationPhotoUrl(eventId:string,stationId:string,key:string|null|undefined){
 return key?`/api/events/${encodeURIComponent(eventId)}/stations/${encodeURIComponent(stationId)}/photo?v=${encodeURIComponent(key)}`:null;
}
