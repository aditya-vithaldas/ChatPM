'use client';
import {ScanSearch,Tag} from 'lucide-react';

const competitors=[
 {name:'OTTO',scope:'Homepage · Fashion · Living · Sport',status:'Promotion-led',tone:'coral',callouts:['Deals of the day, week, and month lead the page','Super-Sale and “Top deals & discounts” are prominent','At least 20% extra is called out across key categories'],updated:'Observed 29 Sep 2026'},
 {name:'Zalando',scope:'Homepage · Sale · Outlet categories',status:'Sale section active',tone:'sun',callouts:['Homepage leads with style discovery, not a broad discount','Sale is a permanent navigation destination','Outlet categories show deep discounts on selected products'],updated:'Observed 29 Sep 2026'},
 {name:'About You',scope:'Homepage · Women · Men · Shoes',status:'Discovery-led',tone:'violet',callouts:['Live Shopping and seasonal styling lead the homepage','Exclusive drops are promoted prominently','Sale is available in navigation, not the main homepage story'],updated:'Observed 29 Sep 2026'},
 {name:'Amazon DE',scope:'Homepage only',status:'Could not verify',tone:'blue',callouts:['Automated access was blocked by a browser challenge','No current promotion claim has been inferred','Retry later through an approved connected browser'],updated:'Scan attempted 29 Sep 2026'}
];

export default function CompetitiveWatch(){
 return <div className="cw-app">
  <header className="cw-heading"><div><p className="an-kicker">COMPETITIVE INTELLIGENCE</p><h1>A brief read of the market.</h1><p>One homepage and a few leading category surfaces per competitor—enough to spot sales, pricing posture, and the messages they are leading with.</p></div><span className="cw-complete"><ScanSearch size={15}/> One-off scan complete</span></header>
  <section className="cw-summary" aria-label="Competitive scan summary"><div><ScanSearch size={18}/><span><strong>4 competitors</strong><small>Homepage + top categories</small></span></div><div><Tag size={18}/><span><strong>2 sale-led surfaces</strong><small>OTTO is the strongest promotion signal</small></span></div><p>Germany · observed 29 September 2026 · summary only, no item-level crawl</p></section>
  <div className="cw-feed">{competitors.map((competitor,index)=><article className={`is-${competitor.tone}`} key={competitor.name}>
   <div className="cw-rank">{String(index+1).padStart(2,'0')}</div><div className="cw-company"><small>{competitor.updated}</small><h2>{competitor.name}</h2><p>{competitor.scope}</p><span>{competitor.status}</span></div>
   <div className="cw-callouts"><small>WHAT THEY ARE LEADING WITH</small><ul>{competitor.callouts.map(callout=><li key={callout}>{callout}</li>)}</ul></div>
  </article>)}</div>
 </div>;
}
