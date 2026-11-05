export const stationReleaseDelayMs=5000;
export function timerSnapshot(startedAt:Date,minutes:number|null){return {timerSnapshotAt:startedAt,timerDeadlineAt:minutes===null?null:new Date(startedAt.getTime()+minutes*60000)};}
export function stoppedTime(now:Date,deadline:Date|null){return deadline&&deadline<now?deadline:now;}
export function releasePending(releaseAt:string|Date|null|undefined,now:Date|number=Date.now()){return !!releaseAt&&new Date(releaseAt).getTime()>(typeof now==='number'?now:now.getTime());}
