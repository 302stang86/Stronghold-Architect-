/* Raids and attacks on rival strongholds: guards, barracks, fog-of-war exploration, room battles and loot. */
const GUARD_MAX=2,RAID_RATE=.1,DEFENDED_RATE=.2,EXP_RES=['gold','stone','food','rp'];
function guardLevel(){return Math.min(state.prince.level,MAX_LEVEL)}
function guardCost(){return 30+10*(state.prince.level-1)}
function hasBarracks(){return state.tiles.some(t=>t.type===1)}
function hireGuard(){
 if(state.over||state.expedition||!hasBarracks()||state.guards.length>=GUARD_MAX||state.gold<guardCost())return false;
 const id='g'+(state.nextGuardId=(state.nextGuardId||0)+1),used=new Set(state.guards.map(g=>g.name)),pool=SERVANT_NAME_POOL.filter(n=>!used.has(n));
 state.gold=roundResource(state.gold-guardCost());const bt=state.tiles.find(t=>t.type===1)||state.tiles.find(t=>t.type===0);state.guards.push({id,guard:true,name:'Guard '+(pool.length?pool[Math.floor(Math.random()*pool.length)]:id),look:Math.floor(Math.random()*5),home:null,x:bt.x+.5,y:bt.y+.5,path:[],mode:'wander',waitMs:600});
 note(`${state.guards[state.guards.length-1].name} joined the barracks.`);save();render();renderRoomViewer();return true}
function renderBarracks(target){
 const box=document.createElement('section'),h=document.createElement('h3'),p=document.createElement('p'),b=document.createElement('button');
 h.textContent='Guards';p.className='muted';p.textContent=state.guards.length?state.guards.map(g=>`${g.name} · Level ${guardLevel()}`).join(' · '):'No guards yet.';
 b.textContent=`Hire a guard · ${guardCost()} gold (${state.guards.length} of ${GUARD_MAX})`;b.disabled=state.over||!!state.expedition||state.guards.length>=GUARD_MAX||state.gold<guardCost();b.onclick=hireGuard;
 const n=document.createElement('p');n.className='muted';n.textContent='Guards match your prince’s level. Post a guard in any room from that room’s window, or let them roam. A guard who falls in a raid or attack is lost for good and must be bought again. Only one Barracks can be built.';
 box.append(h,p,b,n);target.append(box)}

function canHostGuard(room){return ![12,13,14,15].includes(room.type)}
function guardAt(room){return state.guards.find(g=>g.home===roomKey(room))||null}
function assignGuard(id,room){const g=state.guards.find(x=>x.id===id);if(state.over||!g||!room||!canHostGuard(room))return false;const cur=guardAt(room);if(cur&&cur!==g){toast('That room already has a guard.');return false}g.home=roomKey(room);g.path=[];sendServantHome(g);note(`${g.name} was posted to the ${TYPES[room.type][0]}.`);save();render();renderRoomViewer();return true}
function unassignGuard(id){const g=state.guards.find(x=>x.id===id);if(!g||!g.home)return false;g.home=null;g.path=[];g.mode='wander';g.waitMs=600;note(`${g.name} now roams the keep.`);save();render();renderRoomViewer();return true}
function renderRoomGuard(room,target){
 if(!canHostGuard(room)||!state.guards.length&&room.type!==1)return;
 const box=document.createElement('section');box.className='room-guard';const h=document.createElement('h3');h.textContent='Guard';box.append(h);
 const cur=guardAt(room);
 if(cur){const p=document.createElement('p');p.className='muted';p.textContent=`${cur.name} · Level ${guardLevel()} is posted here. If an invader reaches this room, the guard fights first.`;const rem=document.createElement('button');rem.textContent='Let this guard roam';rem.disabled=state.over||!!state.expedition;rem.onclick=()=>unassignGuard(cur.id);box.append(p,rem)}
 else{const p=document.createElement('p');p.className='muted';p.textContent=state.guards.length?'Post a guard here, or leave guards roaming. A roaming guard fights any invader who enters the room it is standing in.':'No guards yet. Hire guards at the Barracks.';box.append(p);for(const g of state.guards){const b=document.createElement('button');b.className='roster-row';const where=g.home?roomFromKey(g.home):null;b.textContent=`Post ${g.name}`+(where?` (now in the ${TYPES[where.type][0]})`:' (roaming)');b.disabled=state.over||!!state.expedition;b.onclick=()=>assignGuard(g.id,room);box.append(b)}}
 target.append(box)}
function unitLevel(m){return m.level||guardLevel()}
function availableUnits(){return [...state.guards.map(g=>({id:g.id,kind:'guard',name:g.name,look:g.look,level:guardLevel()})),...state.collectors.map(n=>({id:n.id,kind:'servant',name:n.name,look:n.look,level:n.level||1}))]}
function partyIssue(mode,ids){
 const units=availableUnits().filter(u=>ids.includes(u.id)),guards=units.filter(u=>u.kind==='guard').length,servants=units.length-guards;
 if(mode==='attack'){if(guards!==1)return'Choose exactly one guard to join the prince.';if(servants>1)return'An attack party can include only one servant.';return''}
 if(units.length<1)return'Choose at least one guard or servant.';if(units.length>3)return'A raid party has at most three units.';return''}
function choosePartyDialog(mode,castleId){
 const why=expReason(mode,castleId);if(why){toast(why);return false}
 const c=castleById(castleId),dlg=$('partydialog'),list=$('party-list'),units=availableUnits(),pick=new Set();
 $('party-title').textContent=(mode==='raid'?'Choose your raid party':'Choose your attack party')+' · '+c.rulingName;
 $('party-rules').textContent=mode==='raid'?'A raid party is one to three guards or servants. The prince stays home.':'An attack party is the prince, one guard, and optionally one servant.';
 const start=$('party-start'),msg=$('party-msg');
 const refresh=()=>{const issue=partyIssue(mode,[...pick]);msg.textContent=issue;start.disabled=!!issue;for(const b of list.querySelectorAll('button.party-unit'))b.classList.toggle('on',pick.has(b.dataset.id)||pick.has(Number(b.dataset.id)))};
 list.replaceChildren();
 if(mode==='attack'){const p=document.createElement('div');p.className='party-unit locked on';p.textContent='Young Prince · Level '+state.prince.level+' (always joins)';list.append(p)}
 for(const u of units){const b=document.createElement('button');b.className='party-unit';b.dataset.id=u.id;const art=document.createElement('span');art.className='portrait';portraitStyle(art,u.look||0);const t=document.createElement('span');t.innerHTML='';const nm=document.createElement('strong');nm.textContent=u.name;const sm=document.createElement('small');sm.textContent=(u.kind==='guard'?'Guard':'Servant')+' · Level '+u.level;t.append(nm,sm);b.append(art,t);b.onclick=()=>{if(pick.has(u.id))pick.delete(u.id);else pick.add(u.id);refresh()};list.append(b)}
 start.onclick=()=>{const ids=[...pick];if(partyIssue(mode,ids))return;dlg.close();startExpedition(mode,castleId,ids)};
 $('party-cancel').onclick=()=>dlg.close();refresh();if(!dlg.open)dlg.showModal();return true}
function castleById(id){return state.world?.castles.find(c=>c.id===id)||null}
function expCastle(){
 const exp=state.expedition;
 if(!exp)return null;
 return exp.mode==='dungeon'?dungeonLandmark(exp.castleId)?.layout:castleById(exp.castleId);
}
function expTile(key){const c=expCastle();return c?c.tiles.find(t=>roomKey(t)===key)||null:null}
function expNeighbors(t,tiles){return DIRS.map(([dx,dy],d)=>{const b=tiles.find(r=>r.x===t.x+dx&&r.y===t.y+dy);return b&&compatible(t,b,d)?{room:b,d}:null}).filter(Boolean)}
function expReason(mode,id){
 if(mode==='dungeon'){
  const dungeon=dungeonMapInfo().find(d=>d.id===id);
  if(!dungeon)return 'That dungeon is not part of this campaign.';
  return dungeon.blocked||(dungeon.remaining>0?'The Boss Vault is still sealed.':'');
 }
 const c=castleById(id);if(!state.world||!c)return'That stronghold is not part of this game.';
 if(c.ownerId==='player')return'This stronghold already belongs to you.';if(state.over)return'Your keep has fallen.';if(state.expedition)return'An expedition is already under way.';
 if(state.invasion.active||state.invasion.combat)return'Finish the invasion first.';
 if(mode==='attack'&&!state.guards.length)return'An attack needs your prince and at least one guard. Hire a guard at your Barracks.';if(mode==='raid'&&!availableUnits().length)return'A raid needs at least one available guard or servant.';return''}
function startExpedition(mode,castleId,ids){
 const why=expReason(mode,castleId);if(why){toast(why);return false}
 if(mode==='dungeon')return startDungeonVisit(castleId);
 if(!Array.isArray(ids))return choosePartyDialog(mode,castleId);if(partyIssue(mode,ids)){toast(partyIssue(mode,ids));return false}
 const c=castleById(castleId),entrance=c.tiles.find(t=>t.type===17);if(!entrance)return false;
 const party=availableUnits().filter(u=>ids.includes(u.id)).map(u=>({id:u.id,kind:u.kind,name:u.name,look:u.look,level:u.level,hp:0,maxHp:0}));
 if(mode==='attack')party.push({id:'mc',kind:'prince',name:'Young Prince',look:0,level:state.prince.level,hp:0,maxHp:0});
 for(const m of party){m.maxHp=m.kind==='prince'?Math.round(hpForLevel(m.level)*(state.hungryDays>=5?.8:1)):hpForLevel(m.level);m.hp=m.maxHp}
 const producers={};for(const t of c.tiles)if(t.type!==0)for(const k of Object.keys(roomRates(t)))producers[k]=(producers[k]||0)+1;
 const share={};for(const k of EXP_RES)share[k]=producers[k]?c.treasury[k]/producers[k]:0;
 const key=roomKey(entrance);
 state.expedition={id:'x'+Date.now().toString(36),mode,castleId,party,current:key,discovered:[key],looted:[],cleared:[],loot:{gold:0,stone:0,food:0,rp:0},share,status:'exploring',encounter:null,log:['You arrive at the gate of '+c.rulingName+'.']};
 try{$('mapdialog').close()}catch{}
 note(`${mode==='raid'?'Raid':'Attack'} on ${c.rulingName} begins.`);save();showExpedition();return true}
function lootRoom(key,defended){
 const exp=state.expedition,c=expCastle(),t=expTile(key);if(!exp||!c||!t||t.type===0||exp.looted.includes(key))return;
 if(exp.mode==='dungeon')return dungeonLoot(exp,c,key);
 const rates=roomRates(t);if(!Object.keys(rates).length)return;exp.looted.push(key);
 const rate=defended?DEFENDED_RATE:RAID_RATE,got=[];
 for(const k of Object.keys(rates)){const take=Math.min(Math.round(exp.share[k]*rate),Math.floor(c.treasury[k]));if(take>0){c.treasury[k]=roundResource(c.treasury[k]-take);exp.loot[k]=(exp.loot[k]||0)+take;got.push(`${take} ${RESOURCE_INFO[k].name.toLowerCase()}`)}}
 exp.log.push(`${TYPES[t.type][0]}: `+(got.length?'you take '+got.join(' and ')+(defended?' (defended room, 20%)':' (10%)')+'.':'nothing worth taking.'))}
function expInfo(key,throne){const c=expCastle();if(state.expedition.mode==='dungeon')return c.defenders[key];const cap=state.prince.level+3;if(throne)return{name:c.prince.name,level:Math.min(c.prince.level,cap),variant:c.prince.variant||0,skill:.75,throne:true};const d=c.defenders[key];return{name:d.name,level:Math.min(d.level,cap),variant:d.variant||0,skill:.6,throne:false}}
function beginExpBattle(info,key,enemyHp){
 const exp=state.expedition,live=exp.party.filter(m=>m.hp>0);
 let lead=info.throne||exp.mode==='dungeon'?live.find(m=>m.kind==='prince'):null;lead=lead||live.find(m=>m.kind==='guard')||live.find(m=>m.kind==='servant')||live.find(m=>m.kind==='prince');
 if(!lead){expeditionEnd('defeat');return}
 const level=lead.level||guardLevel(),ally=lead.kind==='prince'?combatant('Young Prince',level,lead.maxHp,state.hungryDays>=2?1-MC_HUNGER_PENALTY:1,.65):combatant(lead.name,level,lead.maxHp,state.hungryDays>=1?1-SERVANT_HUNGER_PENALTY:1,.65);
 ally.hp=Math.min(ally.maxHp,lead.hp);
 const enemy=combatant(info.name,info.level,Math.round(hpForLevel(info.level)*(info.health||1)),info.damage||1,info.skill);if(enemyHp!==undefined)enemy.hp=Math.min(enemy.maxHp,enemyHp);
 const auto=lead.kind!=='prince';
 state.invasion.combat={kind:auto?'servant':'mc',exp:true,auto,defenderId:null,leadId:lead.id,ally,enemy,turn:'ally',turnNumber:1,waitMs:700,noMoves:false,winner:null,log:[auto?`${lead.name} fights ${info.name}.`:'Each turn: five random cards and 10 energy. Tap a card to play it.'],lastAction:'',lastCard:null,lastBy:null,lastCount:0,lastMs:0,lockMs:0,enemyInfo:{name:info.name,variant:info.variant,level:info.level,key,roomType:expTile(key).type,throne:info.throne,boss:info.boss,dungeon:exp.mode==='dungeon'}};
 exp.status='battle';exp.encounter={key,info};beginCombatTurn('ally');save();renderBattle();renderExpedition()}
function resolveExpeditionCombat(c){
 const exp=state.expedition;state.invasion.combat=null;const m=$('battle-dialog');if(m?.open)m.close();
 if(!exp){save();render();return}
 const member=exp.party.find(x=>x.id===c.leadId),key=exp.encounter.key,info=exp.encounter.info;
 if(c.winner==='ally'){
  if(member)member.hp=Math.max(1,Math.ceil(c.ally.hp));gainXp('mc',8+c.enemy.level*2);exp.cleared.push(key);exp.encounter=null;
  if(info.boss)return expeditionEnd('dungeonVictory');
  if(info.throne){exp.status='victoryChoice';exp.log.push(`${info.name} is beaten. The stronghold is yours to decide.`)}
  else{exp.status='exploring';exp.log.push(`${info.name} is defeated.`);lootRoom(key,true)}
  save();renderExpedition();return}
 if(exp.mode==='dungeon')return expeditionEnd('defeat');
 if(member){member.hp=0;if(member.kind==='guard'){state.guards=state.guards.filter(g=>g.id!==member.id);note(`${member.name} fell and is lost for good. Buy a replacement at the Barracks.`)}else if(member.kind==='servant'){state.collectors=state.collectors.filter(n=>n.id!==member.id);note(`${member.name} fell and is lost for good.`)}}
 exp.party=exp.party.filter(x=>x.hp>0);
 if(!exp.party.length||member?.kind==='prince')return expeditionEnd('defeat');
 beginExpBattle(info,key,c.enemy.hp)}
function expeditionEnd(result){
 const exp=state.expedition,c=expCastle();if(!exp)return;
 const loot=exp.loot,parts=EXP_RES.filter(k=>loot[k]>0).map(k=>`${loot[k]} ${RESOURCE_INFO[k].name.toLowerCase()}`);
 if(exp.mode==='dungeon')finishDungeon(exp,result);
 else if(result==='defeat'){if(c)for(const k of EXP_RES)c.treasury[k]=roundResource(c.treasury[k]+(loot[k]||0));note(`The expedition against ${c?.rulingName||'the stronghold'} failed.${parts.length?' The loot was returned.':''}`);toast('The expedition failed. Carried loot was returned.')}
 else{for(const k of EXP_RES)state[k]=roundResource(state[k]+(loot[k]||0));if(result==='takeover'){note(`${c.rulingName} is now yours. Its prince and defenders swear loyalty, and it sends you 25% of what it makes each day.`);toast(`${c.rulingName} is now yours!`)}else note(`Expedition against ${c?.rulingName||'the stronghold'} ended. ${parts.length?'You brought home '+parts.join(', ')+'.':'You brought home nothing.'}`);if(result!=='takeover')toast(parts.length?'You brought home '+parts.join(', ')+'.':'You returned empty-handed.')}
 state.expedition=null;if($('expdialog').open)$('expdialog').close();save();if(window.cloudPushSoon)cloudPushSoon();render();if(result==='takeover')checkConquest()}
function enterRoom(key){
 const exp=state.expedition;if(!exp||exp.status!=='exploring')return false;
 const cur=expTile(exp.current),t=expTile(key);if(!cur||!t)return false;
 if(!expNeighbors(cur,expCastle().tiles).some(n=>roomKey(n.room)===key))return false;
 if(t.type===0&&exp.mode!=='attack'){toast('Raiders cannot enter the throne room.');return false}
 const c=expCastle();
 if(exp.mode==='dungeon'&&key===c.bossKey&&c.keyRoom&&!exp.vaultKey){
  toast('The Boss Vault is locked. Search the side chambers for its key.');
  return false;
 }
 exp.current=key;if(!exp.discovered.includes(key))exp.discovered.push(key);
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
 if(exp.mode==='dungeon'){
  if(await askConfirm('Leave the dungeon?','You keep your supplies and can resume from this room on your next visit.','Leave and keep loot','Keep exploring')&&state.expedition===exp)expeditionEnd('left');
  return;
 }
 if(await askConfirm('Leave the stronghold?','You keep everything you have collected. A later expedition starts with the rooms hidden again.','Leave and keep loot','Keep exploring'))expeditionEnd('left')}
function takeOver(){const exp=state.expedition,c=expCastle();if(!exp||exp.status!=='victoryChoice'||!c)return;c.ownerId='player';c.flag='player';c.capturedDay=state.day;c.shield=3;expeditionEnd('takeover')}
function checkConquest(){if(!state.world||state.worldWon||!state.world.castles.every(c=>c.ownerId==='player'))return;state.worldWon=true;note('Every stronghold on the map is yours. You rule them all!');save();askConfirm('You rule them all!','Every stronghold on the world map now belongs to you. You may keep playing.','Keep playing','Close')}
function stealResources(){if(state.expedition?.status==='victoryChoice')expeditionEnd('steal')}
const EXP_ARROW=['▲','▶','▼','◀'];
function renderExpedition(){
 if(typeof renderPackBar==='function')renderPackBar($('exp-pack'),'march');
 const exp=state.expedition,dlg=$('expdialog');if(!exp){if(dlg.open)dlg.close();return}
 const c=expCastle();if(!c){state.expedition=null;if(dlg.open)dlg.close();return}
 if(!dlg.open&&!awaitingResume)dlg.showModal();
 $('exp-mode').textContent=exp.mode==='dungeon'?dungeonTier(exp.castleId).tier.toUpperCase()+' DUNGEON':exp.mode==='raid'?'RAID':'ATTACK';$('exp-title').textContent=c.rulingName;
 const party=$('exp-party');party.replaceChildren();
 for(const m of exp.party){const d=document.createElement('div');d.className='exp-member'+(m.hp<=0?' down':'');const a=document.createElement('span');a.className='exp-face';const kind=m.kind==='prince'?'mc':'servant';a.style.backgroundImage=`url("${COMBAT_ART[kind][m.kind==='prince'?0:(m.look||0)]}")`;const nm=document.createElement('b');nm.textContent=m.name;const bar=document.createElement('i');bar.innerHTML=`<u style="width:${Math.max(0,m.hp/m.maxHp*100)}%"></u>`;d.append(a,nm,bar);party.append(d)}
 const loot=$('exp-loot');const parts=EXP_RES.filter(k=>exp.loot[k]>0).map(k=>`${exp.loot[k]} ${RESOURCE_INFO[k].name}`);loot.textContent='Carrying: '+(parts.join(' · ')||'nothing yet');
 const tiles=exp.discovered.map(expTile).filter(Boolean),minX=Math.min(...tiles.map(t=>t.x)),maxX=Math.max(...tiles.map(t=>t.x)),minY=Math.min(...tiles.map(t=>t.y)),maxY=Math.max(...tiles.map(t=>t.y));
 const grid=$('exp-grid');grid.replaceChildren();grid.style.gridTemplateColumns=`repeat(${maxX-minX+1},var(--ecell))`;grid.style.gridTemplateRows=`repeat(${maxY-minY+1},var(--ecell))`;
 const busy=exp.status!=='exploring';
 for(const t of tiles){
  const key=roomKey(t),cell=document.createElement('div');cell.className='exp-cell'+(key===exp.current?' here':'')+(exp.looted.includes(key)?' looted':'');cell.style.gridColumn=t.x-minX+1;cell.style.gridRow=t.y-minY+1;
  const im=document.createElement('img');im.src=art(t.type);im.alt=TYPES[t.type][0];im.style.transform=`rotate(${t.rot*90}deg)`;cell.append(im);
  const lab=document.createElement('span');lab.className='exp-label';lab.textContent=key===c.bossKey?'Boss Vault':TYPES[t.type][0];cell.append(lab);
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
window.addEventListener('message',e=>{const d=e.data;if(e.source!==$('mapframe').contentWindow||e.origin!==location.origin||!$('mapdialog').open)return;if(d&&d.type==='startExpedition'&&typeof d.castleId==='string'&&['raid','attack','dungeon'].includes(d.mode))startExpedition(d.mode,d.castleId)});
