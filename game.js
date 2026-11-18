
'use strict';
const DIRS=[[0,-1],[1,0],[0,1],[-1,0]],$=id=>document.getElementById(id),KEY='stronghold-architect-v2';
const SETTINGS_KEY='stronghold-architect-settings';let settings=(()=>{const d={reduceMotion:false,seenAlarm:false};try{return {...d,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}}catch{return d}})(),activeTab='keep',fxEl=null,shakeTimer=null,lastSaveBody='';
let gameSpeed=[1,2,3].includes(settings.gameSpeed)?settings.gameSpeed:1;
function saveSettings(){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings))}catch{}}
function motionOK(){return !settings.reduceMotion&&!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)}

const START_UNLOCKED=[0,12,13,14,15,16,17,18,19], RESEARCH_COST={1:10,2:10,3:20,4:20,5:15,6:20,7:30,8:30,9:40,10:35,11:15};
const FIELD_SIZE=24,DAY_MS=10*60*1000,ROTATION_COST=10,DEMOLISH_COST=50,START_FOOD=30;
let lastClockTick=Date.now(),lastClockSave=Date.now(),clockSuspended=true,awaitingResume=true;
const BATCH_MS=60000,RESOURCE_KEYS=['gold','stone','food','rp'];
const RESOURCE_INFO={gold:{name:'Gold',icon:'🪙'},stone:{name:'Stone',icon:'🪨'},food:{name:'Food',icon:'🍞'},rp:{name:'Research',icon:'🔬'}};
let relocating=false,buildTarget=null,viewedRoom=null,suppressClickUntil=0,resourceIconSignature='';
let state,blueprint=null,selected=null,rotation=0,size=innerWidth<620?144:168,toastTimer;
function fresh(){
 const column=8+Math.floor(Math.random()*8),hallCount=1+Math.floor(Math.random()*2),emptyCount=1+Math.floor(Math.random()*2),tiles=[{x:column,y:FIELD_SIZE-1,type:17,rot:0}];
 let y=FIELD_SIZE-2;for(let i=0;i<hallCount;i++)tiles.push({x:column,y:y--,type:12,rot:0});for(let i=0;i<emptyCount;i++)tiles.push({x:column,y:y--,type:16,rot:0});tiles.push({x:column,y,type:0,rot:0});
 const result={version:5,clockVersion:1,dayElapsedMs:0,entranceLegacy:false,day:1,gold:220,stone:120,food:START_FOOD,rp:0,hungryDays:0,researched:[],over:false,won:false,tiles,world:WorldGen.generate(),guards:[],pack:{level:1,items:[],open:false},expedition:null,log:[`Day 1 · Castle entrance established on the bottom row. Your keep starts with ${hallCount} hallway${hallCount>1?'s':''} and ${emptyCount} empty room${emptyCount>1?'s':''}.`]};initDungeons(result.world);initEconomy(result);return result;
}
function validate(s){
 if(s&&typeof s==='object'){initPack(s);s.strongholdName=(typeof s.strongholdName==='string'&&s.strongholdName.trim())?s.strongholdName.trim().slice(0,30):'Your Stronghold';s.motto=typeof s.motto==='string'?s.motto.slice(0,40):'';s.banner=Banner.clean(s.banner);if(s.world!=null&&!WorldGen.valid(s.world))s.world=null;if(s.world){WorldGen.fix(s.world);initDungeons(s.world);}if(s.world===undefined)s.world=null;s.guards=(Array.isArray(s.guards)?s.guards:[]).filter(g=>g&&typeof g.id==='string'&&typeof g.name==='string'&&Number.isInteger(g.look)).slice(0,2);{const tl=Array.isArray(s.tiles)?s.tiles:[],base=tl.find(t=>t.type===1)||tl.find(t=>t.type===0)||tl[0]||{x:0,y:0},used=new Set;for(const g of s.guards){g.guard=true;if(!(typeof g.home==='string'&&tl.some(t=>t.x+','+t.y===g.home)&&!used.has(g.home)))g.home=null;if(g.home)used.add(g.home);if(!Number.isFinite(g.x)||!Number.isFinite(g.y)){g.x=base.x+.5;g.y=base.y+.5}g.path=[];g.mode=g.home?'toRoom':'wander';g.waitMs=500}}if(!s.world||!s.expedition||!(s.expedition.mode==='dungeon'?s.world.dungeons.some(d=>d.id===s.expedition.castleId&&d.layout):s.world.castles.some(c=>c.id===s.expedition.castleId))||!Array.isArray(s.expedition.party)||!Array.isArray(s.expedition.discovered)||!s.expedition.discovered.length)s.expedition=null}
 if(!s||s.version!==5||!Array.isArray(s.tiles)||s.tiles.length<1||s.tiles.length>FIELD_SIZE*FIELD_SIZE)throw Error('Invalid save');
 for(const k of ['day','gold','stone','food'])if(!Number.isFinite(s[k])||s[k]<0)throw Error('Invalid save');
 if(!Number.isInteger(s.day)||s.day<1||!Number.isInteger(s.hungryDays)||s.hungryDays<0||typeof s.over!=='boolean'||typeof s.won!=='boolean'||!Array.isArray(s.log)||s.log.some(l=>typeof l!=='string'))throw Error('Invalid save');
 const seen=new Set;for(const t of s.tiles){if(!Number.isInteger(t.x)||!Number.isInteger(t.y)||t.x<0||t.y<0||t.x>FIELD_SIZE-1||t.y>FIELD_SIZE-1||!Number.isInteger(t.type)||!TYPES[t.type]||!Number.isInteger(t.rot)||t.rot<0||t.rot>3||seen.has(t.x+','+t.y)||t.ports&&(!Array.isArray(t.ports)||t.ports.some(n=>!Number.isInteger(n)||n<0||n>3)))throw Error('Invalid tiles');if(t.trap!==undefined&&(t.type!==16||!Object.hasOwn(TRAPS,t.trap)))throw Error('Invalid trap upgrade');seen.add(t.x+','+t.y)}
 if(s.version<4){for(const entrance of s.tiles.filter(t=>t.type===17)){entrance.ports=(entrance.ports||[0,1,2,3]).map(d=>(d+entrance.rot)%4);entrance.rot=0;}}
 if(s.tiles.filter(t=>t.type===0).length!==1||!connected(s.tiles))throw Error('Disconnected keep');
 if(s.version===1){
  s.rp=0;s.researched=[...new Set(s.tiles.map(t=>t.type).filter(i=>!START_UNLOCKED.includes(i)))];
  let entrance=null;for(let y=0;y<9&&!entrance;y++)for(let x=0;x<9&&!entrance;x++){const t={x,y,type:17,rot:0};if(!at(x,y,s.tiles)&&placement(t,s.tiles))entrance=t;}
  if(entrance)s.tiles.push(entrance);else{const old=s.tiles.find(t=>t.type!==0);if(!old)throw Error('Cannot migrate save');const ports=exits(old);old.type=17;old.rot=0;old.ports=ports;}
  s.version=2;s.log.unshift('Research update · Existing rooms remain unlocked. A single entrance has been established.');
 }
 if(!Number.isFinite(s.rp)||s.rp<0||!Array.isArray(s.researched)||s.researched.some(i=>!Number.isInteger(i)||!RESEARCH_COST[i])||s.tiles.filter(t=>t.type===17).length!==1)throw Error('Invalid research or unique rooms');
 if(s.tiles.some(t=>!START_UNLOCKED.includes(t.type)&&!s.researched.includes(t.type)))throw Error('Unresearched room');
 if(s.version===2){s.tiles=s.tiles.map(t=>({...t,x:t.x+4,y:t.y+4}));s.version=3;s.log.unshift('Field expanded to 18×18. Your existing keep is preserved.');}
 if(s.version===3){s.version=4;s.entranceLegacy=true;}
 const entrance=s.tiles.find(t=>t.type===17);
 if(typeof s.entranceLegacy!=='boolean')throw Error('Invalid entrance state');
 if(!s.entranceLegacy&&(entrance.y!==FIELD_SIZE-1||entrance.rot!==0||entrance.ports||s.tiles.some(t=>t!==entrance&&entranceBlocked(t.x,t.y,s.tiles))))throw Error('Invalid castle entrance layout');
 if(s.clockVersion===undefined){s.clockVersion=1;s.dayElapsedMs=0;if(s.won&&s.hp>0){s.won=false;s.over=false;s.log.unshift('The campaign now continues beyond day 15.');}}
 if(s.clockVersion!==1||!Number.isFinite(s.dayElapsedMs)||s.dayElapsedMs<0||s.dayElapsedMs>=DAY_MS)throw Error('Invalid day clock');
 initEconomy(s);if(s.invasion.combat?.enemyInfo?.dungeon&&s.expedition?.mode!=='dungeon')s.invasion.combat=null;validateEconomy(s);validateMC(s);validateInvasion(s);
 return s;
}
let needsSetup=false;try{state=validate(JSON.parse(localStorage.getItem(KEY)))}catch{state=fresh();needsSetup=true}
function save(){if(needsSetup)return false;try{const body=JSON.stringify({...state,savedAt:0});if(body!==lastSaveBody){lastSaveBody=body;state.savedAt=Date.now()}localStorage.setItem(KEY,JSON.stringify(state));return true}catch{toast('Device storage unavailable. Use Export save to keep your progress.');return false}}
function exits(t){const d=t.ports|| (t.type===17?[0]:t.type===12?[0,2]:t.type===13?[0,1]:t.type===14?[0,1,3]:[0,1,2,3]);return d.map(n=>(n+t.rot)%4)}
function at(x,y,tiles=state.tiles){return tiles.find(t=>t.x===x&&t.y===y)}
function compatible(a,b,d){return exits(a).includes(d)&&exits(b).includes((d+2)%4)}
function entranceBlocked(x,y,tiles=state.tiles){const entrance=tiles.find(t=>t.type===17);return !!entrance&&((y===entrance.y&&Math.abs(x-entrance.x)===1)||(x===entrance.x&&y===entrance.y+1))}
function blocksHallDoor(a,b,d){const opposite=(d+2)%4,ao=exits(a).includes(d),bo=exits(b).includes(opposite);return (a.type>=12&&a.type<=15&&ao&&!bo)||(b.type>=12&&b.type<=15&&bo&&!ao)}
function placement(t,tiles=state.tiles){if(entranceBlocked(t.x,t.y,tiles))return false;let joins=0;for(let d=0;d<4;d++){const b=at(t.x+DIRS[d][0],t.y+DIRS[d][1],tiles);if(b){if(blocksHallDoor(t,b,d))return false;if(compatible(t,b,d))joins++}}return joins>0}
function connected(tiles){const root=tiles.find(t=>t.type===0);if(!root)return false;const seen=new Set([root]),q=[root];while(q.length){const a=q.shift();DIRS.forEach(([dx,dy],d)=>{const b=at(a.x+dx,a.y+dy,tiles);if(b&&!seen.has(b)&&compatible(a,b,d)){seen.add(b);q.push(b)}})}return seen.size===tiles.length}
function unlocked(i){return START_UNLOCKED.includes(i)||state.researched.includes(i)}
function research(i){if(state.over||unlocked(i)||!RESEARCH_COST[i])return;if(!state.tiles.some(t=>t.type===19))return toast('Build a research room first.');if(state.rp<RESEARCH_COST[i])return toast('Not enough research points. Research Rooms add points as time passes.');state.rp-=RESEARCH_COST[i];state.researched.push(i);note(TYPES[i][0]+' blueprint researched.');gainXp('mc',15);save();render();toast(TYPES[i][0]+' unlocked!')}
function income(){const total={gold:0,stone:0,rp:0,food:0};for(const room of state.tiles)for(const [k,v]of Object.entries(roomRates(room)))total[k]+=v*(k==='gold'&&state.day<=3?2:k==='food'?1/gameSpeed:1);return total}
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500)}
function note(t){state.log.unshift(`Day ${state.day} · ${t}`);state.log=state.log.slice(0,12);floatLog(`Day ${state.day} · ${t}`)}
function floatLog(text){const box=document.getElementById('logfloat');if(!box)return;const p=document.createElement('p');p.textContent=text;box.append(p);while(box.children.length>5)box.firstChild.remove();setTimeout(()=>p.classList.add('fade'),2600);setTimeout(()=>p.remove(),3200)}
function art(i){return TILE_ART[i]}
const GATE_WIDE_ART='assets/stronghold-entrance-wide.jpg';
function renderResources(){const need=foodNeed(),days=Math.floor(state.food/need),tone=state.hungryDays>0||days<=1?'danger':days<=3?'warn':'',label=state.hungryDays>0?'Hungry · day '+state.hungryDays:days+' day'+(days===1?'':'s')+' left';$('resources').innerHTML=[['Gold',state.gold,''],['Stone',state.stone,''],['Food',state.food,`<em class="food-days ${tone}">${label}</em>`],['Research',state.rp,'']].map(([n,v,x])=>`<div><span>${n}</span><strong>${fmt(v)}</strong>${x}</div>`).join('')}
function render(){renderIdentity();renderPack();
const inc=income();renderResources();renderPrince();
renderBuildPopup();
renderResearch();$('rotate').disabled=!!state.invasion.active;$('rotate').title=state.invasion.active?'Locked during an invasion':'';
$('grid').style.setProperty('--size',size+'px');$('grid').innerHTML='';for(let y=0;y<FIELD_SIZE;y++)for(let x=0;x<FIELD_SIZE;x++){
 const t=at(x,y),b=document.createElement('button');const valid=!state.over&&!state.invasion.active&&(relocating?canRelocate(x,y):!t&&hasBuildOption(x,y));
 const reserved=!t&&!state.over&&entranceBlocked(x,y);b.className='cell'+(t?' occupied':'')+(selected===t&&t?' selected':'')+(valid?' valid':'')+(reserved?' reserved':'')+(!t&&!valid&&!reserved?' blank':'');
 if(t){const im=document.createElement('img');const wide=t.type===17&&x>0&&x<FIELD_SIZE-1;im.src=wide?GATE_WIDE_ART:art(t.type);im.alt='';if(wide){im.className='gate-wide';b.classList.add('gate-wide-cell')}else im.style.transform=`rotate(${t.rot*90}deg)`;b.append(im);if(t.type>=12&&t.type<=15)b.append(doorPips(t));if(t.trap){const layer=document.createElement('span');layer.className='trap-floor trap-'+t.trap;layer.setAttribute('aria-hidden','true');layer.innerHTML='<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">'+TRAP_ART[t.trap]+'</svg>';b.append(layer)}if(selected===t){const label=document.createElement('span');label.className='tag';label.textContent=TYPES[t.type][0];b.append(label)}b.setAttribute('aria-label',`Occupied tile ${x+1}, ${y+1}`)}
 else{b.setAttribute('aria-label',`${valid?(relocating?'Relocate here':'Build here'):reserved?'Reserved gate tile':'Empty tile'} ${x+1}, ${y+1}`);if(reserved)b.title='Reserved: nothing can be built beside the castle gate';if(!valid){b.tabIndex=-1;b.setAttribute('aria-hidden','true')}}
 b.setAttribute('data-x',x);b.setAttribute('data-y',y);b.onclick=()=>{if(Date.now()>=suppressClickUntil)clickCell(x,y)};b.ondblclick=()=>{if(t&&!relocating&&Date.now()>=suppressClickUntil)openRoomViewer(x,y)};$('grid').append(b)
}
fxLayer();
$('day').textContent=state.over?'The keep has fallen':`Day ${state.day}`;$('forecast').textContent=`Room production per day: ${fmt(inc.gold)} gold · ${fmt(inc.stone)} stone · ${fmt(inc.food)} food · ${fmt(inc.rp)} research. Food upkeep: ${foodNeed()} per day (prince + ${state.collectors.length} servant${state.collectors.length===1?'':'s'}). Tap resource icons to collect, or assign a servant to a room. ${state.over?'Start a new keep to try again.':raidForecast()}`;renderClock();
$('hint').textContent=relocating?'Relocate throne · 50 gold + 25 stone · Choose a green + or an Empty Room':'Tap + to build · Drag to move the map · Pinch or Ctrl + scroll to zoom · Double-tap a room for details.';
renderSelection();renderRoomViewer();renderCollectorRoster();renderRoster();renderServantDialog();renderWorldEconomy();}
function inField(x,y){return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<FIELD_SIZE&&y<FIELD_SIZE}
function hasBuildOption(x,y){if(!inField(x,y)||at(x,y)||entranceBlocked(x,y))return false;return TYPES.some((_,i)=>i!==0&&i!==17&&unlocked(i)&&[0,1,2,3].some(rot=>placement({x,y,type:i,rot})))}
function clickCell(x,y){if(!inField(x,y))return;if(relocating){moveThrone(x,y);return}const t=at(x,y);if(t){selected=t;blueprint=null;renderSelection();syncRoomSelection();showTab('keep');openSheetOnPhone();return}if(state.over)return toast('This campaign has ended. Start a new keep.');if(!hasBuildOption(x,y))return;if(state.invasion.active)return toast('Invasion in progress: building is locked until it ends.');buildTarget={x,y};selected=null;blueprint=null;rotation=0;render();$('builddialog').showModal()}
function renderBuildPopup(){
 $('palette').replaceChildren();if(!buildTarget)return;
 $('build-location').textContent=`Build at ${buildTarget.x+1}, ${buildTarget.y+1} · Choose a blueprint below.`;
 const choices=[16,18,19,12,13,14,15,1,2,3,4,5,6,7,8,9,10,11].filter(i=>unlocked(i));
 $('unlock').textContent=choices.length+' unlocked blueprints';$('popuprotate').textContent=`Rotate previews · ${rotation*90}° ↻`;
 choices.forEach(i=>{const t=TYPES[i],fit=placement({...buildTarget,type:i,rot:rotation}),afford=state.gold>=t[1]&&state.stone>=t[2],prereq=prereqsMet(i),b=document.createElement('button');b.className='blueprint';b.disabled=state.over||!fit||!afford||!prereq||!!state.invasion.active;
 const im=document.createElement('img');im.src=art(i);im.alt='';im.style.transform=`rotate(${rotation*90}deg)`;
 const desc=document.createElement('div'),name=document.createElement('strong'),cost=document.createElement('span'),status=document.createElement('span');name.textContent=t[0];cost.textContent=`${t[1]} gold · ${t[2]} stone`;status.textContent=state.invasion.active?'Locked during an invasion':!prereq?'Requires '+prereqNames(i):!fit?'Rotate to match doorways':!afford?'Insufficient resources':'Build room';desc.append(name,cost,status);const thumb=document.createElement('div');thumb.className='thumb';thumb.append(im);if(i>=12&&i<=15)thumb.append(doorPips({type:i,rot:rotation}));b.append(thumb,desc);b.onclick=()=>buildAt(i,buildTarget.x,buildTarget.y,rotation);$('palette').append(b)
 })
}
function buildAt(type,x,y,rot){if(state.invasion.active){toast('Finish the invasion before changing the castle layout.');return false}
 if(state.over||!inField(x,y)||at(x,y)||!unlocked(type)||[0,17].includes(type)||!Number.isInteger(rot)||rot<0||rot>3||!prereqsMet(type))return false;
 const nt={x,y,type,rot},t=TYPES[type];if(type===1&&state.tiles.some(r=>r.type===1)){toast('Only one Barracks can be built.');return false}if(!placement(nt))return false;if(state.gold<t[1]||state.stone<t[2])return false;
 state.gold-=t[1];state.stone-=t[2];state.tiles.push(nt);note(t[0]+' constructed.');gainXp('mc',10);buildTarget=null;blueprint=null;selected=null;if($('builddialog').open)$('builddialog').close();save();render();return true;
}
function rotationAllowed(tile,rot,tiles=state.tiles){
 const candidate={...tile,rot},layout=tiles.map(t=>t===tile?candidate:t);
 if(!connected(layout))return false;
 for(let d=0;d<4;d++){const neighbor=at(candidate.x+DIRS[d][0],candidate.y+DIRS[d][1],layout);if(neighbor&&blocksHallDoor(candidate,neighbor,d))return false}
 return true;
}
function rotateSelected(){if(state.invasion.active){toast('Finish the invasion before changing the castle layout.');return false}
 if(state.over||!selected)return false;if(selected.type===17){toast('The castle entrance orientation is fixed.');return false}
 const old=selected.rot;
 for(let step=1;step<4;step++){const next=(old+step)%4;if(rotationAllowed(selected,next)){if(state.gold<ROTATION_COST){toast('Rotation after placement costs 10 gold.');return false}state.gold-=ROTATION_COST;selected.rot=next;repathServants();note(`Room rotated to ${next*90}° for ${ROTATION_COST} gold.`);save();render();toast(`Rotated to ${next*90}° · 10 gold paid.`);return true}}
 toast('No other rotation fits without blocking a doorway or disconnecting the keep.');return false;
}
function demolish(){if(state.invasion.active){toast('Finish the invasion before changing the castle layout.');return false}if(state.over||!selected||[0,17].includes(selected.type))return;if(selected.trap)return toast('Demolish the installed trap at its listed cost before removing this room.');if(roomCollector(selected)){toast('Unassign the servant before demolishing this room.');return}if(state.gold<DEMOLISH_COST){toast(`Demolition costs ${DEMOLISH_COST} gold.`);return}if(Object.values(selected.stock||{}).some(v=>v>0)){toast('Collect this room’s ready resources before demolition.');return}const tiles=state.tiles.filter(t=>t!==selected);if(!connected(tiles))return toast('Removing this tile would disconnect your keep.');const name=TYPES[selected.type][0];state.gold-=DEMOLISH_COST;state.tiles=tiles;selected=null;repathServants();note(`${name} demolished for ${DEMOLISH_COST} gold.`);save();render()}
function completeDay(){if(state.over)return;const need=foodNeed();if(state.food>=need){state.food=roundResource(state.food-need);if(state.hungryDays>0)note('The keep is fed again. Hunger penalties are lifted.');state.hungryDays=0}else{state.food=0;state.hungryDays++;applyHunger()}if(!state.over){if(state.world){const tr={};WorldGen.dayTick(state.world,{day:state.day,cap:state.prince.level+3,tribute:(k,v)=>{tr[k]=(tr[k]||0)+v;state[k]=roundResource(state[k]+v)},notify:(t,imp)=>{note(t);if(imp)toast(t)}});const parts=Object.keys(tr).filter(k=>tr[k]>=.5).map(k=>Math.round(tr[k])+' '+RESOURCE_INFO[k].name.toLowerCase());if(parts.length)note('Your outposts sent tribute: '+parts.join(', ')+'.');if(window.checkConquest)checkConquest()}state.day++;note('A new day begins.');foodWarning();if(window.cloudPushSoon)cloudPushSoon();if(state.day%5===0)toast(`Day ${state.day} reached. Open Settings to export a backup copy of your save.`)}save();render()}
function applyHunger(){const d=state.hungryDays;if(d===1)note('Hunger: servants fight 30% weaker until the keep is fed.');if(d===2)note('Hunger: the prince fights 25% weaker until the keep is fed.');if(d>=3&&state.collectors.length){const dying=state.collectors.reduce((a,b)=>b.id>a.id?b:a);state.collectors=state.collectors.filter(n=>n!==dying);if(state.invasion.active)state.invasion.active.knocked=state.invasion.active.knocked.filter(id=>id!==dying.id);note(`${dying.name} starved to death. Hire a replacement.`);toast(`${dying.name} starved to death.`)}if(d===5)note('The prince is starving: he has 20% less health in battle.');if(d>=7){state.over=true;state.invasion.active=null;state.invasion.combat=null;const modal=$('battle-dialog');if(modal?.open)modal.close();note('The prince starved. The keep has fallen.')}}
function foodWarning(){if(state.hungryDays>0)return;const days=Math.floor(state.food/foodNeed());if(days===0){note('Warning: not enough food for tomorrow.');toast('Not enough food for tomorrow. Hunger starts at day end.')}else if(days===1){note('Warning: food lasts only one more day.');toast('Food lasts only one more day.')}}

$('rotate').onclick=()=>{if(selected)rotateSelected();else toast('Select a placed tile to rotate it. Rotate new tiles in the build popup.');};$('deselect').onclick=()=>{selected=null;blueprint=null;relocating=false;render()};$('zoomin').onclick=()=>changeZoom(10);$('zoomout').onclick=()=>changeZoom(-10);$('reset').onclick=startNewStronghold;$('closeroster').onclick=()=>$('rosterdialog').close();$('closeservant').onclick=()=>$('servantdialog').close();$('closehelp').onclick=()=>$('helpdialog').close();$('export').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='stronghold-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};$('import').onclick=()=>$('importfile').click();$('importfile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const next=validate(JSON.parse(await file.text()));if(await askConfirm('Replace your campaign?','Your current campaign will be replaced with this save.','Replace','Cancel')){state=next;needsSetup=false;updateMainMenu();resetDayClock();selected=null;blueprint=null;relocating=false;buildTarget=null;save();render();scheduleThroneCenter();toast('Campaign restored.')}}catch{toast('That file is not a valid Stronghold save.')}e.target.value=''};$('popuprotate').onclick=()=>{rotation=(rotation+1)%4;renderBuildPopup()};$('closebuild').onclick=()=>$('builddialog').close();$('builddialog').addEventListener('close',()=>{buildTarget=null;rotation=0});$('builddialog').addEventListener('cancel',()=>{buildTarget=null;rotation=0});$('center').onclick=centerThrone;
document.addEventListener('keydown',e=>{if(awaitingResume||state.expedition)return;if(e.key.toLowerCase()==='r'&&!$('helpdialog').open&&!$('roomdialog').open&&!$('rosterdialog').open&&!$('servantdialog').open&&!$('confirm-dialog').open&&!$('settingsdialog').open&&!$('researchdialog').open&&!$('keepdialog').open&&!$('princedialog').open){if($('builddialog').open)$('popuprotate').click();else $('rotate').click()}if(e.key==='Escape'&&!$('builddialog').open&&!$('roomdialog').open&&!$('rosterdialog').open&&!$('servantdialog').open&&!$('confirm-dialog').open&&!$('settingsdialog').open&&!$('researchdialog').open&&!$('keepdialog').open&&!$('princedialog').open)$('deselect').click()});render();scheduleThroneCenter();

function relocationTiles(x,y){const throne=state.tiles.find(t=>t.type===0);return state.tiles.filter(t=>t.x!==x||t.y!==y).map(t=>t===throne?{...t,type:16}:t).concat({x,y,type:0,rot:throne.rot,level:throne.level||1})}
function canRelocate(x,y){if(state.invasion.active)return false;const dest=at(x,y);if(!inField(x,y)||entranceBlocked(x,y)||dest&&(dest.type!==16||dest.trap)||false)return false;const tiles=relocationTiles(x,y);if(!connected(tiles))return false;for(const a of tiles)for(let d=0;d<4;d++){const b=at(a.x+DIRS[d][0],a.y+DIRS[d][1],tiles);if(b&&blocksHallDoor(a,b,d))return false}return true}
function moveThrone(x,y){if(state.over)return;if(!canRelocate(x,y))return toast('Choose an Empty Room without traps, or an open square connected through matching doorways.');if(state.gold<50||state.stone<25)return toast('Relocation requires 50 gold and 25 stone.');state.gold-=50;state.stone-=25;const previous=state.tiles.find(t=>t.type===0),oldKey=roomKey(previous),productionMs=previous.productionMs||0,stock={...(previous.stock||{})};state.tiles=relocationTiles(x,y);const vacated=at(previous.x,previous.y);delete vacated.level;delete vacated.productionMs;delete vacated.stock;selected=at(x,y);selected.productionMs=productionMs;selected.stock=stock;const displaced=roomCollector(selected);if(displaced){displaced.home=null;displaced.path=[];displaced.mode='wander'}repathServants();relocating=false;note('Throne relocated. Its former chamber is now an Empty Room.');save();render()}
function researchStatus(i){if(unlocked(i))return 'Researched';if(!state.tiles.some(t=>t.type===19))return 'Build a Research Room first';if(state.rp<RESEARCH_COST[i])return `Need ${RESEARCH_COST[i]-state.rp} more points`;return 'Ready to research'}
function renderResearch(){const el=$('research');el.replaceChildren();const h=document.createElement('h3');h.textContent='Research';el.append(h);const p=document.createElement('p');p.className='muted';const left=[];for(let i=1;i<=11;i++)if(!unlocked(i))left.push(i);p.textContent=`${fmt(state.rp)} points available · +${fmt(income().rp)} per day. ${left.length?left.length+' blueprints still locked.':'Every blueprint is researched.'} Unlocks are permanent.`;el.append(p);const b=document.createElement('button');b.className='primary';b.textContent='Open research list';b.onclick=()=>{$('researchdialog').showModal();renderResearchDialog()};el.append(b);renderResearchDialog()}
function renderResearchList(list){list.replaceChildren();for(let i=1;i<=11;i++){const t=TYPES[i],row=document.createElement('div');row.className='research-row'+(unlocked(i)?' done':'');const info=document.createElement('div'),name=document.createElement('strong'),desc=document.createElement('p'),need=document.createElement('p');name.textContent=t[0];desc.className='muted';desc.textContent=t[5];need.className='muted';need.textContent=(t[4]&&t[4].length?'Also needs: '+prereqNames(i)+'. ':'')+researchStatus(i);info.append(name,desc,need);const b=document.createElement('button');b.textContent=unlocked(i)?'Researched':`${RESEARCH_COST[i]} points`;b.disabled=state.over||unlocked(i)||state.rp<RESEARCH_COST[i]||!state.tiles.some(t=>t.type===19);b.onclick=()=>research(i);row.append(info,b);list.append(row)}}
function renderResearchDialog(){const dlg=$('researchdialog');if(!dlg||!dlg.open)return;$('research-summary').textContent=`${fmt(state.rp)} research points · +${fmt(income().rp)} per day. Research Rooms make the points. Unlocks are permanent.`;renderResearchList($('research-list'))}

function scheduleThroneCenter(){requestAnimationFrame(()=>requestAnimationFrame(centerThrone))}
function updateFieldPadding(){const vp=$('viewport');$('grid').style.setProperty('--field-pad-x',vp.clientWidth/2+'px');$('grid').style.setProperty('--field-pad-y',vp.clientHeight/2+'px')}
function centerThrone(){
 const vp=$('viewport'),throne=state.tiles.find(t=>t.type===0);if(!throne)return;updateFieldPadding();
 const tile=$('grid').children[throne.y*FIELD_SIZE+throne.x];if(!tile)return;
 const room=tile.getBoundingClientRect(),view=vp.getBoundingClientRect();
 vp.scrollLeft+=room.left+room.width/2-(view.left+vp.clientLeft+vp.clientWidth/2);
 vp.scrollTop+=room.top+room.height/2-(view.top+vp.clientTop+vp.clientHeight/2);
}
function zoomAt(nextSize,clientX,clientY){
 const vp=$('viewport'),view=vp.getBoundingClientRect(),px=clientX-view.left-vp.clientLeft,py=clientY-view.top-vp.clientTop,padX=vp.clientWidth/2,padY=vp.clientHeight/2,wx=(vp.scrollLeft+px-padX)/size,wy=(vp.scrollTop+py-padY)/size;
 size=Math.max(120,Math.min(240,nextSize));$('grid').style.setProperty('--size',size+'px');updateFieldPadding();vp.scrollLeft=wx*size+padX-px;vp.scrollTop=wy*size+padY-py;
}
function changeZoom(delta){const vp=$('viewport'),r=vp.getBoundingClientRect();zoomAt(size+delta,r.left+vp.clientLeft+vp.clientWidth/2,r.top+vp.clientTop+vp.clientHeight/2)}

function trapDemolitionCost(id){return Math.ceil(TRAPS[id].price*.25)}
function installTrap(id){
 if(state.over||!selected||!state.tiles.includes(selected)||selected.type!==16||!Object.hasOwn(TRAPS,id))return false;
 if(selected.trap){toast('Demolish the installed trap before buying another style.');return false}
 const trap=TRAPS[id];if(state.gold<trap.price){toast('Not enough gold to install this trap.');return false}
 state.gold-=trap.price;selected.trap=id;selected.trapLevel=1;note(`${trap.name} installed. It hurts invaders only.`);gainXp('mc',10);save();render();return true;
}
function demolishTrap(){
 if(state.over||!selected||!state.tiles.includes(selected)||selected.type!==16||!selected.trap)return false;
 const id=selected.trap,cost=trapDemolitionCost(id);if(state.gold<cost){toast(`Trap demolition requires ${cost} gold.`);return false}
 state.gold-=cost;delete selected.trap;delete selected.trapLevel;note(`${TRAPS[id].name} demolished for ${cost} gold. The room can receive a new trap style.`);save();render();return true;
}
function renderTrapOptions(target=$('selection')){
 const panel=document.createElement('section');panel.className='trap-upgrades';const h=document.createElement('h3');h.textContent='Room trap upgrade';panel.append(h);
 const help=document.createElement('p');help.className='muted';help.textContent='Weakest → strongest · Hurts invaders only, never allies. A trap cannot take an invader below 10% health. One style per room. Remove the current trap before changing styles.';panel.append(help);
 if(selected.trap){const trap=TRAPS[selected.trap],active=document.createElement('p');active.className='installed-trap';active.textContent=`Installed: ${trap.name} · Level ${selected.trapLevel||1} / 5 · ${fmt(trapStrength(selected))} damage`;panel.append(active);const room=selected,up=document.createElement('button'),upgradeCost=trapUpgradeCost(room);up.textContent=(room.trapLevel||1)>=5?'Maximum trap level reached':`Upgrade trap to Level ${(room.trapLevel||1)+1} · ${upgradeCost} gold`;up.disabled=state.over||(room.trapLevel||1)>=5||state.gold<upgradeCost;up.onclick=()=>upgradeTrap(room);panel.append(up);const remove=document.createElement('button');remove.className='remove-trap';const cost=trapDemolitionCost(selected.trap);remove.textContent=`Demolish trap · ${cost} gold`;remove.disabled=state.over||state.gold<cost;remove.onclick=demolishTrap;panel.append(remove)}
 for(const [id,trap] of Object.entries(TRAPS)){
  const button=document.createElement('button');button.className='trap-option';button.style.setProperty('--trap-color',trap.color);button.disabled=state.over||!!selected.trap||state.gold<trap.price;
  const name=document.createElement('strong');name.textContent=trap.name;const info=document.createElement('span');info.textContent=`${trap.price} gold · ${trap.strength} damage · remove ${trapDemolitionCost(id)} gold`;button.append(name,info);button.onclick=()=>installTrap(id);panel.append(button)
 }
 target.append(panel);
}

function renderSelection(){$('rotate').disabled=state.over||!selected||selected.type===17||state.gold<ROTATION_COST;$('selection').innerHTML='';if(selected){const t=TYPES[selected.type];const h=document.createElement('h2');h.textContent=t[0];$('selection').append(h);const p=document.createElement('p');p.textContent=t[5];$('selection').append(p);const rot=document.createElement('button');rot.textContent='Rotate · 10 gold ↻';rot.onclick=rotateSelected;rot.disabled=selected.type===17||state.over||state.gold<ROTATION_COST;$('selection').append(rot);if(selected.type===0){const move=document.createElement('button');move.textContent='Relocate throne · 50 gold + 25 stone';move.disabled=state.over;move.onclick=()=>{relocating=true;blueprint=null;render()};$('selection').append(move)}if(![0,17].includes(selected.type)){const del=document.createElement('button');del.textContent=selected.trap?'Remove trap before demolishing room':`Demolish · ${DEMOLISH_COST} gold`;del.disabled=state.over||!!selected.trap||state.gold<DEMOLISH_COST;del.onclick=demolish;$('selection').append(del)}}else $('selection').textContent='Select any placed tile to inspect its room name and details.';
if(selected&&selected.type===16)renderTrapOptions();
if(selected){renderRoomEconomy(selected,$('selection'));renderResourceUpgrade(selected,$('selection'));}
}

function syncRoomSelection(){const grid=$('grid');for(const b of grid.children){b.classList.remove('selected');const tag=b.querySelector('.tag');if(tag)tag.remove()}if(selected){const cell=grid.children[selected.y*FIELD_SIZE+selected.x];cell.classList.add('selected');const tag=document.createElement('span');tag.className='tag';tag.textContent=TYPES[selected.type][0];cell.append(tag)}}
function openRoomViewer(x,y){const room=at(x,y);if(!room)return;viewedRoom={x,y};selected=room;blueprint=null;renderSelection();syncRoomSelection();renderRoomViewer();if(!$('roomdialog').open)$('roomdialog').showModal()}
function renderRoomViewer(){
 if(!viewedRoom)return;const room=at(viewedRoom.x,viewedRoom.y);if(!room){viewedRoom=null;if($('roomdialog').open)$('roomdialog').close();return}
 selected=room;$('room-title').textContent=TYPES[room.type][0];$('room-image').src=room.type===17?GATE_WIDE_ART:art(room.type);$('room-image').style.transform=room.type===17?'':`rotate(${room.rot*90}deg)`;$('room-image').parentElement.style.aspectRatio=room.type===17?'3/1':'';$('roomdialog').classList.toggle('wide',room.type===17);
 $('room-overlay').innerHTML=room.trap?'<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">'+TRAP_ART[room.trap]+'</svg>':'';$('room-overlay').className=room.trap?'trap-floor trap-'+room.trap:'trap-floor';
 $('room-description').textContent=(Object.keys(roomRates(room)).length?'Base room: ':'')+TYPES[room.type][5];$('room-stats').textContent=`Location ${room.x+1}, ${room.y+1} · Rotation ${room.rot*90}°`+(room.trap?` · Trap damage ${fmt(trapStrength(room))}`:'');
 const actions=$('room-actions');actions.replaceChildren();const tools=document.createElement('div');tools.className='room-tools';renderRoomEconomy(room,actions);renderResourceUpgrade(room,actions);if(room.type===16)renderTrapOptions(actions);else if(!Object.keys(roomRates(room)).length){const p=document.createElement('p');p.className='muted';p.textContent='This room has no resource upgrades.';actions.append(p)}
 if(room.type===0){const p=document.createElement('p');p.className='room-role-note';p.textContent='The evil prince wanders only inside this throne room and automatically collects its gold and stone. He follows the throne when relocated. He eats 1 food per day.';actions.append(p);const move=document.createElement('button');move.textContent='Relocate throne · 50 gold + 25 stone';move.disabled=state.over;move.onclick=()=>{$('roomdialog').close();relocating=true;blueprint=null;render()};tools.append(move)}
 renderMC();if(room.type===17)startCrowd();else stopCrowd();
 if(room.type===0){const sv=document.createElement('button');const assigned=state.collectors.filter(n=>n.home!==null).length;sv.textContent=`Manage servants · ${state.collectors.length} of ${servantCap()} · ${assigned} assigned`;sv.onclick=openRoster;tools.append(sv)}
 if(room.type===19){const sec=document.createElement('section');sec.className='room-research';const h=document.createElement('h3');h.textContent='Research blueprints';const p=document.createElement('p');p.className='muted';p.textContent=`${fmt(state.rp)} research points · +${fmt(income().rp)} per day. Unlocks are permanent.`;const list=document.createElement('div');renderResearchList(list);sec.append(h,p,list);actions.append(sec)}
 if(room.type===1&&window.renderBarracks)renderBarracks(actions);
 const rotate=document.createElement('button');rotate.textContent='Rotate room · 10 gold ↻';rotate.disabled=state.over||room.type===17||state.gold<ROTATION_COST||!!state.invasion.active;if(state.invasion.active){rotate.textContent='Rotate locked during invasion';rotate.title='Finish the invasion first'}rotate.onclick=()=>{selected=room;rotateSelected()};tools.append(rotate);
 if(![0,17].includes(room.type)){const del=document.createElement('button');del.textContent=room.trap?'Remove trap before demolishing room':`Demolish room · ${DEMOLISH_COST} gold`;del.disabled=state.over||!!room.trap||state.gold<DEMOLISH_COST||!!state.invasion.active;if(state.invasion.active){del.textContent='Demolish locked during invasion';del.title='Finish the invasion first'}del.onclick=()=>{selected=room;demolish()};tools.append(del)}actions.append(tools);
}

/* ---------- Entrance window: prince, servants and guards mill about and talk ---------- */
let crowd=null;
const CROWD_LINES={mc:['Keep the gate sealed tonight.','Any word from the border?','Our stores look healthy.','Stay sharp, everyone.'],guard:['The gate is secure, my prince.','I take the next watch.','Thieves tried the wall again.','My blade is sharpened and ready.'],servant:['Fresh bread is nearly ready.','Mind the wet floor!','We need more firewood.','I swept the hall twice today.'],reply:['Aye, so I hear.','As you say.','Indeed.','Well said.','Let us hope it stays quiet.']};
function crowdMembers(){const away=new Set((state.expedition?.party||[]).map(m=>m.id)),list=[];if(state.mc&&!away.has('mc'))list.push({id:'mc',role:'mc',name:'Young Prince',atlas:MC_SPRITE_ATLAS});for(const g of state.guards||[])if(!away.has(g.id))list.push({id:g.id,role:'guard',name:g.name,atlas:SERVANT_ATLASES[g.look||0]});for(const n of state.collectors)if(!away.has(n.id))list.push({id:n.id,role:'servant',name:n.name,atlas:SERVANT_ATLASES[n.look||0]});return list}
function stopCrowd(){if(!crowd)return;cancelAnimationFrame(crowd.raf);crowd=null;const box=$('room-crowd');if(box)box.replaceChildren()}
function startCrowd(){
 const box=$('room-crowd');if(!box)return;const members=crowdMembers(),sig=members.map(m=>m.id).join('|');if(crowd&&crowd.sig===sig)return;stopCrowd();
 const actors=members.map(m=>{const el=document.createElement('div');el.className='crowd-actor';el.style.backgroundImage='url("'+m.atlas+'")';el.title=m.name;const bub=document.createElement('span');bub.className='crowd-bubble';bub.hidden=true;el.append(bub);box.append(el);return{...m,el,bub,u:.12+Math.random()*.76,v:.38+Math.random()*.24,tu:0,tv:0,wait:Math.random()*1500,dir:1,moving:false,hold:false}});
 crowd={sig,actors,raf:0,last:performance.now(),convo:null,nextConvo:2500,solo:6000};
 const pick=a=>a[Math.floor(Math.random()*a.length)],say=(a,text)=>{a.bub.textContent=text;a.bub.hidden=false},hush=a=>{a.bub.hidden=true;a.hold=false};
 const loop=now=>{if(!crowd)return;const dt=Math.min(80,now-crowd.last);crowd.last=now;
  for(const a of actors){
   if(!a.hold){if(a.wait>0){a.wait-=dt;a.moving=false}else{const dx=a.tu-a.u,dy=a.tv-a.v,d=Math.hypot(dx,dy/3);if(!a.target||d<.004){a.target=true;a.moving=false;a.wait=900+Math.random()*2600;a.tu=.07+Math.random()*.86;a.tv=.38+Math.random()*.24;if(Math.hypot(a.tu-a.u,(a.tv-a.v)/3)<.06)a.wait=300}else{const step=Math.min(d,dt*.000055);a.u+=dx/d*step;a.v+=dy/d*step;a.moving=true;a.dir=mcFacing(dx*3,dy)}}}
   else a.moving=false;
   const row=a.dir*2+(a.moving?1:0),frame=Math.floor(now/(a.moving?125:250))%8;a.el.style.left=a.u*100+'%';a.el.style.top=a.v*100+'%';a.el.style.zIndex=Math.round(a.v*100);a.el.style.backgroundPosition=`${frame/7*100}% ${row/15*100}%`}
  const c=crowd.convo;
  if(!c){crowd.nextConvo-=dt;crowd.solo-=dt;if(actors.length>=2&&crowd.nextConvo<=0){const a=pick(actors);let b=pick(actors);for(let i=0;i<8&&b===a;i++)b=pick(actors);if(a!==b){const mu=.25+Math.random()*.5,mv=.4+Math.random()*.18;a.tu=mu-.03;a.tv=mv;b.tu=mu+.03;b.tv=mv;for(const x of [a,b]){x.target=false;x.wait=0}crowd.convo={a,b,phase:'meet',t:0,idx:0,next:0};a.target=b.target=true}crowd.nextConvo=6000+Math.random()*4000}
   else if(actors.length===1&&crowd.solo<=0){const a=actors[0];say(a,pick(CROWD_LINES[a.role]));setTimeout(()=>{if(crowd)hush(a)},2600);crowd.solo=8000}}
  else{c.t+=dt;
   if(c.phase==='meet'){c.a.wait=c.b.wait=0;if((Math.hypot(c.a.u-c.a.tu,(c.a.v-c.a.tv)/3)<.012&&Math.hypot(c.b.u-c.b.tu,(c.b.v-c.b.tv)/3)<.012)||c.t>9000){c.phase='talk';c.a.hold=c.b.hold=true;c.a.dir=mcFacing(c.b.u-c.a.u,0);c.b.dir=mcFacing(c.a.u-c.b.u,0);c.next=0;c.idx=0}}
   else{c.next-=dt;if(c.next<=0){if(c.idx>=5){hush(c.a);hush(c.b);c.a.wait=c.b.wait=600;c.a.target=c.b.target=false;crowd.convo=null}else{const s=c.idx%2?c.b:c.a,o=c.idx%2?c.a:c.b;hush(o);o.hold=true;say(s,c.idx<2?pick(CROWD_LINES[s.role]):pick(CROWD_LINES.reply));c.idx++;c.next=2000}}}}
  crowd.raf=requestAnimationFrame(loop)};
 crowd.raf=requestAnimationFrame(loop)}
$('roomdialog').addEventListener('close',stopCrowd);
function setupFieldGestures(){
 const vp=$('viewport'),pointers=new Map();let gesture=null,lastTap=null;
 const blocked=()=>awaitingResume||['roomdialog','builddialog','helpdialog','battle-dialog','expdialog','rosterdialog','servantdialog','confirm-dialog','settingsdialog','researchdialog','keepdialog','princedialog'].some(id=>$(id)?.open);
 const cellAt=(x,y)=>document.elementFromPoint(x,y)?.closest('.cell');
 const cellKey=cell=>cell?cell.getAttribute('data-x')+','+cell.getAttribute('data-y'):null;
 const startDrag=p=>{if(!pointers.has(p.id)||p.wasPinch)return;p.dragging=true;lastTap=null;suppressClickUntil=Date.now()+700;vp.classList.add('is-map-dragging');try{vp.setPointerCapture(p.id)}catch{}};
 vp.addEventListener('wheel',e=>{if(blocked())return;if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?vp.clientHeight:1);zoomAt(size*Math.exp(-Math.max(-25,Math.min(25,delta))*.01),e.clientX,e.clientY)},{passive:false});
 vp.addEventListener('pointerdown',e=>{if(blocked()||e.button!==0&&e.pointerType!=='touch'||e.target.closest?.('.resource-pickup,.collector-sprite'))return;const now=Date.now(),second=!!lastTap&&now-lastTap.time<380&&Math.hypot(e.clientX-lastTap.px,e.clientY-lastTap.py)<30,p={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,time:now,second,firstKey:lastTap?.key,dragging:false,wasPinch:false,type:e.pointerType};pointers.set(e.pointerId,p);if(e.pointerType==='touch'||second)try{vp.setPointerCapture(e.pointerId)}catch{}if(second){p.holdTimer=setTimeout(()=>startDrag(p),180);suppressClickUntil=now+500}if(pointers.size===2){for(const point of pointers.values()){clearTimeout(point.holdTimer);point.wasPinch=true}const [a,b]=[...pointers.values()];gesture={distance:Math.hypot(a.x-b.x,a.y-b.y),size};lastTap=null;suppressClickUntil=now+700;}});
 vp.addEventListener('pointermove',e=>{const p=pointers.get(e.pointerId);if(!p)return;const oldX=p.x,oldY=p.y;p.x=e.clientX;p.y=e.clientY;if(pointers.size===2&&gesture){e.preventDefault();const [a,b]=[...pointers.values()];if(gesture.distance>0)zoomAt(gesture.size*Math.hypot(a.x-b.x,a.y-b.y)/gesture.distance,(a.x+b.x)/2,(a.y+b.y)/2);suppressClickUntil=Date.now()+700;return}const moved=Math.hypot(p.x-p.startX,p.y-p.startY)>8;if(!p.dragging&&moved){clearTimeout(p.holdTimer);startDrag(p)}if(p.dragging){e.preventDefault();vp.scrollLeft-=p.x-oldX;vp.scrollTop-=p.y-oldY;suppressClickUntil=Date.now()+700;}});
 const finish=(e,cancelled=false)=>{const p=pointers.get(e.pointerId);if(!p)return;clearTimeout(p.holdTimer);pointers.delete(e.pointerId);if(pointers.size<2)gesture=null;vp.classList.remove('is-map-dragging');try{vp.releasePointerCapture(e.pointerId)}catch{}if(cancelled||p.dragging||p.wasPinch){lastTap=null;suppressClickUntil=Date.now()+700;return}const cell=cellAt(e.clientX,e.clientY),key=cellKey(cell),now=Date.now(),short=now-p.time<240;if(p.second&&short){e.preventDefault();lastTap=null;suppressClickUntil=now+700;if(cell&&key===p.firstKey&&!relocating){const x=Number(cell.getAttribute('data-x')),y=Number(cell.getAttribute('data-y'));if(at(x,y))openRoomViewer(x,y)}return}lastTap={time:now,px:e.clientX,py:e.clientY,key};if(p.type==='touch'&&cell){e.preventDefault();suppressClickUntil=now+500;clickCell(Number(cell.getAttribute('data-x')),Number(cell.getAttribute('data-y')))}};
 vp.addEventListener('pointerup',e=>finish(e));vp.addEventListener('pointercancel',e=>finish(e,true));vp.addEventListener('lostpointercapture',e=>{if(pointers.has(e.pointerId))finish(e,true)});vp.addEventListener('dblclick',e=>{if(Date.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
}
$('closepack').onclick=()=>$('packdialog').close();$('closeroom').onclick=()=>$('roomdialog').close();$('roomdialog').addEventListener('close',()=>{viewedRoom=null});setupFieldGestures();

const speedButtons=Array.from($('game-speed').querySelectorAll('[data-speed]'));
function renderGameSpeed(){
 for(const button of speedButtons)button.setAttribute('aria-pressed',String(Number(button.dataset.speed)===gameSpeed));
}
for(const button of speedButtons)button.onclick=()=>{
 if(awaitingResume||document.hidden)return;
 tickDayClock();
 gameSpeed=Number(button.dataset.speed);
 settings.gameSpeed=gameSpeed;
 saveSettings();
 renderGameSpeed();
 renderClock();
};
renderGameSpeed();

function renderClock(){
 const remaining=Math.max(0,DAY_MS-state.dayElapsedMs),seconds=Math.ceil(remaining/(1000*gameSpeed)),minutes=Math.floor(seconds/60);
 $('daytimer').textContent=state.over?'Clock stopped':`${String(minutes).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')} until Day ${state.day+1}`;
 $('dayclockfill').style.width=(state.dayElapsedMs/DAY_MS*100)+'%';$('chip-text').textContent=state.over?'The keep has fallen':`Day ${state.day} · ${String(minutes).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;$('chip-fill').style.width=(state.dayElapsedMs/DAY_MS*100)+'%';
}
function resetDayClock(){lastClockTick=Date.now();lastClockSave=lastClockTick;clockSuspended=awaitingResume;}
function applyElapsedTime(elapsed,speed=1){
 if(awaitingResume||state.over||!Number.isFinite(elapsed)||elapsed<=0)return;
 while(elapsed>0&&!state.over){const step=Math.min(elapsed,250,DAY_MS-state.dayElapsedMs);if(state.invasion.combat){tickCombat(step);elapsed-=step;continue}if(state.expedition){elapsed-=step;continue}simulateEconomy(step,step/speed);state.dayElapsedMs+=step;tickInvasion(step);elapsed-=step;if(state.dayElapsedMs>=DAY_MS){state.dayElapsedMs=0;completeDay()}}
 if(state.over)state.dayElapsedMs=0;
}

function tickDayClock(now=Date.now()){
 if(clockSuspended)return;const elapsed=Math.max(0,now-lastClockTick);lastClockTick=now;applyElapsedTime(elapsed*gameSpeed,gameSpeed);renderClock();renderWorldEconomy();renderAlarm();
 if(now-lastClockSave>=5000){save();lastClockSave=now}
}
setInterval(tickDayClock,250);
function updateGameVisibility(){
 if(document.hidden)pauseForBackground();
 else if(!awaitingResume){lastClockTick=Date.now();clockSuspended=false}
}
document.addEventListener('visibilitychange',updateGameVisibility);
window.addEventListener('pagehide',pauseForBackground);
window.addEventListener('pageshow',updateGameVisibility);

function fmt(value){return Number(value.toFixed(3)).toLocaleString(undefined,{maximumFractionDigits:3})}
function roundResource(value){return Math.round((value+Number.EPSILON)*1000000)/1000000}
function roomKey(room){return room.x+','+room.y}
function roomFromKey(key,tiles=state.tiles){if(!key)return null;return tiles.find(t=>roomKey(t)===key)||null}
requestAnimationFrame(animateMC);

requestAnimationFrame(animateCombatVisuals);$('battle-dialog').addEventListener('cancel',e=>e.preventDefault());$('battle-skip').onclick=skipBattle;
function pauseForBackground(){
 if(!clockSuspended)tickDayClock();
 clockSuspended=true;
 save();
}
function updateMainMenu(){
 const info=$('menu-campaign');
 $('menu-continue').disabled=needsSetup;
 info.hidden=needsSetup;
 info.textContent=needsSetup?'':state.strongholdName+' · Day '+state.day+(state.over?' · Keep fallen':'');
}
function setMainMenu(visible){
 $('main-menu').hidden=!visible;
 document.body.classList.toggle('at-main-menu',visible);
 for(const panel of document.querySelectorAll('.game-topbar, body > main'))panel.inert=visible;
 if(visible){updateMainMenu();CitadelMenuScene.draw()}
}
function showMainMenu(){
 pauseForBackground();
 awaitingResume=true;
 for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
 setMainMenu(true);
 $('menu-title').focus();
 window.cloudPushSoon?.();
}
function resumeGame(){
 if(needsSetup)return;
 awaitingResume=false;
 resetDayClock();
 clockSuspended=document.hidden;
 setMainMenu(false);
 renderClock();
 if(window.showExpedition)showExpedition();
 renderBattle();
 save();
 if(!$('battle-dialog').open&&!$('expdialog').open)$('return-menu').focus({preventScroll:true});
}

$('return-menu').onclick=showMainMenu;
$('save-game').onclick=()=>{
 if(!save())return;
 StrongholdAudio.play('save');
 toast('Game saved on this device.');
 window.cloudPushSoon?.();
};
$('menu-continue').onclick=resumeGame;
$('menu-new').onclick=startNewStronghold;
$('menu-help').onclick=()=>$('helpdialog').showModal();
$('close-sound').onclick=()=>$('sound-dialog').close();
const soundFields={music:$('music-volume'),effects:$('effects-volume')};
function updateSoundControls(){
 settings.sound=StrongholdAudio.normalize(settings.sound);
 for(const [key,field] of Object.entries(soundFields)){
  field.value=settings.sound[key];
  $(key+'-level').textContent=field.value+'%';
 }
 $('mute-all').checked=settings.sound.mute;
 StrongholdAudio.set(settings.sound);
}
$('menu-sound').onclick=()=>{updateSoundControls();$('sound-dialog').showModal()};
for(const [key,field] of Object.entries(soundFields))field.oninput=()=>{
 settings.sound[key]=field.valueAsNumber;
 updateSoundControls();
 saveSettings();
};
$('mute-all').onchange=e=>{
 settings.sound.mute=e.target.checked;
 updateSoundControls();
 saveSettings();
};
updateSoundControls();
setMainMenu(true);

function askConfirm(title,text,okLabel='Confirm',cancelLabel='Cancel',hold=false){return new Promise(resolve=>{const dlg=$('confirm-dialog'),ok=$('confirm-ok');$('confirm-title').textContent=title;$('confirm-text').textContent=text;ok.textContent=okLabel;$('confirm-cancel').textContent=cancelLabel;ok.classList.toggle('hold-btn',hold);ok.classList.remove('holding');let done=false,timer=null;const finish=v=>{if(done)return;done=true;clearTimeout(timer);ok.onclick=ok.onpointerdown=ok.onpointerup=ok.onpointerleave=ok.onpointercancel=ok.onkeydown=ok.onkeyup=null;ok.classList.remove('hold-btn','holding');$('confirm-cancel').onclick=null;dlg.onclose=null;if(dlg.open)dlg.close();resolve(v)};const stop=()=>{clearTimeout(timer);ok.classList.remove('holding')},go=()=>{if(timer)clearTimeout(timer);ok.classList.add('holding');timer=setTimeout(()=>finish(true),1200)};if(hold){ok.onpointerdown=e=>{e.preventDefault();go()};ok.onpointerup=ok.onpointerleave=ok.onpointercancel=stop;ok.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat){e.preventDefault();go()}};ok.onkeyup=stop;ok.onclick=e=>e.preventDefault()}else ok.onclick=()=>finish(true);$('confirm-cancel').onclick=()=>finish(false);dlg.onclose=()=>finish(false);dlg.showModal()})}
async function startNewStronghold(){
 if(!needsSetup&&!await askConfirm('Start a New Stronghold?',
  'Your current stronghold on this device'+(window.cloudSignedIn?.()?' and your cloud save':'')+
  ' will be replaced. This cannot be undone. Use Export save first if you want to keep it.',
  'Start New','Keep playing'))return;
 const ident=await openSetup({canCancel:true});
 if(!ident){if(awaitingResume)$('menu-new').focus();return}
 state=fresh();
 needsSetup=false;
 applyIdentity(ident);
 resetDayClock();
 selected=null;blueprint=null;relocating=false;buildTarget=null;
 render();
 resumeGame();
 scheduleThroneCenter();
 window.cloudPushSoon?.();
}


/* ---------- Phase 2 interface ---------- */
function isPhone(){return window.matchMedia&&matchMedia('(max-width:760px)').matches}
function openSheetOnPhone(){}
function showTab(){}
$('daychip').onclick=()=>{if(!$('keepdialog').open)$('keepdialog').showModal()};$('princebtn').onclick=()=>{if(!$('princedialog').open)$('princedialog').showModal()};$('closekeep').onclick=()=>$('keepdialog').close();$('closeprince').onclick=()=>$('princedialog').close();
function fxLayer(){if(!fxEl){fxEl=document.createElement('div');fxEl.id='fx-layer'}const grid=$('grid');if(fxEl.parentNode!==grid)grid.append(fxEl);return fxEl}
function fxAt(room,cls,text,life=1500){if(!room||!$('grid'))return;if(cls==='flash'&&!motionOK())return;const el=document.createElement('span');el.className='fx '+cls+(motionOK()?'':' still');el.style.left=`calc(${room.x+.5}*var(--size))`;el.style.top=`calc(${room.y+(cls==='flash'?.5:.35)}*var(--size))`;if(text)el.textContent=text;fxLayer().append(el);setTimeout(()=>el.remove(),life)}
function shakeScreen(){if(!motionOK())return;document.body.classList.add('shake');clearTimeout(shakeTimer);shakeTimer=setTimeout(()=>document.body.classList.remove('shake'),700)}
function doorPips(tile){const w=document.createElement('span');w.className='doors';w.setAttribute('aria-hidden','true');for(const d of exits(tile)){const s=document.createElement('i');s.className='door d'+d;w.append(s)}return w}
let alarmShown='';
function renderAlarm(){const b=$('alarm-banner');if(!b)return;const r=state.invasion,inv=r.active;let text='';if(!awaitingResume&&!state.over){if(inv)text=`${inv.name} inside the keep · Health ${Math.ceil(inv.hp)}/${inv.maxHp} · tap to locate`;else if(r.alarmMs!=null)text=`Alarm! Intruders at the gate in ${Math.ceil(r.alarmMs/1000)} seconds · tap to look`}b.hidden=!text;if(text!==alarmShown){$('alarm-text').textContent=text;alarmShown=text}b.classList.toggle('inside',!!inv);const first=!!text&&!settings.seenAlarm;$('alarm-help').hidden=!first;$('alarm-ok').hidden=!first}
$('alarm-banner').onclick=e=>{if(e.target.id==='alarm-ok')return;const inv=state.invasion.active;if(inv)centerInvader();else{const gate=state.tiles.find(t=>t.type===17);if(gate)centerTile(gate.x,gate.y)}};
$('alarm-ok').onclick=e=>{e.stopPropagation();settings.seenAlarm=true;saveSettings();renderAlarm()};
$('settings').onclick=()=>{$('opt-motion').checked=!!settings.reduceMotion;$('settingsdialog').showModal()};
$('menu-restore').onclick=$('settings').onclick;
$('closesettings').onclick=()=>$('settingsdialog').close();$('closeresearch').onclick=()=>$('researchdialog').close();
$('opt-motion').onchange=e=>{settings.reduceMotion=e.target.checked;saveSettings()};
const GLOSSARY={Gold:'Gold pays for building, upgrading, rotating and demolishing rooms. Gold Mines and the throne room make it.',Stone:'Stone is the building material for rooms, upgrades and moving the throne.',Food:'Food: the prince and each servant eat 1 per day. Without it fighters weaken, then starve.',Research:'Research points come from Research Rooms and unlock new room blueprints.'};
$('resources').onclick=e=>{const d=e.target.closest('#resources>div');if(!d)return;toast(GLOSSARY[d.querySelector('span').textContent]||'')};
showTab('keep');renderAlarm();

$('world-map-toggle').onclick=openWorldMap;
function openWorldMap(){save();const dlg=$('mapdialog'),fr=$('mapframe');if($('roomdialog')?.open)$('roomdialog').close();fr.src='worldmap/index.html?embed=1&v='+Date.now();if(!dlg.open)dlg.showModal()}
window.addEventListener('message',e=>{if(e.data&&e.data.type==='closeWorldMap'&&$('mapdialog').open)$('mapdialog').close()});


function applyIdentity(id){state.strongholdName=id.name;state.motto=id.motto;state.banner=id.banner;try{localStorage.removeItem('medieval-world-castles-v1')}catch{}$('mapframe').removeAttribute('src')}
function renderIdentity(){const f=$('holdflag');if(!f||!window.Banner)return;const u=Banner.url(state.banner,68,84);if(f.getAttribute('src')!==u)f.src=u;$('keepname').textContent=state.strongholdName||'Your Stronghold';$('keepname').title=state.motto||''}
