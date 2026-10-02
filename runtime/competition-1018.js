/* WE狼殺上帝 PWA Alpha 0.4 - 10/18 competition patch
 * Focus modules: 機械狼×通靈師 / 夢魘×攝夢
 * Also: robust player status tags + optional random role distribution.
 */
(()=>{
  'use strict';
  const PATCH='WEWG-COMPETITION-1018-0.4';
  if(typeof RE==='undefined'||typeof game==='undefined'||typeof bindings==='undefined'){
    console.warn(PATCH,'runtime not ready');return;
  }
  const clone=x=>{try{return structuredClone(x)}catch(e){return JSON.parse(JSON.stringify(x))}};
  const roleLabel=id=>ROLE?.[id]?.name_zh_tw||id||'尚未取得';
  const latest=(s,step)=>[...(s?.actions||[])].reverse().find(a=>Number(a.night)===Number(s.night)&&a.step===step);
  const alive=(s,no)=>s.seats?.some(x=>Number(x.no)===Number(no)&&x.alive!==false);
  const seat=(s,no)=>s.seats?.find(x=>Number(x.no)===Number(no));
  const currentProfile=s=>RE.setupProfile(s||game);

  function copiedSkillName(r){
    if(r==='psychic'||r==='seer')return'通靈查驗（每晚查具體身份）';
    if(r==='guard')return'守衛守護（每晚可守，不可連續兩晚同一人）';
    if(r==='witch')return'女巫毒藥（一瓶）';
    if(r==='hunter')return'獵人開槍（被刀／放逐可開槍，被毒不可）';
    if(r&&RE.isWolfRole(r))return'狼人刀法';
    return r?`${roleLabel(r)}技能`:'尚未取得技能';
  }

  const oldBuildNightFlow=RE.buildNightFlow.bind(RE);
  const oldRecordAction=RE.recordAction.bind(RE);
  const oldNightDeaths=RE.nightDeaths.bind(RE);
  const oldCanShoot=RE.canShoot.bind(RE);

  function mechSkillStep1018(s){
    RE.ensure(s);const r=s.special.mechanicalCopiedRole;
    if(!r||Number(s.night)<2)return null;
    if(r==='psychic'||r==='seer')return'mech_skill_check';
    if(r==='guard')return'mech_skill_guard';
    if(r==='witch')return (s.special.mechanicalPoisonUsed||s.special.mechanicalCopiedSkillUsed)?null:'mech_skill_poison';
    if(r==='hunter')return null;
    if(RE.isWolfRole(r))return s.special.mechanicalCopiedSkillUsed?null:'mech_skill_knife';
    return null;
  }
  RE.copiedSkillStep=mechSkillStep1018;

  RE.buildNightFlow=function(s){
    RE.ensure(s);
    if(s.special.bloodMoonDelayed)return oldBuildNightFlow(s);
    const p=RE.setupProfile(s),first=Number(s.night)===1,a=['dark'];
    if(p==='mechanical'){
      if(first){
        a.push('mech_copy');
        if(s.seats.some(x=>x.alive&&x.role==='guard'))a.push('guard');
        a.push('wolf','witch_cure','witch_poison');
        if(s.seats.some(x=>x.alive&&x.role==='hunter'))a.push('hunter');
        a.push('psychic_choose','psychic_result','mech_result');
      }else{
        const m=mechSkillStep1018(s);if(m)a.push(m);
        a.push('mech_pack');
        if(s.seats.some(x=>x.alive&&x.role==='guard'))a.push('guard');
        a.push('wolf','witch_cure','witch_poison','psychic');
      }
      a.push('dawn');return a;
    }
    if(p==='nightmare'){
      a.push('nightmare','dreamer','wolf','witch_cure','witch_poison','seer','hunter','dawn');
      return a;
    }
    return oldBuildNightFlow(s);
  };

  RE.recordAction=function(s,step,action,targets=[]){
    RE.ensure(s);const sp=s.special,raw=(targets||[]).map(Number);
    if(step==='nightmare'&&action==='恐懼'){
      const n=raw[0];
      if(!n||!alive(s,n))return{ok:false,error:'只能選擇一名存活玩家'};
      if(Number(sp.lastFearSeat)===Number(n))return{ok:false,error:'夢魘不可連續兩晚恐懼同一名玩家'};
      const eff=[RE.effectiveTarget(s,n)];
      const rec={night:s.night,step,action,targets:raw,effectiveTargets:eff,suppressed:false};
      s.actions.push(rec);sp.currentFearSeat=eff[0];sp.lastFearSeat=eff[0];
      return{ok:true,record:rec};
    }
    if(step==='mech_skill_guard'){
      if(action==='守護'){
        const n=raw[0];if(!n||!alive(s,n))return{ok:false,error:'只能選擇一名存活玩家'};
        const eff=RE.effectiveTarget(s,n);
        if(Number(sp.mechanicalLastGuardNight)===Number(s.night)-1&&Number(sp.mechanicalLastGuardSeat)===Number(eff))return{ok:false,error:'機械狼學守衛後，不可連續兩晚守護同一名玩家'};
        const rec={night:s.night,step,action,targets:raw,effectiveTargets:[eff],suppressed:RE.isStepSuppressed(s,step)};
        s.actions.push(rec);
        if(!rec.suppressed){sp.mechanicalGuardSeat=eff;sp.mechanicalLastGuardSeat=eff;sp.mechanicalLastGuardNight=Number(s.night);}
        sp.mechanicalCopiedSkillUsed=false;
        return{ok:true,record:rec};
      }
      if(action==='不使用'){
        const rec={night:s.night,step,action,targets:[],effectiveTargets:[],suppressed:RE.isStepSuppressed(s,step)};s.actions.push(rec);sp.mechanicalGuardSeat=null;sp.mechanicalCopiedSkillUsed=false;return{ok:true,record:rec};
      }
    }
    const out=oldRecordAction(s,step,action,raw);
    if(!out?.ok)return out;
    const rec=out.record,eff=rec?.effectiveTargets?.[0];
    if(step==='mech_skill_poison'&&action==='使用毒藥'){sp.mechanicalPoisonUsed=true;sp.mechanicalCopiedSkillUsed=true;}
    if(step==='mech_skill_check'&&action==='查驗'&&eff){const r=seat(s,eff)?.role||'';sp.mechanicalLastCheckSeat=eff;sp.mechanicalLastCheckRole=r;sp.mechanicalLastCheckNight=Number(s.night);sp.mechanicalCopiedSkillUsed=false;}
    if(step==='mech_copy'&&sp.mechanicalCopiedRole){sp.mechanicalHunterGun=sp.mechanicalCopiedRole==='hunter';sp.mechanicalPoisonUsed=false;}
    return out;
  };

  RE.nightDeaths=function(s){
    RE.ensure(s);const out=new Set(oldNightDeaths(s));const sp=s.special;
    const mg=Number(sp.mechanicalGuardSeat||0);const dream=Number(sp.currentDreamSeat||0);
    if(mg&&mg!==dream){
      const poisons=[latest(s,'witch_poison'),latest(s,'mech_skill_poison'),latest(s,'lucky_poison')];
      for(const p of poisons){
        if(!p||p.suppressed||p.action!=='使用毒藥')continue;
        const n=Number(p.effectiveTargets?.[0]||0);if(n!==mg)continue;
        const target=seat(s,n);if(p.step==='witch_poison'&&target?.role==='demon_hunter')continue;
        out.add(n);
        sp.deathCauses[String(n)]=p.step==='witch_poison'?'poison':p.step==='mech_skill_poison'?'mechanical_poison':'lucky_poison';
      }
    }
    return[...out].sort((a,b)=>a-b);
  };

  RE.canShoot=function(s,no){
    RE.ensure(s);
    const x=seat(s,no);if(!x)return false;
    const cause=s.special.deathCauses[String(no)]||'';
    if(x.role==='mechanical_wolf'&&s.special.mechanicalHunterGun){
      if(['poison','mechanical_poison','lucky_poison','charm','dreamer_chain','double_dream','explode'].includes(cause))return false;
      return cause==='wolf'||cause==='manual_night'||cause==='exile'||cause==='mechanical_knife'||cause==='invincible_wolf'||cause==='wolf_extra';
    }
    return oldCanShoot(s,no);
  };

  const oldStepFromKey=stepFromKey;
  stepFromKey=function(key){
    let s=oldStepFromKey(key);const sp=game.special||{},copied=sp.mechanicalCopiedRole;
    if(key==='mech_result'){
      s={...s,title:'機械狼｜學習結果',start:'機械狼請睜眼。上帝請以手勢告知機械狼學到的技能。',end:'機械狼確認，請閉眼。',note:`上帝提示：模仿身份【${roleLabel(copied)}】｜技能【${copiedSkillName(copied)}】`};
    }else if(key==='mech_pack'){
      s={...s,title:'機械狼｜帶刀手勢',start:'機械狼請睜眼。上帝請以手勢提示目前帶刀狀態。',note:`上帝提示：機械狼學到【${roleLabel(copied)}】｜${copiedSkillName(copied)}。本夜順序：技能 → 手勢。`};
    }else if(key==='mech_skill_check'){
      const a=latest(game,'mech_skill_check'),rr=(a&&sp.mechanicalLastCheckNight===Number(game.night))?sp.mechanicalLastCheckRole:'';
      s={...s,title:'機械狼｜通靈查驗',start:'機械狼請睜眼。請使用你學到的查驗技能。',note:`上帝提示：學到【${roleLabel(copied)}】。${rr?`查驗結果：${a.effectiveTargets?.[0]}號＝【${roleLabel(rr)}】`:'查驗後會顯示具體身份。'}`};
    }else if(key==='mech_skill_guard'){
      s={...s,title:'機械狼｜守護技能',start:'機械狼請睜眼。請使用你學到的守護技能。',actions:['守護','不使用'],note:'上帝提示：學到【守衛】。每晚可守護；不可連續兩晚守同一人。'};
    }else if(key==='mech_skill_poison'){
      s={...s,title:'機械狼｜毒藥技能',start:'機械狼請睜眼。請確認是否使用你學到的毒藥。',note:'上帝提示：學到【女巫】。只有一瓶毒藥，使用後整局不可再用。'};
    }
    return s;
  };

  const oldWolfStartVoice=wolfStartVoice;
  wolfStartVoice=function(){
    if(currentProfile(game)==='nightmare'){
      return Number(game.night)===1
        ?'除夢魘外，其餘狼人請睜眼。請選擇今晚擊殺的玩家。'
        :'狼人請睜眼。請選擇今晚擊殺的玩家。';
    }
    return oldWolfStartVoice();
  };

  const managedTags=new Set(['被刀','被守','被救','被毒','被獵殺','被攝夢','夢遊保護','連攝出局','夢鏈出局','被恐懼','狼刀封印','解藥無效','毒藥無效','被魅惑','被交換','機械守護','可開槍','不可開槍']);
  const put=(no,t)=>{const x=seat(game,no);if(x&&!x.tags.includes(t))x.tags.push(t)};
  function rebuildStatus1018(){
    if(!game?.active)return;RE.ensure(game);
    for(const x of game.seats){x.tags=Array.isArray(x.tags)?x.tags.filter(t=>!managedTags.has(t)):[];}
    const acts=(game.actions||[]).filter(a=>Number(a.night)===Number(game.night));
    const eff=a=>Number(a?.effectiveTargets?.[0]||a?.targets?.[0]||0);
    const dream=eff(latest(game,'dreamer'));const fear=eff(latest(game,'nightmare'));
    const fearedSeat=seat(game,fear);const fearWolf=!!fearedSeat&&RE.isWolfRole(fearedSeat.role);
    for(const a of acts){
      if(!a||a.suppressed||/^不|^確認/.test(String(a.action||'')))continue;
      const n=eff(a);
      if(['wolf','young_awake','gargoyle_knife','mech_skill_knife','bloodmoon_last_knife'].includes(a.step)&&n){if(!(a.step==='wolf'&&fearWolf))put(n,'被刀');}
      if(a.step==='guard'&&n)put(n,'被守');
      if(a.step==='mech_skill_guard'&&n){put(n,'被守');put(n,'機械守護');}
      if(['witch_poison','mech_skill_poison','lucky_poison'].includes(a.step)&&n)put(n,'被毒');
      if(a.step==='demon_hunt'&&n)put(n,'被獵殺');
      if(a.step==='dreamer'&&n){put(n,'被攝夢');put(n,'夢遊保護');}
      if(a.step==='nightmare'&&n)put(n,'被恐懼');
      if(a.step==='wolfbeauty'&&n)put(n,'被魅惑');
      if(['magician','trickster'].includes(a.step))for(const z of (a.targets||[]))put(z,'被交換');
    }
    if(fearWolf){for(const x of game.seats.filter(x=>x.alive&&RE.isWolfRole(x.role)))put(x.no,'狼刀封印');}
    const cure=latest(game,'witch_cure'),wolf=latest(game,'wolf'),poison=latest(game,'witch_poison');
    if(cure?.action==='使用解藥'&&!cure.suppressed){const n=eff(wolf);if(n){put(n,'被救');if(dream===n)put(n,'解藥無效');}}
    if(poison?.action==='使用毒藥'&&!poison.suppressed){const n=eff(poison);if(n&&dream===n)put(n,'毒藥無效');}
    if(dream&&Number(game.special.lastDreamSeat)===dream)put(dream,'連攝出局');
    const dreamer=game.seats.find(x=>x.role==='dreamer');const ds=new Set(RE.nightDeaths(game));if(dreamer&&ds.has(dreamer.no)&&dream)put(dream,'夢鏈出局');
    for(const x of game.seats){
      if(!x.alive&&(x.role==='hunter'||(x.role==='mechanical_wolf'&&game.special.mechanicalHunterGun)))put(x.no,RE.canShoot(game,x.no)?'可開槍':'不可開槍');
    }
  }
  function redrawTagDom(){
    const rows=$$('#playerRows .prow');
    rows.forEach((row,i)=>{const x=game.seats[i],box=row.querySelector('.tags');if(!x||!box)return;box.innerHTML=`${game.sheriff===x.no&&!game.badgeTorn?'<span class="tag sheriff">警長</span>':''}${(x.tags||[]).map(t=>`<span class="tag ${/刀|毒|獵|恐|封印|出局|不可/.test(t)?'wolf':'goodt'}">${esc(t)}</span>`).join('')}`;});
  }
  const previousRenderPlayers=renderPlayers;
  renderPlayers=function(){
    previousRenderPlayers();rebuildStatus1018();redrawTagDom();
    if(game?.identityMode==='random_hidden'&&Number(game.night)===1&&currentStep()?.id!=='dawn'){
      $$('#playerRows .prow').forEach(row=>{const sp=row.querySelector('.pmeta span');if(sp)sp.textContent='隨機發放｜首夜流程中';});
    }
  };

  const RANDOM_KEY=`WE_RANDOM_ROLE_MAP_${APP_SESSION_ID}`;
  const loadRandom=()=>{try{const x=JSON.parse(localStorage.getItem(RANDOM_KEY)||'null');return Array.isArray(x)&&x.length===Number(cfg.players)?x:null}catch{return null}};
  const saveRandom=arr=>localStorage.setItem(RANDOM_KEY,JSON.stringify(arr));
  const clearRandom=()=>localStorage.removeItem(RANDOM_KEY);
  function randomizeRoles(){
    const bag=[];for(const [id,n0] of Object.entries(pool||{}))for(let i=0;i<Number(n0||0);i++)bag.push(id);
    if(bag.length!==Number(cfg.players))return alert(`角色數量必須剛好 ${cfg.players}，目前 ${bag.length}。`);
    for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
    saveRandom(bag);ensureBindings();bindings.forEach((b,i)=>b.role=bag[i]||'');saveState();renderBindings();toast('已隨機發放角色｜請依序讓玩家私密查看');
  }
  function ensureRevealUi(){
    if(!document.querySelector('#randomRoleStyle')){const st=document.createElement('style');st.id='randomRoleStyle';st.textContent=`
      .randommode{margin-top:10px;border:1px solid #5a6a7b;background:#111c28;border-radius:10px;padding:10px}.randommode .note{font-size:11px;color:#c9d2dc;line-height:1.55;margin:5px 0 8px}.revealgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.roleRevealBtn{min-height:38px}.rolemodal{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.94);display:flex;align-items:center;justify-content:center;padding:22px}.rolemodal.hidden{display:none}.rolecard{max-width:520px;width:100%;background:#142231;border:2px solid #d0ad52;border-radius:18px;padding:24px;text-align:center;color:#fff}.rolecard .seat{font-size:18px;color:#cbd8e6}.rolecard .rolename{font-size:34px;font-weight:1000;color:#f0d99b;margin:18px 0}.rolecard .summary{font-size:14px;line-height:1.7;color:#e5e9ee;margin-bottom:20px}@media(max-width:720px){.revealgrid{grid-template-columns:repeat(2,1fr)}}`;
      document.head.appendChild(st);
    }
    if(!document.querySelector('#roleRevealModal')){const m=document.createElement('div');m.id='roleRevealModal';m.className='rolemodal hidden';m.innerHTML='<div class="rolecard"><div id="revealSeat" class="seat"></div><div id="revealRole" class="rolename"></div><div id="revealSummary" class="summary"></div><button id="hideRoleReveal" class="btn goldbtn" style="width:100%">我看完了｜隱藏角色</button></div>';document.body.appendChild(m);$('#hideRoleReveal').onclick=()=>m.classList.add('hidden');}
  }
  function openRoleReveal(no){const map=loadRandom();if(!map)return;const id=map[Number(no)-1],b=bindings[Number(no)-1];$('#revealSeat').textContent=`${no}號｜${b?.name||`玩家${no}`}`;$('#revealRole').textContent=roleLabel(id);$('#revealSummary').textContent=ROLE?.[id]?.summary||'';$('#roleRevealModal').classList.remove('hidden');}

  renderBindings=function(){
    ensureBindings();ensureRevealUi();const map=loadRandom();if(map)bindings.forEach((b,i)=>b.role=map[i]||'');else if(!game?.active)bindings.forEach(b=>b.role='');
    const host=$('#seatBindings');host.innerHTML=bindings.map(b=>`<div class="seatbind" style="grid-template-columns:48px 1fr"><div class="seatno">${b.no}號</div><input class="in" data-bname="${b.no}" value="${esc(b.name)}" placeholder="玩家名稱"></div>`).join('');
    $$('[data-bname]').forEach(x=>x.onchange=()=>{bindings[+x.dataset.bname-1].name=x.value;saveState()});
    const named=bindings.filter(x=>String(x.name||'').trim()).length;$('#assignCount').textContent=`${named}/${cfg.players}`;$('#remaining').innerHTML=Object.entries(pool).map(([id,n])=>`<span class="chip">${esc(roleName(id))} <b>×${n}</b></span>`).join('');
    const rb=$('#randomAssign'),cb=$('#clearAssign');if(rb){rb.style.display='';rb.textContent=map?'重新隨機發放角色':'隨機發放角色';rb.onclick=randomizeRoles;}if(cb){cb.style.display='';cb.textContent='改回實體抽牌／首夜辨認';cb.onclick=()=>{clearRandom();bindings.forEach(b=>b.role='');saveState();renderBindings();toast('已改回實體抽牌｜第一夜逐步辨認身份');};}
    let area=$('#randomRoleRevealArea');if(!area){area=document.createElement('div');area.id='randomRoleRevealArea';host.insertAdjacentElement('afterend',area);}if(map){area.className='randommode';area.innerHTML=`<b>APP 隨機發放模式</b><div class="note">角色已隨機分配，但座位頁不直接顯示身份。請把裝置交給對應玩家，讓玩家只查看自己的角色；看完立即按「隱藏角色」。上帝畫面在第一夜結束前也會遮蔽玩家身份。</div><div class="revealgrid">${bindings.map(b=>`<button class="btn ghost roleRevealBtn" data-reveal-role="${b.no}">${b.no}號｜私密查看角色</button>`).join('')}</div>`;$$('[data-reveal-role]').forEach(b=>b.onclick=()=>openRoleReveal(+b.dataset.revealRole));$('#assignCheck').innerHTML='✓ 已使用 APP 隨機發放角色。第一夜前不直接顯示完整身份。';}else{area.className='randommode';area.innerHTML='<b>角色發放方式</b><div class="note">預設：玩家使用實體身份牌，上帝在第一夜依睜眼順序辨認。若要由 APP 隨機決定角色，請按「隨機發放角色」。</div>';$('#assignCheck').innerHTML='目前為實體抽牌模式：此步驟只綁定「座位 ↔ 玩家」，身份於第一夜逐步辨認。';}
  };

  const oldRenderFlowConfirm=renderFlowConfirm;
  renderFlowConfirm=function(){oldRenderFlowConfirm();if(loadRandom()){const x=$('#lockedSummary');if(x)x.innerHTML=x.innerHTML.replace(/<br><br><b[^>]*>.*?<\/b>/,'<br><br><b style="color:#f0d99b">本局使用 APP 隨機發放角色；座位頁與第一夜流程中不直接顯示完整身份。</b>');const w=$('#flowWarn');if(w)w.innerHTML='<div class="okbox">✓ 角色已隨機發放。請確認所有玩家都已私密查看自己的角色。</div>';}}; 

  const oldFresh=freshGameFromBindings;
  freshGameFromBindings=function(){
    const map=loadRandom();
    if(!map)return oldFresh();
    ensureBindings();bindings.forEach((b,i)=>b.role=map[i]||'');
    const seats=bindings.map(b=>({no:b.no,name:b.name||`玩家${b.no}`,role:b.role,alive:true,tags:[]}));
    const core=RE.state(seats,1);game={...core,active:true,round:tour?.round||1,step:0,sel:[],logs:[],sheriff:null,badgeTorn:false,nightDeaths:[],lastPublishedDeaths:[],lastDeathVoice:'',lastExiledSeat:null,identityMode:'random_hidden',identityPlan:clone(pool),identityReady:true,setupRandomAssigned:true};RE.ensure(game);
  };

  const nextRound=$('#nextRound');if(nextRound){const oldNext=nextRound.onclick;nextRound.onclick=async ev=>{clearRandom();return oldNext?.call(nextRound,ev);};}
  const restored=loadRandom();if(restored&&!game?.active){ensureBindings();bindings.forEach((b,i)=>b.role=restored[i]||'');}
  renderBindings();

  const oldUiRecord=recordAction;
  recordAction=function(){const st=currentStep(),out=oldUiRecord();if(st?.id==='mech_skill_check'&&game.special.mechanicalLastCheckNight===Number(game.night)){const n=game.special.mechanicalLastCheckSeat,r=game.special.mechanicalLastCheckRole;toast(`機械狼查驗：${n}號＝${roleLabel(r)}`);}return out;};
  if($('#confirmAction'))$('#confirmAction').onclick=recordAction;

  window.WEWG_COMPETITION_1018={version:'0.4',rebuildStatus:rebuildStatus1018,randomizeRoles};
  console.info(PATCH,'loaded');
})();
