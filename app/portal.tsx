'use client';
import {useEffect,useState} from 'react';
import {ArrowRight,AudioLines,ChartNoAxesCombined,Mic,PhoneOff,PlayCircle,Sparkles,Video} from 'lucide-react';
import Analytics from './experience';
import './portal.css';

function Landing(){
 const [focus,setFocus]=useState({x:78,y:36});
 const assetBase=location.pathname.startsWith('/analytics')?'/analytics':'';
 return <main className="meridian-home" onPointerMove={e=>{const r=e.currentTarget.getBoundingClientRect();setFocus({x:(e.clientX-r.left)/r.width*100,y:(e.clientY-r.top)/r.height*100});}}>
  <svg className="mh-threads" viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true">
   <defs><linearGradient id="mhg"><stop stopColor="#00f5d4"/><stop offset=".45" stopColor="#3a86ff"/><stop offset="1" stopColor="#8338ec"/></linearGradient></defs>
   {[0,1,2,3].map(i=><path key={i} d={`M-40 ${130+i*145} C 210 ${70+i*120}, 390 ${560-i*80}, ${focus.x*10} ${focus.y*7} S 820 ${160+i*100}, 1060 ${95+i*150}`}/>) }
  </svg>
  <header className="mh-nav"><a href="https://decisionos.me" className="mh-brand"><span><ChartNoAxesCombined size={19}/></span>meridian</a><div className="mh-actions"><a className="mh-video-link" href={`${assetBase}/meridian-commerce-intelligence.mp4`}><PlayCircle size={17}/> Watch video</a><a className="mh-demo-link" href="?demo=1">Browse demo data</a></div></header>
  <section className="mh-hero">
   <div className="mh-copy"><p className="mh-script">commerce intelligence</p><h1>The eCommerce expertise<br/><em>your data has been missing.</em></h1><p className="mh-lede">Meridian gives growing commerce teams an expert view of performance—what matters, what they might be missing, and what to do next.</p><div className="mh-cta"><a href="?demo=1">Explore the live demo <ArrowRight size={18}/></a></div></div>
   <div className="mh-proof" aria-label="Meridian product capabilities">
    <article><small><Sparkles size={15}/> PROACTIVE ANALYTICS</small><strong>Signals surface before somebody thinks to ask.</strong><p>Seasonality, incidents, campaigns, and market movements stay in one evidence trail.</p><figure className="mh-proof-shot"><img src={`${assetBase}/meridian-proactive.png`} alt="Meridian proactive analytics showing conversion, purchase frequency, attribution, and ranked priorities."/></figure></article>
    <article><small><AudioLines size={15}/> LIVE ANALYST</small><strong>Bring your analyst into the call.</strong><p>Ask follow-ups in product, Zoom, Slack, or voice without rebuilding the analysis.</p><div className="mh-call-preview" aria-label="Zoom call where Maya asks Meridian a commerce question and the voice analyst answers"><header><span><Video size={13}/> Zoom call</span><i>3 participants</i></header><div className="mh-call-line is-maya"><b>M</b><p><small>Maya · Head of Sales</small>“Why did revenue fall last month?”</p></div><div className="mh-call-line is-meridian"><b><AudioLines size={15}/></b><p><small>Meridian · Voice analyst</small>“One fewer day explains most of the total gap. Western Europe and Fragrance still declined per day.”</p></div><footer><span><Mic size={13}/><Video size={13}/></span><i><PhoneOff size={13}/></i></footer></div></article>
    <div className="mh-signal"><span>Signal identified</span><b>Halloween campaign finished below plan</b><i>Evidence ready for review</i></div>
   </div>
  </section>
  <section className="mh-values" aria-labelledby="values-title"><p className="mh-script">why meridian</p><div className="mh-section-heading"><h2 id="values-title">Expert judgment, available when you need it.</h2><p>The depth of a specialist commerce team, made practical for a growing business.</p></div><div className="mh-value-grid"><article><span>01</span><h3>Expert, proactive analysis of your data.</h3><p>Industry experts codify how strong eCommerce analysis is done. Meridian combines that approach with your data and your team’s way of working.</p></article><article><span>02</span><h3>Talk to your data naturally.</h3><p>Ask questions and follow-ups as if you were working with a human analyst.</p></article><article><span>03</span><h3>Pay for usage, not seats.</h3><p>Spend on Meridian when your team uses it and gets value from it.</p></article></div></section>
  <section className="mh-team" aria-labelledby="team-title"><div className="mh-team-portrait"><img src={`${assetBase}/aditya-caricature.png`} alt="Caricature of Aditya Vithaldas."/></div><div><p className="mh-script">the team</p><h2 id="team-title">Built by someone who has lived the problem.</h2><h3>Aditya Vithaldas</h3><p>Product, engineering, and analytics leader with 15 years in eCommerce and marketplaces. Formerly at Zalando, eBay, and Flipkart.</p><a href="https://decisionos.me/#about">About Aditya <ArrowRight size={16}/></a></div></section>
 </main>;
}

export default function MeridianPortal(){
 const [demo,setDemo]=useState<boolean|null>(null);
 useEffect(()=>setDemo(new URLSearchParams(location.search).has('demo')),[]);
 if(demo===null)return <div className="mh-loading"/>;
 return demo?<Analytics/>:<Landing/>;
}
