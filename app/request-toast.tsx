import {Check,LoaderCircle,X} from 'lucide-react';
const steps=['Understanding your request','Creating your query','Retrieving the data','Analyzing the results','Showing your answer'];
export default function RequestToast({activity,dismiss}:{activity:{step:number;error?:string}|null;dismiss:()=>void}){
 if(!activity)return null;const done=activity.step===5,failed=!!activity.error;
 return <aside className={`an-request-toast ${done?'is-complete':''} ${failed?'is-error':''}`} aria-label="Request progress">
  <div className="an-request-icon">{done?<Check size={18}/>:failed?<X size={18}/>:<LoaderCircle size={18}/>}</div>
  <div className="an-request-body"><p role="status" aria-live="polite" aria-atomic="true">{failed?'Couldn’t complete this request':done?'Your answer is ready':steps[activity.step]}</p><small>{failed?activity.error:done?'On screen now':`Step ${activity.step+1} of ${steps.length}`}</small><div className="an-request-steps" aria-hidden="true">{steps.map((label,i)=><span key={label} title={label} className={i<activity.step?'is-done':i===activity.step?'is-current':''}/>)}</div></div>
  <button onClick={dismiss} aria-label="Dismiss request progress"><X size={15}/></button>
 </aside>;
}
