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
export const questions=['Show me daily sales growth for the last seven days','Show me traffic for the last seven days','Show me the top users','Compare sales and traffic as lines','Show conversion for the last three days','Make that a bar chart'];
export const totalSales=days.reduce((s,d)=>s+d.sales,0),totalPrevious=days.reduce((s,d)=>s+d.previous,0),totalTraffic=days.reduce((s,d)=>s+d.traffic,0),totalOrders=days.reduce((s,d)=>s+d.orders,0);
export const growth=(totalSales/totalPrevious-1)*100;
export const usd=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
export const analyticsTool={name:'show_analytics',description:'Bring sales, traffic, top users/customers, or sample questions prominently onto the screen. Always call when the user asks to see data. Return includes the exact demo data to interpret.',parameters:{type:'object',properties:{view:{type:'string',enum:['sales','traffic','customers','questions']}},required:['view'],additionalProperties:false}};
export function analyticsResult(view:unknown){if(!['sales','traffic','customers','questions'].includes(String(view)))throw Error('Choose sales, traffic, customers, or questions.');return {view,period:'September 9–15, 2026 (fixed seven-day demo)',currency:'USD',demo:true,...(view==='customers'?{ranking:'Spend during this demo week, descending',customers}:view==='questions'?{questions}:{days:days.map((d,i)=>({...d,dailySalesGrowth:i?(d.sales/days[i-1].sales-1)*100:null})),totalSales,totalPrevious,totalTraffic,totalOrders,weekOverWeekSalesGrowth:growth})};}
export const analyticsInstructions=`You are the live analyst for Meridian, an illustrative ecommerce company. Be clear, conversational, and brief: one or two useful observations, then listen. All figures are DEMO data for September 9–15 2026, a fixed seven-day snapshot, not current real business data. Call show_analytics immediately when asked to show sales/growth, traffic, top users/customers, or example questions. Use only tool data and the supplied dataset for facts. Top users means customers ranked by spend during the demo week. Daily growth means change from the preceding day; first day has no preceding day. Previous sales values are matched days from the preceding week. Do not invent causes or customer details. You can point out correlations, not causation. For unsupported periods or metrics explain what is available. If asked for sample questions show the questions view. If asked to stop, call stop_listening. Dataset: ${JSON.stringify(analyticsResult('sales'))}. Customers: ${JSON.stringify(customers)}.`;
export type Detail='daily'|'comparison'|'conversion'|'breakdown';
export type Metric='sales'|'traffic'|'orders'|'conversion'|'aov'|'growth';
export type ChartSpec={metrics:Metric[];kind:'area'|'line'|'bar';start:number;end:number;previous:boolean};
export type Screen={view:AnalyticsView;details:Detail[];chart?:ChartSpec};
export const metricInfo:Record<Metric,{label:string;unit:string;color:string}>={sales:{label:'Sales',unit:'USD',color:'#b7f478'},traffic:{label:'Traffic',unit:'sessions',color:'#9dbaed'},orders:{label:'Orders',unit:'orders',color:'#ffce84'},conversion:{label:'Conversion',unit:'%',color:'#d7b0ff'},aov:{label:'Average order value',unit:'USD',color:'#8de5d5'},growth:{label:'Daily sales growth',unit:'%',color:'#f4a8be'}};
export const chartDefaults=(view:AnalyticsView):ChartSpec=>({metrics:[view==='traffic'?'traffic':'sales'],kind:view==='traffic'?'bar':'area',start:9,end:15,previous:view==='sales'});
export const screenTool={name:'show_analytics',description:'Build the requested analytics chart from available demo data. replace selects a NEW topic and clears details; update changes the current graph (chart type, metric, date range or comparison) and preserves details; append keeps the graph and adds a detail panel. Chart metrics: sales USD, traffic sessions, orders count, conversion %, aov USD, growth daily sales change %. Supply up to two metrics for a dual-axis comparison. kind: area, line, bar. start/end: day-of-month within Sep 9–15, 2026. Last 3 days means Sep 13–15. previous adds matched previous-week sales only. Never invent unsupported data. For customers or questions use replace with that view; customer data covers the full demo week only.',parameters:{type:'object',properties:{mode:{type:'string',enum:['replace','update','append']},view:{type:'string',enum:['sales','traffic','customers','questions']},detail:{type:'string',enum:['daily','comparison','conversion','breakdown']},metrics:{type:'array',items:{type:'string',enum:['sales','traffic','orders','conversion','aov','growth']},minItems:1,maxItems:2,uniqueItems:true},kind:{type:'string',enum:['area','line','bar']},start:{type:'integer',minimum:9,maximum:15},end:{type:'integer',minimum:9,maximum:15},previous:{type:'boolean'}},required:['mode'],additionalProperties:false}};
export function transitionScreen(screen:Screen,args:unknown):Screen {
 if(!args||typeof args!=='object')throw Error('Expected screen arguments');const a=args as Record<string,unknown>;
 if(!['replace','update','append'].includes(String(a.mode)))throw Error('Choose replace, update, or append');
 if(Object.keys(a).some(k=>!['mode','view','detail','metrics','kind','start','end','previous'].includes(k)))throw Error('Unsupported chart setting');
 const view=(a.view||screen.view) as AnalyticsView;analyticsResult(view);
 if(a.mode!=='replace'&&view!==screen.view)throw Error('Use replace for a new topic.');
 const chartKeys=['metrics','kind','start','end','previous'];
 if((view==='customers'||view==='questions')&&chartKeys.some(k=>a[k]!==undefined))throw Error('Chart settings apply to time-series data only. Customer data covers the full demo week.');
 if(a.mode==='append'){
  if(chartKeys.some(k=>a[k]!==undefined))throw Error('Use update to change the graph; append retains it.');
  if(view==='questions')throw Error('Choose a data topic first');
  const detail=(a.detail||'daily') as Detail;if(!['daily','comparison','conversion','breakdown'].includes(detail))throw Error('Unknown detail');
  if(detail==='comparison'&&view!=='sales')throw Error('Previous-week comparisons are available only for sales');
  if(detail==='conversion'&&view==='customers')throw Error('Customer-level sessions are not available');
  return {...screen,details:[...new Set([...screen.details,detail])]};
 }
 if(view==='customers'||view==='questions')return {view,details:a.mode==='replace'?[]:screen.details};
 const base=a.mode==='replace'?chartDefaults(view):(screen.chart||chartDefaults(view));
 const chart={...base,...Object.fromEntries(chartKeys.filter(k=>a[k]!==undefined).map(k=>[k,a[k]]))} as ChartSpec;
 if(!Array.isArray(chart.metrics)||!chart.metrics.length||chart.metrics.length>2||new Set(chart.metrics).size!==chart.metrics.length||chart.metrics.some(m=>!Object.hasOwn(metricInfo,m)))throw Error('Choose one or two supported metrics.');
 if(!['line','bar','area'].includes(chart.kind))throw Error('Choose line, bar, or area.');
 if(!Number.isInteger(chart.start)||!Number.isInteger(chart.end)||chart.start<9||chart.end>15||chart.start>chart.end)throw Error('Demo dates run from September 9 to 15, 2026.');
 if(typeof chart.previous!=='boolean')throw Error('previous must be true or false');
 if(a.previous===undefined&&a.metrics!==undefined&&!chart.metrics.includes('sales'))chart.previous=false;
 if(chart.previous&&!chart.metrics.includes('sales'))throw Error('Previous-week data is available only for sales.');
 return {view,details:a.mode==='replace'?[]:screen.details,chart};
}
export function chartData(screen:Screen){const spec=screen.chart||chartDefaults(screen.view);return days.map((d,i)=>({...d,date:9+i,conversion:d.orders/d.traffic*100,aov:d.sales/d.orders,growth:i?(d.sales/days[i-1].sales-1)*100:null})).filter(d=>d.date>=spec.start&&d.date<=spec.end);}
export function chartSummary(screen:Screen){const rows=chartData(screen),sum=(m:'sales'|'traffic'|'orders'|'previous')=>rows.reduce((s,d)=>s+d[m],0);return {sales:sum('sales'),traffic:sum('traffic'),orders:sum('orders'),conversion:sum('orders')/sum('traffic')*100,aov:sum('sales')/sum('orders'),growth:rows.length>1?(rows.at(-1)!.sales/rows[0].sales-1)*100:null,previous:sum('previous')};}
export function screenResult(screen:Screen){const summary=chartSummary(screen),rows=chartData(screen);return {...analyticsResult(screen.view),screen,...(['sales','traffic'].includes(screen.view)?{period:`September ${screen.chart?.start||9}–${screen.chart?.end||15}, 2026 (demo)`,days:rows,rows,summary,totalSales:summary.sales,totalTraffic:summary.traffic,totalOrders:summary.orders,totalPrevious:summary.previous,weekOverWeekSalesGrowth:(summary.sales/summary.previous-1)*100,note:'summary.growth is first-to-last selected day; row growth is day-over-day, using the preceding dataset day. Conversion and average order value are weighted over selected days.'}:{})};}
export function metricFormat(metric:Metric,value:number|null){if(value===null)return '—';return metricInfo[metric].unit==='USD'?usd(value):metricInfo[metric].unit==='%'?`${value.toFixed(2)}%`:value.toLocaleString('en-US');}
export function interpretQuestion(message:string,screen:Screen):Record<string,unknown>|null {
 const q=message.toLowerCase();if(/question|example|help/.test(q))return {mode:'replace',view:'questions'};
 if(/last\s+(?:month|year)|last\s+(?:[89]|\d{2,}|eight|nine|ten|thirty)\s+days|yesterday|today|october|august|profit|margin|refund|campaign|channel/.test(q))throw Error('This demo contains sales, traffic, orders and derived metrics for September 9–15 only.');
 if(/user|customer/.test(q)){if(/bar|line|chart|last \d|sep/.test(q))throw Error('Customers are available as a ranked list for the full demo week.');return {mode:'replace',view:'customers'};}
 const metrics:Metric[]=[];
 if(/conversion|convert/.test(q))metrics.push('conversion');
 if(/average order|\baov\b/.test(q))metrics.push('aov');
 if(/growth/.test(q))metrics.push('growth');
 if(/sales|revenue/.test(q)&&!metrics.includes('growth'))metrics.push('sales');
 if(/traffic|visit|session/.test(q))metrics.push('traffic');
 if(/\borders?\b/.test(q)&&!metrics.includes('aov'))metrics.push('orders');
 const kind=/bar/.test(q)?'bar':/line/.test(q)?'line':/area/.test(q)?'area':undefined;
 const last=/last\s+(\d+|one|two|three|four|five|six|seven)\s+days?/.exec(q);const words:Record<string,number>={one:1,two:2,three:3,four:4,five:5,six:6,seven:7};const n=last?(words[last[1]]||Number(last[1])):undefined;
 const range=/(?:sep(?:tember)?\s*)?(\d{1,2})\s*(?:to|through|–|-)\s*(?:sep(?:tember)?\s*)?(\d{1,2})/.exec(q);
 const single=/sep(?:tember)?\s+(\d{1,2})/.exec(q);
 const previous=/previous week|last week/.test(q);
 const base=screen.chart||chartDefaults(screen.view);
 if(metrics.length>2)throw Error('Compare up to two metrics at a time.');
 if(n!==undefined&&(n<1||n>7))throw Error('Choose between one and seven days in this demo.');
 const config:Record<string,unknown>={};if(kind)config.kind=kind;if(n)Object.assign(config,{start:16-n,end:15});else if(range)Object.assign(config,{start:Number(range[1]),end:Number(range[2])});else if(single&&!/why|happen/.test(q))Object.assign(config,{start:Number(single[1]),end:Number(single[1])});
 if(previous)config.previous=!/hide|remove|without/.test(q);
 if(/add|also|overlay/.test(q)&&metrics.length){config.metrics=[...new Set([...base.metrics,...metrics])];}else if(metrics.length)config.metrics=metrics;
 const follow=/detail|more|break.?down|why|happen|each day|daily data/.test(q);
 if(follow&&!kind&&!last&&!range&&!previous&&(metrics.length===0||metrics.every(m=>base.metrics.includes(m)))&&screen.view!=='questions')return {mode:'append',detail:/conversion/.test(q)?'conversion':/break/.test(q)?'breakdown':'daily'};
 if(Object.keys(config).length){const nextMetrics=(config.metrics||base.metrics) as Metric[];const same=metrics.length===0||metrics.every(m=>base.metrics.includes(m))||/add|also|overlay|compare|versus|\bvs\b/.test(q);return {mode:same&&['sales','traffic'].includes(screen.view)?'update':'replace',...(!same||!['sales','traffic'].includes(screen.view)?{view:nextMetrics[0]==='traffic'?'traffic':'sales'}:{}),...config};}
 if(/reset|whole week|all seven|full week/.test(q))return {mode:'update',start:9,end:15};
 return null;
}
