// Regression checks, run on the exact built GitHub Pages site.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=process.argv[2]||'_site',html=fs.readFileSync(path.join(root,'game.html'),'utf8'),comp=fs.readFileSync(path.join(root,'js/competition-1018.js'),'utf8');
const mapLine=html.split('\n').find(x=>x.startsWith('const FIXED_VOICE_CLIPS='));
assert.ok(mapLine,'voice catalog exists');
const clips=vm.runInNewContext('('+mapLine.replace(/^const FIXED_VOICE_CLIPS=/,'').replace(/;$/,'')+')');
const rex=[
 '機械狼請睜眼。你學到的身份是——',
 '機械狼請睜眼。這是你的帶刀手勢。',
 '機械狼請睜眼。請問是否發動技能？',
 '機械狼請睜眼。請使用你學到的查驗技能。',
 '機械狼請睜眼。請使用你學到的守護技能。',
 '機械狼請睜眼。請使用你學到的毒藥技能。',
 '機械狼確認，請閉眼。',
 '獵人請睜眼。請確認目前開槍狀態。',
 '狼人請睜眼。請選擇今晚擊殺的玩家。'
];
for(const line of rex){const c=clips[line];assert.ok(c&&c.url&&Number.isFinite(c.s)&&c.e>c.s,'MISSING CLIP '+line)}
assert.ok(comp.includes("a.push('mech_pack');"),'second night starts with mechanical knife hand');
assert.match(comp,/a\.push\('wolf','witch_cure','witch_poison','psychic'\);\s*a\.push\(mechSkillStep1018\(s\)\|\|'mech_skill_prompt'\);\s*if\(s\.seats\.some\(x=>x\.role==='hunter'\)\)a\.push\('hunter'\)/,'mechanical second-night order');
assert.ok(comp.includes("start:'機械狼請睜眼。你學到的身份是——'"),'first-night learning result has real clip');
assert.ok(comp.includes("start:'機械狼請睜眼。這是你的帶刀手勢。'"),'knife hand cue has real clip');
assert.ok(html.includes("speak('天亮請睜眼，並請亮燈。')") && html.includes("speak('退水的玩家，請亮藍燈。')"),'new light prompts');
assert.ok(html.includes('NEW_COMPETITION_VOICE'),'new prompts are explicitly supported');
assert.ok(!html.includes('playMediaSegment(makeMedia(c.url)'),'old concurrent echo channels removed');
assert.ok(html.includes("speak(n+'號玩家遭到公投出局"),'exile result uses captured selected seat');
// Exercise the actual renderSheriff implementation with mocked HTML selects. Rerender must not reset 7 to 1.
const sheriffLine=html.split('\n').find(x=>x.startsWith('function renderSheriff()'));
assert.ok(sheriffLine);
const els={};for(const id of ['sheriffSeat','daySeat','mvpSeat','specialTarget','shotTarget','shotShooter','sheriffLabel']){
 const el={value:'7',options:Array.from({length:12},(_,i)=>({value:String(i+1)})),textContent:''};
 Object.defineProperty(el,'innerHTML',{set(_){el.value='1'}});
 els[id]=el;
}
const ctx={$:id=>els[id.slice(1)],seatOpts:()=>'',game:{sheriff:null,badgeTorn:false},renderDayOrderState:()=>{},renderSpecialDay:()=>{els.specialTarget.value='1';els.shotTarget.value='1';els.shotShooter.value='1'}};
vm.runInNewContext(sheriffLine+';globalThis.testRender=renderSheriff;',ctx);
ctx.testRender();
for(const id of ['sheriffSeat','daySeat','mvpSeat','specialTarget','shotTarget','shotShooter'])assert.equal(els[id].value,'7','selection lost on '+id);
// Exercise the new single-segment player. No shared media instance, stop resolves pending playback.
const line=html.split('\n').find(x=>x.startsWith('function playMediaSegment('));
assert.ok(line);
const media=[];
class FakeAudio{
 constructor(){this.readyState=2;this.currentTime=0;this.listeners={};media.push(this)}
 addEventListener(k,fn){(this.listeners[k]??=[]).push(fn)}
 removeEventListener(k,fn){this.listeners[k]=(this.listeners[k]||[]).filter(x=>x!==fn)}
 pause(){this.paused=true}
 async play(){this.started=true}
 fire(k){(this.listeners[k]||[]).forEach(fn=>fn())}
}
const sandbox={makeMedia:()=>new FakeAudio(),waitMediaReady:async()=>{},activeMedia:[],console,setTimeout,clearTimeout};
vm.runInNewContext('let activeSegmentStop=null;'+line+';globalThis.start=playMediaSegment;globalThis.cancel=()=>activeSegmentStop?.();',sandbox);
(async()=>{
 const cue={url:'test',s:12.5,e:15.5};
 const first=sandbox.start(null,cue);await Promise.resolve();await Promise.resolve();
 assert.equal(media[0].currentTime,12.5);
 sandbox.cancel();assert.equal(await first,false);
 const second=sandbox.start(null,cue);await Promise.resolve();await Promise.resolve();
 assert.equal(media.length,2);
 media[1].currentTime=15.48;media[1].fire('timeupdate');
 assert.equal(await second,true);
 assert.equal(sandbox.activeMedia.length,0);
 console.log('PASS: 9 recorded Rex cues, mechanics order, first-night result, 2 light prompts, persistent seat 7, cancel/isolation audio playback');
})().catch(e=>{console.error(e);process.exitCode=1});
