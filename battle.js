/* Full-screen party battle scene. Rules stay in characters.js; this file only draws and animates. */
const BATTLE_FX={key:'',seen:0,prev:null,figs:[],lead:null,enemy:null,busy:0};
const BATTLE_BG={0:'throne',1:'barracks',2:'kitchen',3:'armory',4:'warroom',5:'library',6:'chapel',7:'dungeon',8:'greathall',9:'alchemy',10:'vault',11:'dungeon',17:'gatehouse'},BATTLE_BG_SPARE=['greathall','dungeon','winecellar','smithy','bedchamber'];
function battleBackdrop(c){const inv=state.invasion.active,room=c.kind==='mc'?state.tiles.find(t=>t.type===0):roomFromKey(inv.room);let name=BATTLE_BG[room?room.type:0];if(!name)name=BATTLE_BG_SPARE[Math.floor(Math.random()*BATTLE_BG_SPARE.length)];const bg=$('bs-bg');bg.style.backgroundImage=`url("backdrops/${name}.jpg")`;bg.dataset.room=name}
function battleFig(el,kind,idx,role){return{el,mover:el.querySelector('.bf-move'),art:el.querySelector('.bf-art'),atlas:COMBAT_ART[kind][idx]||COMBAT_ART[kind][0],role,until:0,row:0,hit:0,heal:0}}
function battleBuild(c){
 const inv=state.invasion.active,stage=$('bs-stage');stage.replaceChildren();battleBackdrop(c);BATTLE_FX.figs=[];
 const party=[];
 const sv=state.collectors.filter(n=>!inv.knocked.includes(n.id)&&n.id!==c.defenderId);
 if(c.kind==='mc'){party.push({kind:'mc',idx:0,name:c.ally.name,role:'lead'});for(const n of sv.slice(0,3))party.push({kind:'servant',idx:n.look||0,name:n.name,role:'help'})}
 else{const d=servantById(c.defenderId);party.push({kind:'servant',idx:d?.look||0,name:c.ally.name,role:'lead'});party.push({kind:'mc',idx:0,name:'Young Prince',role:'help'});for(const n of sv.slice(0,2))party.push({kind:'servant',idx:n.look||0,name:n.name,role:'help'})}
 const slots=[[28,77,1],[14,72,.82],[40,70,.78],[7,81,.86]];
 const order=party.map((p,i)=>({p,s:slots[i]})).sort((a,b)=>a.s[1]-b.s[1]);
 const mk=(p,x,y,sc,enemy)=>{const el=document.createElement('div');el.className='bf'+(enemy?' enemy':'')+(p.role==='lead'?' lead':'');el.style.cssText=`left:${x}%;top:${y}%;--sc:${sc};z-index:${Math.round(y)}`;el.innerHTML='<div class="bf-shadow"></div><div class="bf-move"><div class="bf-guard"></div><div class="bf-art"></div><span class="bf-name"></span></div>';el.querySelector('.bf-name').textContent=p.name;stage.append(el);const f=battleFig(el,p.kind,p.idx,p.role);f.enemy=!!enemy;f.base={x,y};BATTLE_FX.figs.push(f);return f};
 for(const o of order){const f=mk(o.p,o.s[0],o.s[1],o.s[2],false);if(o.p.role==='lead')BATTLE_FX.lead=f}
 BATTLE_FX.enemy=mk({kind:'invader',idx:inv.variant,name:inv.name,role:'lead'},74,77,1.05,true);BATTLE_FX.enemy.atlas=COMBAT_ART.invader[inv.variant]||COMBAT_ART.invader[0];
 for(const f of BATTLE_FX.figs)f.art.style.backgroundImage='url("'+f.atlas+'")';
}
function battleCenter(f){const r=f.art.getBoundingClientRect(),s=$('bs-stage').getBoundingClientRect();return{x:r.left+r.width/2-s.left,y:r.top+r.height*.4-s.top}}
function battleFloat(f,text,color){const p=battleCenter(f),e=document.createElement('div');e.className='bs-float';e.textContent=text;e.style.cssText=`left:${p.x}px;top:${p.y-40}px;color:${color}`;$('bs-stage').append(e);setTimeout(()=>e.remove(),1300)}
function battleBurst(f,count,color,rise){const p=battleCenter(f),st=$('bs-stage'),m=motionOK();for(let i=0;i<(m?count:Math.ceil(count/3));i++){const e=document.createElement('i');e.className='bs-p';const a=Math.random()*6.283,sp=rise?20+Math.random()*30:40+Math.random()*90,dx=rise?(Math.random()-.5)*60:Math.cos(a)*sp,dy=rise?-40-Math.random()*90:Math.sin(a)*sp;e.style.cssText=`left:${p.x}px;top:${p.y+(rise?30:0)}px;background:${color};width:${3+Math.random()*4}px;height:${3+Math.random()*4}px`;st.append(e);e.animate([{transform:'translate(0,0)',opacity:1},{transform:`translate(${dx}px,${dy}px)`,opacity:0}],{duration:600+Math.random()*500,easing:'ease-out'}).onfinish=()=>e.remove()}}
function battleShake(){if(!motionOK())return;const st=$('battle-scene');st.animate([{transform:'translate(0,0)'},{transform:'translate(-9px,5px)'},{transform:'translate(8px,-6px)'},{transform:'translate(-5px,3px)'},{transform:'translate(0,0)'}],{duration:320,easing:'ease-out'})}
function battleLunge(f,target,scale,delay){const a=battleCenter(f),b=battleCenter(target),dx=(b.x-a.x)*(f.enemy?.62:.7)*scale,dy=(b.y-a.y)*.5*scale;f.until=performance.now()+delay+800;f.row=1;f.start=performance.now()+delay;if(!motionOK())return;f.mover.animate([{transform:'translate(0,0)'},{transform:'translate(0,0)',offset:.001},{transform:`translate(${dx}px,${dy}px)`,offset:.32},{transform:`translate(${dx}px,${dy}px)`,offset:.5},{transform:'translate(0,0)'}],{duration:800,delay,easing:'ease-in-out'})}
function battleHit(f,delay){setTimeout(()=>{f.hitUntil=performance.now()+420;f.el.classList.add('bf-hit');setTimeout(()=>f.el.classList.remove('bf-hit'),420);if(motionOK())f.mover.animate([{transform:'translateX(0)'},{transform:'translateX(-14px)'},{transform:'translateX(10px)'},{transform:'translateX(-6px)'},{transform:'translateX(0)'}],{duration:360})},delay)}
function battleEffect(c){
 const card=CARD_BY_ID[c.lastCard],by=c.lastBy,P=BATTLE_FX.prev,lead=BATTLE_FX.lead,en=BATTLE_FX.enemy,party=BATTLE_FX.figs.filter(f=>!f.enemy);if(!card||!P)return;
 const A=c.ally,E=c.enemy;
 if(card.type==='attack'){
  const actor=by==='ally'?lead:en,target=by==='ally'?en:lead,sideAfter=by==='ally'?E:A,sideBefore=by==='ally'?P.enemy:P.ally;
  battleLunge(actor,target,1,0);if(by==='ally')party.filter(f=>f!==lead).forEach((f,i)=>battleLunge(f,target,.55,90+i*70));
  const dmg=Math.round(sideBefore.hp-sideAfter.hp),blk=Math.round(sideBefore.block-sideAfter.block);
  setTimeout(()=>{battleHit(target,0);battleShake();battleBurst(target,26,'#ffd36b');battleFloat(target,dmg>0?'-'+dmg:'Blocked',dmg>0?'#ff7b7b':'#9cc8ff');if(blk>0&&dmg>0)setTimeout(()=>battleFloat(target,blk+' blocked','#9cc8ff'),250)},300)}
 else if(card.type==='defense'){const g=(by==='ally'?party:[en]);g.forEach(f=>{f.el.classList.add('bf-shield');setTimeout(()=>f.el.classList.remove('bf-shield'),1100);battleBurst(f,10,'#9cc8ff')});battleFloat(by==='ally'?lead:en,'+'+Math.round((by==='ally'?A:E).block-(by==='ally'?P.ally:P.enemy).block)+' block','#9cc8ff')}
 else if(card.type==='healing'){const g=(by==='ally'?party:[en]);g.forEach(f=>{f.healUntil=performance.now()+900;battleBurst(f,12,'#7be6a1',true)});const h=Math.round((by==='ally'?A:E).hp-(by==='ally'?P.ally:P.enemy).hp);battleFloat(by==='ally'?lead:en,'+'+h,'#7be6a1')}
 else{const f=by==='ally'?lead:en;if(motionOK())f.mover.animate([{transform:'translateY(0)'},{transform:'translateY(-22px)'},{transform:'translateY(-22px)'},{transform:'translateY(0)'}],{duration:900,easing:'ease-in-out'});battleBurst(f,24,'#ffcc55');battleFloat(f,'+'+Math.round((by==='ally'?A:E).energy-(by==='ally'?P.ally:P.enemy).energy)+' energy','#ffcc55')}
}
function renderBattle(){
 if(awaitingResume)return;const c=state.invasion?.combat,modal=$('battle-dialog');if(!modal)return;
 if(!c){if(modal.open)modal.close();BATTLE_FX.key='';return}
 const inv=state.invasion.active,key=[c.kind,c.defenderId,inv?.variant,inv?.name,inv?.level].join('|');
 if(!modal.open)modal.showModal();
 if(BATTLE_FX.key!==key){BATTLE_FX.key=key;battleBuild(c);BATTLE_FX.seen=c.lastCount;BATTLE_FX.prev=null;BATTLE_FX.over=false;$('battle-hand').dataset.sig='';$('battle-played').dataset.sig=''}
 const actor=c[c.turn];
 $('battle-title').textContent=c.kind==='mc'?'Defend the Throne':'Servant Skirmish';
 $('battle-subtitle').textContent=`Turn ${c.turnNumber} · ${actor.name}’s turn`;
 for(const side of ['ally','enemy']){const a=c[side];$('battle-'+side+'-name').textContent=`${a.name} · Level ${a.level}`;$('battle-'+side+'-stats').textContent=`Health ${Math.ceil(a.hp)} / ${a.maxHp}${a.block?' · Block '+a.block:''}`;$('battle-'+side+'-hp').style.width=Math.max(0,a.hp/a.maxHp*100)+'%';$('battle-'+side+'-blk').style.width=Math.min(100,a.block/a.maxHp*100)+'%';$('battle-'+side+'-pips').textContent='●'.repeat(a.energy)+'○'.repeat(10-a.energy)}
 for(const f of BATTLE_FX.figs)f.el.classList.toggle('bf-guarded',f.enemy?c.enemy.block>0:c.ally.block>0);
 if(c.lastCount!==BATTLE_FX.seen){BATTLE_FX.seen=c.lastCount;battleEffect(c)}
 BATTLE_FX.prev={ally:{hp:c.ally.hp,block:c.ally.block,energy:c.ally.energy},enemy:{hp:c.enemy.hp,block:c.enemy.block,energy:c.enemy.energy}};
 if(c.winner&&!BATTLE_FX.over){BATTLE_FX.over=true;const loser=c.winner==='ally'?[BATTLE_FX.enemy]:BATTLE_FX.figs.filter(f=>!f.enemy);setTimeout(()=>loser.forEach(f=>f.el.classList.add('bf-down')),500)}
 const canAct=c.kind==='mc'&&c.turn==='ally'&&!c.winner&&!c.noMoves&&!((c.lockMs||0)>0),played=$('battle-played'),psig=c.lastCard&&c.lastMs>0?c.lastCard+':'+c.lastCount:'';
 if(played.dataset.sig!==psig){played.dataset.sig=psig;played.innerHTML=psig?cardHTML(CARD_BY_ID[c.lastCard],c[c.lastBy].level)+`<p>${c.lastAction}</p>`:''}
 $('battle-result').textContent=c.winner?(c.winner==='ally'?'Victory!':'Defeated!'):'';
 $('battle-action-status').textContent=c.winner?'Battle finished':c.noMoves?`${actor.name} has no playable cards · turn ends`:c.auto?`Watching ${actor.name}’s turn`:c.turn!=='ally'?`Enemy turn · ${actor.name} is playing`:(c.lockMs||0)>0?'Card played…':'Your turn · tap a card to play it';
 const hand=$('battle-hand'),sig=[c.turn,actor.hand.join(','),actor.energy,actor.level,canAct].join('|');
 if(hand.dataset.sig!==sig){hand.dataset.sig=sig;hand.replaceChildren();actor.hand.forEach((id,i)=>{const card=CARD_BY_ID[id],b=document.createElement('button');b.className='hand-card'+(card.cost>actor.energy?' unplayable':'');b.style.setProperty('--i',i-(actor.hand.length-1)/2);b.disabled=!canAct||card.cost>actor.energy;b.innerHTML=cardHTML(card,actor.level);b.setAttribute('aria-label',`Play ${card.name}, ${card.cost} energy`);b.onclick=()=>choosePlayerCard(i);hand.append(b)});if(!actor.hand.length){const p=document.createElement('p');p.className='muted';p.textContent='No cards left this turn.';hand.append(p)}}
 $('battle-skip').hidden=!(c.auto&&!c.winner);
 const log=$('battle-log');log.textContent=c.log.join('\n');
}
function animateCombatVisuals(now){
 const c=state?.invasion?.combat;
 if(c&&BATTLE_FX.figs.length){const t=performance.now();for(const f of BATTLE_FX.figs){let row=0,frame=Math.floor(now/200)%8;
  if(f.until>t&&t>=(f.start||0)){row=f.healUntil>t?3:1;frame=Math.min(7,Math.floor((t-f.start)/650*8))}
  else if(f.healUntil>t){row=3;frame=Math.floor(now/110)%8}
  else if(f.hitUntil>t){row=2;frame=Math.min(7,Math.floor((1-(f.hitUntil-t)/420)*8))}
  if(f.until<=t&&f.row===1)f.row=0;
  f.art.style.backgroundPosition=`${frame/7*100}% ${row/3*100}%`}}
 requestAnimationFrame(animateCombatVisuals)}
