import {ManagementForm} from './ManagementForm';
import {SpyIcon} from './SpyIcon';

export function ParticipantVisibility({eventId,hideEventDetails,hideStationDetails,archived}:{eventId:string;hideEventDetails:boolean;hideStationDetails:boolean;archived:boolean}){
 return <section className="panel participant-visibility" aria-labelledby="participant-visibility-heading">
  <div className="section-heading"><div><div className="eyebrow">PARTICIPANT ACCESS</div><h2 id="participant-visibility-heading">Participant visibility</h2></div><SpyIcon name="staff"/></div>
  <p>Control what participants can see before the event. Organizers and facilitators keep their existing access.</p>
  {archived?<p className="notice">Restore this event before changing visibility.</p>:<ManagementForm key={`${hideEventDetails}:${hideStationDetails}`} operation="updateParticipantVisibility" eventId={eventId} label="Save participant visibility">
   <div className="visibility-option"><label className="check"><input type="checkbox" role="switch" aria-describedby="hide-event-details-help" name="hideEventDetails" defaultChecked={hideEventDetails}/><span>Hide event details</span></label><p id="hide-event-details-help">Hide the welcome briefing, event codename, dates and event program/schedule. The event name and branding remain visible.</p><span className={`tag ${hideEventDetails?'visibility-hidden':'visibility-shown'}`}>{hideEventDetails?'Currently hidden':'Currently visible'}</span></div>
   <div className="visibility-option"><label className="check"><input type="checkbox" role="switch" aria-describedby="hide-station-details-help" name="hideStationDetails" defaultChecked={hideStationDetails}/><span>Hide station details</span></label><p id="hide-station-details-help">Hide station names, locations, directions and route history. Participant station-code previews and check-in are blocked until you reveal them.</p><span className={`tag ${hideStationDetails?'visibility-hidden':'visibility-shown'}`}>{hideStationDetails?'Currently hidden':'Currently visible'}</span></div>
   <p className="fine">These settings stay in effect until you change them, including on the event date. Existing mission screens refresh within 10 seconds while connected. Details already seen cannot be recalled.</p>
  </ManagementForm>}
 </section>;
}
