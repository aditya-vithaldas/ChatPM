import assert from 'node:assert/strict';
import {transitionScreen,screenResult} from '../lib/analytics.ts';
import {validateGenerated} from '../lib/generated-data.ts';
const data={title:'Return rate by device',period:'Last 14 days',label:'Return rate',unit:'%',aggregation:'average',kind:'bar',points:[{label:'Mobile',value:4.7},{label:'Desktop',value:2.8}]};
let s=transitionScreen({view:'sales',details:[]},{mode:'replace',display:'chart',generated:data});
assert.deepEqual(screenResult(s).generated.points,data.points);
s=transitionScreen(s,{mode:'update',display:'chart',kind:'pie'});assert.deepEqual(s.generated.points,data.points);assert.equal(s.generated.kind,'pie');
for(const invalid of [{...data,points:[]},{...data,points:[{label:'bad',value:NaN}]},{...data,kind:'invalid'}])assert.throws(()=>validateGenerated(invalid));
assert.throws(()=>transitionScreen(s,{mode:'replace',display:'chart',notice:'Unavailable'}));
console.log('Generated data validation, screen replacement and chart-only preservation passed');

const {widgetAction}=await import('../lib/query-progress.ts');
const response={type:'result',mode:'replace',display:'number',generated:{...data,unit:'USD',aggregation:'sum',kind:'line',points:[{label:'Yesterday',value:1200}]},sql:'SELECT ...',metrics:{sqlMs:3},dataset:{rows:10000000}};
const scalar=transitionScreen(s,widgetAction(response));assert.equal(scalar.display,'number');assert.equal(scalar.generated.points[0].value,1200);
console.log('Streamed database response metadata cannot leak into widget settings');
