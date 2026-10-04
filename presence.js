/* Contadores recibidos de un servicio compartido; nunca simulados. */
(()=>{
 const state={counts:{},active:null};window.ELITE_PRESENCE=state;
 const endpoint=window.ELITE_CONFIG?.presenceEndpoint;
 const enabled=typeof endpoint==='string'&&/^https:\/\//.test(endpoint);
 const session=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`;
 let version=0,timer;
 function paint(){document.querySelectorAll('[data-live]').forEach(el=>{const n=state.counts[el.dataset.live];el.textContent=Number.isInteger(n)&&n>=0?n.toLocaleString('es'):'Sin datos en vivo'})}
 async function sync(action='counts'){
  if(!enabled)return;
  const requestVersion=++version;
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,courseId:state.active,sessionId:session}),signal:AbortSignal.timeout(8000),cache:'no-store'});
   if(!response.ok)throw Error('Presence unavailable');
   const result=await response.json();
   if(requestVersion!==version)return;
   const stamp=Date.parse(result.observedAt);
   if(!Number.isFinite(stamp)||Math.abs(Date.now()-stamp)>90000)throw Error('Stale presence');
   state.counts=Object.fromEntries(Object.entries(result.counts||{}).filter(([id,n])=>window.CATALOG?.some(p=>p.id===id)&&Number.isInteger(n)&&n>=0));paint();
  }catch{if(requestVersion===version){state.counts={};paint()}}
 }
 state.enter=id=>{state.active=id;if(enabled)sync('enter')};
 state.leave=()=>{const courseId=state.active;state.active=null;if(enabled&&courseId)fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'leave',courseId,sessionId:session}),keepalive:true}).catch(()=>{})};
 document.addEventListener('visibilitychange',()=>{if(document.hidden){state.leave();clearInterval(timer)}else{timer=setInterval(()=>sync(state.active?'heartbeat':'counts'),20000);sync()}});
 window.addEventListener('pagehide',()=>state.leave());
 if(enabled){sync();timer=setInterval(()=>sync(state.active?'heartbeat':'counts'),20000)}
})();
