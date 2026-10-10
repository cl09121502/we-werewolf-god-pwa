const assert=require('node:assert/strict'), fs=require('node:fs'),path=require('node:path');
const dir=process.argv[2]||'_site';
const st=require(path.resolve(dir,'js/status-engine-043.js'));
const html=fs.readFileSync(path.join(dir,'game.html'),'utf8');
const comp=fs.readFileSync(path.join(dir,'js/competition-1018.js'),'utf8');
const base=()=>({
 active:true,night:1,
 seats:Array.from({length:12},(_,i)=>({no:i+1,role:i===0?'mechanical_wolf':i===3?'guard':i===6?'witch':'villager',tags:[]})),
 actions:[],special:{mechanicalCopiedRole:'guard',lastDreamSeat:null}
});
const roleName=r=>({guard:'守衛',witch:'女巫'})[r]||r;
function add(s,step,action,targets=[],night=s.night){s.actions.push({step,action,night,targets,effectiveTargets:targets,suppressed:false})}
const s=base();
add(s,'mech_copy','模仿',[4]);add(s,'wolf','狼刀',[5]);add(s,'witch_poison','使用毒藥',[7]);add(s,'guard','守護',[3]);
st.apply(s,{roleName,isWolfRole:r=>r==='werewolf'});
assert.ok(s.seats[3].tags.includes('被機械狼模仿'),'4號應顯示被模仿');
assert.ok(s.seats[0].tags.includes('機械狼模仿：4號／守衛'),'機械狼應標出模仿目標與身份');
assert.ok(s.seats[4].tags.includes('被刀'),'5號被刀應顯示');
assert.ok(s.seats[6].tags.includes('被毒'),'7號被毒應顯示');
assert.ok(s.seats[2].tags.includes('被守'),'3號被守應顯示');
st.apply(s,{roleName});assert.equal(s.seats[4].tags.filter(x=>x==='被刀').length,1,'重繪不重複');
add(s,'witch_cure','使用解藥',[]);st.apply(s,{roleName});
assert.ok(s.seats[4].tags.includes('被救'),'被救顯示於被刀的狼刀目標');
s.night=2;st.apply(s,{roleName});assert.ok(!s.seats[4].tags.includes('被刀'),'新夜移除舊被刀');
assert.ok(s.seats[3].tags.includes('被機械狼模仿'),'跨夜保留模仿關係');
add(s,'mech_skill_check','查驗',[8]);s.special.mechanicalLastCheckRole='witch';st.apply(s,{roleName});
assert.ok(s.seats[0].tags.includes('機械狼查驗：8號／女巫'),'學通靈師夜查應顯示具體身分');
s.seats[2].tags.push('手動註記');st.apply(s,{roleName});assert.ok(s.seats[2].tags.includes('手動註記'));
const src=fs.readFileSync(path.join(dir,'js/status-tags.js'),'utf8');
assert.ok(!src.includes('renderPlayers=function('),'retired patch must not wrap render');
assert.ok(!comp.includes('function redrawTagDom'),'competing postrender renderer removed');
assert.ok(comp.includes('WEWGStatus.apply(game'),'pre-render derivation present');
assert.ok(html.includes('js/status-engine-043.js?v=0.4.3'),'page loads status engine');
assert.ok(comp.includes("start:'機械狼請睜眼。請問是否發動技能？'"),'generic mechanical announcement');
for(const k of ['mech_skill_check','mech_skill_guard','mech_skill_poison','mech_skill_knife']){
  const tag="}else if(key==='"+k+"'){";
  const index=comp.indexOf(tag);
  assert.ok(index>=0,'special role stage '+k);
  const excerpt=comp.slice(index,index+365);
  assert.ok(excerpt.includes("start:'機械狼請睜眼。請問是否發動技能？'"),k+' must not announce learned skill aloud');
}
assert.ok(html.includes("speak('要競選警長的人請舉手，三秒後天亮請亮燈。三、二、一。')"),'sheriff exact prompt');
assert.ok(html.includes('此新台詞尚無 Rex 正式錄音'),'TTS mismatch disclosed');
console.log('PASS derived tags: copy target/role, knife, poison, guard, antidote, next night, repeat render, mechanic inspection; generic skill audio and sheriff text');
