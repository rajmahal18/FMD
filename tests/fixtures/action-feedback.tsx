import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {AppRouterContext} from 'next/dist/shared/lib/app-router-context.shared-runtime';
import {ActionFeedbackProvider} from '../../src/components/ActionFeedback';
import {ManagementForm} from '../../src/components/ManagementForm';
import {RaceAction} from '../../src/components/RaceAction';
import {StartOperation} from '../../src/components/StartOperation';
const router={bfcacheId:'test',push:()=>{},refresh:()=>{window.dispatchEvent(new Event('test-refresh'));},replace:()=>{},back:()=>{},forward:()=>{},prefetch:async()=>{}};
function Harness(){const [show,setShow]=useState(true),[start,setStart]=useState<'blocked'|'ready'|null>(null);return <AppRouterContext.Provider value={router}><ActionFeedbackProvider><ManagementForm operation="test" label="Save station" confirm="Save station changes?"><input name="name" defaultValue="Station 1" required/></ManagementForm>{show&&<RaceAction actorId="test" eventId="test" input={{operation:'startChallenge',visitId:'test'}} label="Start challenge" description="Start Team Alpha at Laser Grid" onSuccess={()=>setShow(false)}/>}<button id="test-blocked-start" onClick={()=>setStart('blocked')}>Test blocked start</button><button id="test-ready-start" onClick={()=>setStart('ready')}>Test ready start</button>{start&&<StartOperation eventId="test" actorId="test" eventName="Test operation" ready={{teamCount:2,stationCount:7,issues:start==='blocked'?[{message:'Station 3B needs a facilitator.',href:'/events/test/staff'},{message:'Station 1 needs an arrival QR/code.',href:'/events/test/stations'}]:[]}}/>}</ActionFeedbackProvider></AppRouterContext.Provider>;}
createRoot(document.getElementById('root')!).render(<Harness/>);

