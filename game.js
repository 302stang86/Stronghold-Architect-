
'use strict';
const DIRS=[[0,-1],[1,0],[0,1],[-1,0]],$=id=>document.getElementById(id),KEY='stronghold-architect-v2';
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
 const result={version:5,clockVersion:1,dayElapsedMs:0,entranceLegacy:false,day:1,gold:220,stone:120,food:START_FOOD,rp:0,hungryDays:0,researched:[],over:false,won:false,tiles,log:[`Day 1 · Castle entrance established on the bottom row. Your keep starts with ${hallCount} hallway${hallCount>1?'s':''} and ${emptyCount} empty room${emptyCount>1?'s':''}.`]};initEconomy(result);return result;
}
function validate(s){
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
 initEconomy(s);validateEconomy(s);validateMC(s);validateInvasion(s);
 return s;
}
try{state=validate(JSON.parse(localStorage.getItem(KEY)))}catch{state=fresh()}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{toast('Device storage unavailable. Use Export save to keep your progress.')}}
function exits(t){const d=t.ports|| (t.type===17?[0]:t.type===12?[0,2]:t.type===13?[0,1]:t.type===14?[0,1,3]:[0,1,2,3]);return d.map(n=>(n+t.rot)%4)}
function at(x,y,tiles=state.tiles){return tiles.find(t=>t.x===x&&t.y===y)}
function compatible(a,b,d){return exits(a).includes(d)&&exits(b).includes((d+2)%4)}
function entranceBlocked(x,y,tiles=state.tiles){const entrance=tiles.find(t=>t.type===17);return !!entrance&&((y===entrance.y&&Math.abs(x-entrance.x)===1)||(x===entrance.x&&y===entrance.y+1))}
function blocksHallDoor(a,b,d){const opposite=(d+2)%4,ao=exits(a).includes(d),bo=exits(b).includes(opposite);return (a.type>=12&&a.type<=15&&ao&&!bo)||(b.type>=12&&b.type<=15&&bo&&!ao)}
function placement(t,tiles=state.tiles){if(entranceBlocked(t.x,t.y,tiles))return false;let joins=0;for(let d=0;d<4;d++){const b=at(t.x+DIRS[d][0],t.y+DIRS[d][1],tiles);if(b){if(blocksHallDoor(t,b,d))return false;if(compatible(t,b,d))joins++}}return joins>0}
function connected(tiles){const root=tiles.find(t=>t.type===0);if(!root)return false;const seen=new Set([root]),q=[root];while(q.length){const a=q.shift();DIRS.forEach(([dx,dy],d)=>{const b=at(a.x+dx,a.y+dy,tiles);if(b&&!seen.has(b)&&compatible(a,b,d)){seen.add(b);q.push(b)}})}return seen.size===tiles.length}
function unlocked(i){return START_UNLOCKED.includes(i)||state.researched.includes(i)}
function research(i){if(state.over||unlocked(i)||!RESEARCH_COST[i])return;if(!state.tiles.some(t=>t.type===19))return toast('Build a research room first.');if(state.rp<RESEARCH_COST[i])return toast('Not enough research points. Research points arrive when the 10-minute day ends.');state.rp-=RESEARCH_COST[i];state.researched.push(i);note(TYPES[i][0]+' blueprint researched.');save();render();toast(TYPES[i][0]+' unlocked!')}
function income(){const total={gold:0,stone:0,rp:0,food:0};for(const room of state.tiles)for(const [k,v]of Object.entries(roomRates(room)))total[k]+=v;return total}
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500)}
function note(t){state.log.unshift(`Day ${state.day} · ${t}`);state.log=state.log.slice(0,12)}
function art(i){return TILE_ART[i]}
function renderResources(){const need=foodNeed(),days=Math.floor(state.food/need),tone=state.hungryDays>0||days<=1?'danger':days<=3?'warn':'',label=state.hungryDays>0?'Hungry · day '+state.hungryDays:days+' day'+(days===1?'':'s')+' left';$('resources').innerHTML=[['Gold',state.gold,''],['Stone',state.stone,''],['Food',state.food,`<em class="food-days ${tone}">${label}</em>`],['Research',state.rp,'']].map(([n,v,x])=>`<div><span>${n}</span><strong>${fmt(v)}</strong>${x}</div>`).join('')}
function render(){
const inc=income();renderResources();
renderBuildPopup();
renderResearch();
$('grid').style.setProperty('--size',size+'px');$('grid').innerHTML='';for(let y=0;y<FIELD_SIZE;y++)for(let x=0;x<FIELD_SIZE;x++){
 const t=at(x,y),b=document.createElement('button');const valid=!state.over&&(relocating?canRelocate(x,y):!t&&hasBuildOption(x,y));
 const reserved=!t&&!state.over&&entranceBlocked(x,y);b.className='cell'+(t?' occupied':'')+(selected===t&&t?' selected':'')+(valid?' valid':'')+(reserved?' reserved':'')+(!t&&!valid&&!reserved?' blank':'');
 if(t){const im=document.createElement('img');im.src=art(t.type);im.alt='';im.style.transform=`rotate(${t.rot*90}deg)`;b.append(im);if(t.trap){const layer=document.createElement('span');layer.className='trap-floor trap-'+t.trap;layer.setAttribute('aria-hidden','true');layer.innerHTML='<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">'+TRAP_ART[t.trap]+'</svg>';b.append(layer)}if(selected===t){const label=document.createElement('span');label.className='tag';label.textContent=TYPES[t.type][0];b.append(label)}b.setAttribute('aria-label',`Occupied tile ${x+1}, ${y+1}`)}
 else{b.setAttribute('aria-label',`${valid?(relocating?'Relocate here':'Build here'):reserved?'Reserved gate tile':'Empty tile'} ${x+1}, ${y+1}`);if(reserved)b.title='Reserved: nothing can be built beside the castle gate';if(!valid){b.tabIndex=-1;b.setAttribute('aria-hidden','true')}}
 b.setAttribute('data-x',x);b.setAttribute('data-y',y);b.onclick=()=>{if(Date.now()>=suppressClickUntil)clickCell(x,y)};b.ondblclick=()=>{if(t&&!relocating&&Date.now()>=suppressClickUntil)openRoomViewer(x,y)};$('grid').append(b)
}
$('day').textContent=state.over?'The keep has fallen':`Day ${state.day}`;$('forecast').textContent=`Room production per day: ${fmt(inc.gold)} gold · ${fmt(inc.stone)} stone · ${fmt(inc.food)} food · ${fmt(inc.rp)} research. Food upkeep: ${foodNeed()} per day (prince + ${state.collectors.length} servant${state.collectors.length===1?'':'s'}). Tap resource icons to collect, or assign a servant to a room. ${state.over?'Start a new keep to try again.':raidForecast()}`;renderClock();
$('hint').textContent=relocating?'Relocate throne · 50 gold + 25 stone · Choose a green + or an Empty Room':'Tap + to build · Wheel / pinch to zoom · Double-tap and hold to drag · Quick double-tap for room details.';
renderSelection();renderRoomViewer();renderCollectorRoster();renderRoster();renderServantDialog();renderWorldEconomy();$('log').replaceChildren(...state.log.map(line=>{const p=document.createElement('p');p.textContent=line;return p}));}
function inField(x,y){return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<FIELD_SIZE&&y<FIELD_SIZE}
function hasBuildOption(x,y){if(!inField(x,y)||at(x,y)||entranceBlocked(x,y))return false;return TYPES.some((_,i)=>i!==0&&i!==17&&unlocked(i)&&[0,1,2,3].some(rot=>placement({x,y,type:i,rot})))}
function clickCell(x,y){if(!inField(x,y))return;if(relocating){moveThrone(x,y);return}const t=at(x,y);if(t){selected=t;blueprint=null;renderSelection();syncRoomSelection();return}if(state.over)return toast('This campaign has ended. Start a new keep.');if(!hasBuildOption(x,y))return;buildTarget={x,y};selected=null;blueprint=null;rotation=0;render();$('builddialog').showModal()}
function renderBuildPopup(){
 $('palette').replaceChildren();if(!buildTarget)return;
 $('build-location').textContent=`Build at ${buildTarget.x+1}, ${buildTarget.y+1} · Choose a blueprint below.`;
 const choices=[16,18,19,12,13,14,15,1,2,3,4,5,6,7,8,9,10,11].filter(i=>unlocked(i));
 $('unlock').textContent=choices.length+' unlocked blueprints';$('popuprotate').textContent=`Rotate previews · ${rotation*90}° ↻`;
 choices.forEach(i=>{const t=TYPES[i],fit=placement({...buildTarget,type:i,rot:rotation}),afford=state.gold>=t[1]&&state.stone>=t[2],prereq=prereqsMet(i),b=document.createElement('button');b.className='blueprint';b.disabled=state.over||!fit||!afford||!prereq;
 const im=document.createElement('img');im.src=art(i);im.alt='';im.style.transform=`rotate(${rotation*90}deg)`;
 const desc=document.createElement('div'),name=document.createElement('strong'),cost=document.createElement('span'),status=document.createElement('span');name.textContent=t[0];cost.textContent=`${t[1]} gold · ${t[2]} stone`;status.textContent=!prereq?'Requires '+prereqNames(i):!fit?'Rotate to match doorways':!afford?'Insufficient resources':'Build room';desc.append(name,cost,status);b.append(im,desc);b.onclick=()=>buildAt(i,buildTarget.x,buildTarget.y,rotation);$('palette').append(b)
 })
}
function buildAt(type,x,y,rot){if(state.invasion.active){toast('Finish the invasion before changing the castle layout.');return false}
 if(state.over||!inField(x,y)||at(x,y)||!unlocked(type)||[0,17].includes(type)||!Number.isInteger(rot)||rot<0||rot>3||!prereqsMet(type))return false;
 const nt={x,y,type,rot},t=TYPES[type];if(!placement(nt))return false;if(state.gold<t[1]||state.stone<t[2])return false;
 state.gold-=t[1];state.stone-=t[2];state.tiles.push(nt);note(t[0]+' constructed.');buildTarget=null;blueprint=null;selected=null;if($('builddialog').open)$('builddialog').close();save();render();return true;
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
function completeDay(){if(state.over)return;const need=foodNeed();if(state.food>=need){state.food=roundResource(state.food-need);if(state.hungryDays>0)note('The keep is fed again. Hunger penalties are lifted.');state.hungryDays=0}else{state.food=0;state.hungryDays++;applyHunger()}if(!state.over){state.day++;note('A new day begins.');foodWarning()}save();render()}
function applyHunger(){const d=state.hungryDays;if(d===1)note('Hunger: servants fight 30% weaker until the keep is fed.');if(d===2)note('Hunger: the prince fights 25% weaker until the keep is fed.');if(d>=3&&state.collectors.length){const dying=state.collectors.reduce((a,b)=>b.id>a.id?b:a);state.collectors=state.collectors.filter(n=>n!==dying);if(state.invasion.active)state.invasion.active.knocked=state.invasion.active.knocked.filter(id=>id!==dying.id);note(`${dying.name} starved to death. Hire a replacement.`);toast(`${dying.name} starved to death.`)}if(d===5)note('The prince is starving: he has 20% less health in battle.');if(d>=7){state.over=true;state.invasion.active=null;state.invasion.combat=null;const modal=$('battle-dialog');if(modal?.open)modal.close();note('The prince starved. The keep has fallen.')}}
function foodWarning(){if(state.hungryDays>0)return;const days=Math.floor(state.food/foodNeed());if(days===0){note('Warning: not enough food for tomorrow.');toast('Not enough food for tomorrow. Hunger starts at day end.')}else if(days===1){note('Warning: food lasts only one more day.');toast('Food lasts only one more day.')}}

$('rotate').onclick=()=>{if(selected)rotateSelected();else toast('Select a placed tile to rotate it. Rotate new tiles in the build popup.');};$('deselect').onclick=()=>{selected=null;blueprint=null;relocating=false;render()};$('zoomin').onclick=()=>changeZoom(10);$('zoomout').onclick=()=>changeZoom(-10);$('reset').onclick=startNewStronghold;$('resume-new').onclick=startNewStronghold;$('help').onclick=()=>$('helpdialog').showModal();$('closeroster').onclick=()=>$('rosterdialog').close();$('closeservant').onclick=()=>$('servantdialog').close();$('closehelp').onclick=()=>$('helpdialog').close();$('export').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='stronghold-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};$('import').onclick=()=>$('importfile').click();$('importfile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const next=validate(JSON.parse(await file.text()));if(await askConfirm('Replace your campaign?','Your current campaign will be replaced with this save.','Replace','Cancel')){state=next;resetDayClock();selected=null;blueprint=null;relocating=false;buildTarget=null;save();render();scheduleThroneCenter();toast('Campaign restored.')}}catch{toast('That file is not a valid Stronghold save.')}e.target.value=''};$('popuprotate').onclick=()=>{rotation=(rotation+1)%4;renderBuildPopup()};$('closebuild').onclick=()=>$('builddialog').close();$('builddialog').addEventListener('close',()=>{buildTarget=null;rotation=0});$('builddialog').addEventListener('cancel',()=>{buildTarget=null;rotation=0});$('center').onclick=centerThrone;
document.addEventListener('keydown',e=>{if(awaitingResume)return;if(e.key.toLowerCase()==='r'&&!$('helpdialog').open&&!$('roomdialog').open&&!$('rosterdialog').open&&!$('servantdialog').open&&!$('confirm-dialog').open){if($('builddialog').open)$('popuprotate').click();else $('rotate').click()}if(e.key==='Escape'&&!$('builddialog').open&&!$('roomdialog').open&&!$('rosterdialog').open&&!$('servantdialog').open&&!$('confirm-dialog').open)$('deselect').click()});render();scheduleThroneCenter();

function relocationTiles(x,y){const throne=state.tiles.find(t=>t.type===0);return state.tiles.filter(t=>t.x!==x||t.y!==y).map(t=>t===throne?{...t,type:16}:t).concat({x,y,type:0,rot:throne.rot,level:throne.level||1})}
function canRelocate(x,y){if(state.invasion.active)return false;const dest=at(x,y);if(!inField(x,y)||entranceBlocked(x,y)||dest&&(dest.type!==16||dest.trap)||false)return false;const tiles=relocationTiles(x,y);if(!connected(tiles))return false;for(const a of tiles)for(let d=0;d<4;d++){const b=at(a.x+DIRS[d][0],a.y+DIRS[d][1],tiles);if(b&&blocksHallDoor(a,b,d))return false}return true}
function moveThrone(x,y){if(state.over)return;if(!canRelocate(x,y))return toast('Choose an Empty Room without traps, or an open square connected through matching doorways.');if(state.gold<50||state.stone<25)return toast('Relocation requires 50 gold and 25 stone.');state.gold-=50;state.stone-=25;const previous=state.tiles.find(t=>t.type===0),oldKey=roomKey(previous),productionMs=previous.productionMs||0,stock={...(previous.stock||{})};state.tiles=relocationTiles(x,y);const vacated=at(previous.x,previous.y);delete vacated.level;delete vacated.productionMs;delete vacated.stock;selected=at(x,y);selected.productionMs=productionMs;selected.stock=stock;const displaced=roomCollector(selected);if(displaced){displaced.home=null;displaced.path=[];displaced.mode='wander'}repathServants();relocating=false;note('Throne relocated. Its former chamber is now an Empty Room.');save();render()}
function renderResearch(){const el=$('research');el.replaceChildren();const h=document.createElement('h3');h.textContent='Research blueprints';el.append(h);const p=document.createElement('p');p.className='muted';p.textContent=`${state.rp} points available · +${income().rp} / day. Build Research Rooms for 10 points per room daily. Unlocks are permanent.`;el.append(p);for(let i=1;i<=11;i++){const b=document.createElement('button');b.className='research-option';b.textContent=TYPES[i][0]+(unlocked(i)?' · Researched':` · ${RESEARCH_COST[i]} points`);b.disabled=state.over||unlocked(i)||state.rp<RESEARCH_COST[i]||!state.tiles.some(t=>t.type===19);b.onclick=()=>research(i);el.append(b)}}

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
 state.gold-=trap.price;selected.trap=id;selected.trapLevel=1;note(`${trap.name} installed. It hurts invaders only.`);save();render();return true;
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
 selected=room;$('room-title').textContent=TYPES[room.type][0];$('room-image').src=art(room.type);$('room-image').style.transform=`rotate(${room.rot*90}deg)`;
 $('room-overlay').innerHTML=room.trap?'<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">'+TRAP_ART[room.trap]+'</svg>':'';$('room-overlay').className=room.trap?'trap-floor trap-'+room.trap:'trap-floor';
 $('room-description').textContent=(Object.keys(roomRates(room)).length?'Base room: ':'')+TYPES[room.type][5];$('room-stats').textContent=`Location ${room.x+1}, ${room.y+1} · Rotation ${room.rot*90}°`+(room.trap?` · Trap damage ${fmt(trapStrength(room))}`:'');
 const actions=$('room-actions');actions.replaceChildren();renderRoomEconomy(room,actions);renderResourceUpgrade(room,actions);if(room.type===16)renderTrapOptions(actions);else if(!Object.keys(roomRates(room)).length){const p=document.createElement('p');p.className='muted';p.textContent='This room has no resource upgrades.';actions.append(p)}
 if(room.type===0){const p=document.createElement('p');p.className='room-role-note';p.textContent='The evil prince wanders only inside this throne room and automatically collects its gold and stone. He follows the throne when relocated. He eats 1 food per day.';actions.append(p);const move=document.createElement('button');move.textContent='Relocate throne · 50 gold + 25 stone';move.disabled=state.over;move.onclick=()=>{$('roomdialog').close();relocating=true;blueprint=null;render()};actions.append(move)}
 renderMC();
 const rotate=document.createElement('button');rotate.textContent='Rotate room · 10 gold ↻';rotate.disabled=state.over||room.type===17||state.gold<ROTATION_COST;rotate.onclick=()=>{selected=room;rotateSelected()};actions.append(rotate);
 if(![0,17].includes(room.type)){const del=document.createElement('button');del.textContent=room.trap?'Remove trap before demolishing room':`Demolish room · ${DEMOLISH_COST} gold`;del.disabled=state.over||!!room.trap||state.gold<DEMOLISH_COST;del.onclick=()=>{selected=room;demolish()};actions.append(del)}
}
function setupFieldGestures(){
 const vp=$('viewport'),pointers=new Map();let gesture=null,lastTap=null;
 const blocked=()=>awaitingResume||['roomdialog','builddialog','helpdialog','battle-dialog','rosterdialog','servantdialog','confirm-dialog'].some(id=>$(id)?.open);
 const cellAt=(x,y)=>document.elementFromPoint(x,y)?.closest('.cell');
 const cellKey=cell=>cell?cell.getAttribute('data-x')+','+cell.getAttribute('data-y'):null;
 const startDrag=p=>{if(!pointers.has(p.id)||p.wasPinch)return;p.dragging=true;lastTap=null;suppressClickUntil=Date.now()+700;vp.classList.add('is-map-dragging');try{vp.setPointerCapture(p.id)}catch{}};
 vp.addEventListener('wheel',e=>{if(blocked())return;e.preventDefault();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?vp.clientHeight:1);zoomAt(size*Math.exp(-delta*.002),e.clientX,e.clientY)},{passive:false});
 vp.addEventListener('pointerdown',e=>{if(blocked()||e.button!==0&&e.pointerType!=='touch'||e.target.closest?.('.resource-pickup,.collector-sprite'))return;const now=Date.now(),second=!!lastTap&&now-lastTap.time<380&&Math.hypot(e.clientX-lastTap.px,e.clientY-lastTap.py)<30,p={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,time:now,second,firstKey:lastTap?.key,dragging:false,wasPinch:false,type:e.pointerType};pointers.set(e.pointerId,p);if(e.pointerType==='touch'||second)try{vp.setPointerCapture(e.pointerId)}catch{}if(second){p.holdTimer=setTimeout(()=>startDrag(p),180);suppressClickUntil=now+500}if(pointers.size===2){for(const point of pointers.values()){clearTimeout(point.holdTimer);point.wasPinch=true}const [a,b]=[...pointers.values()];gesture={distance:Math.hypot(a.x-b.x,a.y-b.y),size};lastTap=null;suppressClickUntil=now+700;}});
 vp.addEventListener('pointermove',e=>{const p=pointers.get(e.pointerId);if(!p)return;const oldX=p.x,oldY=p.y;p.x=e.clientX;p.y=e.clientY;if(pointers.size===2&&gesture){e.preventDefault();const [a,b]=[...pointers.values()];if(gesture.distance>0)zoomAt(gesture.size*Math.hypot(a.x-b.x,a.y-b.y)/gesture.distance,(a.x+b.x)/2,(a.y+b.y)/2);suppressClickUntil=Date.now()+700;return}const moved=Math.hypot(p.x-p.startX,p.y-p.startY)>8;if(!p.dragging&&moved&&(p.second||p.type==='touch')){clearTimeout(p.holdTimer);startDrag(p)}if(p.dragging){e.preventDefault();vp.scrollLeft-=p.x-oldX;vp.scrollTop-=p.y-oldY;suppressClickUntil=Date.now()+700;}});
 const finish=(e,cancelled=false)=>{const p=pointers.get(e.pointerId);if(!p)return;clearTimeout(p.holdTimer);pointers.delete(e.pointerId);if(pointers.size<2)gesture=null;vp.classList.remove('is-map-dragging');try{vp.releasePointerCapture(e.pointerId)}catch{}if(cancelled||p.dragging||p.wasPinch){lastTap=null;suppressClickUntil=Date.now()+700;return}const cell=cellAt(e.clientX,e.clientY),key=cellKey(cell),now=Date.now(),short=now-p.time<240;if(p.second&&short){e.preventDefault();lastTap=null;suppressClickUntil=now+700;if(cell&&key===p.firstKey&&!relocating){const x=Number(cell.getAttribute('data-x')),y=Number(cell.getAttribute('data-y'));if(at(x,y))openRoomViewer(x,y)}return}lastTap={time:now,px:e.clientX,py:e.clientY,key};if(p.type==='touch'&&cell){e.preventDefault();suppressClickUntil=now+500;clickCell(Number(cell.getAttribute('data-x')),Number(cell.getAttribute('data-y')))}};
 vp.addEventListener('pointerup',e=>finish(e));vp.addEventListener('pointercancel',e=>finish(e,true));vp.addEventListener('lostpointercapture',e=>{if(pointers.has(e.pointerId))finish(e,true)});vp.addEventListener('dblclick',e=>{if(Date.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
}
$('closeroom').onclick=()=>$('roomdialog').close();$('roomdialog').addEventListener('close',()=>{viewedRoom=null});setupFieldGestures();

function renderClock(){
 const remaining=Math.max(0,DAY_MS-state.dayElapsedMs),seconds=Math.ceil(remaining/1000),minutes=Math.floor(seconds/60);
 $('daytimer').textContent=state.over?'Clock stopped':`${String(minutes).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')} until Day ${state.day+1}`;
 $('dayclockfill').style.width=(state.dayElapsedMs/DAY_MS*100)+'%';
}
function resetDayClock(){lastClockTick=Date.now();lastClockSave=lastClockTick;clockSuspended=awaitingResume;}
function applyElapsedTime(elapsed){
 if(awaitingResume||state.over||!Number.isFinite(elapsed)||elapsed<=0)return;
 while(elapsed>0&&!state.over){const step=Math.min(elapsed,250,DAY_MS-state.dayElapsedMs);if(state.invasion.combat){tickCombat(step);elapsed-=step;continue}simulateEconomy(step);state.dayElapsedMs+=step;tickInvasion(step);elapsed-=step;if(state.dayElapsedMs>=DAY_MS){state.dayElapsedMs=0;completeDay()}}
 if(state.over)state.dayElapsedMs=0;
}

function tickDayClock(now=Date.now()){
 if(clockSuspended)return;const elapsed=Math.max(0,now-lastClockTick);lastClockTick=now;applyElapsedTime(elapsed);renderClock();renderWorldEconomy();
 if(now-lastClockSave>=5000){save();lastClockSave=now}
}
setInterval(tickDayClock,250);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseForReturn();else showResumePrompt()});
window.addEventListener('pagehide',pauseForReturn);window.addEventListener('blur',pauseForReturn);window.addEventListener('focus',()=>{if(awaitingResume)showResumePrompt()});
window.addEventListener('pageshow',showResumePrompt);

function fmt(value){return Number(value.toFixed(3)).toLocaleString(undefined,{maximumFractionDigits:3})}
function roundResource(value){return Math.round((value+Number.EPSILON)*1000000)/1000000}
function roomKey(room){return room.x+','+room.y}
function roomFromKey(key,tiles=state.tiles){if(!key)return null;return tiles.find(t=>roomKey(t)===key)||null}
requestAnimationFrame(animateMC);

requestAnimationFrame(animateCombatVisuals);$('locate-invader').onclick=centerInvader;$('battle-dialog').addEventListener('cancel',e=>e.preventDefault());$('battle-export').onclick=()=>$('export').click();
function pauseForReturn(){if(!clockSuspended)tickDayClock();clockSuspended=true;awaitingResume=true;lastClockTick=Date.now();save()}
function showResumePrompt(){if(document.hidden)return;clockSuspended=true;awaitingResume=true;lastClockTick=Date.now();for(const id of ['roomdialog','builddialog','helpdialog','battle-dialog','rosterdialog','servantdialog'])if($(id)?.open)$(id).close();const modal=$('resume-dialog');$('resume-day').textContent=`Day ${state.day} · Your stronghold is paused`;if(!modal.open)modal.showModal()}
function resumeGame(){awaitingResume=false;clockSuspended=false;lastClockTick=Date.now();lastClockSave=lastClockTick;if($('resume-dialog').open)$('resume-dialog').close();renderClock();renderBattle();save()}

$('resume-dialog').addEventListener('cancel',e=>e.preventDefault());$('resume-game').onclick=resumeGame;showResumePrompt();
function askConfirm(title,text,okLabel='Confirm',cancelLabel='Cancel'){return new Promise(resolve=>{const dlg=$('confirm-dialog');$('confirm-title').textContent=title;$('confirm-text').textContent=text;$('confirm-ok').textContent=okLabel;$('confirm-cancel').textContent=cancelLabel;let done=false;const finish=v=>{if(done)return;done=true;$('confirm-ok').onclick=null;$('confirm-cancel').onclick=null;dlg.onclose=null;if(dlg.open)dlg.close();resolve(v)};$('confirm-ok').onclick=()=>finish(true);$('confirm-cancel').onclick=()=>finish(false);dlg.onclose=()=>finish(false);dlg.showModal()})}
async function startNewStronghold(){if(!await askConfirm('Start a New Stronghold?','Your current stronghold on this device will be replaced. This cannot be undone. Use Export save first if you want to keep it.','Start new','Keep playing'))return;state=fresh();for(const id of ['battle-dialog','roomdialog','builddialog','rosterdialog','servantdialog'])if($(id)?.open)$(id).close();resetDayClock();selected=null;blueprint=null;relocating=false;buildTarget=null;save();render();scheduleThroneCenter()}
