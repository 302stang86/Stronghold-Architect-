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
let packSel=null,packForSale=false;
/* Open-backpack pictures. box is [left, top, width, height] of the picture in the source sheet; slots are [centreX, centreY, width, height] of each drawn pocket, in reading order. */
const PACK_ART={
 1:{box:[80,50,360,480],slots:[[234,175,44,45],[287,175,44,45],[234,228,44,45],[287,228,44,45],[233,391,45,47],[288,391,45,47],[233,446,45,47],[288,446,45,47]]},
 2:{box:[490,30,390,520],slots:[340,395,451].flatMap(y=>[625,679,733].map(x=>[x,y,45,46]))},
 3:{box:[920,40,420,520],slots:[339,387,436,484].flatMap(y=>[1050,1093,1138,1181].map(x=>[x,y,38,40]))}
};
function renderPack(){const p=state.pack,spots=packSpots(),el=$('pack');if(el){const h=`<button id="pack-toggle" aria-label="Open backpack, ${p.items.length} of ${spots} spots used" title="Backpack level ${p.level}"><img src="assets/backpack-${p.level}.png" alt=""><span class="pack-count">${p.items.length}/${spots}</span></button>`;if(el.dataset.html!==h){el.dataset.html=h;el.innerHTML=h;$('pack-toggle').onclick=()=>openPack()}}
 const d=$('packdialog');if(d&&d.open)renderPackDialog()}
function openPack(forSale=false){
 const d=$('packdialog');
 if(!d)return;
 if(forSale?(!$('merchantdialog').open||merchantTab!=='sell'):!!document.querySelector('dialog[open]'))return;
 packForSale=forSale;packSel=null;renderPackDialog();d.showModal();
}
function renderPackDialog(){const p=state.pack,spots=packSpots(),art=PACK_ART[p.level],[bx,by,bw,bh]=art.box,up=packUpgradeCost(),body=$('pack-body');
 let h=`<div class="pack-stage" style="aspect-ratio:${bw}/${bh}"><img src="assets/backpack-open-${p.level}.png" alt="Open level ${p.level} backpack">`;
 art.slots.forEach(([cx,cy,w,hh],i)=>{const st=`left:${(cx-w/2-bx)/bw*100}%;top:${(cy-hh/2-by)/bh*100}%;width:${w/bw*100}%;height:${hh/bh*100}%`;if(i>=spots)h+=`<span class="pslot sealed" style="${st}" title="Sealed pocket. Not part of this backpack's ${spots} spots."></span>`;else{const id=p.items[i];h+=id?`<button class="pslot full${packSel===i?' sel':''}" style="${st}" data-i="${i}" title="${ITEMS[id].name}">${ITEMS[id].icon}</button>`:`<span class="pslot" style="${st}"></span>`}});
 h+='</div><div class="pack-side">';
 const sid=packSel!==null?p.items[packSel]:null;
 if(packForSale){h+='<h3>Sell backpack items</h3><p>Tap an item to add it to the sale list.</p></div>'}
 else {
 if(sid){const it=ITEMS[sid];h+=`<h3>${it.icon} ${it.name}</h3><p>${it.text}</p><div class="pack-btns">${it.use!=='none'?'<button id="pack-use">Use</button>':''}<button id="pack-drop">Discard</button></div>`}else h+=`<h3>Level ${p.level} backpack</h3><p>${p.items.length} of ${spots} spots used. Tap an item to read it, use it or discard it.</p>`;
 h+='<div class="pack-levels">'+[1,2,3].map(n=>`<span class="${n===p.level?'cur':n<p.level?'done':'lock'}" title="Level ${n}: ${PACK_LEVELS[n].spots} spots"><img src="assets/backpack-${n}.png" alt="Level ${n}"><small>${PACK_LEVELS[n].spots} spots</small></span>`).join('')+'</div>';
 h+=up?`<button id="pack-up">Upgrade to ${up.spots} spots<br><small>${up.gold} gold · ${up.stone} stone</small></button>`:'<p class="muted">Fully upgraded.</p>';
 h+='</div>';
 }
 if(body.dataset.html===h)return;body.dataset.html=h;body.innerHTML=h;
 body.querySelectorAll('.pslot.full').forEach(b=>b.onclick=()=>{if(packForSale){addItemToSale(p.items[+b.dataset.i]);return}packSel=packSel===+b.dataset.i?null:+b.dataset.i;renderPackDialog()});
 const u=$('pack-use');if(u)u.onclick=()=>{const r=useItem(state.pack.items[packSel]);if(r)toast(r);packSel=null;renderPackDialog()};
 const dr=$('pack-drop');if(dr)dr.onclick=()=>{state.pack.items.splice(packSel,1);packSel=null;save();render();renderPackDialog()};
 const g=$('pack-up');if(g){g.onclick=()=>{upgradePack();packSel=null;renderPackDialog()};g.disabled=state.gold<up.gold||state.stone<up.stone}}
/* Merchant trade window. Stock is picked when the merchant arrives. */
let merchantStock=[];
function pickMerchantStock(){const ids=Object.keys(ITEMS).map(Number);for(let i=ids.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]]}merchantStock=ids.slice(0,MERCHANT_STOCK_SIZE).sort((a,b)=>a-b)}
const RESOURCE_SALE_RATES={gold:1,stone:.8,food:.8,rp:1};
let merchantTab='buy',saleItems=new Map(),saleResources=new Map();
function resetMerchantTrade(){
 merchantTab='buy';
 saleItems.clear();
 saleResources.clear();
}
function tradeButton(label,action){
 const button=document.createElement('button');
 button.type='button';button.textContent=label;button.onclick=action;
 return button;
}
function tradeQuantity(label,max,step,onConfirm){
 const dialog=$('merchant-quantity'),input=$('trade-quantity');
 $('trade-quantity-label').textContent=label+' · Available '+fmt(max);
 input.min=String(step);input.max=String(max);input.step=String(step);
 input.value=String(Math.min(1,max));
 $('trade-quantity-cancel').onclick=()=>dialog.close();
 $('trade-quantity-form').onsubmit=event=>{
  event.preventDefault();
  const value=input.valueAsNumber;
  if(!input.checkValidity()||!Number.isFinite(value)||value<=0||value>max)return;
  dialog.close();onConfirm(value);
 };
 dialog.showModal();input.focus();input.select();
}
function addItemToSale(id){
 const owned=state.pack.items.filter(item=>item===id).length;
 const remaining=owned-(saleItems.get(id)||0);
 if(remaining<=0)return toast('All copies are already on the sale list.');
 const add=amount=>{
  saleItems.set(id,(saleItems.get(id)||0)+amount);
  $('packdialog').close();
  renderMerchantShop();
 };
 if(owned>1)tradeQuantity(ITEMS[id].name,remaining,1,add);
 else add(1);
}
function itemSalePrice(id){return Number.isFinite(ITEMS[id]?.price)?ITEMS[id].price*.5:10}
function totalSale(){
 return roundResource([...saleItems].reduce((sum,[id,qty])=>sum+itemSalePrice(id)*qty,0)+
  [...saleResources].reduce((sum,[key,qty])=>sum+RESOURCE_SALE_RATES[key]*qty,0));
}
function completeMerchantSale(){
 if(!$('merchantdialog').open||merchantTab!=='sell'||state.over)return;
 if([...saleItems].some(([id,qty])=>state.pack.items.filter(item=>item===id).length<qty)||
  [...saleResources].some(([key,qty])=>state[key]<qty))return toast('Inventory changed. Adjust the sale and try again.');
 const earned=totalSale();
 if(earned<=0)return;
 for(const [id,qty] of saleItems)for(let i=0;i<qty;i++)takeItem(id);
 for(const [key,qty] of saleResources)state[key]=roundResource(state[key]-qty);
 state.gold=roundResource(state.gold+earned);
 saleItems.clear();saleResources.clear();
 note('Merchant paid '+fmt(earned)+' gold.');
 save();render();renderMerchantShop();
}
function renderMerchantSale(target){
 const backpack=tradeButton('Open backpack to sell',()=>openPack(true));
 backpack.disabled=!state.pack.items.length;
 target.append(backpack);
 const resources=document.createElement('div');resources.className='shop-list';
 for(const [key,rate] of Object.entries(RESOURCE_SALE_RATES)){
  const left=roundResource(state[key]-(saleResources.get(key)||0));
  const row=document.createElement('div');row.className='shop-row';
  const name=document.createElement('span');
  name.textContent=RESOURCE_INFO[key].name+' · '+fmt(rate)+' gold each';
  const add=tradeButton('Add',()=>tradeQuantity(RESOURCE_INFO[key].name,left,.000001,value=>{
   saleResources.set(key,roundResource((saleResources.get(key)||0)+value));renderMerchantShop();
  }));
  add.disabled=left<=0;row.append(name,add);resources.append(row);
 }
 target.append(resources);
 const heading=document.createElement('h3');heading.textContent='Sale list';target.append(heading);
 for(const [cart,display] of [[saleItems,id=>ITEMS[id].name],[saleResources,key=>RESOURCE_INFO[key].name]]){
  for(const [id,qty] of cart){
   const row=document.createElement('div');row.className='shop-row';
   const text=document.createElement('span');text.textContent=display(id)+' × '+fmt(qty);
   row.append(text,tradeButton('Remove',()=>{cart.delete(id);renderMerchantShop()}));
   target.append(row);
  }
 }
 const total=totalSale(),confirm=tradeButton('Confirm Sale · '+fmt(total)+' gold',completeMerchantSale);
 confirm.disabled=total<=0;confirm.className='primary';target.append(confirm);
}
function renderMerchantShop(){
 const target=$('merchant-text');target.replaceChildren();
 const tabs=document.createElement('div');tabs.className='merchant-tabs';tabs.setAttribute('aria-label','Trade mode');
 for(const tab of ['buy','sell']){
  const button=tradeButton(tab==='buy'?'Buy':'Sell',()=>{merchantTab=tab;renderMerchantShop()});
  button.setAttribute('aria-pressed',String(merchantTab===tab));tabs.append(button);
 }
 target.append(tabs);
 const gold=document.createElement('p');gold.textContent=`Your gold: ${fmt(state.gold)} · Backpack spots free: ${packFree()}`;target.append(gold);
 if(merchantTab==='sell'){renderMerchantSale(target);return}
 const list=document.createElement('div');list.className='shop-list';
 for(const id of merchantStock){
  const it=ITEMS[id],row=document.createElement('div'),info=document.createElement('span');
  row.className='shop-row';info.innerHTML=`<b>${it.icon} ${it.name}</b><br><small>${it.text}</small>`;
  const button=tradeButton(it.price+'g',()=>{const error=buyItem(id);if(error)toast(error);renderMerchantShop()});
  button.disabled=state.gold<it.price||it.kind==='pack'&&packFree()<1;
  row.append(info,button);list.append(row);
 }
 target.append(list);
}
