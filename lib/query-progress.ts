/** Progress comes from actual server milestones, never a simulated timer. */
export async function readQueryResponse(response:Response,onStage:(step:number)=>void):Promise<any>{
 if(!response.headers.get('content-type')?.includes('application/x-ndjson'))return response.json();
 const reader=response.body?.getReader();if(!reader)throw Error('The response was interrupted. Please try again.');
 const decoder=new TextDecoder();let buffer='',result:any;
 const consume=(line:string)=>{if(!line.trim())return;const event=JSON.parse(line);if(event.type==='stage'&&Number.isInteger(event.step)&&event.step>=1&&event.step<=3)onStage(event.step);else if(event.type==='error')throw Error(event.error||'Please try again.');else if(event.type==='result')result=event;};
 try{for(;;){const {done,value}=await reader.read();buffer+=decoder.decode(value,{stream:!done});let newline;while((newline=buffer.indexOf('\n'))>=0){consume(buffer.slice(0,newline));buffer=buffer.slice(newline+1);}if(done)break;}consume(buffer);if(!result)throw Error('The response was interrupted. Please try again.');return result;}finally{reader.releaseLock();}
}
