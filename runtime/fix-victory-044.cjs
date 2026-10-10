// Repair the source-level victory announcement in the generated legacy game page.
// Fail closed on a changed upstream shape. Do not append another runtime winner handler.
const fs=require('node:fs'),path=require('node:path');
const target=path.join(process.argv[2]||'_site','game.html');
let html=fs.readFileSync(target,'utf8');
const original="async function confirmWin(side){const detected=detectVictory();if(detected&&detected!==side&&!confirm('系統偵測的勝方不同，仍要手動確認嗎？'))return;const texts=[];if(game.lastDeathVoice)texts.push(game.lastDeathVoice);texts.push(side==='wolf'?'狼人陣營獲勝。':'好人陣營獲勝。');speakSequence(texts,{type:'settleWin',winnerSide:side,winnerSeats:winnerSeats(side),round:Number(tour?.round||1)});toast('已送出勝方公布，語音結束後結算積分')}";
const fixed="async function confirmWin(side){const detected=detectVictory();if(detected&&detected!==side&&!confirm('系統偵測的勝方不同，仍要手動確認嗎？'))return;const announcement=side==='wolf'?'狼人陣營獲勝。':'好人陣營獲勝。';speak(announcement,{type:'settleWin',winnerSide:side,winnerSeats:winnerSeats(side),round:Number(tour?.round||1)});toast('已送出勝方公布，語音結束後結算積分')}";
if(html.split(original).length!==2)throw Error('Expected exactly one 0.4.3 victory handler; refusing silent patch');
html=html.replace(original,fixed);
fs.writeFileSync(target,html);
console.log('PASS winner speech sends only the selected winning side, never stale lastDeathVoice');
