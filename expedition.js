/* Raids and attacks on rival strongholds: guards, barracks, fog-of-war exploration, room battles and loot. */
const RAID_RATE=.1,DEFENDED_RATE=.2,EXP_RES=['gold','stone','food','rp'];
function guardLevel(){return Math.min(state.prince.level,MAX_LEVEL)}
function guardRecruitment(room){
 const paladin=room.type===6;
 const guards=state.guards.filter(g=>paladin?g.paladin&&g.chapel===roomKey(room):!g.paladin);
 const cap=paladin?1:room.level||1;
 const base=30+10*(guardLevel()-1),cost=paladin?Math.ceil(base*1.5):base+15*guards.length;
 const allowed=!state.over&&!state.expedition&&!state.invasion.active&&state.tiles.includes(room)&&guards.length<cap&&state.gold>=cost;
 return {paladin,guards,cap,cost,allowed};
}
function hireGuard(room){
 const {paladin,cost,allowed}=guardRecruitment(room);
 if(!allowed)return false;
 let id;
 do{id='g'+(state.nextGuardId=(state.nextGuardId||0)+1)}while(state.guards.some(g=>g.id===id));
 const title=paladin?'Paladin':'Guard',used=new Set(state.guards.map(g=>g.name));
 const pool=SERVANT_NAME_POOL.filter(n=>!used.has(title+' '+n));
 const name=title+' '+(pool.length?pool[Math.floor(Math.random()*pool.length)]:id);
 const guard={id,guard:true,name,look:Math.floor(Math.random()*5),home:null,x:room.x+.5,y:room.y+.5,path:[],mode:'wander',waitMs:600};
 if(paladin){guard.paladin=true;guard.chapel=roomKey(room)}
 state.gold=roundResource(state.gold-cost);state.guards.push(guard);
 note(name+' joined the keep.');save();render();return true;
}
function renderBarracks(target,room){
 const {paladin,guards,cap,cost,allowed}=guardRecruitment(room);
 const box=document.createElement('section'),h=document.createElement('h3'),p=document.createElement('p'),b=document.createElement('button'),n=document.createElement('p');
 h.textContent=paladin?'Paladin':'Guards';p.className='muted';
 p.textContent=guards.length?guards.map(g=>g.name+' · Level '+guardLevel()).join(' · '):'No recruits yet.';
 b.textContent='Hire '+(paladin?'a Paladin':'a guard')+' · '+cost+' gold ('+guards.length+' of '+cap+')';
 b.disabled=!allowed;b.onclick=()=>hireGuard(room);
 n.className='muted';n.textContent=paladin?'Long bastard sword. +5% health, attack damage, and defense card block. Counts as a guard.':'Upgrade the Barracks to unlock one more guard slot per level.';
 box.append(h,p,b,n);target.append(box);
}

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
function availableUnits(){return [...state.guards.map(g=>({id:g.id,kind:'guard',name:g.name,look:g.look,level:guardLevel(),paladin:g.paladin===true})),...state.collectors.map(n=>({id:n.id,kind:'servant',name:n.name,look:n.look,level:n.level||1}))]}
function partyIssue(mode,ids){
 const units=availableUnits().filter(u=>ids.includes(u.id)),guards=units.filter(u=>u.kind==='guard').length,servants=units.length-guards;
 if(mode!=='raid'){if(guards!==1)return'Choose exactly one guard to join the prince.';if(servants>1)return'You can bring only one servant.';return''}
 if(units.length<1)return'Choose at least one guard or servant.';if(units.length>3)return'A raid party has at most three units.';return''}
function choosePartyDialog(mode,castleId){
 const why=expReason(mode,castleId);if(why){toast(why);return false}
 const target=mode==='dungeon'?dungeonTier(castleId).name:castleById(castleId).rulingName,dlg=$('partydialog'),list=$('party-list'),units=availableUnits(),pick=new Set();
 $('party-title').textContent=(mode==='raid'?'Choose your raid party':mode==='dungeon'?'Choose your dungeon party':'Choose your attack party')+' · '+target;
 $('party-rules').textContent=mode==='raid'?'A raid party is one to three guards or servants. The prince stays home.':'Bring the prince, one guard, and optionally one servant.';
 const start=$('party-start'),msg=$('party-msg');
 const refresh=()=>{const issue=partyIssue(mode,[...pick]);msg.textContent=issue;start.disabled=!!issue;for(const b of list.querySelectorAll('button.party-unit'))b.classList.toggle('on',pick.has(b.dataset.id)||pick.has(Number(b.dataset.id)))};
 list.replaceChildren();
 if(mode!=='raid'){const p=document.createElement('div');p.className='party-unit locked on';p.textContent='Young Prince · Level '+state.prince.level+' (always joins)';list.append(p)}
 for(const u of units){const b=document.createElement('button');b.className='party-unit';b.dataset.id=u.id;const art=document.createElement('span');art.className='portrait';portraitStyle(art,u.look||0);const t=document.createElement('span');t.innerHTML='';const nm=document.createElement('strong');nm.textContent=u.name;const sm=document.createElement('small');sm.textContent=(u.paladin?'Paladin':u.kind==='guard'?'Guard':'Servant')+' · Level '+u.level;t.append(nm,sm);b.append(art,t);b.onclick=()=>{if(pick.has(u.id))pick.delete(u.id);else pick.add(u.id);refresh()};list.append(b)}
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
  return dungeon.blocked||(dungeon.remaining>0?'The Boss Vault is still sealed.':'')||
   (state.guards.length?'':'A dungeon needs your prince and one guard. Hire a guard at your Barracks.');
 }
 const c=castleById(id);if(!state.world||!c)return'That stronghold is not part of this game.';
 if(c.ownerId==='player')return'This stronghold already belongs to you.';if(state.over)return'Your keep has fallen.';if(state.expedition)return'An expedition is already under way.';
 if(state.invasion.active||state.invasion.combat)return'Finish the invasion first.';
 if(mode==='attack'&&!state.guards.length)return'An attack needs your prince and at least one guard. Hire a guard at your Barracks.';if(mode==='raid'&&!availableUnits().length)return'A raid needs at least one available guard or servant.';return''}
function startExpedition(mode,castleId,ids){
 const why=expReason(mode,castleId);if(why){toast(why);return false}
 if(!Array.isArray(ids))return choosePartyDialog(mode,castleId);if(partyIssue(mode,ids)){toast(partyIssue(mode,ids));return false}
 const party=availableUnits().filter(u=>ids.includes(u.id)).map(u=>({id:u.id,kind:u.kind,name:u.name,look:u.look,level:u.level,hp:0,maxHp:0}));
 if(mode!=='raid')party.push({id:'mc',kind:'prince',name:'Young Prince',look:0,level:state.prince.level,hp:0,maxHp:0});
 for(const m of party){m.maxHp=m.kind==='prince'?Math.round(hpForLevel(m.level)*(state.hungryDays>=5?.8:1)):Math.round(hpForLevel(m.level)*(m.paladin?1.05:1));m.hp=m.maxHp}
 if(mode==='dungeon')return startDungeonVisit(castleId,party);
 const c=castleById(castleId),entrance=c.tiles.find(t=>t.type===17);if(!entrance)return false;
 const producers={};for(const t of c.tiles)if(t.type!==0)for(const k of Object.keys(roomRates(t)))producers[k]=(producers[k]||0)+1;
 const share={};for(const k of EXP_RES)share[k]=producers[k]?c.treasury[k]/producers[k]:0;
 const key=roomKey(entrance);
 state.expedition={id:'x'+Date.now().toString(36),mode,castleId,party,partySize:party.length,current:key,discovered:[key],looted:[],cleared:[],loot:{gold:0,stone:0,food:0,rp:0},share,status:'exploring',encounter:null,log:['You arrive at the gate of '+c.rulingName+'.']};
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
function reinforcedRoom(exp,key){
 if(exp.partySize!==3)return false;
 const layout=expCastle();
 const dungeon=exp.mode==='dungeon';
 if(key===layout.bossKey)return exp.castleId!=='dungeon-low';
 if(exp.mode==='attack'&&expTile(key)?.type===0)return true;
 const limit=exp.castleId==='dungeon-high'?3:exp.castleId==='dungeon-medium'||exp.mode==='attack'?2:1;
 const rooms=Object.keys(layout.defenders).filter(room=>room!==layout.bossKey).sort();
 return rooms.filter((room,index)=>index%Math.max(1,Math.floor(rooms.length/limit))===0).slice(0,limit).includes(key);
}
function enterExpBattle(info,key){
 const exp=state.expedition;
 if(!reinforcedRoom(exp,key))return beginExpBattle(info,key);
 const name=exp.mode==='dungeon'?'Vault sentry':'Reserve guard';
 const level=Math.max(1,info.level-1);
 exp.log.push(name+' blocks the way. A second defender waits behind.');
 return beginExpBattle({name,level,variant:info.variant,skill:.55,health:.8},key,undefined,info);
}
function beginExpBattle(info,key,enemyHp,followup){
 const exp=state.expedition,live=exp.party.filter(m=>m.hp>0);
 let lead=info.throne||exp.mode==='dungeon'?live.find(m=>m.kind==='prince'):null;lead=lead||live.find(m=>m.kind==='guard')||live.find(m=>m.kind==='servant')||live.find(m=>m.kind==='prince');
 if(!lead){expeditionEnd('defeat');return}
 const allies=[lead,...live.filter(member=>member!==lead)].map(member=>{
  const level=member.level||guardLevel(),player=member.kind==='prince';
  const penalty=player?state.hungryDays>=2?MC_HUNGER_PENALTY:0:state.hungryDays?SERVANT_HUNGER_PENALTY:0;
  const actor=applyGuardBuffs(combatant(member.name,level,member.maxHp,1-penalty,.65),player||member.kind==='guard',member.paladin);
  return Object.assign(actor,{id:member.id,player,look:member.look||0,hp:Math.min(member.maxHp,member.hp)});
 });
 const enemy=combatant(info.name,info.level,Math.round(hpForLevel(info.level)*(info.health||1)),info.damage||1,info.skill);
 if(enemyHp!==undefined)enemy.hp=Math.min(enemy.maxHp,enemyHp);
 const combat={allies,exp:true,auto:!allies.some(a=>a.player),enemy,turn:'ally',turnNumber:1,waitMs:700,noMoves:false,winner:null,
  log:['Each fighter takes a turn with five cards and 10 energy.'],lastAction:'',lastCard:null,lastBy:null,lastCount:0,lastMs:0,lockMs:0,
  enemyInfo:{name:info.name,variant:info.variant,level:info.level,key,roomType:expTile(key).type,throne:info.throne,boss:info.boss,dungeon:exp.mode==='dungeon'}};
 state.invasion.combat=combat;
 selectCombatAlly(combat,0);
 if(info.boss)window.StrongholdAudio?.play(info.boss);
 exp.status='battle';exp.encounter={key,info,followup};beginCombatTurn('ally');save();renderBattle();renderExpedition()}
function resolveExpeditionCombat(c){
 const exp=state.expedition;state.invasion.combat=null;const m=$('battle-dialog');if(m?.open)m.close();
 if(!exp){save();render();return}
 const member=exp.party.find(x=>x.id===c.leadId),{key,info,followup}=exp.encounter;
 if(c.allies){
  for(const actor of c.allies){
   const participant=exp.party.find(unit=>unit.id===actor.id);
   if(!participant)continue;
   participant.hp=Math.ceil(actor.hp);
   if(participant.hp>0||actor.player||exp.mode==='dungeon')continue;
   if(participant.kind==='guard')state.guards=state.guards.filter(g=>g.id!==participant.id);
   else state.collectors=state.collectors.filter(n=>n.id!==participant.id);
   note(`${participant.name} fell and is lost for good.`);
  }
  exp.party=exp.party.filter(unit=>unit.hp>0);
  if(c.winner!=='ally')return expeditionEnd('defeat');
 }
 if(c.winner==='ally'){
  if(member&&!c.allies)member.hp=Math.max(1,Math.ceil(c.ally.hp));
  if(followup){exp.log.push(info.name+' is defeated. '+followup.name+' steps forward.');return beginExpBattle(followup,key)}
  gainXp('mc',8+c.enemy.level*2);exp.cleared.push(key);exp.encounter=null;
  if(info.boss)return expeditionEnd('dungeonVictory');
  if(info.throne){exp.status='victoryChoice';exp.log.push(`${info.name} is beaten. The stronghold is yours to decide.`)}
  else{exp.status='exploring';exp.log.push(`${info.name} is defeated.`);lootRoom(key,true)}
  save();renderExpedition();return}
 if(exp.mode==='dungeon')return expeditionEnd('defeat');
 if(member){member.hp=0;if(member.kind==='guard'){state.guards=state.guards.filter(g=>g.id!==member.id);note(`${member.name} fell and is lost for good. Buy a replacement at the Barracks.`)}else if(member.kind==='servant'){state.collectors=state.collectors.filter(n=>n.id!==member.id);note(`${member.name} fell and is lost for good.`)}}
 exp.party=exp.party.filter(x=>x.hp>0);
 if(!exp.party.length||member?.kind==='prince')return expeditionEnd('defeat');
 beginExpBattle(info,key,c.enemy.hp,followup)}
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
  window.StrongholdAudio?.play('locked');
  toast('The Boss Vault is locked. Search the side chambers for its key.');
  return false;
 }
 window.StrongholdAudio?.play('door');
 exp.current=key;if(!exp.discovered.includes(key))exp.discovered.push(key);
 if(t.type===0)enterExpBattle(expInfo(key,true),key);
 else if(c.defenders[key]&&!exp.cleared.includes(key))enterExpBattle(expInfo(key,false),key);
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
 const chestButton=$('exp-chest'),chest=exp.mode==='dungeon'?c.chests?.[exp.current]:null;
 chestButton.hidden=busy||!chest||exp.openedChests?.includes(exp.current)||
  !!(c.defenders[exp.current]&&!exp.cleared.includes(exp.current));
 if(!chestButton.hidden){
  const key=exp.current;
  chestButton.textContent=chest.locked?'Unlock chest · 1 Lockpick Set':'Open treasure chest';
  chestButton.onclick=()=>openDungeonChest(key);
 }

 for(const t of tiles){
  const key=roomKey(t),cell=document.createElement('div');cell.className='exp-cell'+(key===exp.current?' here':'')+(exp.looted.includes(key)?' looted':'');cell.style.gridColumn=t.x-minX+1;cell.style.gridRow=t.y-minY+1;
  const im=document.createElement('img');im.src=art(t.type);im.alt=TYPES[t.type][0];im.style.transform=`rotate(${t.rot*90}deg)`;cell.append(im);
  const lab=document.createElement('span');lab.className='exp-label';lab.textContent=key===c.bossKey?'Boss Vault':TYPES[t.type][0];cell.append(lab);
  if(exp.cleared.includes(key)&&t.type!==0){const k=document.createElement('span');k.className='exp-flag';k.textContent='✔ cleared';cell.append(k)}
  const chestHere=exp.mode==='dungeon'?c.chests?.[key]:null;
  if(chestHere){
   const marker=document.createElement('span'),opened=exp.openedChests?.includes(key);
   marker.className='exp-chest-marker';
   marker.textContent=opened?'Chest opened':chestHere.locked?'Locked chest':'Treasure chest';
   cell.append(marker);
  }
  if(key===exp.current){const who=document.createElement('div');who.className='exp-party-token';for(const m of exp.party.slice(0,3)){const f=document.createElement('span');const kind=m.kind==='prince'?'mc':'servant';f.style.backgroundImage=`url("${COMBAT_ART[kind][m.kind==='prince'?0:(m.look||0)]}")`;who.append(f)}cell.append(who)}
  if(!busy&&key!==exp.current){cell.classList.add('go');cell.onclick=()=>moveTo(key)}
  for(const n of expNeighbors(t,c.tiles)){const nk=roomKey(n.room);if(exp.discovered.includes(nk))continue;if(n.room.type===0&&exp.mode!=='attack')continue;const a=document.createElement('button');a.className='exp-arrow d'+n.d;a.textContent=EXP_ARROW[n.d];a.setAttribute('aria-label','Explore an unseen room '+['north','east','south','west'][n.d]);a.disabled=busy;a.onclick=e=>{e.stopPropagation();arrowClick(key,nk)};cell.append(a)}
  grid.append(cell)}
 $('exp-status').textContent=exp.status==='battle'?'Battle in progress. You cannot leave until it ends.':exp.status==='victoryChoice'?'The resident prince is beaten. Choose what to do with the stronghold.':exp.log[exp.log.length-1]||'';
 $('exp-leave').disabled=exp.status!=='exploring';$('exp-choice').hidden=exp.status!=='victoryChoice';
 const l=$('exp-log');l.textContent=exp.log.slice(-4).join('\n')}
function showExpedition(){
 const exp=state.expedition;if(!exp||awaitingResume)return;
 const dungeon=exp.mode==='dungeon'?expCastle():null;
 if(dungeon&&placeDungeonChests(dungeon,dungeonTier(exp.castleId)))save();

 if(exp.status==='battle'&&!state.invasion.combat){exp.status='exploring';const k=exp.current,c=expCastle();if(c&&expTile(k)&&((expTile(k).type===0)||(c.defenders[k]&&!exp.cleared.includes(k)))){const pending=exp.encounter;if(pending?.key===k&&pending.info)beginExpBattle(pending.info,k,undefined,pending.followup);else enterExpBattle(expInfo(k,expTile(k).type===0),k);return}}
 renderExpedition()}
$('exp-leave').onclick=leaveExpedition;$('exp-steal').onclick=stealResources;$('exp-take').onclick=takeOver;$('expdialog').addEventListener('cancel',e=>e.preventDefault());
window.addEventListener('message',e=>{const d=e.data;if(e.source!==$('mapframe').contentWindow||e.origin!==location.origin||!$('mapdialog').open)return;if(d&&d.type==='startExpedition'&&typeof d.castleId==='string'&&['raid','attack','dungeon'].includes(d.mode))startExpedition(d.mode,d.castleId)});
