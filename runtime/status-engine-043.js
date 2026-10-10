/* WEWG 0.4.3 - authoritative game-state status projection.
 * No DOM access, no global event handlers, no modification of the action log.
 * Only the God/controller UI should display these secret night-action statuses.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.WEWGStatus=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const MANAGED=/^(?:被刀|被毒|被守|被救|被獵殺|被攝夢|夢遊保護|連攝出局|夢鏈出局|被恐懼|狼刀封印|解藥無效|毒藥無效|被魅惑|被交換|機械守護|可開槍|不可開槍|被機械狼模仿|機械狼模仿：|機械狼查驗：|被查驗)/;
  const targets=a=>{
    const from=Array.isArray(a?.effectiveTargets)&&a.effectiveTargets.length?a.effectiveTargets:a?.targets;
    return(Array.isArray(from)?from:[]).map(Number).filter(n=>Number.isSafeInteger(n)&&n>0);
  };
  const valid=a=>a&&!a.suppressed&&!/^(?:不使用|不發動|不守|確認封印)$/.test(String(a.action||''));
  const latest=(items,key)=>[...items].reverse().find(a=>a.step===key);
  function derive(s,labels={}){
    if(!s||!Array.isArray(s.seats))return new Map();
    const night=Number(s.night||1);
    const byNo=new Map(s.seats.map(x=>[Number(x.no),[]]));
    const put=(no,tag)=>{const arr=byNo.get(Number(no));if(arr&&tag&&!arr.includes(tag))arr.push(tag)};
    const actions=Array.isArray(s.actions)?s.actions:[];
    const current=actions.filter(a=>Number(a?.night)===night);
    for(const a of current){
      if(!valid(a))continue;
      const ns=targets(a),n=ns[0];
      switch(a.step){
        // All confirmed identification skills mark the selected target. Results stay on God's screen.
        case 'psychic_choose':case 'psychic':case 'seer':case 'mech_skill_check':case 'gargoyle_choose':case 'lucky_check':
          if(a.action==='查驗'&&n)put(n,'被查驗');break;
        case 'wolf':case 'mech_skill_knife':case 'young_awake':case 'gargoyle_knife':case 'bloodmoon_last_knife':if(n)put(n,'被刀');break;
        case 'guard':if(n)put(n,'被守');break;
        case 'mech_skill_guard':if(n){put(n,'被守');put(n,'機械守護')}break;
        case 'witch_poison':case 'mech_skill_poison':case 'lucky_poison':if(a.action==='使用毒藥'&&n)put(n,'被毒');break;
        case 'demon_hunt':if(n)put(n,'被獵殺');break;
        case 'dreamer':if(n){put(n,'被攝夢');put(n,'夢遊保護')}break;
        case 'nightmare':if(n)put(n,'被恐懼');break;
        case 'wolfbeauty':if(n)put(n,'被魅惑');break;
        case 'magician':case 'trickster':ns.forEach(no=>put(no,'被交換'));break;
      }
    }
    const wolf=latest(current,'wolf'),cure=latest(current,'witch_cure');
    if(valid(cure)&&cure.action==='使用解藥'&&valid(wolf)&&targets(wolf)[0])put(targets(wolf)[0],'被救');
    const dream=latest(current,'dreamer'),poison=latest(current,'witch_poison'),dreamNo=valid(dream)?targets(dream)[0]:0;
    if(dreamNo){
      if(valid(cure)&&cure.action==='使用解藥'&&targets(wolf)[0]===dreamNo)put(dreamNo,'解藥無效');
      if(valid(poison)&&poison.action==='使用毒藥'&&targets(poison)[0]===dreamNo)put(dreamNo,'毒藥無效');
      if(Number(s.special?.lastDreamSeat)===dreamNo)put(dreamNo,'連攝出局');
    }
    const fear=latest(current,'nightmare');
    const fearNo=valid(fear)?targets(fear)[0]:0;
    if(fearNo&&labels.isWolfRole){
      const t=s.seats.find(x=>Number(x.no)===fearNo);
      if(t&&labels.isWolfRole(t.role)){
        for(const x of s.seats)if(labels.isWolfRole(x.role))put(x.no,'狼刀封印');
      }
    }
    const copied=[...actions].reverse().find(a=>a.step==='mech_copy'&&a.action==='模仿'&&Number(a.night)>0);
    const copyNo=copied?targets(copied)[0]:0;
    if(copyNo){
      put(copyNo,'被機械狼模仿');
      const machine=s.seats.find(x=>x.role==='mechanical_wolf');
      const learned=s.special?.mechanicalCopiedRole||s.seats.find(x=>Number(x.no)===copyNo)?.role||'';
      if(machine)put(machine.no,'機械狼模仿：'+copyNo+'號'+(learned?'／'+(labels.roleName?labels.roleName(learned):learned):''));
    }
    const check=latest(current,'mech_skill_check');
    if(valid(check)&&check.action==='查驗'){
      const machine=s.seats.find(x=>x.role==='mechanical_wolf');
      const no=targets(check)[0];
      if(machine&&no){
        const r=s.special?.mechanicalLastCheckRole||s.seats.find(x=>Number(x.no)===no)?.role||'';
        put(machine.no,'機械狼查驗：'+no+'號'+(r?'／'+(labels.roleName?labels.roleName(r):r):''));
      }
    }
    return byNo;
  }
  function apply(s,labels={}){
    const derived=derive(s,labels);
    for(const x of s?.seats||[]){
      const prior=Array.isArray(x.tags)?x.tags:[];
      x.tags=[...new Set([...prior.filter(t=>!MANAGED.test(String(t))),...(derived.get(Number(x.no))||[])])];
    }
    return derived;
  }
  return {derive,apply,targets};
});
