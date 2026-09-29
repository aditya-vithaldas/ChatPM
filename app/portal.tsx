'use client';
import {useEffect,useState} from 'react';
import {ArrowRight,AudioLines,ChartNoAxesCombined,ShieldCheck,Sparkles} from 'lucide-react';
import Analytics from './experience';
import './portal.css';

function Landing(){
 const [focus,setFocus]=useState({x:78,y:36});
 return <main className="meridian-home" onPointerMove={e=>{const r=e.currentTarget.getBoundingClientRect();setFocus({x:(e.clientX-r.left)/r.width*100,y:(e.clientY-r.top)/r.height*100});}}>
  <svg className="mh-threads" viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true">
   <defs><linearGradient id="mhg"><stop stopColor="#00f5d4"/><stop offset=".45" stopColor="#3a86ff"/><stop offset="1" stopColor="#8338ec"/></linearGradient></defs>
   {[0,1,2,3].map(i=><path key={i} d={`M-40 ${130+i*145} C 210 ${70+i*120}, 390 ${560-i*80}, ${focus.x*10} ${focus.y*7} S 820 ${160+i*100}, 1060 ${95+i*150}`}/>) }
  </svg>
  <header className="mh-nav"><a href="https://decisionos.me" className="mh-brand"><span><ChartNoAxesCombined size={19}/></span>meridian</a><div className="mh-actions"><button className="mh-login" disabled title="Google OAuth will be connected in a later release"><span>G</span> Continue with Google</button><a className="mh-demo-link" href="?demo=1">Browse demo data</a></div></header>
  <section className="mh-hero">
   <div className="mh-copy"><p className="mh-script">commerce intelligence</p><h1>Find the signal.<br/><em>Know what to do next.</em></h1><p className="mh-lede">Meridian combines industry knowledge, your business data, and external market signals—then brings the answer into the conversation while decisions are being made.</p><div className="mh-cta"><a href="?demo=1">Explore the live demo <ArrowRight size={18}/></a><span><ShieldCheck size={16}/> Private access will be limited to the owner account.</span></div></div>
   <div className="mh-proof" aria-label="Meridian product capabilities">
    <article><small><Sparkles size={15}/> PROACTIVE ANALYTICS</small><strong>Signals surface before somebody thinks to ask.</strong><p>Seasonality, incidents, campaigns, and market movements stay in one evidence trail.</p></article>
    <article><small><AudioLines size={15}/> LIVE ANALYST</small><strong>Bring your analyst into the call.</strong><p>Ask follow-ups in product, Zoom, Slack, or voice without rebuilding the analysis.</p></article>
    <div className="mh-signal"><span>Signal identified</span><b>Halloween campaign finished below plan</b><i>Evidence ready for review</i></div>
   </div>
  </section>
 </main>;
}

export default function MeridianPortal(){
 const [demo,setDemo]=useState<boolean|null>(null);
 useEffect(()=>setDemo(new URLSearchParams(location.search).has('demo')),[]);
 if(demo===null)return <div className="mh-loading"/>;
 return demo?<Analytics/>:<Landing/>;
}
