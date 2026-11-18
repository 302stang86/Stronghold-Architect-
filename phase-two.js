/* Monster Lair and Puzzle Room progression. */
const COMPANIONS={
 moss:{name:'Mossling',icon:'🌿',size:.25,level:2,gold:45,detail:'Opening block +5% of max HP; attack damage −3%.',opening:.05,attack:.97},
 imp:{name:'Cinder Imp',icon:'👹',size:.25,level:2,gold:60,detail:'Attack damage +6%; healing cards −10%.',attack:1.06,heal:.9},
 sprite:{name:'Lightning Sprite',icon:'⚡',size:.25,level:3,gold:100,detail:'Attack damage +10%; start each turn with 9 energy.',attack:1.1,energy:1},
 whelp:{name:'Stoneback Whelp',icon:'🐢',size:1/3,level:3,gold:120,detail:'Defense-card block +15%; attack damage −5%.',block:1.15,attack:.95},
 moth:{name:'Moonveil Moth',icon:'🦋',size:1/3,level:4,gold:180,detail:'First healing card +25%; first turn −2 energy.',firstHeal:1.25,firstEnergy:2},
 drake:{name:'Ember Drake',icon:'🐉',size:.5,level:5,gold:280,detail:'First attack +25%, later attacks +8%; defense-card block −15%.',firstAttack:1.25,attack:1.08,block:.85},
};
const LAIR_RESEARCH=[0,20,35,55,80];
const PUZZLE_COSTS=[null,[50,30,20],[100,55,40],[170,90,65],[250,135,100]];
const PHASE_ROOM_LIMITS={7:3,8:1};
function phaseRoomFull(type){return !!PHASE_ROOM_LIMITS[type]&&state.tiles.filter(t=>t.type===type).length>=PHASE_ROOM_LIMITS[type]}
function phaseRoomLevel(type){return Math.max(0,...state.tiles.filter(t=>t.type===type).map(t=>t.level||1))}
function ownedCompanions(){return [...new Set(Array.isArray(state.companions)?state.companions:[])].filter(id=>Object.hasOwn(COMPANIONS,id))}
function phaseRoomAvailable(room){return state.tiles.includes(room)&&!state.over&&!state.expedition&&!state.invasion.active&&!state.invasion.combat}
function phaseRoomAction(room,action,id){
 if(!phaseRoomAvailable(room)||![7,8].includes(room.type))return false;
 const level=room.level||1;
 let gold=0,stone=0,rp=0;
 if(action==='research'){
  if(room.type!==7||level>=5||room.companionResearch===level)return false;
  rp=LAIR_RESEARCH[level];
 }else if(action==='upgrade'){
  if(level>=5||room.type===7&&room.companionResearch!==level)return false;
  if(room.type===7){({gold,stone}=resourceUpgradeCost(room))}else [gold,stone,rp]=PUZZLE_COSTS[level];
 }else if(action==='hire'){
  const pet=Object.hasOwn(COMPANIONS,id)&&COMPANIONS[id],top=phaseRoomLevel(7),owned=ownedCompanions();
  if(room.type!==7||!pet||top<pet.level||owned.includes(id)||owned.length>=(top>=4?2:1))return false;
  gold=pet.gold;
 }else return false;
 if(state.gold<gold||state.stone<stone||state.rp<rp)return false;
 state.gold-=gold;state.stone-=stone;state.rp-=rp;
 if(action==='research')room.companionResearch=level;
 if(action==='upgrade')room.level=level+1;
 if(action==='hire'){state.companions=[...ownedCompanions(),id];state.homeCompanion??=id;}
 save();render();return true;
}
function renderPhaseRoom(room,target){
 const level=room.level||1,available=phaseRoomAvailable(room),lair=room.type===7;
 const section=document.createElement('section'),heading=document.createElement('h3');
 heading.textContent=(lair?'Monster Lair':'Puzzle Room')+' · Level '+level+' / 5';section.append(heading);
 function button(label,disabled,click){
  const el=document.createElement('button');el.type='button';el.textContent=label;el.disabled=disabled;el.onclick=click;section.append(el);
 }
 if(level<5){
  const ready=room.companionResearch===level;
  if(lair)button('Research monster companion · '+LAIR_RESEARCH[level]+' RP',!available||ready||state.rp<LAIR_RESEARCH[level],()=>phaseRoomAction(room,'research'));
  const [gold,stone,rp]=lair?Object.values(resourceUpgradeCost(room)).concat(0):PUZZLE_COSTS[level];
  button('Upgrade to Level '+(level+1)+' · '+gold+' gold + '+stone+' stone'+(rp?' + '+rp+' RP':''),!available||lair&&!ready||state.gold<gold||state.stone<stone||state.rp<rp,()=>phaseRoomAction(room,'upgrade'));
 }
 if(lair){
  const owned=ownedCompanions(),top=phaseRoomLevel(7),cap=top>=4?2:top>=2?1:0;
  const info=document.createElement('p');info.textContent=owned.length+' / '+cap+' companions. Select one for home defense.';section.append(info);
  for(const [id,pet] of Object.entries(COMPANIONS)){
   const line=document.createElement('p');line.textContent=pet.icon+' '+pet.name+' · Level '+pet.level+' · '+pet.detail;section.append(line);
   if(owned.includes(id))button(state.homeCompanion===id?'Active for defense':'Use '+pet.name+' for defense',!available||state.homeCompanion===id,()=>{state.homeCompanion=id;save();render()});
   else button('Recruit '+pet.name+' · '+pet.gold+' gold',!available||top<pet.level||owned.length>=cap||state.gold<pet.gold,()=>phaseRoomAction(room,'hire',id));
  }
  if(state.homeCompanion)button('Clear defense companion',!available,()=>{state.homeCompanion=null;save();render()});
 }else{
  const info=document.createElement('p');info.textContent=['','Inspect basic locks.','Open basic locks.','Find hidden treasure doors.','Open reinforced locks.','Find sealed treasury doors.'][level];section.append(info);
 }
 target.append(section);
}
function attachCompanion(allies,id){
 if(!ownedCompanions().includes(id)||!allies.length)return;
 const actor=allies.find(a=>a.player)||allies[0],pet=COMPANIONS[id];
 actor.companion=id;
 if(pet.opening){actor.block+=Math.round(actor.maxHp*pet.opening);actor.openingBlock=actor.block>0}
}
function companionAttack(actor){const pet=COMPANIONS[actor.companion];return pet?.firstAttack&&!actor.companionAttacked?pet.firstAttack:pet?.attack||1}
const companionPositions=new Map();
let nextCompanionWalk=0;
function renderCompanions(){
 const grid=$('grid');if(!grid)return;
 const now=Date.now(),walk=!awaitingResume&&!state.expedition&&!state.invasion.combat&&now>=nextCompanionWalk;
 if(walk)nextCompanionWalk=now+1800;
 for(const id of ownedCompanions()){
  if(state.expedition?.companion===id){$('companion-'+id)?.remove();continue}
  let tile=roomFromKey(companionPositions.get(id))||state.tiles.find(t=>t.type===7)||state.tiles.find(t=>t.type===0);
  if(!tile)continue;
  if(walk){
   const next=DIRS.map(([dx,dy],d)=>({tile:at(tile.x+dx,tile.y+dy),d})).filter(n=>n.tile&&n.tile.type!==17&&compatible(tile,n.tile,n.d));
   if(next.length)tile=next[Math.floor(Math.random()*next.length)].tile;
   companionPositions.set(id,roomKey(tile));
  }
  let marker=$('companion-'+id);
  if(!marker){
   marker=document.createElement('span');marker.id='companion-'+id;marker.title=COMPANIONS[id].name;
   marker.textContent=COMPANIONS[id].icon;
   marker.style.cssText='position:absolute;z-index:6;pointer-events:none;transform:translate(-50%,-50%);transition:left .5s linear,top .5s linear';
   marker.style.fontSize='calc(var(--size) * '+(.33*COMPANIONS[id].size)+')';grid.append(marker);
  }
  marker.style.left='calc(var(--field-pad-x, 0px) + var(--size) * '+(tile.x+.7)+')';
  marker.style.top='calc(var(--field-pad-y, 0px) + var(--size) * '+(tile.y+.65)+')';
 }
}
function sideDoors(layout){
 const excluded=new Set([layout.bossKey,layout.keyRoom]);
 const leaves=layout.tiles.filter(t=>![0,12,13,14,15,17].includes(t.type)&&!excluded.has(roomKey(t)))
  .map(t=>({to:roomKey(t),links:expNeighbors(t,layout.tiles)}))
  .filter(entry=>entry.links.length===1&&![0,17].includes(entry.links[0].room.type));
 leaves.sort((a,b)=>Number(!!layout.chests?.[b.to])-Number(!!layout.chests?.[a.to])||a.to.localeCompare(b.to));
 const requirements=[2,3,4,5],rewards=[18,30,45,65];
 return leaves.slice(0,4).map(({to,links},i)=>({from:roomKey(links[0].room),to,level:requirements[i],secret:i%2===1,gold:layout.chests?.[to]?0:rewards[i]}));
}
function lockedSideDoor(exp,a,b){return exp.sideDoors?.find(d=>!exp.unlockedDoors?.includes(d.to)&&(d.from===a&&d.to===b||d.from===b&&d.to===a))}
function revealSideDoors(exp){
 for(const d of exp.sideDoors||[]){
  if(!d.secret||d.from!==exp.current||phaseRoomLevel(8)<d.level||exp.revealedDoors?.includes(d.to))continue;
  (exp.revealedDoors??=[]).push(d.to);exp.log.push('Hidden door found · Puzzle Room level '+d.level+'.');
  toast('Hidden door found. Look for the purple marker.');
 }
}
async function openSideDoor(exp,door){
 if(door.secret&&!exp.revealedDoors?.includes(door.to))return false;
 if(phaseRoomLevel(8)<door.level){toast('This door requires Puzzle Room level '+door.level+'.');return false}
 if(!await askConfirm('Open treasure door?','Your Puzzle Room level meets this door’s requirement.','Unlock door','Cancel'))return false;
 if(state.expedition!==exp||exp.status!=='exploring'||exp.current!==door.from||!lockedSideDoor(exp,door.from,door.to))return false;
 (exp.unlockedDoors??=[]).push(door.to);save();return enterRoom(door.to);
}
function sideTreasure(exp,key){
 const door=exp.sideDoors?.find(d=>d.to===key&&d.gold);
 return door&&!(exp.openedChests||[]).includes(key)&&!(expCastle().claimedSideTreasure||[]).includes(key)?door:null;
}
function collectSideTreasure(exp,key){
 const chest=sideTreasure(exp,key),layout=expCastle();
 if(!chest||state.expedition!==exp||exp.status!=='exploring'||exp.current!==key||layout.defenders[key]&&!exp.cleared.includes(key))return;
 (exp.openedChests??=[]).push(key);
 if(exp.mode==='dungeon')exp.loot.gold+=chest.gold;
 else {(exp.sideTreasureClaims??=[]).push(key);exp.sideGold=(exp.sideGold||0)+chest.gold;}
 exp.log.push('Opened a treasure chest and found '+chest.gold+' gold.');
 window.StrongholdAudio?.play('chest');save();renderExpedition();
}
