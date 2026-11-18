/* Backpack and merchant items. Item numbers follow README_Invaders_and_Merchants.md. Numbers 5, 8, 9, 18, 19 and 29 are reserved. */
const PACK_LEVELS=[null,{spots:6},{spots:9,gold:600,stone:150},{spots:15,gold:2000,stone:500}];
/* kind: 'store' goes straight to the stores and never takes a backpack spot. 'pack' takes one spot. */
const ITEMS={
 1:{id:1,name:'Food Bundle',icon:'🍞',kind:'store',price:40,give:{food:25},text:'Adds 25 food to your stores.'},
 2:{id:2,name:'Timber Bundle',icon:'🪵',kind:'pack',price:35,use:'none',text:'Wood for future building. Nothing uses it yet.'},
 3:{id:3,name:'Stone Shipment',icon:'🪨',kind:'store',price:50,give:{stone:30},text:'Adds 30 stone to your stores.'},
 4:{id:4,name:'Iron Ingot Crate',icon:'⛓️',kind:'pack',price:70,use:'none',text:'Iron for future crafting. Nothing uses it yet.'},
 6:{id:6,name:'Medicinal Herb Bundle',icon:'🌿',kind:'pack',price:30,use:'none',text:'Herbs for future potions. Nothing uses it yet.'},
 7:{id:7,name:'Alchemical Ingredient Satchel',icon:'⚗️',kind:'pack',price:60,use:'none',text:'Ingredients for future alchemy. Nothing uses it yet.'},
 10:{id:10,name:'Mixed Provision Crate',icon:'📦',kind:'store',price:60,give:{food:15,stone:15},text:'Adds 15 food and 15 stone. The wood share comes when wood exists.'},
 11:{id:11,name:'Minor Health Potion',icon:'🧪',kind:'pack',price:30,use:'heal',amount:.25,text:'Heals 25% of maximum health in a prince battle or on a march.'},
 12:{id:12,name:'Greater Health Potion',icon:'🧪',kind:'pack',price:70,use:'heal',amount:.5,text:'Heals 50% of maximum health.'},
 13:{id:13,name:'Royal Health Potion',icon:'🧪',kind:'pack',price:140,use:'heal',amount:1,text:'Heals to full health.'},
 14:{id:14,name:'Minor Energy Potion',icon:'⚡',kind:'pack',price:25,use:'energy',amount:3,text:'Gives 3 energy in a prince battle (maximum 10).'},
 15:{id:15,name:'Greater Energy Potion',icon:'⚡',kind:'pack',price:55,use:'energy',amount:6,text:'Gives 6 energy in a prince battle (maximum 10).'},
 16:{id:16,name:'Royal Energy Potion',icon:'⚡',kind:'pack',price:110,use:'energy',amount:10,text:'Gives 10 energy in a prince battle (maximum 10).'},
 17:{id:17,name:'Field Bandage Pack',icon:'🩹',kind:'pack',price:45,use:'bandage',amount:.3,text:'On a raid or attack, between room battles: heals the weakest party member by 30%.'},
 20:{id:20,name:'Strength Elixir',icon:'💪',kind:'pack',price:80,use:'strength',amount:1.25,text:'Prince battle: 25% more attack damage until the battle ends.'},
 21:{id:21,name:'Ironhide Elixir',icon:'🛡️',kind:'pack',price:80,use:'ironhide',amount:6,text:'Prince battle: gain 6 block now and at the start of each of your turns until the battle ends.'},
 22:{id:22,name:'Regeneration Draught',icon:'💚',kind:'pack',price:70,use:'regen',amount:.05,turns:5,text:'Prince battle: heals 5% of maximum health at the start of each of your next 5 turns.'},
 30:{id:30,name:"Prince's Training Manual",icon:'📖',kind:'pack',price:150,use:'manual',text:'Gives the prince experience worth half of his current level-up need.'}
};
const MERCHANT_STOCK_SIZE=6;
function packSpots(){return PACK_LEVELS[state.pack.level].spots}
function packFree(){return packSpots()-state.pack.items.length}
function initPack(s){const p=s.pack&&typeof s.pack==='object'?s.pack:{};const level=Number.isInteger(p.level)&&p.level>=1&&p.level<=3?p.level:1;let items=Array.isArray(p.items)?p.items.filter(id=>Number.isInteger(id)&&ITEMS[id]&&ITEMS[id].kind==='pack'):[];items=items.slice(0,PACK_LEVELS[level].spots);s.pack={level,items,open:p.open===true}}
function packUpgradeCost(){const n=PACK_LEVELS[state.pack.level+1];return n?{gold:n.gold,stone:n.stone,spots:n.spots}:null}
function upgradePack(){const c=packUpgradeCost();if(!c)return;if(state.over||state.gold<c.gold||state.stone<c.stone){toast(`The upgrade needs ${c.gold} gold and ${c.stone} stone.`);return}state.gold-=c.gold;state.stone-=c.stone;state.pack.level++;note(`Backpack upgraded to level ${state.pack.level}: ${c.spots} spots.`);toast(`Backpack level ${state.pack.level}: ${c.spots} spots`);save();render()}
function addItem(id){if(packFree()<1)return false;state.pack.items.push(id);return true}
function takeItem(id){const i=state.pack.items.indexOf(id);if(i<0)return false;state.pack.items.splice(i,1);return true}
function buyItem(id){const it=ITEMS[id];if(!it||state.over)return 'Not available.';if(state.gold<it.price)return `You need ${it.price} gold.`;if(it.kind==='pack'&&packFree()<1)return 'Your backpack is full.';state.gold-=it.price;if(it.kind==='store'){for(const k in it.give)state[k]+=it.give[k];note(`Bought ${it.name} for ${it.price} gold.`)}else{addItem(id);note(`Bought ${it.name} for ${it.price} gold. It is in your backpack.`)}save();render();return ''}
/* Use rules. Returns an empty string when used, or the reason it could not be used. */
function itemContext(){const c=state.invasion?.combat;if(c&&!c.exp&&c.kind==='mc'||c&&c.exp&&c.kind==='mc')return c.turn==='ally'&&!c.winner&&!c.noMoves&&!(c.lockMs>0)&&!c.auto?'battle':'wait';if(c)return 'wait';if(state.expedition)return 'march';return 'home'}
function useItem(id){const it=ITEMS[id];if(!it||!state.pack.items.includes(id))return 'You do not have that.';const ctx=itemContext(),c=state.invasion?.combat;
 if(it.use==='none')return 'Nothing uses this yet.';
 if(ctx==='wait')return 'Wait for your turn.';
 if(it.use==='manual'){if(c)return 'Use it outside battle.';if(state.prince.level>=MAX_LEVEL)return 'The prince is at the top level.';takeItem(id);gainXp('mc',Math.max(1,Math.round(xpNeed(state.prince.level)/2)));note("The prince studied the Training Manual.");save();render();return ''}
 if(it.use==='bandage'){if(ctx!=='march')return 'Bandages work between room battles on a raid or attack.';return healWeakest(id,it.amount)}
 if(it.use==='heal'){if(ctx==='march')return healWeakest(id,it.amount);if(ctx!=='battle')return 'Use health potions in a prince battle or on a march.';const a=c.ally;if(a.hp>=a.maxHp)return 'The prince is at full health.';a.hp=Math.min(a.maxHp,Math.round(a.hp+a.maxHp*it.amount));takeItem(id);combatLog(`${a.name} drinks a ${it.name}.`);save();renderBattle();render();return ''}
 if(ctx!=='battle')return 'Use this in a prince battle, on your turn.';const a=c.ally;
 if(it.use==='energy'){if(a.energy>=10)return 'Energy is already full.';a.energy=Math.min(10,a.energy+it.amount)}
 else if(it.use==='strength'){if(c.strength)return 'Already in effect.';c.strength=true;a.dmgMod=Math.round(a.dmgMod*it.amount*100)/100}
 else if(it.use==='ironhide'){if(a.ironhide)return 'Already in effect.';a.ironhide=it.amount;a.block+=it.amount}
 else if(it.use==='regen'){if(a.regen&&a.regen.turns>0)return 'Already in effect.';a.regen={turns:it.turns,pct:it.amount}}
 takeItem(id);combatLog(`${a.name} uses ${it.name}.`);save();renderBattle();render();return ''}
function healWeakest(id,pct){const exp=state.expedition;if(!exp||state.invasion.combat)return 'Use this between room battles.';const live=exp.party.filter(m=>m.hp>0&&m.hp<m.maxHp).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(!live)return 'Everyone in the party is at full health.';live.hp=Math.min(live.maxHp,Math.round(live.hp+live.maxHp*pct));takeItem(id);exp.log.push(`${live.name} is treated with ${ITEMS[id].name}.`);save();render();if(window.renderExpedition)renderExpedition();return ''}
/* Shows use buttons for the items that work right now. mode is 'battle' or 'march'. */
function renderPackBar(el,mode){if(!el)return;const ctx=itemContext(),usable=[...new Set(state.pack.items)].filter(id=>{const u=ITEMS[id].use;if(mode==='battle')return ['heal','energy','strength','ironhide','regen'].includes(u);return ['heal','bandage','manual'].includes(u)});const sig=mode+'|'+ctx+'|'+usable.map(id=>id+'x'+state.pack.items.filter(x=>x===id).length).join(',');if(el.dataset.sig===sig)return;el.dataset.sig=sig;el.replaceChildren();if(!usable.length){el.hidden=true;return}el.hidden=false;const h=document.createElement('span');h.textContent='Backpack:';el.append(h);for(const id of usable){const it=ITEMS[id],n=state.pack.items.filter(x=>x===id).length,b=document.createElement('button');b.type='button';b.textContent=`${it.icon} ${it.name}${n>1?' ×'+n:''}`;b.title=it.text;b.disabled=mode==='battle'&&ctx!=='battle';b.onclick=()=>{const r=useItem(id);if(r)toast(r);el.dataset.sig=''};el.append(b)}}
let packSel=null;
function renderPack(){const el=$('pack');if(!el)return;const p=state.pack,spots=packSpots(),open=p.open,up=packUpgradeCost();
 let h=`<button id="pack-toggle" aria-expanded="${open}">🎒 Backpack ${p.items.length}/${spots}</button>`;
 if(open){h+='<div class="pack-body"><div class="pack-grid">';for(let i=0;i<spots;i++){const id=p.items[i];h+=id?`<button class="pack-slot full${packSel===i?' sel':''}" data-i="${i}" title="${ITEMS[id].name}">${ITEMS[id].icon}</button>`:'<span class="pack-slot"></span>'}h+='</div>';
  const sid=packSel!==null?p.items[packSel]:null;if(sid){const it=ITEMS[sid];h+=`<p class="pack-info"><b>${it.name}</b><br>${it.text}</p><div class="pack-btns">${it.use!=='none'?'<button id="pack-use">Use</button>':''}<button id="pack-drop">Discard</button></div>`}else h+='<p class="pack-info">Tap an item to see what it does.</p>';
  h+=`<p class="pack-info">Level ${p.level} of 3 · ${spots} spots</p>`;
  h+=up?`<button id="pack-up">Upgrade to ${up.spots} spots · ${up.gold}g ${up.stone}s</button>`:'<p class="pack-info">Fully upgraded.</p>';h+='</div>'}
 if(el.dataset.html!==h){el.dataset.html=h;el.innerHTML=h;
  $('pack-toggle').onclick=()=>{state.pack.open=!state.pack.open;save();renderPack()};
  el.querySelectorAll('.pack-slot.full').forEach(b=>b.onclick=()=>{packSel=packSel===+b.dataset.i?null:+b.dataset.i;el.dataset.html='';renderPack()});
  const u=$('pack-use');if(u)u.onclick=()=>{const r=useItem(state.pack.items[packSel]);if(r)toast(r);packSel=null;el.dataset.html='';renderPack()};
  const d=$('pack-drop');if(d)d.onclick=()=>{state.pack.items.splice(packSel,1);packSel=null;save();el.dataset.html='';render()};
  const g=$('pack-up');if(g){g.onclick=upgradePack;g.disabled=state.gold<up.gold||state.stone<up.stone}}
 else{const g=$('pack-up');if(g)g.disabled=state.gold<up.gold||state.stone<up.stone}}
/* Merchant trade window. Stock is picked when the merchant arrives. */
let merchantStock=[];
function pickMerchantStock(){const ids=Object.keys(ITEMS).map(Number);for(let i=ids.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]]}merchantStock=ids.slice(0,MERCHANT_STOCK_SIZE).sort((a,b)=>a-b)}
function renderMerchantShop(){const t=$('merchant-text');t.replaceChildren();const gold=document.createElement('p');gold.textContent=`Your gold: ${Math.floor(state.gold)} · Backpack spots free: ${packFree()}`;t.append(gold);const list=document.createElement('div');list.className='shop-list';for(const id of merchantStock){const it=ITEMS[id],row=document.createElement('div'),info=document.createElement('span'),b=document.createElement('button');row.className='shop-row';info.innerHTML=`<b>${it.icon} ${it.name}</b><br><small>${it.text}</small>`;b.textContent=`${it.price}g`;b.disabled=state.gold<it.price||it.kind==='pack'&&packFree()<1;b.title=it.kind==='pack'&&packFree()<1?'Backpack is full':'';b.onclick=()=>{const r=buyItem(id);if(r)toast(r);renderMerchantShop()};row.append(info,b);list.append(row)}t.append(list)}
