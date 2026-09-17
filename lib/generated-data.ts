export type GeneratedData={title:string;period:string;label:string;unit:'USD'|'%'|'count';aggregation:'sum'|'average';kind:string;secondaryLabel?:string;points:{label:string;value:number;secondary?:number}[]};
const kinds=['area','line','bar','horizontal','stacked','pie','donut','scatter','funnel','heatmap','histogram','radar'];
export function validateGenerated(value:unknown):GeneratedData{
 const d=value as GeneratedData;if(!d||typeof d!=='object')throw Error('Expected chart data');
 for(const k of ['title','period','label'] as const)if(typeof d[k]!=='string'||!d[k].trim()||d[k].length>160)throw Error('Invalid chart label');
 if(!['USD','%','count'].includes(d.unit)||!['sum','average'].includes(d.aggregation)||!kinds.includes(d.kind))throw Error('Invalid chart settings');
 if(!Array.isArray(d.points)||!d.points.length||d.points.length>120||d.points.some(p=>!p||typeof p.label!=='string'||p.label.length>100||typeof p.value!=='number'||!Number.isFinite(p.value)||Math.abs(p.value)>1e12||p.secondary!==undefined&&(typeof p.secondary!=='number'||!Number.isFinite(p.secondary)||Math.abs(p.secondary)>1e12)))throw Error('Invalid chart values');
 if(d.secondaryLabel!==undefined&&(typeof d.secondaryLabel!=='string'||d.secondaryLabel.length>100))throw Error('Invalid secondary label');
 if(['pie','donut','funnel'].includes(d.kind)&&d.points.some(p=>p.value<0))throw Error('This chart requires non-negative values');
 return {title:d.title,period:d.period,label:d.label,unit:d.unit,aggregation:d.aggregation,kind:d.kind,secondaryLabel:d.secondaryLabel,points:d.points.map(p=>({label:p.label,value:p.value,...(p.secondary!==undefined?{secondary:p.secondary}:{})}))};
}
export function generateDemo(question:string,previous?:GeneratedData):GeneratedData{
 const q=question.toLowerCase();const kind=/donut|doughnut/.test(q)?'donut':/pie/.test(q)?'pie':/horizontal/.test(q)?'horizontal':/stack/.test(q)?'stacked':/heat.?map/.test(q)?'heatmap':/scatter/.test(q)?'scatter':/funnel/.test(q)?'funnel':/radar/.test(q)?'radar':/histogram/.test(q)?'histogram':/area/.test(q)?'area':/bar/.test(q)?'bar':/line|trend/.test(q)?'line':previous?.kind||'bar';
 if(previous)return {...previous,kind,...(['scatter','stacked'].includes(kind)&&!previous.secondaryLabel?{secondaryLabel:'Comparison',points:previous.points.map((p,i)=>({...p,secondary:Math.round(p.value*(.7+i*.04))}))}:{})};
 const label=/profit/.test(q)?'Profit':/refund/.test(q)?'Refunds':/margin/.test(q)?'Margin':/conversion/.test(q)?'Conversion':/retention/.test(q)?'Retention':/churn/.test(q)?'Churn':/traffic|visit|session/.test(q)?'Traffic':/orders/.test(q)?'Orders':/sales|revenue/.test(q)?'Sales':question.replace(/^(show me|show|what is|give me)\s+/i,'').slice(0,70)||'Performance';
 const unit=/margin|conversion|retention|churn/.test(q)?'%':/traffic|visit|session|orders|users/.test(q)?'count':'USD';
 const n=Math.min(90,Math.max(1,Number(/last\s+(\d+)\s+days/.exec(q)?.[1]||7)));
 const period=/last month/.test(q)?'Last month':/quarter/.test(q)?'Last quarter':/year/.test(q)?'Last year':/today/.test(q)?'Today':/yesterday/.test(q)?'Yesterday':`Last ${n} days`;
 const labels=/region|geograph/.test(q)?['North America','Europe','Asia Pacific','Latin America','Middle East & Africa']:/countr/.test(q)?['United States','United Kingdom','Germany','India','Australia']:/cit(?:y|ies)/.test(q)?['New York','London','Berlin','Mumbai','Sydney']:/channel|campaign/.test(q)?['Organic search','Paid search','Social','Email','Direct']:/device/.test(q)?['Mobile','Desktop','Tablet']:/product|categor/.test(q)?['Apparel','Electronics','Home','Beauty','Other']:/cohort/.test(q)?['New customers','Returning customers','Loyal customers']:/funnel/.test(q)?['Visits','Product views','Add to cart','Checkout','Purchase']:Array.from({length:/year/.test(q)?12:/month/.test(q)?30:n},(_,i)=>`Day ${i+1}`);
 let seed=2166136261;for(const c of (label+period+labels.join()))seed=Math.imul(seed^c.charCodeAt(0),16777619);const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296;};
 const points=labels.map((name,i)=>({label:name,value:unit==='%'?Math.round((2+random()*8)*100)/100:Math.round((unit==='USD'?17000:6000)*(0.65+random()*.7)*(1+i*.035)),...(/scatter|stack|compare/.test(q)?{secondary:Math.round(4000+random()*9000)}:{})}));
 if(kind==='funnel')points.sort((a,b)=>b.value-a.value);
 if(label==='Sales'&&labels[0]==='North America'&&n===7&&period==='Last 7 days'){let used=0;points.forEach((p,i)=>{p.value=i===points.length-1?171360-used:Math.round(171360*[.38,.27,.19,.10,.06][i]);used+=p.value;});}
 return validateGenerated({title:`${label}${/region|geograph/.test(q)?' by region':/channel/.test(q)?' by channel':''}`,period,label,unit,aggregation:unit==='%'?'average':'sum',kind,points,...(/scatter|stack|compare/.test(q)?{secondaryLabel:'Comparison'}:{})});
}
