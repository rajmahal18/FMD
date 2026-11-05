import {passwordSetupRequired} from './password-setup';
import {displayStations} from "@/lib/station-name";
import 'server-only';
import {db} from '@/lib/db';
import {InputError} from '@/lib/validation';
import {getRaceRule} from './race-ranking';
import {validatePenaltyButtons} from '@/lib/time-penalties';
import {samplePreviewStation,type ScreenPreviewData} from '@/lib/screen-preview';
export async function readScreenPreview(userId:string,eventId:string,view?:string):Promise<ScreenPreviewData>{return db().$transaction(async tx=>{
 const m=await tx.eventMembership.findUnique({where:{eventId_userId:{eventId,userId}},include:{user:{select:{active:true,mustChangePassword:true}},event:{select:{name:true,state:true,screenPreviewEnabled:true}}}});
 if(!m?.active||!m.user.active||(await passwordSetupRequired(tx,userId,eventId,m.user.mustChangePassword))||!['ORGANIZER','FACILITATOR'].includes(m.role))throw new InputError('Organizer or facilitator access is required for live screen previews.',403);
 if(!m.event.screenPreviewEnabled)throw new InputError('Live screen previews are disabled. Ask the organizer to enable them in Event setup.',403);
 if(view==='participant'&&m.role!=='ORGANIZER')throw new InputError('Only organizers can preview participant screens.',403);
 const selected=view==='participant'||!view&&m.role==='ORGANIZER'?'participant':'facilitator';
 const stations=await tx.station.findMany({where:{eventId,...(m.role==='FACILITATOR'?{assignments:{some:{membershipId:m.id}}}:{})},select:{id:true,name:true,location:true,briefing:true,codename:true,facilitatorInstructions:true,timeLimitMinutes:true,capacity:true,queueEnabled:true,timePenaltyButtons:true,brawn:true,brain:true,playersRequired:true,scoringMode:true,fixedPoints:true,minimumPoints:true,maximumPoints:true,allowAdjustments:true,maximumAdjustment:true},orderBy:{name:'asc'}}).then(displayStations);
 return {eventId,eventName:m.event.name,actualState:m.event.state,allowParticipant:m.role==='ORGANIZER',view:selected,rule:await getRaceRule(tx,eventId),checkedAt:new Date().toISOString(),stations:stations.length?stations.map(s=>({...s,location:s.location||'Sample location · not set yet',briefing:s.briefing||'Sample directions · station briefing is not set yet.',facilitatorInstructions:s.facilitatorInstructions||'Sample instructions · facilitator notes are not set yet.',timePenaltyButtons:validatePenaltyButtons(s.timePenaltyButtons)})):[samplePreviewStation]};
},{isolationLevel:'RepeatableRead',timeout:10000});}
