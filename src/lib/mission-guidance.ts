/** Explain the next real action without changing race rules or granting client permissions. */
export function missionInstruction(status:string,captain:boolean,playing:boolean|undefined,fallback:string){
 if(status==='ARRIVED')return captain?'Choose the players below, then confirm to start the timer and read the instructions.':'Your captain is choosing the players. Stay with your team; the timer has not started.';
 if(status==='QUEUED')return 'Wait in the station holding area. The timer has not started. After admission, your captain confirms the lineup and starts.';
 if(status==='AWAITING_CONFIRMATION')return 'The timer has stopped. Stay at this station until the facilitator confirms your result. Your next destination will update here.';
 if(status==='ACTIVE')return playing===false?'Stay in the holding area while your teammates play.':'Follow the station instructions below. Your facilitator will stop the timer and confirm the result.';
 if(status==='HEAD_TO_STATION'&&!captain)return 'Stay with your team and go to the station below. Your captain handles the station QR and player selection.';
 return fallback;
}
