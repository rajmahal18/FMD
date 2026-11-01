import {Shell} from '@/components/Shell';
import {EventProgram} from '@/components/EventProgram';
import {requireMembership} from '@/lib/auth';
import {db} from '@/lib/db';
import {initialProgramDay,parseEventProgram} from '@/lib/event-program';
import './program.css';

export default async function ProgramPage({params}:{params:Promise<{eventId:string}>}){
 const {eventId}=await params;const {user,m}=await requireMembership(eventId);
 const saved=await db().eventProgram.findUnique({where:{eventId},select:{content:true}});
 const program=saved?parseEventProgram(saved.content):null;
 return <Shell name={user.name} title="Event Program" role={m.role} eventId={eventId}>{program?<EventProgram program={program} initialDay={initialProgramDay(program,m.event.timezone)} timezone={m.event.timezone}/>:<div className="program-empty"><h2>Program not published yet</h2><p>The organizer has not added a schedule for this event. Check back for the daily activities and timings.</p></div>}</Shell>;
}
