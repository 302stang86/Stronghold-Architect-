/* Raids and attacks on rival strongholds: guards, barracks, fog-of-war exploration, room battles and loot. */
const GUARD_MAX=2,RAID_RATE=.1,DEFENDED_RATE=.2,EXP_RES=['gold','stone','food','rp'];
function guardLevel(){return Math.min(state.prince.level,MAX_LEVEL)}
function guardCost(){return 30+10*(state.prince.level-1)}
function hasBarracks(){return state.tiles.some(t=>t.type===1)}
function hireGuard(){
 if(state.over||state.expedition||!hasBarracks()||state.guards.length>=GUARD_MAX||state.gold<guardCost())return false;
 const id='g'+(state.nextGuardId=(state.nextGuardId||0)+1),used=new Set(state.guards.map(g=>g.name)),pool=SERVANT_NAME_POOL.filter(n=>!used.has(n));
 state.gold=roundResource(state.gold-guardCost());state.guards.push({id,name:'Guard '+(pool.length?pool[Math.floor(Math.random()*pool.length)]:id),look:Math.floor(Math.random()*5)});
 note(`${state.guards[state.guards.length-1].name} joined the barracks.`);save();render();renderRoomViewer();return true}
function renderBarracks(target){
 const box=document.createElement('section'),h=document.createElement('h3'),p=document.createElement('p'),b=document.createElement('button');
 h.textContent='Guards';p.className='muted';p.textContent=state.guards.length?state.guards.map(g=>`${g.name} · Level ${guardLevel()}`).join(' · '):'No guards yet.';
 b.textContent=`Hire a guard · ${guardCost()} gold (${state.guards.length} of ${GUARD_MAX})`;b.disabled=state.over||!!state.expedition||state.guards.length>=GUARD_MAX||state.gold<guardCost();b.onclick=hireGuard;
 const n=document.createElement('p');n.className='muted';n.textContent='Guards match your prince’s level. A guard who falls in a raid or attack is lost for good and must be bought again. Only one Barracks can be built.';
 box.append(h,p,b,n);target.append(box)}
function castleById(id){return state.world?.castles.find(c=>c.id===id)||null}
function expCastle(){return state.expedition?castleById(state.expedition.castleId):null}
function expTile(key){const c=expCastle();return c?c.tiles.find(t=>roomKey(t)===key)||null:null}
function expNeighbors(t,tiles){return DIRS.map(([dx,dy],d)=>{const b=tiles.find(r=>r.x===t.x+dx&&r.y===t.y+dy);return b&&compatible(t,b,d)?{room:b,d}:null}).filter(Boolean)}
function expReason(mode,id){
 const c=castleById(id);if(!state.world||!c)return'That stronghold is not part of this game.';
 if(c.ownerId==='player')return'This stronghold already belongs to you.';if(state.over)return'Your keep has fallen.';if(state.expedition)return'An expedition is already under way.';
 if(state.invasion.active||state.invasion.combat)return'Finish the invasion first.';
 if(mode==='raid'&&!state.guards.length)return'A raid needs at least one guard. Hire one at your Barracks.';return''}
function startExpedition(mode,castleId){
 const why=expReason(mode,castleId);if(why){toast(why);return false}
 const c=castleById(castleId),entrance=c.tiles.find(t=>t.type===17);if(!entrance)return false;
 const level=guardLevel(),party=state.guards.slice(0,GUARD_MAX).map(g=>({id:g.id,kind:'guard',name:g.name,look:g.look,hp:0,maxHp:0}));
 if(mode==='attack')party.push({id:'mc',kind:'prince',name:'Young Prince',look:0,hp:0,maxHp:0});
 for(const m of party){m.maxHp=m.kind==='prince'?Math.round(hpForLevel(level)*(state.hungryDays>=5?.8:1)):hpForLevel(level);m.hp=m.maxHp}
 const producers={};for(const t of c.tiles)if(t.type!==0)for(const k of Object.keys(roomRates(t)))producers[k]=(producers[k]||0)+1;
 const share={};for(const k of EXP_RES)share[k]=producers[k]?c.treasury[k]/producers[k]:0;
 const key=roomKey(entrance);
 state.expedition={id:'x'+Date.now().toString(36),mode,castleId,party,current:key,discovered:[key],looted:[],cleared:[],loot:{gold:0,stone:0,food:0,rp:0},share,status:'exploring',encounter:null,log:['You arrive at the gate of '+c.rulingName+'.']};
 try{$('mapdialog').close()}catch{}
 note(`${mode==='raid'?'Raid':'Attack'} on ${c.rulingName} begins.`);save();showExpedition();return true}
function lootRoom(key,defended){
 const exp=state.expedition,c=expCastle(),t=expTile(key);if(!exp||!c||!t||t.type===0||exp.looted.includes(key))return;
 const rates=roomRates(t);if(!Object.keys(rates).length)return;exp.looted.push(key);
 const rate=defended?DEFENDED_RATE:RAID_RATE,got=[];
 for(const k of Object.keys(rates)){const take=Math.min(Math.round(exp.share[k]*rate),Math.floor(c.treasury[k]));if(take>0){c.treasury[k]=roundResource(c.treasury[k]-take);exp.loot[k]=(exp.loot[k]||0)+take;got.push(`${take} ${RESOURCE_INFO[k].name.toLowerCase()}`)}}
 exp.log.push(`${TYPES[t.type][0]}: `+(got.length?'you take '+got.join(' and ')+(defended?' (defended room, 20%)':' (10%)')+'.':'nothing worth taking.'))}
function expInfo(key,throne){const c=expCastle(),cap=state.prince.level+3;if(throne)return{name:c.prince.name,level:Math.min(c.prince.level,cap),variant:c.prince.variant||0,skill:.75,throne:true};const d=c.defenders[key];return{name:d.name,level:Math.min(d.level,cap),variant:d.variant||0,skill:.6,throne:false}}
function beginExpBattle(info,key,enemyHp){
 const exp=state.expedition,live=exp.party.filter(m=>m.hp>0);
 let lead=info.throne?live.find(m=>m.kind==='prince'):null;lead=lead||live.find(m=>m.kind==='guard')||live.find(m=>m.kind==='prince');
 if(!lead){expeditionEnd('defeat');return}
 const level=guardLevel(),ally=lead.kind==='prince'?combatant('Young Prince',level,lead.maxHp,state.hungryDays>=2?1-MC_HUNGER_PENALTY:1,.65):combatant(lead.name,level,lead.maxHp,state.hungryDays>=1?1-SERVANT_HUNGER_PENALTY:1,.65);
 ally.hp=Math.min(ally.maxHp,lead.hp);
 const enemy=combatant(info.name,info.level,hpForLevel(info.level),1,info.skill);if(enemyHp!==undefined)enemy.hp=Math.min(enemy.maxHp,enemyHp);
 const auto=lead.kind==='guard';
 state.invasion.combat={kind:auto?'servant':'mc',exp:true,auto,defenderId:null,leadId:lead.id,ally,enemy,turn:'ally',turnNumber:1,waitMs:700,noMoves:false,winner:null,log:[auto?`${lead.name} fights ${info.name}.`:'Each turn: five random cards and 10 energy. Tap a card to play it.'],lastAction:'',lastCard:null,lastBy:null,lastCount:0,lastMs:0,lockMs:0,enemyInfo:{name:info.name,variant:info.variant,level:info.level,key,roomType:expTile(key).type,throne:info.throne}};
 exp.status='battle';exp.encounter={key,info};beginCombatTurn('ally');save();renderBattle();renderExpedition()}
function resolveExpeditionCombat(c){
 const exp=state.expedition;state.invasion.combat=null;const m=$('battle-dialog');if(m?.open)m.close();
 if(!exp){save();render();return}
 const member=exp.party.find(x=>x.id===c.leadId),key=exp.encounter.key,info=exp.encounter.info;
 if(c.winner==='ally'){
  if(member)member.hp=Math.max(1,Math.ceil(c.ally.hp));gainXp('mc',8+c.enemy.level*2);exp.cleared.push(key);exp.encounter=null;
  if(info.throne){exp.status='victoryChoice';exp.log.push(`${info.name} is beaten. The stronghold is yours to decide.`)}
  else{exp.status='exploring';exp.log.push(`${info.name} is defeated.`);lootRoom(key,true)}
  save();renderExpedition();return}
 if(member){member.hp=0;if(member.kind==='guard'){state.guards=state.guards.filter(g=>g.id!==member.id);note(`${member.name} fell and is lost for good. Buy a replacement at the Barracks.`)}}
 exp.party=exp.party.filter(x=>x.hp>0);
 if(!exp.party.length||member?.kind==='prince')return expeditionEnd('defeat');
 beginExpBattle(info,key,c.enemy.hp)}
function expeditionEnd(result){
 const exp=state.expedition,c=expCastle();if(!exp)return;
 const loot=exp.loot,parts=EXP_RES.filter(k=>loot[k]>0).map(k=>`${loot[k]} ${RESOURCE_INFO[k].name.toLowerCase()}`);
 if(result==='defeat'){if(c)for(const k of EXP_RES)c.treasury[k]=roundResource(c.treasury[k]+(loot[k]||0));note(`The expedition against ${c?.rulingName||'the stronghold'} failed.${parts.length?' The loot was returned.':''}`);toast('The expedition failed. Carried loot was returned.')}
 else{for(const k of EXP_RES)state[k]=roundResource(state[k]+(loot[k]||0));if(result==='takeover'){note(`${c.rulingName} is now yours. Its prince and defenders swear loyalty, and it sends you 25% of what it makes each day.`);toast(`${c.rulingName} is now yours!`)}else note(`Expedition against ${c?.rulingName||'the stronghold'} ended. ${parts.length?'You brought home '+parts.join(', ')+'.':'You brought home nothing.'}`);if(result!=='takeover')toast(parts.length?'You brought home '+parts.join(', ')+'.':'You returned empty-handed.')}
 state.expedition=null;if($('expdialog').open)$('expdialog').close();if(window.cloudPushSoon)cloudPushSoon();save();render();if(result==='takeover')checkConquest()}
function enterRoom(key){
 const exp=state.expedition;if(!exp||exp.status!=='exploring')return false;
 const cur=expTile(exp.current),t=expTile(key);if(!cur||!t)return false;
 if(!expNeighbors(cur,expCastle().tiles).some(n=>roomKey(n.room)===key))return false;
 if(t.type===0&&exp.mode!=='attack'){toast('Raiders cannot enter the throne room.');return false}
 exp.current=key;if(!exp.discovered.includes(key))exp.discovered.push(key);
 const c=expCastle();
 if(t.type===0)beginExpBattle(expInfo(key,true),key);
 else if(c.defenders[key]&&!exp.cleared.includes(key))beginExpBattle(expInfo(key,false),key);
 else{lootRoom(key,false);save();renderExpedition()}
 return true}
function moveTo(key){
 const exp=state.expedition;if(!exp||exp.status!=='exploring'||!exp.discovered.includes(key))return false;if(key===exp.current)return true;
 const tiles=expCastle().tiles,prev=new Map([[exp.current,null]]),q=[exp.current];
 while(q.length){const k=q.shift();if(k===key)break;for(const n of expNeighbors(expTile(k),tiles)){const nk=roomKey(n.room);if(exp.discovered.includes(nk)&&!prev.has(nk)){prev.set(nk,k);q.push(nk)}}}
 if(!prev.has(key))return false;exp.current=key;save();renderExpedition();return true}
function arrowClick(fromKey,toKey){if(!moveTo(fromKey))return;enterRoom(toKey)}
async function leaveExpedition(){
 const exp=state.expedition;if(!exp||exp.status!=='exploring')return;
 if(await askConfirm('Leave the stronghold?','You keep everything you have collected. A later expedition starts with the rooms hidden again.','Leave and keep loot','Keep exploring'))expeditionEnd('left')}
function takeOver(){const exp=state.expedition,c=expCastle();if(!exp||exp.status!=='victoryChoice'||!c)return;c.ownerId='player';c.flag='player';c.capturedDay=state.day;c.shield=3;expeditionEnd('takeover')}
function checkConquest(){if(!state.world||state.worldWon||!state.world.castles.every(c=>c.ownerId==='player'))return;state.worldWon=true;note('Every stronghold on the map is yours. You rule them all!');save();askConfirm('You rule them all!','Every stronghold on the world map now belongs to you. You may keep playing.','Keep playing','Close')}
function stealResources(){if(state.expedition?.status==='victoryChoice')expeditionEnd('steal')}
const EXP_ARROW=['▲','▶','▼','◀'];
function renderExpedition(){
 const exp=state.expedition,dlg=$('expdialog');if(!exp){if(dlg.open)dlg.close();return}
 const c=expCastle();if(!c){state.expedition=null;if(dlg.open)dlg.close();return}
 if(!dlg.open&&!awaitingResume)dlg.showModal();
 $('exp-mode').textContent=exp.mode==='raid'?'RAID':'ATTACK';$('exp-title').textContent=c.rulingName;
 const party=$('exp-party');party.replaceChildren();
 for(const m of exp.party){const d=document.createElement('div');d.className='exp-member'+(m.hp<=0?' down':'');const a=document.createElement('span');a.className='exp-face';const kind=m.kind==='prince'?'mc':'servant';a.style.backgroundImage=`url("${COMBAT_ART[kind][m.kind==='prince'?0:(m.look||0)]}")`;const nm=document.createElement('b');nm.textContent=m.name;const bar=document.createElement('i');bar.innerHTML=`<u style="width:${Math.max(0,m.hp/m.maxHp*100)}%"></u>`;d.append(a,nm,bar);party.append(d)}
 const loot=$('exp-loot');const parts=EXP_RES.filter(k=>exp.loot[k]>0).map(k=>`${exp.loot[k]} ${RESOURCE_INFO[k].name}`);loot.textContent='Carrying: '+(parts.join(' · ')||'nothing yet');
 const tiles=exp.discovered.map(expTile).filter(Boolean),minX=Math.min(...tiles.map(t=>t.x)),maxX=Math.max(...tiles.map(t=>t.x)),minY=Math.min(...tiles.map(t=>t.y)),maxY=Math.max(...tiles.map(t=>t.y));
 const grid=$('exp-grid');grid.replaceChildren();grid.style.gridTemplateColumns=`repeat(${maxX-minX+1},var(--ecell))`;grid.style.gridTemplateRows=`repeat(${maxY-minY+1},var(--ecell))`;
 const busy=exp.status!=='exploring';
 for(const t of tiles){
  const key=roomKey(t),cell=document.createElement('div');cell.className='exp-cell'+(key===exp.current?' here':'')+(exp.looted.includes(key)?' looted':'');cell.style.gridColumn=t.x-minX+1;cell.style.gridRow=t.y-minY+1;
  const im=document.createElement('img');im.src=art(t.type);im.alt=TYPES[t.type][0];im.style.transform=`rotate(${t.rot*90}deg)`;cell.append(im);
  const lab=document.createElement('span');lab.className='exp-label';lab.textContent=TYPES[t.type][0];cell.append(lab);
  if(exp.cleared.includes(key)&&t.type!==0){const k=document.createElement('span');k.className='exp-flag';k.textContent='✔ cleared';cell.append(k)}
  if(key===exp.current){const who=document.createElement('div');who.className='exp-party-token';for(const m of exp.party.slice(0,3)){const f=document.createElement('span');const kind=m.kind==='prince'?'mc':'servant';f.style.backgroundImage=`url("${COMBAT_ART[kind][m.kind==='prince'?0:(m.look||0)]}")`;who.append(f)}cell.append(who)}
  if(!busy&&key!==exp.current){cell.classList.add('go');cell.onclick=()=>moveTo(key)}
  for(const n of expNeighbors(t,c.tiles)){const nk=roomKey(n.room);if(exp.discovered.includes(nk))continue;if(n.room.type===0&&exp.mode!=='attack')continue;const a=document.createElement('button');a.className='exp-arrow d'+n.d;a.textContent=EXP_ARROW[n.d];a.setAttribute('aria-label','Explore an unseen room '+['north','east','south','west'][n.d]);a.disabled=busy;a.onclick=e=>{e.stopPropagation();arrowClick(key,nk)};cell.append(a)}
  grid.append(cell)}
 $('exp-status').textContent=exp.status==='battle'?'Battle in progress. You cannot leave until it ends.':exp.status==='victoryChoice'?'The resident prince is beaten. Choose what to do with the stronghold.':exp.log[exp.log.length-1]||'';
 $('exp-leave').disabled=exp.status!=='exploring';$('exp-choice').hidden=exp.status!=='victoryChoice';
 const l=$('exp-log');l.textContent=exp.log.slice(-4).join('\n')}
function showExpedition(){
 const exp=state.expedition;if(!exp||awaitingResume)return;
 if(exp.status==='battle'&&!state.invasion.combat){exp.status='exploring';const k=exp.current,c=expCastle();if(c&&expTile(k)&&((expTile(k).type===0)||(c.defenders[k]&&!exp.cleared.includes(k)))){beginExpBattle(expInfo(k,expTile(k).type===0),k);return}}
 renderExpedition()}
$('exp-leave').onclick=leaveExpedition;$('exp-steal').onclick=stealResources;$('exp-take').onclick=takeOver;$('expdialog').addEventListener('cancel',e=>e.preventDefault());
window.addEventListener('message',e=>{const d=e.data;if(d&&d.type==='startExpedition'&&typeof d.castleId==='string'&&(d.mode==='raid'||d.mode==='attack'))startExpedition(d.mode,d.castleId)});
