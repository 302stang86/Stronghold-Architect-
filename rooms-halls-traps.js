const TILE_ART=["assets/225d8567b5dac4c82362.png", "assets/5616cde8557072084971.png", "assets/824d68f062dab294a1b2.png", "assets/bd6ea3249aee9f851c93.png", "assets/a61f3bd65a9110e33736.png", "assets/8f5639b7c40db69bacbf.png", "assets/744c109ce954d087bb4a.png", "assets/12dc8ebcd0938a49c9df.png", "assets/a0b59ddb9d0bc72869bd.png", "assets/d50a99bbbe69090b5dcb.png", "assets/090dc4a86cad34b10194.png", "assets/f40a2fc5937d24eb4dd3.png", "assets/9c0d8f456ec95bd50a5f.png", "assets/3f8a2452bce8957b1cfb.png", "assets/2603f66f08ab337323e2.png", "assets/ad1b0d9f04c3ef563003.png", "assets/ccb42ff288667d7b1979.png", "assets/b6f73a3ffd724e2a1337.png", "assets/c78c976783b3c352a479.png", "assets/c9cc8504e9aa089f19bb.png"];
const TYPES=[
['Throne Room',0,0,0,[],'The heart of your keep. Produces 20 gold and 12 stone daily.'],
['Barracks',50,25,0,[],'Recruit guards. Each Barracks level unlocks one slot, up to five.'],
['Kitchen',40,20,0,[],'Produces 0.5 food every 60 real seconds. Allows more servants: Level 1 adds 1, Level 3 adds 2 in total, Level 5 adds 4 in total.'],
['Armory',65,35,0,[1],'Produces 10 stone daily and adds opening block equal to 3% of max HP per room level for the prince and guards.'],
['War Room',75,35,0,[1,3],'Adds 3% attack damage per room level for the prince and guards.'],
['Library',60,30,0,[],'Produces 5 research points daily. Research Monster Lair, Puzzle Room, and Arcane Lab here.'],
['Chapel',65,35,0,[2],'Recruit one Paladin per Chapel, armed with a long bastard sword.'],
['Monster Lair',85,40,0,[5,11],'Research and recruit monster companions. Up to three Lairs.'],
['Puzzle Room',80,45,0,[5,11],'Open optional treasure doors in rival keeps and dungeons. One per keep.'],
['Arcane Lab',100,50,0,[5],'Craft single-use runes. Upgrade the Lab to unlock more recipes.'],
['Vault',90,45,0,[3,4],'Produces 35 gold daily.'],
['Trap Room',45,25,0,[],'Your trap workshop. Build at least one Trap Room to install or upgrade traps in Empty Rooms. Traps trigger in the room where they are installed.'],
['Straight Hall',0,5,0,[],'Connects north and south.'],
['Turn Hall',0,5,0,[],'Connects north and east.'],
['T Junction',0,8,0,[],'Connects north, east, and west.'],
['Crossroads',0,10,0,[],'Connects all four directions.'],
['Empty Room',20,10,0,[],'Assign a servant, leave this room clear for the throne, or install one trap after building a Trap Room.'],
['Entrance',0,0,0,[],'Castle gate at the southern edge. Build only inward above it; the immediate left, right, and below are reserved. Cannot be duplicated, rotated, or demolished.'],
['Gold Mine',60,30,0,[],'Produces 25 gold daily.'],
['Research Room',60,30,0,[],'Produces 10 research points daily. Spend them to permanently unlock room blueprints.']
];

const TRAPS={
 spikes:{name:'Spiked Traps',price:50,strength:10,color:'#c7d1d8'},
 gas:{name:'Gas Traps',price:100,strength:20,color:'#83cf8e'},
 flame:{name:'Flame Traps',price:175,strength:35,color:'#ff9c5b'},
 acid:{name:'Acid Rain Traps',price:275,strength:55,color:'#d5e874'}
};
const KEEP_ROOM_ART_DIR='assets/keep-rooms/';
const KEEP_ROOM_ART={prison:'room_prisoner_poles.webp',stairs:'room_dungeon_stairs.webp'};
const triggeredTrapArt=new WeakMap();
const trapImageRooms=new WeakMap();
const preloadedTrapArt=new Map();

function trapRoomArt(id,active){
 const variant=active?(id==='acid'?'_1':''):'_inactive';
 return KEEP_ROOM_ART_DIR+'room_trap_'+id+variant+'.webp';
}

function setRoomImage(image,room,fallback){
 const trap=room.trap;
 if(!Object.hasOwn(TRAPS,trap)){
  trapImageRooms.delete(image);
  delete image.dataset.trapArt;
  image.src=KEEP_ROOM_ART[room.keepUse]?KEEP_ROOM_ART_DIR+KEEP_ROOM_ART[room.keepUse]:fallback;
  return;
 }
 const activeSrc=trapRoomArt(trap,true);
 if(!preloadedTrapArt.has(trap)){
  const preload=new Image();
  preload.src=activeSrc;
  preloadedTrapArt.set(trap,preload);
 }
 trapImageRooms.set(image,room);
 image.dataset.trapArt=trap;
 image.src=trapRoomArt(trap,triggeredTrapArt.has(room));
}

function showTriggeredTrap(room){
 const update=active=>{
  for(const image of document.querySelectorAll('img[data-trap-art]')){
   if(trapImageRooms.get(image)===room)image.src=trapRoomArt(image.dataset.trapArt,active);
  }
 };
 clearTimeout(triggeredTrapArt.get(room));
 const timer=setTimeout(()=>{
  triggeredTrapArt.delete(room);
  update(false);
 },1400);
 triggeredTrapArt.set(room,timer);
 update(true);
}

function baseRoomRates(room){switch(room.type){case 0:return {gold:20,stone:12};case 2:return {food:5};case 3:return {stone:10};case 5:return {rp:5};case 10:return {gold:35};case 18:return {gold:25};case 19:return {rp:10};default:return {}}}

function levelMultiplier(level){return 1+((level||1)-1)*.25}
function roomRates(room){return Object.fromEntries(Object.entries(baseRoomRates(room)).map(([k,v])=>[k,v*(room.type===2?1:levelMultiplier(room.level))]))}
function prereqsMet(type,tiles=state.tiles){return TYPES[type][4].every(r=>tiles.some(t=>t.type===r))}
function prereqNames(type){return TYPES[type][4].map(r=>TYPES[r][0]).join(' and ')}
function trapStrength(room){return room.trap?TRAPS[room.trap].strength*levelMultiplier(room.trapLevel):0}
function resourceUpgradeCost(room){const level=room.level||1;return {gold:Math.ceil((TYPES[room.type][1]||100)*.5*level),stone:Math.ceil((TYPES[room.type][2]||50)*.5*level)}}
function canUpgradeRoom(room){return [1,4].includes(room.type)||Object.keys(roomRates(room)).length>0}
function roomCombatBonus(type){return state.tiles.reduce((total,room)=>total+(room.type===type?(room.level||1)*.03:0),0)}
function upgradeResourceRoom(room){if(state.over||!state.tiles.includes(room)||!canUpgradeRoom(room)||(room.level||1)>=5)return false;const cost=resourceUpgradeCost(room);if(state.gold<cost.gold||state.stone<cost.stone)return false;state.gold-=cost.gold;state.stone-=cost.stone;room.level=(room.level||1)+1;window.StrongholdAudio?.play('upgrade');note(`${TYPES[room.type][0]} upgraded to Level ${room.level}.`);save();render();return true}
function trapUpgradeCost(room){return Math.ceil(TRAPS[room.trap].price*.5*(room.trapLevel||1))}
function hasTrapWorkshop(){return state.tiles.some(room=>room.type===11)}
function upgradeTrap(room){if(state.over||!state.tiles.includes(room)||room.type!==16||!room.trap||(room.trapLevel||1)>=5||!hasTrapWorkshop())return false;const cost=trapUpgradeCost(room);if(state.gold<cost)return false;state.gold-=cost;room.trapLevel=(room.trapLevel||1)+1;window.StrongholdAudio?.play('upgrade');note(`${TRAPS[room.trap].name} upgraded to Level ${room.trapLevel}.`);save();render();return true}
function renderResourceUpgrade(room,target){if(!canUpgradeRoom(room))return;const section=document.createElement('section'),p=document.createElement('p'),b=document.createElement('button');p.textContent=`Room · Level ${room.level||1} / 5`+(room.type===2?` · Allows ${kitchenBonus(room.level)} servant${kitchenBonus(room.level)===1?'':'s'} · 0.5 food per 60 real seconds`:room.type===1?` · ${room.level||1} guard slots`:room.type===4?` · +${(room.level||1)*3}% attack damage`:` · +${((room.level||1)-1)*25}% production`);section.append(p);const cost=resourceUpgradeCost(room);b.textContent=(room.level||1)>=5?'Maximum level reached':`Upgrade to Level ${(room.level||1)+1} · ${cost.gold} gold + ${cost.stone} stone`;b.disabled=state.over||(room.level||1)>=5||state.gold<cost.gold||state.stone<cost.stone;b.onclick=()=>upgradeResourceRoom(room);section.append(b);target.append(section)}

function batchFor(room,day=state.day){return Object.fromEntries(Object.entries(roomRates(room)).map(([k,v])=>[k,v*BATCH_MS/DAY_MS*(k==='gold'&&day<=3?2:1)]))}
