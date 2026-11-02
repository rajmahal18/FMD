import {SpyIcon} from './SpyIcon';

export type StationRequirementsData={brawn?:number|null;brain?:number|null;playersRequired?:number|null};
function Rating({label,emoji,value}:{label:string;emoji:string;value:number}){
 return <div className="station-requirement"><div className="station-requirement-label">{label} <strong>{value}/5</strong></div><span className="station-rating-icons" aria-hidden="true"><span>{emoji.repeat(value)}</span><span className="station-rating-empty">{emoji.repeat(5-value)}</span></span></div>;
}
export function StationRequirements({station,compact=false}:{station:StationRequirementsData;compact?:boolean}){
 if(station.brawn==null&&station.brain==null&&station.playersRequired==null)return null;
 return <div className={`station-requirements${compact?' compact':''}`} role="group" aria-label="Station requirements">
  {station.brawn!=null&&<Rating label="Brawn" emoji="👊" value={station.brawn}/>}
  {station.brain!=null&&<Rating label="Brain" emoji="🧠" value={station.brain}/>}
  {station.playersRequired!=null&&<div className="station-requirement station-player-count"><span className="station-requirement-label">Players needed</span><strong><SpyIcon name="people"/>{station.playersRequired} <span>{station.playersRequired===1?'player':'players'}</span></strong></div>}
 </div>;
}
export function StationRequirementsFields({station}:{station:StationRequirementsData}){
 return <section className="station-requirements-editor" aria-label="Participant station requirements"><h3>What participants need</h3><p className="fine">Shown with the station details. Ratings describe the physical and mental challenge; they do not affect scoring. Leave blank if not set.</p><div className="station-details-grid">
  {([{name:'brawn',label:'Brawn',emoji:'👊'},{name:'brain',label:'Brain',emoji:'🧠'}] as const).map(field=><label key={field.name}>{field.emoji} {field.label} · 0–5<select name={field.name} defaultValue={station[field.name]??''}><option value="">Not set</option>{Array.from({length:6},(_,value)=><option key={value} value={value}>{value}/5 {field.emoji.repeat(value)}</option>)}</select></label>)}
  <label>Number of players · optional<input name="playersRequired" type="number" min={1} max={1000} step={1} defaultValue={station.playersRequired??''}/></label>
 </div><p className="fine">5 icons means maximum intensity. Player count is for this challenge, separate from simultaneous-team capacity.</p></section>;
}
