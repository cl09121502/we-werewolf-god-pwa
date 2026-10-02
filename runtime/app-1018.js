import{createSession,currentSession,listSessions,setCurrentSession,clearSessionRuntime,deleteSession,deleteAllSessions}from'./session-store.js';
const $=s=>document.querySelector(s);
function fmt(s){try{return new Date(s).toLocaleString('zh-TW')}catch{return s}}
function label(mode){return mode==='standalone'?'單機':mode==='controller'?'iPad 雲端主控':'電腦鏡像'}
function openGame(session){location.href=`game.html?app=1&sid=${encodeURIComponent(session.id)}&mode=${encodeURIComponent(session.mode)}`}
function render(){
 const cur=currentSession(),list=listSessions();$('#resume').disabled=!cur;$('#resumeInfo').textContent=cur?`目前賽事：${label(cur.mode)}｜第 ${cur.round||1} 局｜${fmt(cur.updatedAt)}`:'目前沒有進行中的賽事';
 $('#sessions').innerHTML=list.length?`<div class="small" style="margin-bottom:8px">目前共有 ${list.length} 個場次紀錄</div>${list.slice(0,20).map(s=>`<div class="session"><b>${label(s.mode)}｜第 ${s.round||1} 局</b><div class="small">${fmt(s.updatedAt)}｜${s.status}</div><div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:8px"><button class="btn ghost" data-open="${s.id}">開啟此賽事</button><button class="btn ghost" data-delete="${s.id}" style="border-color:#8a3f3f;color:#ffb4b4">刪除此場次</button></div></div>`).join('')}<button id="deleteAllSessions" class="btn ghost" style="width:100%;margin-top:10px;border-color:#8a3f3f;color:#ffb4b4">清除全部測試場次</button>`:'<div class="small">尚無賽事紀錄。</div>';
 document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{const s=setCurrentSession(b.dataset.open);if(s)openGame(s)});
 document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{const id=b.dataset.delete;if(!confirm('確定刪除此場次？此場次的本機設定、積分與測試資料會一併清除。'))return;deleteSession(id);render()});
 const all=$('#deleteAllSessions');if(all)all.onclick=()=>{if(!confirm(`目前共有 ${list.length} 個場次。確定全部刪除？`))return;if(!confirm('再次確認：全部測試場次刪除後無法復原。'))return;deleteAllSessions();render()};
}
$('#newStandalone').onclick=()=>{const s=createSession('standalone');clearSessionRuntime(s.id);openGame(s)};
$('#newController').onclick=()=>{const s=createSession('controller');clearSessionRuntime(s.id);openGame(s)};
$('#newMirror').onclick=()=>{const s=createSession('mirror');clearSessionRuntime(s.id);openGame(s)};
$('#resume').onclick=()=>{const s=currentSession();if(s)openGame(s)};
render();
