'use client';
import {createContext,useContext,type ReactNode} from 'react';
const Context=createContext<string|null>(null);
export function useScreenPreview(){return useContext(Context)!==null;}
export function useScreenPreviewPath(){return useContext(Context);}
export function ScreenPreviewProvider({children}:{children:ReactNode}){
 return <Context.Provider value="/events/screen-preview"><div className="screen-preview-surface" onClickCapture={event=>{if((event.target as HTMLElement).closest('a')){event.preventDefault();event.stopPropagation();}}}>{children}</div></Context.Provider>;
}
