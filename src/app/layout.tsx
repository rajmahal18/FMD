import './record-lists.css';
import {ErrorModalProvider} from '@/components/ErrorNotice';
import './error-modal.css';
import type { Metadata } from "next";
import "./globals.css";
import "./player.css";
import "./voting.css";
export const metadata:Metadata={title:"Spy Chase | Operation Classified",description:"Field operations for station-based team events",robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><head><link rel="stylesheet" href="/fonts/fonts.css"/></head><body><ErrorModalProvider>{children}</ErrorModalProvider></body></html>;}
