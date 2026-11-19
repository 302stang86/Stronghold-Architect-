const ORIGINAL_ENEMY_SPRITES=4;
const EXTRA_INVADERS=[
 {name:'Roadside Cutthroat',atk:13,skill:.46},
 {name:'Rogue Pikeman',atk:15,skill:.5},
 {name:'Black Banner Mercenary',atk:17,skill:.55},
 {name:'Ashcloak Scout',atk:14,skill:.53}
];
const DUNGEON_ENEMIES=[
 {name:'Dungeon Gaoler',skill:.48,damageScale:1},
 {name:'Vault Shieldwarden',skill:.7,damageScale:.9},
 {name:'Crypt Acolyte',skill:.64,damageScale:.95},
 {name:'Hollow Revenant',skill:.56,damageScale:1.1}
].map((enemy,index)=>({...enemy,variant:ORIGINAL_ENEMY_SPRITES+EXTRA_INVADERS.length+index}));
const enemyPortrait=variant=>'assets/enemy-'+variant+'-v1.webp';
const COMBAT_ART={
 mc:['assets/prince-battle-v2.webp'],
 servant:Array.from({length:5},(_,i)=>'assets/servant-'+i+'-battle-v2.webp'),
 guard:['assets/guard-battle-v2.webp'],
 paladin:['assets/paladin-battle-v2.webp'],
 invader:Array.from({length:ORIGINAL_ENEMY_SPRITES+EXTRA_INVADERS.length+DUNGEON_ENEMIES.length},(_,i)=>i<ORIGINAL_ENEMY_SPRITES?'assets/invader-'+i+'-battle-v2.webp':enemyPortrait(i))
};
function combatSpriteKind(unit){
 return unit.player||unit.kind==='prince'?'mc':unit.paladin?'paladin':unit.guard||unit.kind==='guard'?'guard':'servant';
}
function combatSprite(unit){
 const art=COMBAT_ART[combatSpriteKind(unit)];
 return art[unit.look]||art[0];
}
const INVADER_ATLASES=Array.from({length:4},(_,i)=>'assets/invader-'+i+'-map-v2.webp');
const INVADER_TYPES=[{name:'Guild Thief',maxHp:100,atk:12,skill:.42},{name:'Rogue Soldier',maxHp:100,atk:15,skill:.5},{name:'Hired Assassin',maxHp:100,atk:17,skill:.55},{name:'Bandit Marauder',maxHp:100,atk:15,skill:.45},...EXTRA_INVADERS];
const MERCHANT_RATIO=.25;
function unitById(id){return servantById(id)||(state.guards||[]).find(g=>g.id===id)||null}
function allUnits(){return [...state.collectors,...(state.guards||[])]}
function unitAway(n){return !!state.expedition&&state.expedition.party.some(m=>m.id===n.id)}
function guardRoomKey(g){const r=at(Math.floor(g.x),Math.floor(g.y));return r?roomKey(r):null}
function roomDefenders(inv){
 const here=inv.room;
 return allUnits().filter(n=>!unitAway(n)&&!inv.knocked.includes(n.id)&&guardRoomKey(n)===here&&
  (n.guard||n.home===here&&n.mode==='working'));
}
function invasionClock(s=state){return (s.day-1)*DAY_MS+(s.dayElapsedMs||0)}
function firstInvasionAt(){return DAY_MS+Math.random()*(2*DAY_MS-ALARM_MS-250)}
function merchantTick(){const r=state.invasion;if(state.over||state.day<3||!(r.merchantCredit>=1)||r.active||r.combat||state.expedition||r.alarmMs!=null||document.querySelector('dialog[open]'))return;r.merchantCredit-=1;note('A merchant arrived at the castle gate.');save();showMerchantDialog()}
function showMerchantDialog(){const d=$('merchantdialog');if(!d||d.open)return;d.classList.remove('merchant-case');resetMerchantTrade();$('merchant-title').textContent='A merchant at the gate';$('merchant-text').textContent='A travelling merchant waits outside your castle gate. Merchants never attack. Would you like to trade?';$('merchant-yes').hidden=false;$('merchant-no').textContent='No';$('merchant-yes').onclick=()=>{pickMerchantStock();d.classList.add('merchant-case');$('merchant-title').textContent='Trade with the merchant';$('merchant-yes').hidden=true;$('merchant-no').textContent='Leave';renderMerchantShop();note('You are trading with the merchant.')};$('merchant-no').onclick=()=>d.close();d.showModal()}
const ALARM_MS=6000;const LOSS_RATES={gold:.5,stone:.3,food:.3,rp:.1};
const SERVANT_BONUS=1.05,SERVANT_HUNGER_PENALTY=.3,MC_HUNGER_PENALTY=.25,BASE_SERVANTS=3,TRAP_FLOOR_RATIO=.1;
function initInvasion(s){
 if(!s.invasion)s.invasion={active:null,combat:null,alarmMs:null,nextAt:firstInvasionAt()};
 const r=s.invasion;
 if(!Number.isFinite(r.nextAt)||r.nextAt<DAY_MS)r.nextAt=s.day<=3&&!r.active?firstInvasionAt():
  Math.max(invasionClock(s),((r.nextDay||s.day)-1)*DAY_MS);
 if(r.alarmMs===undefined)r.alarmMs=null;
 if(!Number.isFinite(r.mapResumeAt)||r.mapResumeAt<0)delete r.mapResumeAt;
 if(!Array.isArray(r.warbands))r.warbands=[];
 r.warbands=r.warbands.filter(x=>x&&typeof x.house==='string'&&Number.isFinite(x.level)).slice(0,2).map(x=>({house:x.house.slice(0,40),houseId:String(x.houseId||'').slice(0,24),level:Math.max(1,Math.min(MAX_LEVEL,Math.round(x.level))),count:Math.max(1,Math.min(3,x.count|0||1))}));
 if(!Number.isFinite(r.merchantCredit)||r.merchantCredit<0)r.merchantCredit=0;
 if(r.active&&r.active.level===undefined)r.active.level=1;
 if(r.combat&&!Array.isArray(r.combat.ally?.hand))r.combat=null;
 if(r.combat){
  r.combat.lockMs=0;
  if(r.combat.allies?.[r.combat.allyIndex])r.combat.ally=r.combat.allies[r.combat.allyIndex];
 }
}
function raidNeighbors(room){return DIRS.map(([dx,dy],d)=>{const r=at(room.x+dx,room.y+dy);return r&&compatible(room,r,d)?r:null}).filter(Boolean)}
function raidPath(from,to,avoidThrone=false){const start=roomFromKey(from),target=roomFromKey(to);if(!start||!target)return null;const q=[start],prev=new Map([[from,null]]);while(q.length){const r=q.shift(),key=roomKey(r);if(key===to){const path=[];let k=key;while(prev.get(k)!==null){path.unshift(k);k=prev.get(k)}return path}for(const n of raidNeighbors(r)){const k=roomKey(n);if(avoidThrone&&n.type===0)continue;if(!prev.has(k)){prev.set(k,key);q.push(n)}}}return null}
function checkScheduledInvasion(ms){
 const r=state.invasion;
 if(state.over||r.active||r.combat||$('merchantdialog').open||invasionClock()<r.nextAt)return;
 if(r.alarmMs==null){
  r.alarmMs=ALARM_MS;
  window.StrongholdAudio?.play('alarm');
  toast('Alarm! Intruders are approaching the castle gate.');
  shakeScreen();save();return;
 }
 r.alarmMs=Math.max(0,r.alarmMs-ms);
 if(r.alarmMs===0)spawnInvader();
}
function planInvaderRoute(startKey){const throne=state.tiles.find(t=>t.type===0),eligible=state.tiles.filter(t=>![0,12,13,14,15,17].includes(t.type)),maxRooms=Math.max(1,Math.floor(eligible.length*.5)),count=Math.min(eligible.length,1+Math.floor(Math.random()*maxRooms));const shuffled=eligible.slice().sort(()=>Math.random()-.5),served=shuffled.filter(t=>state.collectors.some(n=>n.home===roomKey(t))),rest=shuffled.filter(t=>!served.includes(t));let picks=[...served,...rest].slice(0,count).filter(t=>raidPath(startKey,roomKey(t),true));const route=[];let cur=startKey;while(picks.length){let bi=0,bl=Infinity;picks.forEach((t,i)=>{const p=raidPath(cur,roomKey(t),true);if(p&&p.length<bl){bl=p.length;bi=i}});const t=picks.splice(bi,1)[0];route.push(roomKey(t));cur=roomKey(t)}route.push(roomKey(throne));return route}
function invasionPartyLimit(level){return level>=16?3:level>=8?2:1}
function ownedCastleCount(){return state.world?state.world.castles.filter(c=>c.ownerId==='player').length:0}
function rollInvader(variants,band){
 const [variant]=variants.splice(Math.floor(Math.random()*variants.length),1);
 const pressure=Math.floor(Math.min(6,ownedCastleCount())/2);          // every conquest draws harder fighters to your gate
 const raw=band?band.level+Math.floor(Math.random()*3)-1:state.prince.level+Math.floor(Math.random()*7)-3+pressure;
 return {variant,level:Math.max(1,Math.min(MAX_LEVEL,raw)),house:band?band.house:null,houseId:band?band.houseId:null};
}
function readyInvader(profile,remaining,knocked){
 const {variant,level,house,houseId}=profile,template=INVADER_TYPES[variant],maxHp=Math.round(hpForLevel(level)*(house?1.15:1));
 const gate=roomKey(state.tiles.find(t=>t.type===17)),bonus=Math.min(.2,Math.max(0,state.day-3)*.004);   // invaders learn the game as the days pass
 state.invasion.active={...template,skill:Math.min(.95,template.skill+bonus),name:house?template.name+' of '+house:template.name,house:house||null,houseId:houseId||null,dmg:Math.round((1+Math.min(.35,Math.max(0,state.day-3)*.005)+(house?.1:0))*100)/100,maxHp,hp:maxHp,level,variant,room:gate,from:gate,target:null,travelMs:0,waitMs:1200,knocked,route:planInvaderRoute(gate),remaining};
}
/* A rival house sends a warband: it joins the next invasion at your gate. Called by the world simulation. */
function queueWarband(w){
 const r=state.invasion;if(!r||state.over||!w||typeof w.house!=='string')return;
 if(!Array.isArray(r.warbands))r.warbands=[];
 if(r.warbands.length>=2||r.warbands.some(x=>x.houseId===w.houseId))return;
 r.warbands.push({house:w.house.slice(0,40),houseId:String(w.houseId||'').slice(0,24),level:Math.max(1,Math.min(MAX_LEVEL,Math.round(w.level)||1)),count:Math.max(1,Math.min(3,w.count|0||1))});
 note(`Scouts report that ${w.house} is sending a warband against your keep.`)}
function spawnInvader(){
 const r=state.invasion;if(state.over||state.day<2||r.active||r.combat||invasionPausedForMap())return false;
 const band=Array.isArray(r.warbands)&&r.warbands.length&&state.day>=6?r.warbands.shift():null;
 const count=band?band.count:1+Math.floor(Math.random()*invasionPartyLimit(state.prince.level));
 const variants=INVADER_TYPES.map((_,index)=>index).filter(index=>state.day>3||index<2||index===4||index===5);
 const party=Array.from({length:count},()=>rollInvader(variants,band));
 readyInvader(party.shift(),party,[]);
 r.merchantCredit=Math.min(3,(r.merchantCredit||0)+MERCHANT_RATIO);r.alarmMs=null;
 shakeScreen();for(const n of state.collectors)if(n.home===null)fleeToThrone(n);
 const inv=r.active;
 const message=band?`A warband from ${band.house} is at your gate. ${inv.name} enters first.`:count===1?inv.name+' has entered your stronghold!':count+' invaders at the gate. '+inv.name+' enters first.';
 note(message);toast(message);save();render();return true;
}
function chooseInvaderNext(inv){const throneKey=roomKey(state.tiles.find(t=>t.type===0));while(inv.route.length){const goal=inv.route[0];if(goal===inv.room){inv.route.shift();continue}const path=raidPath(inv.room,goal,goal!==throneKey);if(path&&path.length)return path[0];inv.route.shift()}return null}
function enterInvaderRoom(){const inv=state.invasion.active,room=roomFromKey(inv.room);if(!room)return finishInvasion('escape','The invader withdrew.');if(inv.route[0]===inv.room)inv.route.shift();
 if(room.trap){window.StrongholdAudio?.play(room.trap);const floor=Math.ceil(inv.maxHp*TRAP_FLOOR_RATIO),before=inv.hp,damage=Math.round(trapStrength(room));inv.hp=before>floor?Math.max(floor,before-damage):before;note(`${inv.name} triggered ${TRAPS[room.trap].name} and lost ${fmt(before-inv.hp)} health.`);fxAt(room,'flash','');if(before-inv.hp>0)fxAt(room,'fx-dmg','−'+fmt(before-inv.hp));else fxAt(room,'fx-dmg','Resisted')}
 triggerBasementTrap(inv,room);
 if(startRoomCombat(inv))return;
 save();refreshEconomyUI();
}
function invasionPausedForMap(){
 return $('mapdialog').open||invasionClock()<(state.invasion.mapResumeAt||0);
}
function resumeInvasionAfterMap(){
 const r=state.invasion,now=invasionClock();
 if(!r.active&&!r.combat&&r.alarmMs==null&&now<r.nextAt)return;
 r.mapResumeAt=now+DAY_MS/12;
 if(!r.active&&!r.combat){r.nextAt=r.mapResumeAt;r.alarmMs=0}
 save();
}
function tickInvasion(ms){
 const r=state.invasion;if(state.over||invasionPausedForMap())return;
 if(r.mapResumeAt)delete r.mapResumeAt;
 if(r.combat){tickCombat(ms);return}
 checkScheduledInvasion(ms);merchantTick();
 const inv=r.active;if(!inv)return;
 if(!inv.target){
  if(startRoomCombat(inv))return;
  if(inv.waitMs>0){inv.waitMs=Math.max(0,inv.waitMs-ms);return}
  inv.target=chooseInvaderNext(inv);inv.from=inv.room;inv.travelMs=0;
  if(!inv.target)return finishInvasion('escape','The invader escaped.');
 }
 inv.travelMs=Math.min(3200,inv.travelMs+ms);
 if(inv.travelMs>=3200){inv.room=inv.target;inv.target=null;inv.waitMs=600;enterInvaderRoom()}
}
function listText(parts){return parts.length<2?parts.join(''):parts.slice(0,-1).join(', ')+' and '+parts[parts.length-1]}
function rollReward(inv){const scale=inv.atk/12*Math.min(2,1+.04*Math.max(0,state.day-3))*(1+.02*(inv.level-1))*(inv.house?1.5:1),reward={gold:Math.max(1,Math.round((10+Math.random()*15)*scale))};if(Math.random()<.7)reward.stone=Math.max(1,Math.round((5+Math.random()*10)*scale));if(Math.random()<.4)reward.food=Math.max(1,Math.round((3+Math.random()*5)*scale));return reward}
function finishInvasion(result,message,captured=false){const r=state.invasion,inv=r.active;if(!inv)return;let text=message;
 const rivalHouse=inv.houseId&&state.world?state.world.castles.find(c=>c.id===inv.houseId):null;
 if(result==='win'){if(rivalHouse){rivalHouse.guards=Math.max(0,(rivalHouse.guards||0)-1);text+=` ${rivalHouse.rulingName} loses a warrior.`}if(!captured){const reward=rollReward(inv);for(const [k,v]of Object.entries(reward))state[k]=roundResource(state[k]+v);const found=`Found ${listText(Object.entries(reward).map(([k,v])=>v+' '+RESOURCE_INFO[k].name.toLowerCase()))} on the invader’s body.`;text+=' '+found;toast(found)}}
 else if(result==='loss'){const taken={};for(const [k,rate]of Object.entries(LOSS_RATES)){const amount=Math.floor(state[k]*rate);if(amount>0){taken[k]=amount;state[k]=roundResource(state[k]-amount)}}const parts=Object.entries(taken).map(([k,v])=>v+' '+(k==='rp'?'research points':RESOURCE_INFO[k].name.toLowerCase()));text+=parts.length?` The invader stole ${listText(parts)}.`:' The invader found nothing to steal.';if(rivalHouse)for(const [k,v]of Object.entries(taken))rivalHouse.treasury[k]=roundResource(rivalHouse.treasury[k]+v);toast('The prince was defeated. Resources were stolen.')}
 if(result!=='loss'&&inv.remaining?.length){
  const [next,...remaining]=inv.remaining;
  const modal=$('battle-dialog');if(modal?.open)modal.close();
  r.combat=null;readyInvader(next,remaining,inv.knocked);
  note(text+' '+r.active.name+' enters as reinforcement.');toast(r.active.name+' is entering at the gate.');save();render();return;
 }
 note(text+' Everyone recovers.');r.active=null;r.combat=null;r.alarmMs=null;r.nextAt=invasionClock()+DAY_MS*(.5+2.5*Math.random());for(const n of allUnits())if(n.home===null&&!n.guard||n.guard&&!n.home){n.path=[];n.mode='wander';n.waitMs=800+Math.random()*2500}const modal=$('battle-dialog');if(modal?.open)modal.close();if(window.cloudPushSoon)cloudPushSoon();save();render()}
function combatant(name,level,maxHp,dmgMod,skill){return {name,level,maxHp,hp:maxHp,energy:10,block:0,dmgMod,skill,hand:[]}}
function applyGuardBuffs(actor,eligible,paladin){
 if(!eligible)return actor;
 actor.dmgMod*=(1+roomCombatBonus(4))*(paladin?1.05:1);
 actor.block=Math.round(actor.maxHp*roomCombatBonus(3));
 actor.openingBlock=actor.block>0;
 if(paladin)actor.paladin=true;
 return actor;
}
function roomCombatant(n){
 const prince=n==null,level=prince?state.prince.level:n.guard?guardLevel():n.level||1;
 const hp=Math.round(hpForLevel(level)*(prince&&state.hungryDays>=5?.8:1)*(n?.paladin?1.05:1));
 const hunger=prince?state.hungryDays>=2?MC_HUNGER_PENALTY:0:state.hungryDays?SERVANT_HUNGER_PENALTY:0;
 const actor=combatant(prince?'Young Prince':n.name,level,hp,(1-hunger)*scholarBonus(),prince||n.guard ? .65 : servantRole(n).skill);
 return Object.assign(applyGuardBuffs(actor,prince||n.guard,n?.paladin),{id:prince?'mc':n.id,look:n?.look||0,guard:!!n?.guard,player:prince});
}
function selectCombatAlly(combat,index){
 combat.allyIndex=index;
 combat.ally=combat.allies[index];
 combat.kind=combat.ally.player?'mc':'servant';
 combat.defenderId=combat.exp?null:combat.ally.player?null:combat.ally.id;
 combat.leadId=combat.ally.id;
}
function startRoomCombat(inv){
 const allies=roomDefenders(inv).map(roomCombatant);
 if(roomFromKey(inv.room)?.type===0)allies.unshift(roomCombatant(null));
 if(!allies.length)return false;
 attachCompanion(allies,state.homeCompanion);
 for(const id of ['roomdialog','builddialog','helpdialog','servantdialog','rosterdialog','settingsdialog','researchdialog','mapdialog','packdialog','basement-dialog'])if($(id)?.open)$(id).close();
 const enemy=combatant(inv.name,inv.level,inv.maxHp,inv.dmg||1,inv.skill);
 enemy.hp=inv.hp;
 const combat={allies,enemy,auto:!allies.some(a=>a.player),turn:'ally',turnNumber:1,waitMs:700,noMoves:false,winner:null,
  log:['Each fighter takes a turn with five cards and 10 energy.'],lastAction:'',lastCard:null,lastBy:null,lastCount:0,lastMs:0,lockMs:0};
 const supported=allies.find(a=>a.companion);
 if(supported)combat.log.push(COMPANIONS[supported.companion].name+' supports '+supported.name+'.');
 state.invasion.combat=combat;
 selectCombatAlly(combat,0);
 beginCombatTurn('ally');save();renderBattle();
 return true;
}
function beginCombatTurn(side){const c=state.invasion.combat;if(!c)return;c.turn=side;c.noMoves=false;c.waitMs=side==='ally'&&!c.auto?0:900;const actor=c[side];const pet=side==='ally'?COMPANIONS[actor.companion]:null;actor.energy=10-(pet?.energy||(!actor.companionTurn&&pet?.firstEnergy)||0);if(pet)actor.companionTurn=true;if(!actor.openingBlock)actor.block=0;delete actor.openingBlock;if(side==='ally'){if(actor.ironhide)actor.block+=actor.ironhide;if(actor.regen&&actor.regen.turns>0){actor.regen.turns--;const h=Math.round(actor.maxHp*actor.regen.pct);actor.hp=Math.min(actor.maxHp,actor.hp+h);c.lastAction=`${actor.name} regenerates ${h} health.`}}actor.hand=side==='enemy'?drawNpcHand(c.exp?actor.name:INVADER_TYPES[state.invasion.active?.variant]?.name||actor.name):drawHand(5);if(c.enemyInfo?.boss)dungeonBossTurn(c)}
function combatLog(message){const c=state.invasion.combat;c.lastAction=message;c.log.push(message);c.log=c.log.slice(-5)}
function endCombatTurn(){
 const c=state.invasion.combat;
 c.turnNumber++;
 if(!c.allies){beginCombatTurn(c.turn==='ally'?'enemy':'ally');return}
 const next=c.allies.findIndex((actor,index)=>actor.hp>0&&(c.turn==='enemy'||index>c.allyIndex));
 if(next<0){
  const after=c.enemyTargetIndex??-1;
  const target=c.allies.findIndex((actor,index)=>actor.hp>0&&index>after);
  c.enemyTargetIndex=target<0?c.allies.findIndex(actor=>actor.hp>0):target;
  selectCombatAlly(c,c.enemyTargetIndex);
  beginCombatTurn('enemy');return;
 }
 selectCombatAlly(c,next);
 beginCombatTurn('ally');
}
function playCard(index){const c=state.invasion.combat;if(!c||c.winner)return false;const side=c.turn,actor=c[side],target=c[side==='ally'?'enemy':'ally'],id=actor.hand[index],card=CARD_BY_ID[id];if(!card||card.cost>actor.energy)return false;actor.hand.splice(index,1);actor.energy-=card.cost;c.lastCard=id;c.lastBy=side;c.lastAllyId=c.ally.id;c.lastCount++;c.lastMs=1500;c.flashActor=side;c.flashAction=card.type==='healing'?'heal':card.type==='attack'?'basic':card.type==='defense'?'defend':'energy';c.flashType=card.type;c.flashMs=650;c.flashAt=Date.now();const amt=cardAmount(card,actor.level);
 if(card.type==='attack'){const raw=Math.max(1,Math.round(amt*actor.dmgMod*companionAttack(actor)*(actor.activeRune===33?1.35:1))),warded=target.activeRune===32,absorbed=warded?raw:Math.min(target.block,raw);actor.companionAttacked=true;if(actor.activeRune===33)delete actor.activeRune;if(warded)delete target.activeRune;else target.block-=absorbed;target.hp=Math.max(0,target.hp-(raw-absorbed));combatLog(`${actor.name} plays ${card.name}: ${raw} damage${warded?' (absorbed by Ward Rune)':absorbed?` (${absorbed} blocked)`:''}.`)}
 else if(card.type==='defense'){const block=Math.round(amt*(actor.paladin?1.05:1)*(COMPANIONS[actor.companion]?.block||1));actor.block+=block;combatLog(`${actor.name} plays ${card.name}: ${block} block.`)}
 else if(card.type==='healing'){const before=actor.hp;const pet=COMPANIONS[actor.companion],heal=Math.round(amt*(pet?.heal||(!actor.companionHealed&&pet?.firstHeal)||1));actor.companionHealed=true;actor.hp=Math.min(actor.maxHp,actor.hp+heal);combatLog(`${actor.name} plays ${card.name}: restores ${actor.hp-before} health.`)}
 else{const before=actor.energy;actor.energy=Math.min(10,actor.energy+amt);combatLog(`${actor.name} plays ${card.name}: energy ${before} → ${actor.energy}.`)}
 if(!c.exp&&state.invasion.active)state.invasion.active.hp=c.enemy.hp;if(c.enemy.hp<=0)c.winner='ally';else if(c.ally.hp<=0&&(!c.allies||!c.allies.some(a=>a.hp>0)||c.exp&&c.ally.player))c.winner='enemy';
 else if(side==='enemy'&&c.ally.hp<=0){c.noMoves=true;c.waitMs=450;save();return true}
 if(c.winner){c.waitMs=motionOK()?2400:1550;save();return true}
 c.noMoves=!actor.hand.some(h=>CARD_BY_ID[h].cost<=actor.energy);if(c.noMoves)c.waitMs=900;save();return true}
function aiGreedy(actor,target){const opts=actor.hand.map((id,i)=>({i,card:CARD_BY_ID[id]})).filter(o=>o.card.cost<=actor.energy);if(!opts.length)return -1;const amt=o=>cardAmount(o.card,actor.level),atk=opts.filter(o=>o.card.type==='attack');
 const kill=atk.filter(o=>target.activeRune!==32&&Math.round(amt(o)*actor.dmgMod*companionAttack(actor))>=target.hp+target.block).sort((a,b)=>a.card.cost-b.card.cost);if(kill.length)return kill[0].i;
 if(actor.hp<=actor.maxHp*.45){const heals=opts.filter(o=>o.card.type==='healing').sort((a,b)=>b.card.value-a.card.value);if(heals.length)return heals[0].i}
 const en=opts.find(o=>o.card.type==='energy'&&actor.hand.some(id=>{const k=CARD_BY_ID[id];return k.cost>actor.energy-1&&k.cost<=Math.min(10,actor.energy-1+o.card.value)}));if(en)return en.i;
 if(atk.length)return atk.sort((a,b)=>b.card.value-a.card.value)[0].i;
 const def=opts.filter(o=>o.card.type==='defense').sort((a,b)=>b.card.value-a.card.value);if(def.length)return def[0].i;
 const heals=opts.filter(o=>o.card.type==='healing'&&actor.hp<actor.maxHp);if(heals.length)return heals[0].i;return opts[0].i}

/* Smarter play: look through every order of the cards in hand and choose the line that scores best (damage, block against the
   expected hit, healing when hurt, and a clean kill). Lower skill means more slips. */
const TURN_DAMAGE=42;
function aiThreat(foe){return TURN_DAMAGE*powerForLevel(foe.level)*(foe.dmgMod||1)*(foe.activeRune===33?1.35:1)}
function aiPlan(actor,target){
 const hand=actor.hand.map((id,i)=>({i,card:CARD_BY_ID[id]})),used=hand.map(()=>false);
 const mul=actor.dmgMod*companionAttack(actor)*(actor.activeRune===33?1.35:1),threat=aiThreat(target),blockMul=(actor.paladin?1.05:1)*(COMPANIONS[actor.companion]?.block||1);
 let best={score:-1e9,first:-1};
 function walk(energy,first,dealt,hp,block,tHp,tBlock,ward,n,healed){
  let score;
  if(tHp<=0)score=1e6-n;
  else{
   const incoming=Math.max(0,threat-block),left=hp-incoming;
   score=dealt+Math.min(block,threat)*.85+Math.max(0,block-threat)*.1+healed*(hp<actor.maxHp*.55?1.1:.6);
   if(left<=0)score-=400;else if(left<actor.maxHp*.2)score-=60;
   score-=n*.01}
  if(first>=0&&score>best.score)best={score,first};
  if(tHp<=0)return;
  for(let k=0;k<hand.length;k++){
   if(used[k])continue;const card=hand[k].card;if(card.cost>energy)continue;
   used[k]=true;let e=energy-card.cost,d=dealt,b=block,h=hp,th=tHp,tb=tBlock,w=ward,hl=healed;
   if(card.type==='attack'){const raw=Math.max(1,Math.round(cardAmount(card,actor.level)*mul));if(w)w=false;else{const ab=Math.min(tb,raw);tb-=ab;th-=raw-ab;d+=raw-ab+ab*.3}}
   else if(card.type==='defense')b+=Math.round(cardAmount(card,actor.level)*blockMul);
   else if(card.type==='healing'){const real=Math.min(Math.round(cardAmount(card,actor.level)),actor.maxHp-h);h+=real;hl+=real}
   else e=Math.min(10,e+cardAmount(card,actor.level));
   walk(e,first<0?hand[k].i:first,d,h,b,th,tb,w,n+1,hl);used[k]=false}
 }
 walk(actor.energy,-1,0,actor.hp,actor.block,target.hp,target.block,target.activeRune===32,0,0);
 return best.first}
function aiChoose(actor,target){
 const opts=actor.hand.map((id,i)=>({i,card:CARD_BY_ID[id]})).filter(o=>o.card.cost<=actor.energy);
 if(!opts.length)return -1;
 if(Math.random()>actor.skill)return Math.random()<.5?opts[Math.floor(Math.random()*opts.length)].i:aiGreedy(actor,target);
 const pick=aiPlan(actor,target);return pick>=0?pick:aiGreedy(actor,target)}
function choosePlayerCard(index){if(awaitingResume)return false;const c=state.invasion.combat;if(!c||c.kind!=='mc'||c.turn!=='ally'||c.winner||c.noMoves||(c.lockMs||0)>0)return false;const ok=playCard(index);if(ok&&state.invasion.combat===c)c.lockMs=450;renderBattle();return ok}
function tickCombat(ms){const c=state.invasion.combat;if(!c)return;for(const k of ['flashMs','lastMs','lockMs'])c[k]=Math.max(0,(c[k]||0)-ms);
 if(c.winner){c.waitMs-=ms;if(c.waitMs<=0)resolveCombat();else renderBattle();return}
 const actor=c[c.turn];
 if(c.noMoves){c.waitMs-=ms;if(c.waitMs<=0){combatLog(`${actor.name} has no playable cards. Turn ends.`);endCombatTurn();save()}renderBattle();return}
 if(c.kind==='mc'&&c.turn==='ally'){renderBattle();return}
 c.waitMs-=ms;if(c.waitMs>0){renderBattle();return}c.waitMs=900;const i=aiChoose(actor,c[c.turn==='ally'?'enemy':'ally']);if(i<0){c.noMoves=true;c.waitMs=300}else playCard(i);renderBattle()}
function skipBattle(){const c=state.invasion.combat;if(!c||!c.auto||c.winner)return;let guard=0;while(!c.winner&&guard++<800){const actor=c[c.turn];if(c.noMoves){endCombatTurn();continue}const i=aiChoose(actor,c[c.turn==='ally'?'enemy':'ally']);if(i<0){endCombatTurn();continue}playCard(i)}if(!c.winner)c.winner=c.ally.hp/c.ally.maxHp>=c.enemy.hp/c.enemy.maxHp?'ally':'enemy';c.waitMs=0;resolveCombat()}
function resolveCombat(){
 const c=state.invasion.combat,inv=state.invasion.active;
 if(c?.winner&&!BATTLE_FX.over)window.StrongholdAudio?.play(c.winner==='ally'?'victory':'defeat');
 if(c?.exp)return resolveExpeditionCombat(c);
 if(!c||!inv)return;
 const allies=c.allies||[Object.assign(c.ally,{id:c.defenderId,player:c.kind==='mc'})];
 if(c.winner==='ally'){
  return offerInvaderCapture(c,inv,captured=>{
   gainXp('mc',30+inv.level*2);
   for(const actor of allies){const servant=servantById(actor.id);if(servant)gainXp(servant,40+inv.level*2)}
   finishInvasion('win',captured?`The defenders captured ${inv.name}!`:`The defenders defeated ${inv.name}!`,captured);
  });
 }
 if(allies.some(a=>a.player))return finishInvasion('loss','The prince was defeated.');
 inv.hp=c.enemy.hp;
 for(const actor of allies){
  if(!inv.knocked.includes(actor.id))inv.knocked.push(actor.id);
  note(`${actor.name} was knocked out until this invasion ends.`);
 }
 state.invasion.combat=null;
 if($('battle-dialog').open)$('battle-dialog').close();
 inv.waitMs=1200;save();render();
}
/* ---- levels and experience ---- */
function gainXp(who,base){if(state.over)return;const e=who==='mc'?state.prince:who;if(!e||e.level>=MAX_LEVEL)return;const rate=who==='mc'?1:(e.xpRate||1);e.xp=Math.round((e.xp+base*rate)*100)/100;let up=0;while(e.level<MAX_LEVEL&&e.xp>=xpNeed(e.level)){e.xp=Math.round((e.xp-xpNeed(e.level))*100)/100;e.level++;up++}if(e.level>=MAX_LEVEL)e.xp=0;if(up){const name=who==='mc'?'The prince':e.name;note(`${name} reached level ${e.level}.`);toast(`${name} reached level ${e.level}!`);if(window.cloudPushSoon)cloudPushSoon()}}
function awardRoomXp(room,base){gainXp('mc',base);const sv=roomCollector(room);if(sv)gainXp(sv,Math.ceil(base*.75))}
function renderPrince(){const el=$('prince-card');if(!el)return;const p=state.prince,need=p.level>=MAX_LEVEL?0:xpNeed(p.level);if($('princebtn'))$('princebtn').textContent='Prince · Lv '+p.level;el.innerHTML=`<strong>Young Prince · Level ${p.level}</strong><div class="xpbar"><i style="width:${need?Math.min(100,p.xp/need*100):100}%"></i></div><small>${need?`Experience ${Math.floor(p.xp)} / ${need}`:'Maximum level'} · Health ${hpForLevel(p.level)} · Card power ×${powerForLevel(p.level).toFixed(2)}</small>`}

function spriteStyle(el,atlas,direction,frame=0,walking=false){el.style.backgroundImage='url("'+atlas+'")';el.style.backgroundSize='200% 1600%';el.style.backgroundPosition=`${frame%2*100}% ${(direction*2+(walking?1:0))/15*100}%`}
function renderInvader(){if($('invasion-status'))$('invasion-status').textContent=raidForecast();const r=state.invasion,inv=r?.active,grid=$('grid');let layer=$('invader-layer');if(!layer){layer=document.createElement('div');layer.id='invader-layer';grid.append(layer)}if(!inv){layer.replaceChildren();return}let actor=$('invader-sprite');if(!actor){actor=document.createElement('div');actor.id='invader-sprite';actor.setAttribute('aria-label','Invading enemy');actor.innerHTML='<span class="inv-hp"><i></i></span>';layer.append(actor)}const bar=actor.querySelector('.inv-hp i');if(bar)bar.style.width=Math.max(0,inv.hp/inv.maxHp*100)+'%';const from=roomFromKey(inv.room),to=roomFromKey(inv.target),p=to?inv.travelMs/3200:0;if(!from)return;actor.style.left=`calc(${from.x+.5+(to?(to.x-from.x)*p:0)}*var(--size))`;actor.style.top=`calc(${from.y+.65+(to?(to.y-from.y)*p:0)}*var(--size))`;const direction=to?mcFacing(to.x-from.x,to.y-from.y):1,frame=Math.floor(Date.now()/250)%8;if(inv.variant<ORIGINAL_ENEMY_SPRITES)spriteStyle(actor,INVADER_ATLASES[inv.variant],direction,frame,!!to);
 else{
  actor.style.backgroundImage='url("'+enemyPortrait(inv.variant)+'")';
  actor.style.backgroundSize='100% 100%';
  actor.style.backgroundPosition='center';
 }}
function raidForecast(){const r=state.invasion;return r.active?`Invader inside · ${r.active.name} · HP ${r.active.hp}/${r.active.maxHp}${r.active.remaining?.length?' · '+r.active.remaining.length+' waiting at the gate':''}`:`Next invasion: day ${Math.floor(r.nextAt/DAY_MS)+1}`}
function validateInvasion(s){const r=s.invasion,finite=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max,keys=new Set(s.tiles.map(roomKey));if(!r||!Number.isFinite(r.nextAt)||r.nextAt<DAY_MS||r.alarmMs!=null&&!finite(r.alarmMs,0,ALARM_MS))throw Error('Invalid invasion schedule');const inv=r.active;if(inv){if(!Number.isInteger(inv.level)||inv.level<1||inv.level>MAX_LEVEL||!Number.isInteger(inv.variant)||!INVADER_TYPES[inv.variant]||!finite(inv.hp,0,10000)||!finite(inv.maxHp,1,10000)||inv.hp>inv.maxHp||!finite(inv.atk,1,1000)||!finite(inv.skill,0,1)||typeof inv.name!=='string'||!keys.has(inv.room)||!keys.has(inv.from)||inv.target!==null&&!keys.has(inv.target)||!finite(inv.travelMs,0,3200)||!finite(inv.waitMs,0,10000)||![inv.route,inv.knocked].every(Array.isArray)||inv.route.length>FIELD_SIZE*FIELD_SIZE||inv.route.some(k=>!keys.has(k))||inv.knocked.some(id=>!s.collectors.some(n=>n.id===id)&&!(s.guards||[]).some(g=>g.id===id)))throw Error('Invalid invader');if(inv.remaining!==undefined&&(!Array.isArray(inv.remaining)||inv.remaining.length>2||inv.remaining.some(x=>!x||!Number.isInteger(x.level)||x.level<1||x.level>MAX_LEVEL||!Number.isInteger(x.variant)||!INVADER_TYPES[x.variant])))throw Error('Invalid invasion party');if(inv.target&&!raidAdjacentInSave(inv.room,inv.target,s.tiles))throw Error('Invalid invasion route')}
 const c=r.combat;if(c){if(!c.exp&&(!inv||!['mc','servant'].includes(c.kind)||!['ally','enemy'].includes(c.turn)||!Number.isInteger(c.turnNumber)||c.turnNumber<1||!finite(c.waitMs,-1000,10000)||!Array.isArray(c.log)||c.log.length>5||c.log.some(x=>typeof x!=='string')||![null,'ally','enemy'].includes(c.winner)||c.kind==='servant'&&!s.collectors.some(n=>n.id===c.defenderId)&&!(s.guards||[]).some(g=>g.id===c.defenderId)))throw Error('Invalid combat');for(const a of [...(c.allies||[c.ally]),c.enemy])if(!a||typeof a.name!=='string'||!Number.isInteger(a.level)||a.level<1||a.level>MAX_LEVEL||!finite(a.maxHp,1,10000)||!finite(a.hp,0,a.maxHp)||!Number.isInteger(a.energy)||a.energy<0||a.energy>10||!finite(a.block,0,100000)||!finite(a.dmgMod,0,100)||!finite(a.skill,0,1)||!Array.isArray(a.hand)||a.hand.length>5||a.hand.some(id=>!CARD_BY_ID[id]))throw Error('Invalid combat actor')}
}
function raidAdjacentInSave(a,b,tiles){const ra=roomFromKey(a,tiles),rb=roomFromKey(b,tiles);return DIRS.some(([dx,dy],d)=>ra.x+dx===rb.x&&ra.y+dy===rb.y&&compatible(ra,rb,d))}

function centerInvader(){const inv=state.invasion.active;if(!inv)return toast('No invasion in progress.');const room=roomFromKey(inv.target||inv.room),cell=$('grid').children[room.y*FIELD_SIZE+room.x],vp=$('viewport'),a=cell.getBoundingClientRect(),b=vp.getBoundingClientRect();vp.scrollLeft+=a.left+a.width/2-b.left-vp.clientWidth/2;vp.scrollTop+=a.top+a.height/2-b.top-vp.clientHeight/2;}

const SERVANT_ATLASES=Array.from({length:5},(_,i)=>'assets/servant-'+i+'-map-v2.webp');
function npcMapAtlas(unit){
 return unit.paladin?'assets/paladin-map-v2.webp':unit.guard||unit.kind==='guard'?'assets/guard-map-v2.webp':SERVANT_ATLASES[unit.look]||SERVANT_ATLASES[0];
}
const SERVANT_ROLES=[{role:'Castle Chef',hp:75,atk:12,skill:.45},{role:'Chamber Maid',hp:75,atk:12,skill:.5},{role:'Head Steward',hp:85,atk:14,skill:.6},{role:'Armory Blacksmith',hp:100,atk:17,skill:.5},{role:'Library Scribe',hp:75,atk:13,skill:.65}];
const SERVANT_NAME_POOL=['Alda','Bram','Cedric','Dara','Edmund','Fenna','Gareth','Hilda','Ivo','Joran','Kelda','Lorcan','Maren','Nell','Osric','Petra','Quill','Rowan','Sela','Tobias','Una','Vesper','Wren','Xander','Yara','Zephyr','Aldric','Brienne','Corin','Delia','Emrys','Fionn','Greta','Hugh','Isolde','Jory','Kit','Lena','Marek','Nessa','Orla','Percy','Rhea','Sorrel','Tamsin','Ulric','Vera','Wilf','Yvaine','Zora'];
const MC_SPRITE_ATLAS='assets/prince-map-hd.webp';

function initEconomy(s){
 if(!s.prince)s.prince={level:1,xp:0};
 initInvasion(s);
 initMC(s);
 if(s.economyVersion===undefined){s.economyVersion=2;s.nextCollectorPrice=75;s.nextCollectorId=2;const throne=s.tiles.find(t=>t.type===0);s.collectors=[makeServant([],1,throne)];for(const room of s.tiles){room.productionMs=0;room.stock={}}}
}
function canHostServant(room){return !!room&&![0,12,13,14,15,17].includes(room.type)}
function makeServant(list,id,room){const used=new Set(list.map(n=>n.name));const free=SERVANT_NAME_POOL.filter(x=>!used.has(x));let name;if(free.length)name=free[Math.floor(Math.random()*free.length)];else{const base=SERVANT_NAME_POOL[Math.floor(Math.random()*SERVANT_NAME_POOL.length)];let i=2;while(used.has(base+' '+i))i++;name=base+' '+i}return {id,name,level:1,xp:0,xpRate:Math.round((.8+Math.random()*.4)*100)/100,look:Math.floor(Math.random()*SERVANT_ROLES.length),home:null,x:room.x+.5,y:room.y+.5,mode:'wander',path:[],waitMs:1000+Math.random()*2500}}
function servantById(id){return state.collectors.find(n=>n.id===id)||null}
function servantRole(n){return SERVANT_ROLES[n.look]||SERVANT_ROLES[0]}
function kitchenBonus(level){level=level||1;return level>=5?4:level>=3?2:1}
function servantCap(s=state){return BASE_SERVANTS+s.tiles.filter(t=>t.type===2).reduce((sum,t)=>sum+kitchenBonus(t.level),0)}
function foodNeed(s=state){return 1+s.collectors.length}
function validateEconomy(s){
 if(s.economyVersion!==2||!Number.isSafeInteger(s.nextCollectorPrice)||s.nextCollectorPrice<75||!Number.isInteger(s.nextCollectorId)||s.nextCollectorId<2||!Array.isArray(s.collectors)||s.collectors.length>324)throw Error('Invalid servants');
 if(!s.prince)s.prince={level:1,xp:0};if(!Number.isInteger(s.prince.level)||s.prince.level<1||s.prince.level>MAX_LEVEL||!Number.isFinite(s.prince.xp)||s.prince.xp<0)throw Error('Invalid prince');for(const n of s.collectors){if(n.level===undefined)n.level=1;if(n.xp===undefined)n.xp=0;if(n.xpRate===undefined)n.xpRate=1;if(!Number.isInteger(n.level)||n.level<1||n.level>MAX_LEVEL||!Number.isFinite(n.xp)||n.xp<0||!Number.isFinite(n.xpRate)||n.xpRate<.5||n.xpRate>1.5)throw Error('Invalid servant level')}
 const ids=new Set,homes=new Set,names=new Set;for(const n of s.collectors){if(!Number.isInteger(n.id)||n.id<1||n.id>=s.nextCollectorId||ids.has(n.id)||typeof n.name!=='string'||!n.name||names.has(n.name)||!Number.isInteger(n.look)||n.look<0||n.look>=SERVANT_ROLES.length||!Number.isFinite(n.x)||!Number.isFinite(n.y)||n.x<.5||n.y<.5||n.x>FIELD_SIZE-.5||n.y>FIELD_SIZE-.5||!['wander','toRoom','working','flee','hiding'].includes(n.mode)||!Array.isArray(n.path)||n.path.length>FIELD_SIZE*FIELD_SIZE||!Number.isFinite(n.waitMs))throw Error('Invalid servant');ids.add(n.id);names.add(n.name);if(n.home!==null){const r=roomFromKey(n.home,s.tiles);if(!r||!canHostServant(r)||homes.has(n.home))throw Error('Invalid assignment');homes.add(n.home)}for(const q of n.path)if(!q||!Number.isInteger(q.x)||!Number.isInteger(q.y)||!s.tiles.some(t=>t.x===q.x&&t.y===q.y))throw Error('Invalid servant path')}
 for(const r of s.tiles){if(r.level===undefined)r.level=1;if(r.trap&&r.trapLevel===undefined)r.trapLevel=1;if(!Number.isInteger(r.level)||r.level<1||r.level>5||r.trap&&(!Number.isInteger(r.trapLevel)||r.trapLevel<1||r.trapLevel>5))throw Error('Invalid upgrade level');if(r.productionMs===undefined)r.productionMs=0;if(r.stock===undefined)r.stock={};if(!Number.isFinite(r.productionMs)||r.productionMs<0||r.productionMs>BATCH_MS||!r.stock||typeof r.stock!=='object'||Array.isArray(r.stock))throw Error('Invalid room production');const batch=batchFor(r,1);if(r.type===2)batch.food=1.2*levelMultiplier(r.level);for(const [k,v]of Object.entries(r.stock))if(!Object.hasOwn(batch,k)||!Number.isFinite(v)||v<0||v>batch[k]+.000001)throw Error('Invalid stockpile')}
}
function guardCapacity(hasServant){return hasServant?1:2}
function roomGuards(room){return state.guards.filter(g=>g.home===roomKey(room))}
function canAssignGuardTo(room,guard){
 return state.tiles.includes(room)&&roomGuards(room).filter(g=>g!==guard).length<guardCapacity(!!roomCollector(room));
}
function canAssignServantTo(room,servant){
 const worker=roomCollector(room);
 return state.tiles.includes(room)&&canHostServant(room)&&(!worker||worker===servant)&&roomGuards(room).length<=guardCapacity(true);
}
function roomCollector(room){return state.collectors.find(n=>n.home===roomKey(room))}
function isKnockedOut(n){return !!state.invasion.active?.knocked.includes(n.id)}
function resourceRoute(x,y,dest){const start=at(Math.floor(x),Math.floor(y));if(!start||!dest)return null;const queue=[start],prev=new Map([[roomKey(start),null]]);while(queue.length){const a=queue.shift();if(a===dest){const path=[];let key=roomKey(a);while(key!==null){const room=roomFromKey(key);path.unshift({x:room.x,y:room.y});key=prev.get(key)}return path.slice(1)}for(let d=0;d<4;d++){const b=at(a.x+DIRS[d][0],a.y+DIRS[d][1]);if(b&&compatible(a,b,d)&&!prev.has(roomKey(b))){prev.set(roomKey(b),roomKey(a));queue.push(b)}}}return null}
function stepServantPath(n,ms){let travel=ms/(n.guard?3200:2400),guard=0;while(travel>0&&n.path.length&&guard++<400){const t=n.path[0],dx=t.x+.5-n.x,dy=t.y+.5-n.y,dist=Math.hypot(dx,dy);if(dist<=travel+.000001){n.x=t.x+.5;n.y=t.y+.5;n.path.shift();if(n.guard&&n.mode==='wander'){n.waitMs=3000;return}travel-=dist}else{n.x+=dx/dist*travel;n.y+=dy/dist*travel;travel=0}}}
function fleeToThrone(n){const throne=state.tiles.find(t=>t.type===0),r=resourceRoute(n.x,n.y,throne);if(r&&r.length){n.path=r;n.mode='flee'}else{n.path=[];n.mode='hiding'}}
function sendServantHome(n){const home=roomFromKey(n.home);if(!home){n.home=null;n.path=[];n.mode='wander';n.waitMs=800;return}const r=resourceRoute(n.x,n.y,home);if(r&&r.length){n.path=r;n.mode='toRoom'}else{if(!r){n.x=home.x+.5;n.y=home.y+.5}n.path=[];n.mode='working'}}
function repathServants(){const throne=state.tiles.find(t=>t.type===0);for(const n of state.collectors){if(!at(Math.floor(n.x),Math.floor(n.y))){n.x=throne.x+.5;n.y=throne.y+.5}n.path=[];if(n.home)sendServantHome(n);else if(state.invasion.active&&!n.guard)fleeToThrone(n);else{n.mode='wander';n.waitMs=500}}for(const g of state.guards||[]){if(!at(Math.floor(g.x),Math.floor(g.y))){g.x=throne.x+.5;g.y=throne.y+.5}g.path=[];if(g.home)sendServantHome(g);else{g.mode='wander';g.waitMs=500}}}
function tickServant(n,ms){
 if(isKnockedOut(n)||unitAway(n))return;
 if(n.guard&&n.mode==='wander'&&n.waitMs>0){n.waitMs=Math.max(0,n.waitMs-ms);return}
 if(n.path.length){stepServantPath(n,ms);if(!n.path.length){if(n.mode==='toRoom')n.mode='working';else if(n.mode==='flee')n.mode='hiding';else if(!n.guard)n.waitMs=1500+Math.random()*3500}return}
 if(n.mode!=='wander')return;
 n.waitMs-=ms;if(n.waitMs>0)return;
 const dest=state.tiles[Math.floor(Math.random()*state.tiles.length)],route=resourceRoute(n.x,n.y,dest);
 if(route&&route.length)n.path=route;else n.waitMs=1500;
}
function autoCollectRoom(room){const worker=roomCollector(room);if(worker)gainXp(worker,1);for(const [k,v]of Object.entries(room.stock||{}))state[k]=roundResource(state[k]+v*SERVANT_BONUS);room.stock={};room.productionMs=0;refreshEconomyUI()}
function simulateEconomy(ms,realMs=ms,goldMs=ms){
 if(state.over)return;
 advanceMC(ms);
 for(const room of state.tiles){const rates=roomRates(room);if(!Object.keys(rates).length)continue;const productionStep=room.type===2?realMs:rates.gold>0?goldMs:ms;const produced=(room.productionMs||0)+productionStep;room.productionMs=produced>=BATCH_MS-.00001?BATCH_MS:produced;if(room.productionMs===BATCH_MS&&!Object.values(room.stock||{}).some(v=>v>0))room.stock=batchFor(room)}
 const throne=state.tiles.find(r=>r.type===0);if(throne&&throne.productionMs===BATCH_MS&&Object.values(throne.stock||{}).some(v=>v>0)){for(const [key,value]of Object.entries(throne.stock))state[key]=roundResource(state[key]+value);throne.stock={};throne.productionMs=0;refreshEconomyUI()}
 for(const room of state.tiles){if(room.type===0||room.productionMs<BATCH_MS||!Object.values(room.stock||{}).some(v=>v>0))continue;const n=roomCollector(room);if(n&&n.mode==='working'&&!isKnockedOut(n))autoCollectRoom(room)}
 for(const n of allUnits())tickServant(n,n.guard?realMs:ms);
}
function collectRoomResource(x,y,key){const room=at(x,y);if(state.over||!room||room.productionMs<BATCH_MS||!(room.stock?.[key]>0))return false;const amount=room.stock[key];window.StrongholdAudio?.play('collect');state[key]=roundResource(state[key]+amount);delete room.stock[key];if(!Object.values(room.stock).some(v=>v>0))room.productionMs=0;note(`${fmt(amount)} ${RESOURCE_INFO[key].name.toLowerCase()} collected.`);fxAt(room,'fx-gain','+'+fmt(amount)+' '+RESOURCE_INFO[key].name.toLowerCase());save();render();return true}
function hireServant(){if(state.over)return false;if(state.collectors.length>=servantCap()){toast('Servant limit reached. Build or upgrade a Kitchen to allow more.');return false}if(state.gold<state.nextCollectorPrice)return false;const cost=state.nextCollectorPrice,throne=state.tiles.find(t=>t.type===0),n=makeServant(state.collectors,state.nextCollectorId++,throne);state.gold=roundResource(state.gold-cost);state.collectors.push(n);if(state.invasion.active)fleeToThrone(n);state.nextCollectorPrice=Math.min(Number.MAX_SAFE_INTEGER,cost*2);note(`${n.name} (${servantRole(n).role}) hired for ${cost} gold. Next hire: ${state.nextCollectorPrice} gold.`);save();render();return true}
async function requestHire(){if(state.over||state.collectors.length>=servantCap()||state.gold<state.nextCollectorPrice)return hireServant();const need=foodNeed()+1,net=income().food-need,days=Math.floor(state.food/need);if(net<0&&days<3&&!await askConfirm('Food is short',`With another servant the keep uses ${need} food per day and produces ${fmt(income().food)}. Food would last about ${days} day${days===1?'':'s'}. Hire anyway?`,'Hire anyway','Cancel'))return false;return hireServant()}
function assignServant(id,room){const n=servantById(id);if(state.over||!n||!canHostServant(room)||isKnockedOut(n))return false;if(!canAssignServantTo(room,n)){toast('A room with a servant can have only one guard. Choose a room with an open servant slot.');return false}n.home=roomKey(room);sendServantHome(n);note(`${n.name} assigned to ${TYPES[room.type][0]}.`);save();render();return true}
function unassignServant(id){const n=servantById(id);if(state.over||!n||n.home===null)return false;const room=roomFromKey(n.home);n.home=null;n.path=[];if(state.invasion.active)fleeToThrone(n);else{n.mode='wander';n.waitMs=800}note(`${n.name} is free to wander${room?' (left '+TYPES[room.type][0]+')':''}.`);save();render();return true}
function servantStatus(n){const home=roomFromKey(n.home);if(isKnockedOut(n))return 'Knocked out until the invasion ends';if(n.mode==='flee'||n.mode==='hiding')return 'Hiding in the throne room';if(home)return (n.mode==='working'?'Working in ':'Walking to ')+TYPES[home.type][0]+' ('+(home.x+1)+', '+(home.y+1)+')';return 'Wandering the keep'}
function refreshEconomyUI(){renderResources();renderSelection();renderRoomViewer();renderResearch();renderCollectorRoster();renderRoster();renderServantDialog()}
function renderCollectorRoster(){const el=$('collectors');el.replaceChildren();const h=document.createElement('h3');h.textContent='Servants';const row=document.createElement('button');row.className='roster-row';const assigned=state.collectors.filter(n=>n.home!==null).length;row.textContent=`${state.collectors.length} of ${servantCap()} servants · ${assigned} assigned · tap to manage`;row.onclick=openRoster;el.append(h,row)}
function openRoster(){if(!$('rosterdialog').open)$('rosterdialog').showModal();renderRoster()}
function portraitStyle(el,look,unit={look}){el.style.backgroundImage='url("'+npcMapAtlas(unit)+'")';el.style.backgroundSize='200% 1600%';el.style.backgroundPosition='0% '+(2/15*100)+'%'}
function renderRoster(){const dlg=$('rosterdialog');if(!dlg||!dlg.open)return;const cap=servantCap(),body=$('roster-body');body.replaceChildren();const info=document.createElement('p');info.className='muted';info.textContent=`${state.collectors.length} of ${cap} servants · Food upkeep ${foodNeed()} per day (prince + servants). Tap a servant to see details or assign a room.`;body.append(info);const hire=document.createElement('button');hire.className='roster-row hire-row';const full=state.collectors.length>=cap;hire.textContent=full?`Servant limit reached (${cap}). Build or upgrade a Kitchen.`:`Hire a servant · ${state.nextCollectorPrice} gold`;hire.disabled=state.over||full||state.gold<state.nextCollectorPrice;hire.onclick=()=>requestHire();body.append(hire);for(const n of state.collectors){const row=document.createElement('button');row.className='roster-row servant-row';const art=document.createElement('span');art.className='portrait';portraitStyle(art,n.look,n);const text=document.createElement('span');const nm=document.createElement('strong');nm.textContent=n.name+' · '+servantRole(n).role+' · Lv '+n.level;const st=document.createElement('small');st.textContent=servantStatus(n)+(state.hungryDays>0?' · Hungry':'');text.append(nm,st);row.append(art,text);row.onclick=()=>openServantDialog(n.id);body.append(row)}}
let servantDialogId=null;
function openServantDialog(id){if(!unitById(id))return;servantDialogId=id;if(!$('servantdialog').open)$('servantdialog').showModal();renderServantDialog()}
function renderServantDialog(){
 const dlg=$('servantdialog');if(!dlg?.open)return;
 const n=unitById(servantDialogId);if(!n){dlg.close();return}
 const guard=!!n.guard,level=guard?guardLevel():n.level,home=roomFromKey(n.home),blocked=state.over||unitAway(n)||isKnockedOut(n)||!!state.invasion.active;
 $('servant-name').textContent=n.name;$('servant-role').textContent=guard?(n.paladin?'Paladin':'Guard'):servantRole(n).role;
 portraitStyle($('servant-art'),n.look,n);
 $('servant-stats').textContent='Level '+level+' · Health '+Math.round(hpForLevel(level)*(n.paladin?1.05:1))+(guard?'':' · Experience '+Math.floor(n.xp));
 $('servant-status').textContent=guard?(home?'Posted in '+TYPES[home.type][0]:'Roaming the keep'):servantStatus(n);
 const box=$('servant-actions');box.replaceChildren();
 function button(label,action,disabled=false){const row=document.createElement('button');row.className='roster-row';row.textContent=label;row.disabled=disabled;row.onclick=action;box.append(row)}
 if(home)button('Unassign and let wander',()=>guard?unassignGuard(n.id):unassignServant(n.id),blocked);
 button('Show on map',()=>{dlg.close();if($('rosterdialog').open)$('rosterdialog').close();centerTile(Math.floor(n.x),Math.floor(n.y))});
 const title=document.createElement('h3');title.textContent=home?'Move to another room':'Assign to a room';box.append(title);
 const rooms=state.tiles.filter(room=>room!==home&&(guard?canAssignGuardTo(room,n):canAssignServantTo(room,n)));
 if(!rooms.length){const info=document.createElement('p');info.textContent='No rooms have a free '+(guard?'guard':'servant')+' slot.';box.append(info)}
 for(const room of rooms)button(TYPES[room.type][0]+' · ('+(room.x+1)+', '+(room.y+1)+')',()=>guard?assignGuard(n.id,room):assignServant(n.id,room),blocked);
}
function centerTile(x,y){const cell=$('grid').children[y*FIELD_SIZE+x],vp=$('viewport');if(!cell)return;const a=cell.getBoundingClientRect(),b=vp.getBoundingClientRect();vp.scrollLeft+=a.left+a.width/2-b.left-vp.clientWidth/2;vp.scrollTop+=a.top+a.height/2-b.top-vp.clientHeight/2}
function renderRoomServant(room,target){if(!canHostServant(room))return;const box=document.createElement('section');box.className='room-servant';const h=document.createElement('h3');h.textContent='Servant';box.append(h);const cur=roomCollector(room);if(cur){const p=document.createElement('p');p.className='muted';p.textContent=`${cur.name} (${servantRole(cur).role}) works here.`+(Object.keys(roomRates(room)).length?` Collects this room’s batch automatically with a +${Math.round((SERVANT_BONUS-1)*100)}% bonus.`:' This room has no production yet.');box.append(p);const open=document.createElement('button');open.className='roster-row';open.textContent='Open '+cur.name;open.onclick=()=>openServantDialog(cur.id);const rem=document.createElement('button');rem.className='roster-row';rem.textContent='Remove from this room · let wander';rem.disabled=state.over;rem.onclick=()=>unassignServant(cur.id);box.append(open,rem)}else{const p=document.createElement('p');p.className='muted';p.textContent=state.collectors.length?'Tap a servant to assign them to this room.':'No servants. Hire one from the servants list.';box.append(p);for(const n of state.collectors){const row=document.createElement('button');row.className='roster-row servant-row';const art=document.createElement('span');art.className='portrait';portraitStyle(art,n.look,n);const text=document.createElement('span'),nm=document.createElement('strong'),st=document.createElement('small');nm.textContent=n.name+' · '+servantRole(n).role+' · Lv '+n.level;st.textContent=servantStatus(n);text.append(nm,st);row.append(art,text);row.disabled=state.over||isKnockedOut(n);row.onclick=()=>assignServant(n.id,room);box.append(row)}}target.append(box)}
function renderRoomEconomy(room,target){const rates=roomRates(room),box=document.createElement('section');box.className='room-economy';if(Object.keys(rates).length){const h=document.createElement('h3');h.textContent='Resources & collection';box.append(h);const p=document.createElement('p');p.className='muted';p.textContent='One-minute batch: '+Object.entries(batchFor(room)).map(([k,v])=>fmt(v)+' '+RESOURCE_INFO[k].name).join(' + ')+'. Uncollected batches do not stack.';box.append(p);for(const [key,value]of Object.entries(room.stock||{})){if(value<=0)continue;const b=document.createElement('button');b.textContent=`Collect ${RESOURCE_INFO[key].icon} ${fmt(value)} ${RESOURCE_INFO[key].name}`;b.disabled=state.over;b.onclick=()=>collectRoomResource(room.x,room.y,key);box.append(b)}if(room.type===0){const mc=document.createElement('p');mc.className='muted';mc.textContent='The prince automatically collects this room’s gold and stone every minute. No servant needed.';box.append(mc)}target.append(box)}renderRoomServant(room,target);if(window.renderRoomGuard)renderRoomGuard(room,target)}
function ensureEconomyLayers(){renderMC();renderInvader();renderBattle();const grid=$('grid');if(!$('map-boundary')){const edge=document.createElement('div');edge.id='map-boundary';edge.setAttribute('aria-hidden','true');grid.append(edge)}if(!$('resource-layer')){const layer=document.createElement('div');layer.id='resource-layer';grid.append(layer);resourceIconSignature=''}if(!$('npc-layer')){const layer=document.createElement('div');layer.id='npc-layer';grid.append(layer)}}
function renderWorldEconomy(){
 if(!state?.collectors)return;ensureEconomyLayers();const layer=$('resource-layer'),signature=JSON.stringify(state.tiles.filter(t=>Object.values(t.stock||{}).some(v=>v>0)).map(t=>[t.x,t.y,t.stock]));
 if(signature!==resourceIconSignature){layer.replaceChildren();for(const room of state.tiles){let offset=0;for(const [key,amount]of Object.entries(room.stock||{})){if(!(amount>0))continue;const b=document.createElement('button');b.className='resource-pickup';b.setAttribute('aria-label',`Collect ${RESOURCE_INFO[key].name} at ${room.x+1}, ${room.y+1}`);b.style.left=`calc((${room.x} + .5)*var(--size) - 30px)`;b.style.top=`calc((${room.y} + .18)*var(--size) + ${offset*39}px)`;b.textContent=RESOURCE_INFO[key].icon+' '+fmt(amount);b.disabled=state.over;b.onclick=e=>{e.stopPropagation();collectRoomResource(room.x,room.y,key)};b.ondblclick=e=>e.stopPropagation();layer.append(b);offset++}}resourceIconSignature=signature;if(selected){renderSelection();renderRoomViewer()}}
 const npcLayer=$('npc-layer');for(const old of [...npcLayer.children])if(!allUnits().some(n=>'collector-'+n.id===old.id&&!unitAway(n)))old.remove();for(const n of allUnits()){if(unitAway(n))continue;let actor=$('collector-'+n.id);if(!actor){actor=document.createElement('div');actor.id='collector-'+n.id;actor.className='collector-sprite'+(n.guard?' guard':'');actor.innerHTML='<span class="servant-art"></span>';const art=actor.querySelector('.servant-art');art.style.backgroundImage='url("'+npcMapAtlas(n)+'")';art.style.backgroundSize='200% 1600%';actor.setAttribute('role','button');actor.tabIndex=0;actor.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();if(!awaitingResume)openServantDialog(n.id)}};actor.onclick=e=>{e.stopPropagation();if(Date.now()>=suppressClickUntil&&!awaitingResume){openServantDialog(n.id)}};npcLayer.append(actor)}actor.title=n.guard?n.name+' · Guard':n.name+' · '+servantRole(n).role+' (tap for details)';actor.setAttribute('aria-label',actor.title);actor.style.display='';const walking=n.path.length>0&&!(n.guard&&n.mode==='wander'&&n.waitMs>0);const destination=walking?n.path[0]:null;if(destination)actor.dataset.facing=String(mcFacing(destination.x+.5-n.x,destination.y+.5-n.y));const parked=!n.path.length&&n.mode!=='working',offset=parked?((allUnits().indexOf(n)%5)-2)*.05:0;actor.style.left=`calc(${n.x+offset}*var(--size))`;actor.style.top=`calc(${n.y+(n.mode==='working'?.22:.1)}*var(--size))`;actor.classList.toggle('knocked-out',isKnockedOut(n));actor.classList.toggle('hungry',state.hungryDays>0&&!n.guard);actor.classList.toggle('walking',walking)}
}
function animateServants(now){if(!state?.collectors)return;for(const n of allUnits()){const actor=$('collector-'+n.id);if(!actor)continue;const sprite=actor.querySelector('.servant-art');if(!sprite)continue;const walking=actor.classList.contains('walking')&&!state.over,direction=Number(actor.dataset.facing||1),row=direction*2+(walking?1:0),frame=Math.floor(now/250)%8;sprite.style.backgroundPosition=`${frame%2*100}% ${row/15*100}%`;const working=n.mode==='working'&&!n.path.length&&!state.over&&!isKnockedOut(n)&&!n.guard;actor.classList.toggle('working',working);let tool=actor.querySelector('.servant-tool');if(working&&!tool){tool=document.createElement('span');tool.className='servant-tool';tool.textContent='⚒';actor.append(tool)}else if(!working&&tool)tool.remove()}}

function initMC(s){if(s.mc===undefined)s.mc={u:.5,v:.63,targetU:.5,targetV:.63,waitMs:900,direction:1,moving:false};}
function validateMC(s){const m=s.mc;if(!m||typeof m!=='object'||![m.u,m.v,m.targetU,m.targetV,m.waitMs].every(Number.isFinite)||m.u<.36||m.u>.64||m.v<.5||m.v>.7||m.targetU<.36||m.targetU>.64||m.targetV<.5||m.targetV>.7||m.waitMs<0||m.waitMs>10000||!Number.isInteger(m.direction)||m.direction<0||m.direction>7||typeof m.moving!=='boolean')throw Error('Invalid throne-room MC state')}
function mcFloorPoint(u,v,rot){const a=rot*Math.PI/2,c=Math.cos(a),sn=Math.sin(a);return {u:.5+(u-.5)*c-(v-.5)*sn,v:.5+(u-.5)*sn+(v-.5)*c}}
function mcFacing(dx,dy){const vectors=[[-.581,.473],[.164,.575],[.813,.338],[.986,-.102],[.581,-.473],[-.164,-.575],[-.813,-.338],[-.986,.102]];let best=1,score=-Infinity;vectors.forEach(([x,y],i)=>{const n=(dx*x+dy*y)/Math.hypot(x,y);if(n>score){score=n;best=i}});return best}
function advanceMC(ms){
 if(!state.mc)initMC(state);const m=state.mc;if(state.over){m.moving=false;return}if(m.waitMs>0){m.waitMs=Math.max(0,m.waitMs-ms);m.moving=false;return}
 let dx=m.targetU-m.u,dy=m.targetV-m.v,dist=Math.hypot(dx,dy);
 if(dist<.002){m.moving=false;m.waitMs=900+Math.random()*1700;for(let i=0;i<12;i++){m.targetU=.36+Math.random()*.28;m.targetV=.5+Math.random()*.2;if(Math.hypot(m.targetU-m.u,m.targetV-m.v)>.07)break}return}
 const step=Math.min(dist,ms*.000065);m.u=Math.max(.36,Math.min(.64,m.u+dx/dist*step));m.v=Math.max(.5,Math.min(.7,m.v+dy/dist*step));m.moving=true;
 const room=state.tiles.find(t=>t.type===0),a=room.rot*Math.PI/2;m.direction=mcFacing(dx*Math.cos(a)-dy*Math.sin(a),dx*Math.sin(a)+dy*Math.cos(a));
}
function mcActor(container,id){let actor=document.getElementById(id);if(!actor){actor=document.createElement('div');actor.id=id;actor.className='mc-sprite';actor.setAttribute('aria-hidden','true');actor.style.backgroundImage='url("'+MC_SPRITE_ATLAS+'")';container.append(actor)}return actor}
function renderMC(){
 if(!state?.mc)return;const room=state.tiles.find(t=>t.type===0);if(!room)return;let layer=document.getElementById('mc-room');if(!layer){layer=document.createElement('div');layer.id='mc-room';layer.setAttribute('aria-label','Main character assigned to the throne room');$('grid').append(layer)}
 layer.style.left=`calc(var(--field-pad-x, 0px) + ${room.x}*var(--size))`;layer.style.top=`calc(var(--field-pad-y, 0px) + ${room.y}*var(--size))`;
 const p=mcFloorPoint(state.mc.u,state.mc.v,room.rot),actor=mcActor(layer,'main-character');actor.style.left=(p.u*100)+'%';actor.style.top=(p.v*100)+'%';layer.setAttribute('data-room',roomKey(room));
 const detail=$('room-mc');if(detail){detail.style.display=viewedRoom&&viewedRoom.x===room.x&&viewedRoom.y===room.y?'block':'none';if(detail.style.display==='block'){const zoomed=mcActor(detail,'main-character-detail');zoomed.style.left=p.u*100+'%';zoomed.style.top=p.v*100+'%'}}
}
function animateMC(now){animateServants(now);if(state?.mc){const m=state.mc,walking=m.moving&&!state.over,row=m.direction*2+(walking?1:0),frame=Math.floor(now/(walking?125:250))%8;for(const id of ['main-character','main-character-detail']){const el=$(id);if(el)el.style.backgroundPosition=`${frame/7*100}% ${row/15*100}%`}}requestAnimationFrame(animateMC)}
