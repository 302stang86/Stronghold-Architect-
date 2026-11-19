const BASEMENT_SIZE=7;
const KEEP_CONVERSIONS={
 prison:{name:'Prison',gold:30,stone:20},
 stairs:{name:'Stairs',gold:50,stone:25}
};
// These use the home keep's art. Custom basement artwork can be assigned here.
const capturePrompts=new WeakSet();
function keepRoomName(room){return KEEP_CONVERSIONS[room.keepUse]?.name||TYPES[room.type][0]}
function basementRoot(){return {x:3,y:6,type:0,rot:0,keepUse:'stairs'}}
function initKeepBasement(s){
 let stairs=false;
 for(const room of s.tiles){
  if(room.type!==16||room.trap||!['stairs','prison'].includes(room.keepUse)||room.keepUse==='stairs'&&stairs)delete room.keepUse;
  if(room.keepUse==='stairs')stairs=true;
  validatePrisoner(room);
 }
 if(!stairs){delete s.basement;return}
 const raw=Array.isArray(s.basement?.tiles)?s.basement.tiles:[];
 const tiles=[basementRoot()];
 for(const tile of raw){
  if(!tile||![12,13,14,15,16].includes(tile.type)||!Number.isInteger(tile.rot)||tile.rot<0||tile.rot>3||
    !Number.isInteger(tile.x)||!Number.isInteger(tile.y)||tile.x<0||tile.y<0||tile.x>=BASEMENT_SIZE||tile.y>=BASEMENT_SIZE||
    at(tile.x,tile.y,tiles))continue;
  if(tile.type!==16||tile.keepUse!=='prison')delete tile.keepUse;
  if(tile.keepUse||tile.type!==16||!Object.hasOwn(TRAPS,tile.trap))delete tile.trap;
  validatePrisoner(tile);
  tiles.push(tile);
 }
 s.basement={tiles:connected(tiles)?tiles:[basementRoot()]};
}
function validatePrisoner(room){
 const p=room.prisoner;
 if(room.keepUse!=='prison'||!p||typeof p.name!=='string'||!Number.isInteger(p.level)||p.level<1||p.level>MAX_LEVEL||
    !Number.isFinite(p.ransomAt)||p.ransomAt<0)delete room.prisoner;
 else p.name=p.name.slice(0,100);
}
function freePrison(){
 return [...state.tiles,...(state.basement?.tiles||[])].find(t=>t.keepUse==='prison'&&!t.prisoner);
}
async function offerInvaderCapture(combat,invader,finish){
 if(capturePrompts.has(combat))return;
 const prison=freePrison();
 if(!prison){finish(false);return}
 capturePrompts.add(combat);
 try{
  const capture=await askConfirm('Capture the invader?',invader.name+' can be held in your Prison and ransomed after one in-game day. Capture replaces the immediate loot.','Capture','Take loot');
  if(state.invasion.combat!==combat||state.invasion.active!==invader)return;
  if(capture&&prison.keepUse==='prison'&&!prison.prisoner){
   prison.prisoner={name:invader.name,level:invader.level,ransomAt:invasionClock()+DAY_MS};
   finish(true);
  }else finish(false);
 }finally{capturePrompts.delete(combat)}
}
function keepWorksBlocked(){return state.over||!!state.invasion.active||!!state.invasion.combat||!!state.expedition}
function keepButton(label,action,disabled=false){
 const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=action;button.disabled=disabled;return button;
}
function renderPrison(room,panel,refresh){
 const prisoner=room.prisoner,p=document.createElement('p');
 const amount=20+4*(prisoner?.level||0);
 if(!prisoner){p.textContent='Cell empty. Defeat an invader to capture a prisoner.';panel.append(p);return}
 p.textContent=prisoner.name+' · Level '+prisoner.level+' · '+(invasionClock()>=prisoner.ransomAt?'Ready for ransom':'Ransom opens one in-game day after capture.');
 const settle=ransom=>{
  if(keepWorksBlocked()||room.prisoner!==prisoner||ransom&&invasionClock()<prisoner.ransomAt)return;
  if(ransom)state.gold=roundResource(state.gold+amount);
  delete room.prisoner;
  note(prisoner.name+(ransom?' was ransomed for '+amount+' gold.':' was released.'));
  save();render();refresh();
 };
 panel.append(p,keepButton('Ransom · '+amount+' gold',()=>settle(true),keepWorksBlocked()||invasionClock()<prisoner.ransomAt),
  keepButton('Release',()=>settle(false),keepWorksBlocked()));
}
function renderKeepRoomUses(room,target){
 const panel=document.createElement('section'),h=document.createElement('h3');panel.className='keep-room-use';h.textContent=room.keepUse?keepRoomName(room):'Convert Empty Room';panel.append(h);
 if(room.keepUse==='prison')renderPrison(room,panel,renderRoomViewer);
 else if(room.keepUse==='stairs')panel.append(keepButton('Enter basement',openKeepBasement,keepWorksBlocked()));
 else for(const [kind,{name,gold,stone}] of Object.entries(KEEP_CONVERSIONS)){
  const unavailable=()=>keepWorksBlocked()||room.trap||room.keepUse||roomCollector(room)||(kind==='stairs'&&state.basement)||state.gold<gold||state.stone<stone;
  panel.append(keepButton(name+' · '+gold+' gold + '+stone+' stone',()=>{
   if(unavailable()||!state.tiles.includes(room))return;
   state.gold-=gold;state.stone-=stone;room.keepUse=kind;
   if(kind==='stairs')state.basement={tiles:[basementRoot()]};
   note(name+' built.');save();render();
  },!!unavailable()));
 }
 target.append(panel);
}
let basementCursor=null;
function openKeepBasement(){
 if(!state.basement||keepWorksBlocked())return;
 basementCursor=null;
 const dialog=$('basement-dialog');
 $('roomdialog').close();
 renderKeepBasement();
 if(!dialog.open)dialog.showModal();
}
function renderKeepBasement(){
 const grid=$('basement-grid'),panel=$('basement-options'),tiles=state.basement?.tiles;
 if(!tiles)return;
 grid.replaceChildren();panel.replaceChildren();
 const blocked=keepWorksBlocked();
 for(let y=0;y<BASEMENT_SIZE;y++)for(let x=0;x<BASEMENT_SIZE;x++){
  const tile=at(x,y,tiles);
  const adjacent=DIRS.some(([dx,dy])=>at(x+dx,y+dy,tiles));
  const key=x+','+y,label=tile?keepRoomName(tile):'Build at '+(x+1)+', '+(y+1);
  const cell=keepButton(tile?'':'+',()=>{basementCursor=key;renderKeepBasement()},!tile&&(blocked||!adjacent));
  cell.className='basement-cell';cell.setAttribute('aria-label',label);cell.title=label;
  cell.setAttribute('aria-pressed',String(basementCursor===key));
  if(tile){
   const image=document.createElement('img');setRoomImage(image,tile,art(tile.type===0?16:tile.type));image.alt='';
   image.style.transform='rotate('+(tile.rot*90)+'deg)';
   const caption=document.createElement('span');caption.textContent=tile.trap?TRAPS[tile.trap].name:label;
   cell.append(image,caption);
  }
  grid.append(cell);
 }
 if(basementCursor===null){panel.textContent='Choose a space next to a room to expand the basement.';return}
 const [x,y]=basementCursor.split(',').map(Number),tile=at(x,y,tiles);
 if(tile){
  if(tile.keepUse==='prison')renderPrison(tile,panel,renderKeepBasement);
  else if(tile.type===16&&!tile.trap&&hasTrapWorkshop()){
   for(const [id,trap] of Object.entries(TRAPS))panel.append(keepButton(trap.name+' · '+trap.price+' gold',()=>{
    if(keepWorksBlocked()||tile.trap||!hasTrapWorkshop()||state.gold<trap.price)return;
    state.gold-=trap.price;tile.trap=id;save();render();renderKeepBasement();
   },blocked||state.gold<trap.price));
  }
  if(tile.type!==0&&!tile.prisoner&&connected(tiles.filter(t=>t!==tile)))panel.append(keepButton('Remove tile',()=>{
   if(keepWorksBlocked()||tile.prisoner)return;
   const remaining=tiles.filter(t=>t!==tile);
   if(!connected(remaining))return;
   state.basement.tiles=remaining;save();render();renderKeepBasement();
  },blocked));
  return;
 }
 const options=[12,13,14,15,16,16];
 for(const [index,type] of options.entries()){
  const prison=index===options.length-1,name=prison?'Prison':TYPES[type][0];
  const {gold,stone}=prison?KEEP_CONVERSIONS.prison:{gold:TYPES[type][1],stone:TYPES[type][2]};
  const angles=type===16?[0]:type===12?[0,1]:type===15?[0]:[0,1,2,3];
  for(const rot of angles){
   const candidate={x,y,type,rot,...(prison?{keepUse:'prison'}:{})};
   if(!placement(candidate,tiles))continue;
   panel.append(keepButton(name+(angles.length>1?' · '+rot*90+'°':'')+' · '+gold+' gold + '+stone+' stone',()=>{
    if(keepWorksBlocked()||at(x,y,tiles)||!placement(candidate,tiles)||state.gold<gold||state.stone<stone)return;
    state.gold-=gold;state.stone-=stone;tiles.push(candidate);save();render();renderKeepBasement();
   },blocked||state.gold<gold||state.stone<stone));
  }
 }
}

function triggerBasementTrap(invader,room){
 if(room.keepUse!=='stairs'||invader.basementTrapTriggered)return;
 const trap=state.basement?.tiles.find(tile=>tile.trap);
 if(!trap)return;
 invader.basementTrapTriggered=true;
 const floor=Math.ceil(invader.maxHp*TRAP_FLOOR_RATIO),before=invader.hp;
 if(before>floor)invader.hp=Math.max(floor,before-Math.round(trapStrength(trap)));
 showTriggeredTrap(trap);
 window.StrongholdAudio?.play(trap.trap);
 note(invader.name+' triggered '+TRAPS[trap.trap].name+' below the stairs and lost '+fmt(before-invader.hp)+' health.');
}
