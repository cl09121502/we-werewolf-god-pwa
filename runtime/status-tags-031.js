(()=>{
  'use strict';
  const PATCH='WEWG-STATUS-TAGS-0.3.1';
  const transient=new Set(['被刀','被守','被救','被毒','被獵殺','被攝夢','被恐懼','被魅惑','被交換']);

  function used(a){
    return a && !a.suppressed && !/^不/.test(String(a.action||''));
  }
  function nums(a, effective=true){
    const src=effective && Array.isArray(a?.effectiveTargets) && a.effectiveTargets.length ? a.effectiveTargets : (a?.targets||[]);
    return src.map(Number).filter(n=>Number.isFinite(n)&&n>0);
  }
  function latest(actions, step){
    for(let i=actions.length-1;i>=0;i--) if(actions[i]?.step===step) return actions[i];
    return null;
  }
  function put(no,label){
    const seat=game?.seats?.find(s=>Number(s.no)===Number(no));
    if(seat && !seat.tags.includes(label)) seat.tags.push(label);
  }
  function rebuildNightStatusTags(){
    if(!game?.active || !Array.isArray(game.seats)) return;
    for(const seat of game.seats){
      if(!Array.isArray(seat.tags)) seat.tags=[];
      seat.tags=seat.tags.filter(t=>!transient.has(t));
    }
    const night=Number(game.night||1);
    const actions=(game.actions||[]).filter(a=>Number(a?.night)===night);

    for(const a of actions){
      if(!used(a)) continue;
      const eff=nums(a,true), raw=nums(a,false);
      switch(a.step){
        case 'wolf':
        case 'young_awake':
        case 'gargoyle_knife':
        case 'mech_skill_knife':
        case 'bloodmoon_last_knife':
          if(eff[0]) put(eff[0],'被刀');
          break;
        case 'guard':
        case 'mech_skill_guard':
          if(eff[0]) put(eff[0],'被守');
          break;
        case 'witch_poison':
        case 'mech_skill_poison':
        case 'lucky_poison':
          if(eff[0]) put(eff[0],'被毒');
          break;
        case 'demon_hunt':
          if(eff[0]) put(eff[0],'被獵殺');
          break;
        case 'dreamer':
          if(eff[0]) put(eff[0],'被攝夢');
          break;
        case 'nightmare':
          if(eff[0]) put(eff[0],'被恐懼');
          break;
        case 'wolfbeauty':
          if(eff[0]) put(eff[0],'被魅惑');
          break;
        case 'magician':
        case 'trickster':
          for(const no of raw) put(no,'被交換');
          break;
      }
    }

    const cure=latest(actions,'witch_cure');
    if(cure?.action==='使用解藥' && !cure.suppressed){
      const wolf=latest(actions,'wolf');
      const target=nums(wolf,true)[0];
      if(target) put(target,'被救');
    }
  }

  const previousRenderPlayers=renderPlayers;
  renderPlayers=function(){
    rebuildNightStatusTags();
    return previousRenderPlayers();
  };

  window.WEWG_STATUS_TAGS_PATCH={version:'0.3.1',rebuild:rebuildNightStatusTags};
  console.info(PATCH,'loaded');
})();