/** Explain the next real action without changing race rules or granting client permissions. */
export function missionInstruction(status:string,captain:boolean,playing:boolean|undefined,fallback:string){
 if(status==='ARRIVED')return 'Stay with your team. The assigned facilitator will confirm who plays and start the challenge.';
 if(status==='QUEUED')return 'Wait in the station holding area. The timer has not started. After admission, the facilitator confirms the lineup and starts play.';
 if(status==='AWAITING_CONFIRMATION')return 'The timer has stopped. Stay at this station until the facilitator confirms your result. Your next destination will update here.';
 if(status==='ACTIVE')return playing===false?'Stay in the holding area while your teammates play.':'Follow the station instructions below. Your facilitator will stop the timer and confirm the result.';
 if(status==='HEAD_TO_STATION'&&!captain)return 'Stay with your team and go to the station below. Your captain records the station QR arrival; the facilitator confirms who plays.';
 return fallback;
}
