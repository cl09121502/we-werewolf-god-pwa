const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=process.argv[2]||'_site';
const Status=require(path.resolve(dir,'js/status-engine-043.js'));
const html=fs.readFileSync(path.join(dir,'game.html'),'utf8');
const gameSeats=()=>Array.from({length:12},(_,i)=>({no:i+1,role:i===0?'mechanical_wolf':i===3?'psychic':'villager',alive:true,tags:[]}));
function check(s,step,n,night=s.night,suppressed=false){
 s.actions.push({night,step,action:'查驗',targets:[n],effectiveTargets:[n],suppressed});
}
const s={active:true,night:1,seats:gameSeats(),special:{},actions:[]};
check(s,'psychic_choose',9);
Status.apply(s);
assert.deepEqual(s.seats[8].tags,['被查驗'],'first-night psychic target 9');
Status.apply(s);
assert.equal(s.seats[8].tags.filter(x=>x==='被查驗').length,1,'re-render does not duplicate checked');
check(s,'mech_skill_check',7);
Status.apply(s);
assert.ok(s.seats[6].tags.includes('被查驗'),'mechanical copy of psychic tags target');
check(s,'seer',8);Status.apply(s);
assert.ok(s.seats[7].tags.includes('被查驗'),'seer target marked');
s.night=2;Status.apply(s);
assert.ok(!s.seats[8].tags.includes('被查驗'),'previous night check status cleared');
check(s,'psychic',6);Status.apply(s);
assert.ok(s.seats[5].tags.includes('被查驗'),'second-night psychic target 6');
check(s,'mech_skill_check',10,2,true);Status.apply(s);
assert.ok(!s.seats[9].tags.includes('被查驗'),'suppressed check does not mark target');
check(s,'lucky_check',2);Status.apply(s);
assert.ok(s.seats[1].tags.includes('被查驗'),'lucky role check target');
check(s,'gargoyle_choose',3);Status.apply(s);
assert.ok(s.seats[2].tags.includes('被查驗'),'gargoyle check target');
const handler=html.match(/^async function confirmWin\(side\).*$/m);
assert.ok(handler,'winner handler exists');
const cues=[];
const ctx={
 game:{lastDeathVoice:'1號玩家遭到公投出局。請發表遺言。'},
 detectVictory:()=>null,
 confirm:()=>true,
 winnerSeats:side=>side==='wolf'?[2,5]:[1,3,7],
 tour:{round:4},
 speak:(voice,after)=>cues.push({voice,after}),
 speakSequence:()=>{throw Error('winner announcements must not queue last death')},
 toast:()=>{}
};
vm.runInNewContext(handler[0]+';globalThis.runWin=confirmWin;',ctx);
(async()=>{
 await ctx.runWin('good');await ctx.runWin('wolf');
 assert.equal(cues.length,2);
 assert.deepEqual(cues.map(c=>c.voice),['好人陣營獲勝。','狼人陣營獲勝。']);
 assert.equal(cues[0].after.type,'settleWin');
 assert.equal(cues[1].after.type,'settleWin');
 assert.equal(cues[0].after.round,4);
 const mapLine=html.split('\n').find(line=>line.startsWith('const FIXED_VOICE_CLIPS='));
 assert.ok(mapLine,'fixed voice clip map exists');
 const catalog=vm.runInNewContext('('+mapLine.replace(/^const FIXED_VOICE_CLIPS=/,'').replace(/;$/,'')+')');
 const good=catalog['好人陣營獲勝。'],wolf=catalog['狼人陣營獲勝。'];
 assert.ok(good&&wolf,'both sides have recorded Rex sound source');
 assert.ok(good.url&&wolf.url&&good.e>good.s&&wolf.e>wolf.s,'winner clips have valid ranges');
 assert.notDeepEqual({u:good.url,s:good.s,e:good.e},{u:wolf.url,s:wolf.s,e:wolf.e},'winner voices have distinct ranges');
 const exile=catalog['1號玩家遭到公投出局。請發表遺言。'];
 if(exile)for(const c of [good,wolf])if(c.url===exile.url)
  assert.ok(c.e<=exile.s||c.s>=exile.e,'winner voice cannot overlap 1號 exile segment');
 console.log('PASS: both wins announce only victory; no stale 1號; correct Rex cue ranges; first/second night checked; no duplicate tags; suppressions and other check roles');
})().catch(e=>{console.error(e);process.exitCode=1});
