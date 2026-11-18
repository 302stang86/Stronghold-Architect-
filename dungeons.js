/* Dungeon landmarks live in the campaign save, outside rival stronghold simulation. */
const DUNGEON_GRID_SIZE=10;
const DUNGEON_LAYOUT_VERSION=3;
const DUNGEON_TIERS = [
 {id:'dungeon-low', name:'Forgotten Cellar', tier:'Low', occupancy:.3, recommended:1, boss:'The Fallen Captain',
  warning:'Light resistance. The Captain alternates shield and counterattack turns.',
  rooms:[2,3,16,18], guard:'Restless Sentry', variant:1, guardLevel:1, health:.8, skill:.4,
  reward:{gold:65,stone:30,food:20,rp:8}},
 {id:'dungeon-medium', name:'Buried Keep', tier:'Medium', occupancy:.6, recommended:5, boss:'The Candlewick Witch',
  warning:'Carry healing supplies. Find the vault key and extinguish the Witch’s three ward candles.',
  rooms:[3,5,6,8,19], guard:'Candlewick Shadow', variant:2, guardLevel:3, health:1.05, skill:.65,
  reward:{gold:145,stone:75,food:35,rp:25}},
 {id:'dungeon-high', name:'Hollow Citadel', tier:'High', occupancy:.9, recommended:10, boss:'The Ironbound Demon',
  warning:'Elite defenders. The Demon breaks its chains at half health. Use block when it charges.',
  rooms:[3,4,7,9,11,18,19], guard:'Ironbound Sentinel', variant:3, guardLevel:7, health:1.3, skill:.85,
  reward:{gold:300,stone:150,food:65,rp:60}}
];

function dungeonClock(s){return (s.day-1)*DAY_MS+s.dayElapsedMs}

function initDungeons(world){
 const saved=Array.isArray(world.dungeons)?world.dungeons:[];
 const occupied=[{x:14,y:14},...world.castles];
 world.dungeons=DUNGEON_TIERS.map((tier,index)=>{
  const previous=saved.find(d=>d?.id===tier.id);
  const free=(x,y)=>occupied.every(p=>(x-p.x)**2+(y-p.y)**2>=9);
  if(previous&&Number.isInteger(previous.x)&&Number.isInteger(previous.y)&&
     previous.x>=1&&previous.x<=28&&previous.y>=1&&previous.y<=28&&free(previous.x,previous.y)){
   if(!Number.isFinite(previous.readyAt)||previous.readyAt<0)previous.readyAt=0;
   occupied.push(previous);
   return previous;
  }
  const [targetX,targetY]=[[10,16],[20,9],[23,23]][index];
  const candidates=[];
  for(let y=1;y<=28;y++)for(let x=1;x<=28;x++)if(free(x,y))candidates.push({x,y});
  candidates.sort((a,b)=>(a.x-targetX)**2+(a.y-targetY)**2-((b.x-targetX)**2+(b.y-targetY)**2));
  const landmark={id:tier.id,...candidates[0],readyAt:0,layout:null};
  occupied.push(landmark);
  return landmark;
 });
}

function dungeonLandmark(id){
 return state.world?.dungeons?.find(d=>d.id===id)||null;
}

function dungeonTier(id){return DUNGEON_TIERS.find(t=>t.id===id)}

function dungeonMapInfo(){
 return (state.world?.dungeons||[]).map(d=>{
  const tier=dungeonTier(d.id);
  return {id:d.id,x:d.x,y:d.y,name:tier.name,tier:tier.tier,boss:tier.boss,
   warning:tier.warning,recommended:tier.recommended,remaining:Math.max(0,d.readyAt-dungeonClock(state)),
   dayMs:DAY_MS,hasProgress:!!d.layout?.progress,
   blocked:state.over?'Your keep has fallen.':state.expedition?'An expedition is already underway.':
    state.invasion.active||state.invasion.combat?'Finish the invasion at your gate first.':''};
 });
}

function generateDungeon(tier){
 const index=DUNGEON_TIERS.indexOf(tier),roll=n=>Math.floor(Math.random()*n);
 const pick=list=>list[roll(list.length)];
 const side=DUNGEON_GRID_SIZE,total=Math.round(side*side*tier.occupancy);
 const entrance={x:2+roll(side-4),y:side-1,type:17,rot:0,level:1,ports:[0]};
 const first={x:entrance.x,y:entrance.y-1,rot:0,level:1,ports:[2],depth:1};
 const rooms=[first],tiles=[entrance,first],occupied=new Set(tiles.map(roomKey)),frontier=[];
 const addFrontier=parent=>{
  DIRS.forEach(([dx,dy],direction)=>{
   const x=parent.x+dx,y=parent.y+dy;
   if(x>=0&&x<side&&y>=0&&y<side&&!occupied.has(roomKey({x,y})))frontier.push({parent,x,y,direction});
  });
 };
 addFrontier(first);
 while(tiles.length<total){
  const index=roll(frontier.length),edge=frontier[index];
  frontier[index]=frontier[frontier.length-1];frontier.pop();
  if(occupied.has(roomKey(edge)))continue;
  const {x,y,parent,direction}=edge;
  const room={x,y,rot:0,level:1,ports:[(direction+2)%4],depth:parent.depth+1};
  parent.ports.push(direction);
  tiles.push(room);rooms.push(room);occupied.add(roomKey(room));
  addFrontier(room);
 }
 // A leaf keeps the vault from blocking access to any other room.
 const deepest=Math.max(...rooms.map(room=>room.depth));
 const vault=pick(rooms.filter(room=>room.depth===deepest));
 const bossKey=roomKey(vault);
 vault.type=10;
 const sideRooms=rooms.filter(room=>room!==vault);
 const keyRoom=index>0?roomKey(pick(sideRooms.filter(room=>room.depth>=2))):null;
 const defenders={},caches={};
 const encounterPool=sideRooms.filter(room=>room!==first);
 for(let count=[5,10,20][index];count>0;count--){
  const [room]=encounterPool.splice(roll(encounterPool.length),1);
  defenders[roomKey(room)]={name:tier.guard,level:tier.guardLevel+roll(index+1),
   variant:tier.variant,health:.45+index*.15,skill:tier.skill,damage:.65+index*.12};
 }
 const cachePool=[...sideRooms];
 for(let count=[7,12,18][index];count>0;count--){
  const [room]=cachePool.splice(roll(cachePool.length),1);
  caches[roomKey(room)]={[pick(['gold','food','stone','rp'])]:4+index*5+roll(7)};
 }
 for(const room of sideRooms)room.type=pick(tier.rooms);
 for(const room of rooms)delete room.depth;
 defenders[bossKey]={name:tier.boss,level:tier.recommended,variant:tier.variant,
  health:tier.health,skill:tier.skill,damage:[.72,.9,1][index],boss:tier.id};
 return {version:DUNGEON_LAYOUT_VERSION,rulingName:tier.name,tiles,defenders,caches,bossKey,keyRoom,progress:null};
}

function dungeonLoot(exp,layout,key){
 if(exp.looted.includes(key))return;
 const cache=layout.caches[key];
 if(cache){
  exp.looted.push(key);
  const supplies=Object.entries(cache).map(([resource,amount])=>{
   exp.loot[resource]+=amount;
   return amount+' '+RESOURCE_INFO[resource].name.toLowerCase();
  });
  exp.log.push('You found '+supplies.join(' and ')+'.');
 }
 if(key===layout.keyRoom&&!exp.vaultKey){
  exp.vaultKey=true;
  exp.log.push('You found the Boss Vault key.');
 }
}

function finishDungeon(exp,result){
 const landmark=dungeonLandmark(exp.castleId),tier=dungeonTier(exp.castleId);
 if(result==='defeat'){
  state.pack.items=exp.packAtEntry;
  state.prince=exp.princeAtEntry;
  note('Defeated in '+tier.name+'. You returned to your keep. This visit was rolled back.');
  toast('Dungeon defeat · This visit was rolled back.');
  return;
 }
 if(result==='dungeonVictory'){
  for(const [k,v] of Object.entries(tier.reward))exp.loot[k]+=v;
  landmark.readyAt=dungeonClock(state)+3*DAY_MS;
  landmark.layout=null;
 }else{
  const {current,discovered,cleared,looted,vaultKey}=exp;
  landmark.layout.progress={current,discovered,cleared,looted,vaultKey};
 }
 const supplies=Object.entries(exp.loot).filter(([,v])=>v>0).map(([k,v])=>{
  state[k]=roundResource(state[k]+v);
  return v+' '+RESOURCE_INFO[k].name.toLowerCase();
 });
 const summary=supplies.length?' You brought home '+supplies.join(', ')+'.':'';
 const message=result==='dungeonVictory'?tier.boss+' defeated. The vault is sealed for 3 in-game days.':
  'Returned from '+tier.name+'. Your dungeon progress is saved.';
 note(message+summary);
 toast(message+summary);
}

function dungeonBossTurn(c){
 const boss=c.enemyInfo?.boss;
 const round=Math.ceil(c.turnNumber/2),enemy=c.enemy,ally=c.ally;
 if(boss==='dungeon-low'&&c.turn==='enemy'){
  enemy.block=round%2?cardAmount(CARD_BY_ID.D02,enemy.level):0;
  enemy.dmgMod=round%2?.55:.9;
 }
 if(boss==='dungeon-medium'&&(c.turn==='enemy'||c.turnNumber===1)){
  enemy.block=(c.candles??3)*cardAmount(CARD_BY_ID.D01,enemy.level);
  if(c.turn==='enemy'&&c.candles!==0)enemy.hand[0]='A08';
 }
 if(boss==='dungeon-high'&&c.turn==='enemy'){
  const enraged=enemy.hp<=enemy.maxHp/2;
  c.enraged=enraged;
  enemy.dmgMod=enraged?1.25:1;
  if(enraged&&round%2===0){
   enemy.hand[0]='A12';
   if(ally.block>0)enemy.dmgMod=.7;
  }
 }
}

function snuffDungeonCandle(){
 const c=state.invasion.combat;
 if(c?.enemyInfo?.boss!=='dungeon-medium'||c.turn!=='ally'||c.winner||
    c.noMoves||c.lockMs>0||c.ally.energy<2||c.candles===0)return;
 c.candles=(c.candles??3)-1;
 c.ally.energy-=2;
 c.enemy.block=Math.max(0,c.enemy.block-cardAmount(CARD_BY_ID.D01,c.enemy.level));
 combatLog(c.candles?'You extinguish a ward candle.':'The last candle goes dark. The ward is broken.');
 c.noMoves=!c.ally.hand.some(id=>CARD_BY_ID[id].cost<=c.ally.energy);
 if(c.noMoves)c.waitMs=900;
 save();
 renderBattle();
}

function startDungeonVisit(id){
 const landmark=dungeonLandmark(id),tier=dungeonTier(id);
 if(!landmark.layout?.progress&&landmark.layout?.version!==DUNGEON_LAYOUT_VERSION){
  landmark.layout=generateDungeon(tier);
 }
 const layout=landmark.layout;
 const entrance=roomKey(layout.tiles.find(t=>t.type===17));
 const progress=layout.progress?structuredClone(layout.progress):
  {current:entrance,discovered:[entrance],cleared:[],looted:[],vaultKey:false};
 const level=state.prince.level,maxHp=Math.round(hpForLevel(level)*(state.hungryDays>=5?.8:1));
 const party=[{id:'mc',kind:'prince',name:'Young Prince',look:0,level,hp:maxHp,maxHp}];
 state.expedition={id:'x'+Date.now().toString(36),mode:'dungeon',castleId:id,party,...progress,
  packAtEntry:[...state.pack.items],princeAtEntry:{...state.prince},
  loot:{gold:0,stone:0,food:0,rp:0},status:'exploring',encounter:null,
  log:[layout.progress?'You return to where you left off.':'You enter '+tier.name+'.']};
 if($('mapdialog').open)$('mapdialog').close();
 note('Dungeon expedition begins in '+tier.name+'.');
 save();
 showExpedition();
}
