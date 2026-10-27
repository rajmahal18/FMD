import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {AppRouterContext} from 'next/dist/shared/lib/app-router-context.shared-runtime';
import {ActionFeedbackProvider} from '../../src/components/ActionFeedback';
import {ManagementForm} from '../../src/components/ManagementForm';
import {RaceAction} from '../../src/components/RaceAction';
const router={bfcacheId:'test',push:()=>{},refresh:()=>{},replace:()=>{},back:()=>{},forward:()=>{},prefetch:async()=>{}};
function Harness(){const [show,setShow]=useState(true);return <AppRouterContext.Provider value={router}><ActionFeedbackProvider><ManagementForm operation="test" label="Save station" confirm="Save station changes?"><input name="name" defaultValue="Station 1" required/></ManagementForm>{show&&<RaceAction actorId="test" eventId="test" input={{operation:'startChallenge',visitId:'test'}} label="Start challenge" description="Start Team Alpha at Laser Grid" onSuccess={()=>setShow(false)}/>}</ActionFeedbackProvider></AppRouterContext.Provider>;}
createRoot(document.getElementById('root')!).render(<Harness/>);

