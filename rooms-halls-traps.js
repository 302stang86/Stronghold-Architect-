const TILE_ART=["assets/225d8567b5dac4c82362.png", "assets/5616cde8557072084971.png", "assets/824d68f062dab294a1b2.png", "assets/bd6ea3249aee9f851c93.png", "assets/a61f3bd65a9110e33736.png", "assets/8f5639b7c40db69bacbf.png", "assets/744c109ce954d087bb4a.png", "assets/12dc8ebcd0938a49c9df.png", "assets/a0b59ddb9d0bc72869bd.png", "assets/d50a99bbbe69090b5dcb.png", "assets/090dc4a86cad34b10194.png", "assets/f40a2fc5937d24eb4dd3.png", "assets/9c0d8f456ec95bd50a5f.png", "assets/3f8a2452bce8957b1cfb.png", "assets/2603f66f08ab337323e2.png", "assets/ad1b0d9f04c3ef563003.png", "assets/ccb42ff288667d7b1979.png", "assets/b6f73a3ffd724e2a1337.png", "assets/c78c976783b3c352a479.png", "assets/c9cc8504e9aa089f19bb.png"];
const TYPES=[
['Throne Room',0,0,10,[],'The heart of your keep. Produces 20 gold and 12 stone daily.'],
['Barracks',50,25,18,[],'Soldiers add 18 defense.'],
['Kitchen',40,20,2,[],'Produces 12 food daily.'],
['Armory',65,35,14,[1],'Produces 10 stone daily and adds 14 defense.'],
['War Room',75,35,20,[1],'Adds 20 defense through tactical planning.'],
['Library',60,30,4,[],'Adds 4 defense and 5 research points daily.'],
['Chapel',65,35,8,[2],'Restores 5 keep health daily.'],
['Monster Lair',85,40,28,[11],'Monstrous guardians add 28 defense.'],
['Puzzle Room',80,45,24,[5,11],'Arcane puzzles add 24 defense.'],
['Arcane Lab',100,50,35,[5,6],'Magical wards add 35 defense.'],
['Vault',90,45,5,[3,4],'Produces 35 gold daily.'],
['Trap Room',45,25,22,[],'Deadly defenses add 22 defense.'],
['Straight Hall',10,5,1,[],'Connects north and south.'],
['Turn Hall',10,5,1,[],'Connects north and east.'],
['T Junction',15,8,2,[],'Connects north, east, and west.'],
['Crossroads',20,10,2,[],'Connects all four directions.'],
['Empty Room',20,10,0,[],'A spacious chamber. Install one trap style, or leave it clear to receive the throne.'],
['Entrance',0,0,5,[],'Castle gate at the southern edge. Build only inward above it; the immediate left, right, and below are reserved. Cannot be duplicated, rotated, or demolished.'],
['Gold Mine',60,30,2,[],'Produces 25 additional gold daily.'],
['Research Room',60,30,0,[],'Produces 10 research points daily. Spend them to permanently unlock room blueprints.']
];

const TRAPS={
 spikes:{name:'Spiked Traps',price:50,strength:10,color:'#c7d1d8'},
 gas:{name:'Gas Traps',price:100,strength:20,color:'#83cf8e'},
 flame:{name:'Flame Traps',price:175,strength:35,color:'#ff9c5b'},
 acid:{name:'Acid Rain Traps',price:275,strength:55,color:'#d5e874'}
};
const TRAP_ART={
 spikes:'<g fill="#bbc6cd" stroke="#30383c" stroke-width="1.4"><path d="M18 33 L23 16 L28 33Z M32 33 L37 16 L42 33Z M58 33 L63 16 L68 33Z M72 33 L77 16 L82 33Z M18 84 L23 67 L28 84Z M32 84 L37 67 L42 84Z M58 84 L63 67 L68 84Z M72 84 L77 67 L82 84Z"/></g>',
 gas:'<g fill="#8bea9b" opacity=".55"><ellipse cx="24" cy="27" rx="15" ry="10"/><ellipse cx="76" cy="27" rx="15" ry="10"/><ellipse cx="24" cy="76" rx="15" ry="10"/><ellipse cx="76" cy="76" rx="15" ry="10"/></g><g fill="#2e5840" stroke="#bbd6a7" stroke-width="1"><circle cx="22" cy="23" r="5"/><circle cx="78" cy="23" r="5"/><circle cx="22" cy="78" r="5"/><circle cx="78" cy="78" r="5"/></g>',
 flame:'<g fill="#a44828" stroke="#edb769" stroke-width="1"><rect x="16" y="20" width="15" height="10"/><rect x="69" y="20" width="15" height="10"/><rect x="16" y="70" width="15" height="10"/><rect x="69" y="70" width="15" height="10"/></g><g fill="#ffb34f"><path d="M17 26 Q10 16 23 10 Q21 17 29 20 Q34 32 17 26Z M70 26 Q63 16 76 10 Q74 17 82 20 Q87 32 70 26Z M17 77 Q10 67 23 60 Q21 68 29 70 Q34 82 17 77Z M70 77 Q63 67 76 60 Q74 68 82 70 Q87 82 70 77Z"/></g>',
 acid:'<g fill="#c6e76b" opacity=".7"><ellipse cx="25" cy="80" rx="15" ry="6"/><ellipse cx="75" cy="80" rx="15" ry="6"/></g><g stroke="#d2f379" stroke-width="2" stroke-linecap="round"><path d="M23 17 L19 29 M35 26 L31 38 M23 47 L19 59 M35 60 L31 72 M73 17 L69 29 M85 26 L81 38 M73 47 L69 59 M85 60 L81 72"/></g><g fill="#788a3a" stroke="#d2f379" stroke-width="1"><rect x="17" y="12" width="23" height="5"/><rect x="67" y="12" width="23" height="5"/></g>'
};

function baseRoomRates(room){switch(room.type){case 0:return {gold:20,stone:12};case 2:return {food:12};case 3:return {stone:10};case 5:return {rp:5};case 10:return {gold:35};case 18:return {gold:25};case 19:return {rp:10};default:return {}}}

function levelMultiplier(level){return 1+((level||1)-1)*.25}
function roomRates(room){return Object.fromEntries(Object.entries(baseRoomRates(room)).map(([k,v])=>[k,v*levelMultiplier(room.level)]))}
function trapStrength(room){return room.trap?TRAPS[room.trap].strength*levelMultiplier(room.trapLevel):0}
function resourceUpgradeCost(room){const level=room.level||1;return {gold:Math.ceil((TYPES[room.type][1]||100)*.5*level),stone:Math.ceil((TYPES[room.type][2]||50)*.5*level)}}
function upgradeResourceRoom(room){if(state.over||!state.tiles.includes(room)||!Object.keys(roomRates(room)).length||(room.level||1)>=5)return false;const cost=resourceUpgradeCost(room);if(state.gold<cost.gold||state.stone<cost.stone)return false;state.gold-=cost.gold;state.stone-=cost.stone;room.level=(room.level||1)+1;note(`${TYPES[room.type][0]} upgraded to Level ${room.level}.`);save();render();return true}
function trapUpgradeCost(room){return Math.ceil(TRAPS[room.trap].price*.5*(room.trapLevel||1))}
function upgradeTrap(room){if(state.over||!state.tiles.includes(room)||room.type!==16||!room.trap||(room.trapLevel||1)>=5)return false;const cost=trapUpgradeCost(room);if(state.gold<cost)return false;state.gold-=cost;room.trapLevel=(room.trapLevel||1)+1;note(`${TRAPS[room.trap].name} upgraded to Level ${room.trapLevel}.`);save();render();return true}
function renderResourceUpgrade(room,target){if(!Object.keys(roomRates(room)).length)return;const section=document.createElement('section'),p=document.createElement('p'),b=document.createElement('button');p.textContent=`Resource room · Level ${room.level||1} / 5 · +${((room.level||1)-1)*25}% production`;section.append(p);const cost=resourceUpgradeCost(room);b.textContent=(room.level||1)>=5?'Maximum level reached':`Upgrade to Level ${(room.level||1)+1} · ${cost.gold} gold + ${cost.stone} stone`;b.disabled=state.over||(room.level||1)>=5||state.gold<cost.gold||state.stone<cost.stone;b.onclick=()=>upgradeResourceRoom(room);section.append(b);target.append(section)}

function batchFor(room){return Object.fromEntries(Object.entries(roomRates(room)).map(([k,v])=>[k,v*BATCH_MS/DAY_MS]))}
