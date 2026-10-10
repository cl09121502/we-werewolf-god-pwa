// Deterministic 0.4.3 build-time integration, not a browser-time patch.
const fs=require('node:fs'),path=require('node:path');
const dir=process.argv[2]||'_site',file=path.join(dir,'game.html');
let src=fs.readFileSync(file,'utf8');
function rep(a,b,reason){
 const hits=src.split(a).length-1;
 if(hits!==1)throw Error(reason+': expected 1 match, got '+hits);
 src=src.replace(a,b);
}
// Shift the authoritative status projection BEFORE the legacy player markup,
// so the HTML is generated with stable, up-to-date tags.
rep('function renderPlayers(){\n', 'function renderPlayers(){\n', 'renderPlayers exists');
rep('<script src="js/status-tags.js?v=0.3.1"></script><script src="js/competition-1018.js?v=0.4.2"></script>',
    '<script src="js/status-tags.js?v=0.3.1"></script><script src="js/status-engine-043.js?v=0.4.3"></script><script src="js/competition-1018.js?v=0.4.3"></script>','load unified status model');
// New exact election wording. The original Rex catalog has NO identical
// recording. Register text with opt-in OS speech rather than silently
// playing an unrelated Rex line.
const sheriff='要競選警長的人請舉手，三秒後天亮請亮燈。三、二、一。';
rep("speak('天亮請睜眼，並請亮燈。')","speak('"+sheriff+"')",'sheriff election exact request');
rep("['天亮請睜眼，並請亮燈。','退水的玩家，請亮藍燈。']",
    "['"+sheriff+"','退水的玩家，請亮藍燈。']",'new user-requested voice fallback');
rep("const vs=$('#voiceStatus');if(!NEW_COMPETITION_VOICE.has(text))",
    "const vs=$('#voiceStatus');if(!NEW_COMPETITION_VOICE.has(text))",'fallback intact');
// The native operating-system voice is not Rex. Make it explicit at the
// control surface, not an invisible silent change.
rep("if(vs)vs.textContent='新增指令暫使用系統繁體中文語音（非 Rex 正式錄音）'",
    "if(vs)vs.textContent='此新台詞尚無 Rex 正式錄音｜目前使用裝置語音，音色可能不同'",
    'honest fallback label');
rep("let activeSegmentStop=null;function stopVoiceLocal(){",
    "let activeSegmentStop=null;function stopVoiceLocal(){",'single player invariant');
fs.writeFileSync(file,src);
console.log('0.4.3 integrated status script and generic mechanical voice; sheriff prompt uses exact instruction with disclosed temporary TTS');
