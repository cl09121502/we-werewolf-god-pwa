const META_KEY='WE_APP_META_V1';
const safeParse=(s,f)=>{try{return JSON.parse(s)??f}catch{return f}};
const nowIso=()=>new Date().toISOString();
const uuid=()=>globalThis.crypto?.randomUUID?.()||`sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
function loadMeta(){return safeParse(localStorage.getItem(META_KEY),{version:1,currentSessionId:null,sessions:{}})}
function saveMeta(m){localStorage.setItem(META_KEY,JSON.stringify(m));return m}
export function createSession(mode='standalone'){const m=loadMeta(),id=uuid();m.sessions[id]={id,mode,createdAt:nowIso(),updatedAt:nowIso(),round:1,status:'active'};m.currentSessionId=id;saveMeta(m);return m.sessions[id]}
export function currentSession(){const m=loadMeta();return m.currentSessionId?m.sessions[m.currentSessionId]||null:null}
export function setCurrentSession(id){const m=loadMeta();if(!m.sessions[id])return null;m.currentSessionId=id;m.sessions[id].updatedAt=nowIso();saveMeta(m);return m.sessions[id]}
export function closeSession(id){const m=loadMeta();if(m.sessions[id]){m.sessions[id].status='closed';m.sessions[id].updatedAt=nowIso()}if(m.currentSessionId===id)m.currentSessionId=null;saveMeta(m)}
export function listSessions(){return Object.values(loadMeta().sessions).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)))}
export function gameStateKey(id){return `WE_GAME_STATE_${id}`}
export function tourStateKey(id){return `WE_LOCAL_TOUR_${id}`}
export function clearSessionRuntime(id){localStorage.removeItem(gameStateKey(id));localStorage.removeItem(tourStateKey(id))}
export function deleteSession(id){const m=loadMeta();if(!m.sessions[id])return false;delete m.sessions[id];if(m.currentSessionId===id)m.currentSessionId=null;saveMeta(m);for(const k of [gameStateKey(id),tourStateKey(id),`WE_CLOUD_ROOM_${id}`,`WE_CLOUD_PIN_${id}`,`WE_RANDOM_ROLE_MAP_${id}`])localStorage.removeItem(k);return true}
export function deleteAllSessions(){const m=loadMeta();for(const id of Object.keys(m.sessions||{}))for(const k of [gameStateKey(id),tourStateKey(id),`WE_CLOUD_ROOM_${id}`,`WE_CLOUD_PIN_${id}`,`WE_RANDOM_ROLE_MAP_${id}`])localStorage.removeItem(k);m.sessions={};m.currentSessionId=null;saveMeta(m);return true}
export function markRound(id,round){const m=loadMeta();if(m.sessions[id]){m.sessions[id].round=Number(round)||1;m.sessions[id].updatedAt=nowIso();saveMeta(m)}}
export function diagnostic(){const m=loadMeta();return{current:m.currentSessionId,count:Object.keys(m.sessions).length}}
