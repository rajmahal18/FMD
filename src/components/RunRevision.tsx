'use client';
import {createContext,useContext} from 'react';
const RunRevision=createContext(0);
export function RunRevisionProvider({revision,children}:{revision:number;children:React.ReactNode}){
 return <RunRevision.Provider value={revision}>{children}</RunRevision.Provider>;
}
export function useRunRevision(){return useContext(RunRevision);}
