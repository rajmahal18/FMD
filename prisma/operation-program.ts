import type {EventProgramData} from '../src/lib/event-program';

// Organizer-supplied master schedule. Times are interpreted in the event timezone.
export const operationProgram:EventProgramData={
 title:'Financial Management Division Team Building 2026',theme:'Espionage',days:[
  {date:'2026-11-04',label:'Forum',sections:[{id:'forum-day1',title:'Financial Management Forum',items:[
   {id:'forum1-morning',start:'09:00',end:'12:00',title:'Seminar Day 1 · Morning session',description:'Seminar on RA 12009 — The New Government Procurement Act.'},
   {id:'lunch1',start:'12:00',end:'13:00',title:'Lunch break'},
   {id:'forum1-afternoon',start:'13:00',end:'16:00',title:'Seminar Day 1 · Afternoon session',description:'Continuation of the Financial Management Forum seminar.'}
  ]}]},
  {date:'2026-11-05',label:'Tactical Challenges',sections:[
   {id:'forum-day2',title:'Financial Management Forum',items:[
    {id:'forum2-morning',start:'09:00',end:'12:00',title:'Seminar Day 2 · Morning session',description:'Continuation of the Financial Management Forum seminar.'},
    {id:'lunch2',start:'12:00',end:'13:00',title:'Lunch break'},
    {id:'forum2-afternoon',start:'13:00',end:'16:00',title:'Seminar Day 2 · Afternoon session',description:'Continuation of the Financial Management Forum seminar.'}
   ]},
   {id:'tactical',title:'Pre-Race Tactical Challenges',items:[
    {id:'tactical-briefing',start:'16:00',end:'17:00',title:'Pre-Race Tactical Challenge',description:'Mission briefing and presentation of the squad banner and team chant guidelines.',details:[
     {label:'Mission briefer',value:'Chief Macabai M. Pangamadun'},
     {label:'Squad Banner Field Relay guidelines',value:'Alfayeed Nur K. Salik'},
     {label:'Team Chant guidelines',value:'Mia Fatma I. Tilendo'}
    ]},
    {id:'banner-relay',start:'17:00',end:'18:00',title:'Squad Banner Field Relay'},
    {id:'dinner2',start:'18:00',end:'19:00',title:'Dinner / Break'},
    {id:'war-cry',start:'19:00',end:'19:30',title:'War Cry'},
    {id:'spy-guidelines',start:'19:30',end:'20:30',title:'Spy Chase General Guidelines',details:[{label:'Presenter',value:'Chief Emraiza D. Mangacop'}]}
   ]}
  ]},
  {date:'2026-11-06',label:'Spy Chase & Gala',sections:[
   {id:'morning-mission',title:'Morning Mission',items:[
    {id:'assembly',start:'05:00',end:'05:30',title:'Morning assembly & Zumba',description:'Pre-Spy Chase preparations and warm-up.',details:[{label:'Zumba leads',value:'Ma. Carmela T. Santilla and squad representatives'}]},
    {id:'spy-chase',start:'05:30',end:'09:00',title:'Amazing Race: “Spy Chase”',description:'Outdoor and compound-wide physical and mental intelligence missions for the five teams.'}
   ]},
   {id:'recovery',title:'Recovery Break',items:[
    {id:'rest',start:'09:00',end:'16:00',title:'Rest & free time',description:'Freshen up, rest, recover, and prepare your gala attire.'}
   ]},
   {id:'gala',title:'The Agency Gala',description:'Main program: 4:00–8:30 PM. Afterglow reception follows until 10:00 PM.',items:[
    {id:'red-carpet',start:'16:00',end:'16:30',title:'Agent Briefing & Red Carpet Check-In',description:'Arrival of operatives, red carpet photo opportunities, and background spy music.'},
    {id:'parade',start:'16:30',end:'17:00',title:'Parade of Squads',description:'Presentation of squad and individual outfits in a fashionable manner.'},
    {id:'showcase',start:'17:00',end:'18:15',title:'Mission Execution: Gala Showcase',description:'Squad production numbers and performance showcases. Each team has 15 minutes.'},
    {id:'feast',start:'18:15',end:'19:00',title:'The Operative Feast',description:'Dinner accompanied by spy motion picture soundtracks.'},
    {id:'ice-breaker',start:'19:00',end:'19:40',title:'Ice Breaker',description:'An interactive team-building activity to challenge and energize the squads.'},
    {id:'awarding',start:'19:40',end:'20:20',title:'Declassification: Grand Awarding Ceremony & Photo Op',description:'Presentation of team, individual, minor, and major awards, followed by photo opportunities.'},
    {id:'closing',start:'20:20',end:'20:30',title:'Final Transmission',description:'Closing remarks and formal mission wrap-up.'},
    {id:'afterglow',start:'20:30',end:'22:00',title:'Afterglow Reception'}
   ]}
  ]}
 ]
};
