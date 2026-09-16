export const days = [
 {day:'Sep 09',sales:18240,previous:16500,traffic:8200,orders:228},
 {day:'Sep 10',sales:20480,previous:17800,traffic:9100,orders:256},
 {day:'Sep 11',sales:19840,previous:18100,traffic:8750,orders:248},
 {day:'Sep 12',sales:24640,previous:19400,traffic:10800,orders:308},
 {day:'Sep 13',sales:28960,previous:21500,traffic:12400,orders:362},
 {day:'Sep 14',sales:26720,previous:20800,traffic:11600,orders:334},
 {day:'Sep 15',sales:32480,previous:23900,traffic:13900,orders:406},
];
export const customers=[
 {name:'Olivia Chen',initials:'OC',location:'San Francisco, US',orders:12,spend:3840},
 {name:'Noah Williams',initials:'NW',location:'London, UK',orders:10,spend:3260},
 {name:'Amara Okafor',initials:'AO',location:'Lagos, NG',orders:9,spend:2880},
 {name:'Luca Rossi',initials:'LR',location:'Milan, IT',orders:8,spend:2640},
 {name:'Sofia Andersson',initials:'SA',location:'Stockholm, SE',orders:7,spend:2240},
];
export type AnalyticsView='sales'|'traffic'|'customers'|'questions';
export const questions=['Show me daily sales growth for the last seven days','Show me traffic for the last seven days','Show me the top users','What happened to sales on September 11?'];
export const totalSales=days.reduce((s,d)=>s+d.sales,0),totalPrevious=days.reduce((s,d)=>s+d.previous,0),totalTraffic=days.reduce((s,d)=>s+d.traffic,0),totalOrders=days.reduce((s,d)=>s+d.orders,0);
export const growth=(totalSales/totalPrevious-1)*100;
export const usd=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
export const analyticsTool={name:'show_analytics',description:'Bring sales, traffic, top users/customers, or sample questions prominently onto the screen. Always call when the user asks to see data. Return includes the exact demo data to interpret.',parameters:{type:'object',properties:{view:{type:'string',enum:['sales','traffic','customers','questions']}},required:['view'],additionalProperties:false}};
export function analyticsResult(view:unknown){if(!['sales','traffic','customers','questions'].includes(String(view)))throw Error('Choose sales, traffic, customers, or questions.');return {view,period:'September 9–15, 2026 (fixed seven-day demo)',currency:'USD',demo:true,...(view==='customers'?{ranking:'Spend during this demo week, descending',customers}:view==='questions'?{questions}:{days:days.map((d,i)=>({...d,dailySalesGrowth:i?(d.sales/days[i-1].sales-1)*100:null})),totalSales,totalPrevious,totalTraffic,totalOrders,weekOverWeekSalesGrowth:growth})};}
export const analyticsInstructions=`You are the live analyst for Meridian, an illustrative ecommerce company. Be clear, conversational, and brief: one or two useful observations, then listen. All figures are DEMO data for September 9–15 2026, a fixed seven-day snapshot, not current real business data. Call show_analytics immediately when asked to show sales/growth, traffic, top users/customers, or example questions. Use only tool data and the supplied dataset for facts. Top users means customers ranked by spend during the demo week. Daily growth means change from the preceding day; first day has no preceding day. Previous sales values are matched days from the preceding week. Do not invent causes or customer details. You can point out correlations, not causation. For unsupported periods or metrics explain what is available. If asked for sample questions show the questions view. If asked to stop, call stop_listening. Dataset: ${JSON.stringify(analyticsResult('sales'))}. Customers: ${JSON.stringify(customers)}.`;
export type Detail='daily'|'comparison'|'conversion'|'breakdown';
export type Screen={view:AnalyticsView;details:Detail[]};
export const screenTool={name:'show_analytics',description:'Control the analytics screen. Use replace for a new topic (clears old content). Use append for a follow-up or more detail about the current slide: retains the graph and adds a detail panel. For append omit view or use the current view. Details: daily (daily data), comparison (sales versus previous week), conversion (orders divided by sessions), breakdown (customer spending or daily data).',parameters:{type:'object',properties:{mode:{type:'string',enum:['replace','append']},view:{type:'string',enum:['sales','traffic','customers','questions']},detail:{type:'string',enum:['daily','comparison','conversion','breakdown']}},required:['mode'],additionalProperties:false}};
export function transitionScreen(screen:Screen,args:unknown):Screen {
 if(!args||typeof args!=='object')throw Error('Expected screen arguments');const a=args as Record<string,unknown>;
 if(a.mode==='replace'){analyticsResult(a.view);return {view:a.view as AnalyticsView,details:[]};}
 if(a.mode!=='append')throw Error('Choose replace or append');
 if(a.view&&a.view!==screen.view)throw Error('Append must keep the existing topic. Use replace for a new topic.');
 if(screen.view==='questions')throw Error('Choose a data topic first');
 const detail=(a.detail||'daily') as Detail;if(!['daily','comparison','conversion','breakdown'].includes(detail))throw Error('Unknown detail');
 if(detail==='comparison'&&screen.view!=='sales')throw Error('Previous-week comparisons are available only for sales');
 if(detail==='conversion'&&screen.view==='customers')throw Error('Customer-level sessions are not available');
 return {...screen,details:[...new Set([...screen.details,detail])]};
}
export function interpretQuestion(message:string,screen:Screen):Record<string,unknown>|null {
 const q=message.toLowerCase();if(/question|example|help/.test(q))return {mode:'replace',view:'questions'};
 const topic=/user|customer/.test(q)?'customers':/traffic|visit|session/.test(q)?'traffic':/sales|revenue|growth/.test(q)?'sales':undefined;
 const follow=/detail|more|break.?down|why|happen|compare|comparison|conversion|each day|daily data|september 11/.test(q);
 if(follow&&(!topic||topic===screen.view)&&screen.view!=='questions')return {mode:'append',detail:/conversion/.test(q)?'conversion':/compar|previous/.test(q)?'comparison':/break/.test(q)?'breakdown':'daily'};
 if(topic)return {mode:'replace',view:topic};return null;
}
