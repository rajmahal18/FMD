import Link from "next/link";

export default function Home(){
  return <main className="entry entry-themed">
    <div className="entry-backdrop" aria-hidden="true"/>
    <div className="classification classification-lockup">
      <span>OPERATION: CLASSIFIED / FIELD NETWORK</span>
      <img className="inline-emblem" src="/theme/spy-shield-emblem.png" alt="" width={42} height={42}/>
    </div>
    <div className="entry-content">
      <div className="hero">
        <span className="eyebrow">YOUR NEXT ASSIGNMENT AWAITS</span>
        <h1>SPY<br/><span>CHASE.</span></h1>
        <p>Real-world challenges.<br/>One coordinated operation.</p>
        <div className="hero-actions">
          <Link className="button" href="/login">Enter operation <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
      <aside className="hero-aside" aria-label="Operation visuals">
        <div className="hero-visual-card">
          <img src="/theme/spy-command-center.png" alt="" width={1672} height={941}/>
        </div>
        <div className="hero-visual-card compact">
          <img src="/theme/spy-icon-grid.png" alt="" width={1448} height={1086}/>
        </div>
      </aside>
    </div>
    <footer>
      <span>SECURE FIELD ACCESS</span>
      <span>Phase 10 / Animated Theme</span>
    </footer>
  </main>;
}
