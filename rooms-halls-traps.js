const TILE_ART=["assets/225d8567b5dac4c82362.png", "assets/5616cde8557072084971.png", "assets/824d68f062dab294a1b2.png", "assets/bd6ea3249aee9f851c93.png", "assets/a61f3bd65a9110e33736.png", "assets/8f5639b7c40db69bacbf.png", "assets/744c109ce954d087bb4a.png", "assets/12dc8ebcd0938a49c9df.png", "assets/a0b59ddb9d0bc72869bd.png", "assets/d50a99bbbe69090b5dcb.png", "assets/090dc4a86cad34b10194.png", "assets/f40a2fc5937d24eb4dd3.png", "assets/9c0d8f456ec95bd50a5f.png", "assets/3f8a2452bce8957b1cfb.png", "assets/2603f66f08ab337323e2.png", "assets/ad1b0d9f04c3ef563003.png", "assets/ccb42ff288667d7b1979.png", "assets/b6f73a3ffd724e2a1337.png", "assets/c78c976783b3c352a479.png", "assets/c9cc8504e9aa089f19bb.png"];
const TYPES=[
['Throne Room',0,0,0,[],'The heart of your keep. Produces 20 gold and 12 stone daily.'],
['Barracks',50,25,0,[],'Quarters for soldiers. No effect yet; its role is being redesigned.'],
['Kitchen',40,20,0,[],'Produces 0.5 food every 60 real seconds. Allows more servants: Level 1 adds 1, Level 3 adds 2 in total, Level 5 adds 4 in total.'],
['Armory',65,35,0,[1],'Produces 10 stone daily.'],
['War Room',75,35,0,[1],'Tactical planning room. No effect yet; its role is being redesigned.'],
['Library',60,30,0,[],'Produces 5 research points daily.'],
['Chapel',65,35,0,[2],'A place of healing. No effect yet; its role is being redesigned.'],
['Monster Lair',85,40,0,[11],'Home of monstrous guardians. No effect yet; its role is being redesigned.'],
['Puzzle Room',80,45,0,[5,11],'Arcane puzzles. No effect yet; its role is being redesigned.'],
['Arcane Lab',100,50,0,[5,6],'Magical wards. No effect yet; its role is being redesigned.'],
['Vault',90,45,0,[3,4],'Produces 35 gold daily.'],
['Trap Room',45,25,0,[],'Deadly defenses. No effect yet; its role is being redesigned.'],
['Straight Hall',10,5,0,[],'Connects north and south.'],
['Turn Hall',10,5,0,[],'Connects north and east.'],
['T Junction',15,8,0,[],'Connects north, east, and west.'],
['Crossroads',20,10,0,[],'Connects all four directions.'],
['Empty Room',20,10,0,[],'A spacious chamber. Install one trap style, or leave it clear to receive the throne. A servant can be assigned here.'],
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
const TRAP_ART={
 spikes:`<ellipse cx="50" cy="73" rx="31" ry="11" fill="#08060a" opacity=".7"/>
 <path d="m21 63 23-11 35 8v10L54 82 21 74Z" fill="#2d272d" stroke="#16131b" stroke-width="2"/>
 <path d="m21 63 23-11 35 8-25 13Z" fill="#66636b" stroke="#98949a" stroke-width="1.3"/>
 <path d="M28 64 35 39 40 65Zm14-4 7-29 6 31Zm14 6 8-28 5 26Zm-12 4 5-21 8 20Z" fill="#c0c2ca" stroke="#454653" stroke-width="1.4"/>
 <path d="m35 39 1 22 4 4Zm14-8 1 26 5 5Zm15 7-2 22 7 4Z" fill="#7b8994"/>`,
 gas:`<ellipse cx="51" cy="75" rx="31" ry="10" fill="#08060a" opacity=".7"/>
 <path d="m22 67 27-13 31 9v8L54 83l-32-9Z" fill="#443e3d" stroke="#211c20" stroke-width="2"/>
 <path d="m22 67 27-13 31 9-26 13Z" fill="#686258" stroke="#a69b82" stroke-width="1.3"/>
 <path d="m32 65 19-8m-10 12 20-9m-10 12 20-9" stroke="#201b1d" stroke-width="3"/>
 <path d="M40 58c-11-4-7-11 1-11-9-6-4-13 4-15-3-7 5-12 12-8 5 4 3 9 0 13 10-2 16 6 11 11-3 4-10 6-15 7Z" fill="#80ba65" opacity=".6"/>
 <path d="M50 55c-5-4-2-7 3-10s8-7 5-11" fill="none" stroke="#b9e099" stroke-width="2.5" opacity=".7"/>`,
 flame:`<ellipse cx="51" cy="76" rx="28" ry="8" fill="#08060a" opacity=".7"/>
 <path d="M26 66h47l-7 11H32Z" fill="#562e24" stroke="#291917" stroke-width="2"/>
 <path d="M34 69v7m16-7v9m15-9v7" stroke="#b47243" stroke-width="2"/>
 <ellipse cx="50" cy="64" rx="25" ry="8" fill="#262027" stroke="#aa7650" stroke-width="2"/>
 <path d="M39 64c-12-11 6-18 4-31 8 4 11 9 10 15 7-4 9-10 8-15 13 15 14 27 1 32Z" fill="#c64e25"/>
 <path d="M46 65c-6-7 2-12 5-20 3 5 5 7 4 11 4-3 7-4 8-8 5 10 0 15-4 18Z" fill="#ffac43"/>
 <path d="M51 65c-2-3 2-7 4-10 4 5 5 7 2 10Z" fill="#ffe0a2"/>`,
 acid:`<ellipse cx="49" cy="77" rx="31" ry="9" fill="#08060a" opacity=".72"/>
 <path d="M25 71 61 61l18 10-32 12Z" fill="#719331" opacity=".73"/>
 <path d="M32 69V41l12-6h20l8 6v19l-9 9Z" fill="#62644a" stroke="#272b1b" stroke-width="2"/>
 <path d="m32 41 14-7h18l-10 7Z" fill="#a0a471" stroke="#3b3f29" stroke-width="1.5"/>
 <path d="M39 41v26m7-26v24m7-24v26m8-27v23" stroke="#393f2d" stroke-width="1.4"/>
 <path d="m31 49 32-1 9-6m-41 15 32-1 9-6" fill="none" stroke="#9a9871" stroke-width="2"/>
 <path d="M72 52h7v3l-4 2h-3Z" fill="#bcc36c" stroke="#474c29"/>
 <path d="M78 59c0 4 4 6 2 9-2 2-5 1-5-1 0-2 2-4 3-8Z" fill="#c3eb71"/>`,
};

function baseRoomRates(room){switch(room.type){case 0:return {gold:20,stone:12};case 2:return {food:5};case 3:return {stone:10};case 5:return {rp:5};case 10:return {gold:35};case 18:return {gold:25};case 19:return {rp:10};default:return {}}}

function levelMultiplier(level){return 1+((level||1)-1)*.25}
function roomRates(room){return Object.fromEntries(Object.entries(baseRoomRates(room)).map(([k,v])=>[k,v*(room.type===2?1:levelMultiplier(room.level))]))}
function prereqsMet(type,tiles=state.tiles){return TYPES[type][4].every(r=>tiles.some(t=>t.type===r))}
function prereqNames(type){return TYPES[type][4].map(r=>TYPES[r][0]).join(' and ')}
function trapStrength(room){return room.trap?TRAPS[room.trap].strength*levelMultiplier(room.trapLevel):0}
function resourceUpgradeCost(room){const level=room.level||1;return {gold:Math.ceil((TYPES[room.type][1]||100)*.5*level),stone:Math.ceil((TYPES[room.type][2]||50)*.5*level)}}
function upgradeResourceRoom(room){if(state.over||!state.tiles.includes(room)||!Object.keys(roomRates(room)).length||(room.level||1)>=5)return false;const cost=resourceUpgradeCost(room);if(state.gold<cost.gold||state.stone<cost.stone)return false;state.gold-=cost.gold;state.stone-=cost.stone;room.level=(room.level||1)+1;note(`${TYPES[room.type][0]} upgraded to Level ${room.level}.`);save();render();return true}
function trapUpgradeCost(room){return Math.ceil(TRAPS[room.trap].price*.5*(room.trapLevel||1))}
function upgradeTrap(room){if(state.over||!state.tiles.includes(room)||room.type!==16||!room.trap||(room.trapLevel||1)>=5)return false;const cost=trapUpgradeCost(room);if(state.gold<cost)return false;state.gold-=cost;room.trapLevel=(room.trapLevel||1)+1;note(`${TRAPS[room.trap].name} upgraded to Level ${room.trapLevel}.`);save();render();return true}
function renderResourceUpgrade(room,target){if(!Object.keys(roomRates(room)).length)return;const section=document.createElement('section'),p=document.createElement('p'),b=document.createElement('button');p.textContent=`Resource room · Level ${room.level||1} / 5`+(room.type===2?` · Allows ${kitchenBonus(room.level)} servant${kitchenBonus(room.level)===1?'':'s'} · 0.5 food per 60 real seconds`:` · +${((room.level||1)-1)*25}% production`);section.append(p);const cost=resourceUpgradeCost(room);b.textContent=(room.level||1)>=5?'Maximum level reached':`Upgrade to Level ${(room.level||1)+1} · ${cost.gold} gold + ${cost.stone} stone`;b.disabled=state.over||(room.level||1)>=5||state.gold<cost.gold||state.stone<cost.stone;b.onclick=()=>upgradeResourceRoom(room);section.append(b);target.append(section)}

function batchFor(room,day=state.day){return Object.fromEntries(Object.entries(roomRates(room)).map(([k,v])=>[k,v*BATCH_MS/DAY_MS*(k==='gold'&&day<=3?2:1)]))}
