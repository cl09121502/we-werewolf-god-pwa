const PWA_VERSION='PWA-ALPHA-0.4.1';
const isStandalone=window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone===true;
window.WE_PWA={version:PWA_VERSION,isStandalone};

async function registerPWA(){
  if(!('serviceWorker' in navigator)) return;
  try{
    const reg=await navigator.serviceWorker.register('./sw.js?v=0.4.1',{scope:'./',updateViaCache:'none'});
    reg.update().catch(()=>{});
    let refreshing=false;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(refreshing) return;
      refreshing=true;
      if(!sessionStorage.getItem('WE_SW_RELOAD_041')){
        sessionStorage.setItem('WE_SW_RELOAD_041','1');
        location.reload();
      }
    });
    if(reg.waiting) reg.waiting.postMessage?.({type:'SKIP_WAITING'});
  }catch(e){ console.warn('PWA service worker registration failed',e); }
}
registerPWA();
if(navigator.storage?.persist){ navigator.storage.persist().catch(()=>{}); }
