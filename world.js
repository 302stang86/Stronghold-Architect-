/* Persistent rival strongholds. Generated once when a new stronghold starts and saved with the game. */
const WorldGen=(()=>{
const NAMES=["House Ashford", "House Blackthorn", "House Ravenshield", "House Ironwood", "House Valemont", "House Greywatch", "House Thornwick", "House Stormholt", "House Fairbourne", "House Embercrest", "House Wintermere", "House Goldwyck", "House Dunraven", "House Highmere", "House Redwyne", "House Stonehart", "House Wyrmwood", "House Silverbrook", "House Oakenshield", "House Nightford", "Clan Frosthelm", "Clan Wolfhearth", "Clan Stagmoor", "Clan Brackenfell", "House Kingsward", "House Bellgrave", "House Whitestone", "House Hawkridge", "The Iron Covenant", "The Order of Dawn"],ARMS=["arms-01", "arms-02", "arms-03", "arms-04", "arms-05", "arms-06", "arms-07", "arms-08", "arms-09", "arms-10", "arms-11", "arms-12", "arms-13", "arms-14", "arms-15", "arms-16", "arms-17", "arms-18", "arms-19", "arms-20", "arms-21", "arms-22", "arms-23", "arms-24", "arms-25", "arms-26", "arms-27", "arms-28", "arms-29", "arms-30"],GRID=30,MIN_D=3,HOME={x:14,y:14};
const ri=n=>Math.floor(Math.random()*n),shuf=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=ri(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const sep=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2>=MIN_D**2;
const PRINCE_NAMES=['Aldric','Bran','Cador','Dorian','Edric','Fenwick','Gawain','Hadrian','Ivor','Jorund','Kael','Leofric','Merek','Njal','Osmund','Percival','Rolf','Sigmund','Tancred','Ulric'];
const SERVANT_NAMES=['Alda','Bram','Cedric','Dara','Edmund','Fenna','Gareth','Hilda','Ivo','Joran','Kelda','Lorcan','Maren','Nell','Osric','Petra','Quill','Rowan','Sela','Tobias'];
const EXTRA=[2,5,18,19,16,1];
function layout(){
 const col=8+ri(8),tiles=[{x:col,y:23,type:17,rot:0,level:1},{x:col,y:22,type:15,rot:0,level:1},{x:col,y:21,type:16,rot:0,level:1},{x:col,y:20,type:0,rot:0,level:1}];
 const want=2+ri(4);let tries=0,barracks=false;
 while(tiles.length<4+want&&tries++<200){
  const base=tiles[ri(tiles.length)];if(base.type===0||base.type===17)continue;
  const d=ri(4),x=base.x+DIRS[d][0],y=base.y+DIRS[d][1];
  if(x<1||y<1||x>GRID-7||y>22||tiles.some(t=>t.x===x&&t.y===y))continue;
  if(tiles.some(t=>t.type===0&&Math.abs(t.x-x)+Math.abs(t.y-y)<=1))continue;
  let type=EXTRA[ri(EXTRA.length)];if(type===1&&barracks)continue;
  if(type!==16&&type!==1&&!prereqsMet(type,tiles))continue;
  const nt={x,y,type,rot:0,level:1};if(!placement(nt,tiles))continue;
  if(type===1)barracks=true;tiles.push(nt);
 }
 if(barracks&&!tiles.some(t=>t.type===3)&&Math.random()<.6){for(let k=0;k<40;k++){const b=tiles[ri(tiles.length)];if(b.type===0||b.type===17)continue;const d=ri(4),x=b.x+DIRS[d][0],y=b.y+DIRS[d][1];if(x<1||y<1||x>GRID-7||y>22||tiles.some(t=>t.x===x&&t.y===y)||tiles.some(t=>t.type===0&&Math.abs(t.x-x)+Math.abs(t.y-y)<=1))continue;const nt={x,y,type:3,rot:0,level:1};if(placement(nt,tiles)){tiles.push(nt);break}}}
 return tiles;
}

/* ---- Rival ruler temperaments, fortification and strategy ---- */
const TEMPER=['Warlord','Steward','Turtle'];
const LEVEL_RATE=[.55,.45,.5];            // prince levels gained per campaign day, by temperament
const RAID_EVERY=[9,18,14];                // days between military decisions, by temperament
const BUILD_EVERY=[8,6,7];                 // days between building projects
const MAX_GUARDS=[3,2,2];
const PREFER={0:[1,3,3,4,4,18,2,16,19],1:[18,18,10,2,2,19,19,5,16,3,1],2:[3,3,4,16,16,1,2,18,19,5]};
const DAY_LIMIT_GOLD=f=>250+200*f,DAY_LIMIT_STONE=f=>120+100*f,DAY_LIMIT_FOOD=f=>100+60*f,DAY_LIMIT_RP=f=>60+60*f;
const round6=v=>Math.round(v*1e6)/1e6;
const fortFor=c=>Math.max(1,Math.min(5,1+Math.floor(Math.hypot(c.x-HOME.x,c.y-HOME.y)/4.2)+(c.profile===2?1:0)));
const levelTarget=(w,c,ctx)=>{
 if(c.ownerId==='player')return Math.max(c.prince.level,Math.floor((ctx.playerLevel||1)*.85));
 const empire=empireSize(w,c.ownerId),f=c.fort||fortFor(c);
 return Math.min(MAX_LEVEL,Math.round(2+(ctx.day||1)*LEVEL_RATE[c.profile||0]+f*1.5+(ctx.playerCastles||0)+1.5*(empire-1)));
};
function empireSize(w,ownerId){return w.castles.filter(c=>c.ownerId===ownerId).length}
const hostableTiles=(c)=>c.tiles.filter(t=>![0,12,13,14,15].includes(t.type)&&(t.type!==17||(c.fort||fortFor(c))>=2));
function wantDefenders(c){return Math.min(hostableTiles(c).length,1+(c.fort||fortFor(c))+(c.profile===2?1:0))}
function newDefender(c,key,offset){const L=Math.max(1,c.prince.level-offset);c.defenders[key]={name:SERVANT_NAMES[ri(SERVANT_NAMES.length)],level:L,variant:ri(4),offset}}
function rival(id,p,name,arms){
 const c={id,x:p.x,y:p.y,rulingName:name,armsId:arms,owner:'rival',prince:{name:PRINCE_NAMES[ri(PRINCE_NAMES.length)],level:2,variant:ri(4)},tiles:layout(),defenders:{},treasury:{gold:120+ri(200),stone:60+ri(100),food:60+ri(100),rp:10+ri(30)},profile:ri(3)};
 c.fort=fortFor(c);c.prince.level=Math.min(MAX_LEVEL,Math.round(2+c.fort*1.5+.5));
 const hs=shuf(hostableTiles(c)).slice(0,Math.max(1,wantDefenders(c)-ri(2)));
 for(const t of hs)newDefender(c,t.x+','+t.y,ri(3));
 return c;
}
function generate(){
 const count=7+ri(7),cand=[];for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++)cand.push({x,y});
 const placed=[];for(const p of shuf(cand)){if(sep(p,HOME)&&placed.every(q=>sep(p,q)))placed.push(p);if(placed.length===count)break}
 const names=shuf(NAMES),arms=shuf(ARMS);
 return fix({version:1,id:Date.now().toString(36)+'-'+ri(1e9).toString(36),createdAt:new Date().toISOString(),castles:placed.map((p,i)=>rival('castle-'+(i+1),p,names[i],arms[i]))});
}
function valid(w){return !!w&&w.version===1&&typeof w.id==='string'&&Array.isArray(w.castles)&&w.castles.length>=7&&w.castles.length<=13&&w.castles.every(c=>c&&Number.isInteger(c.x)&&Number.isInteger(c.y)&&typeof c.id==='string'&&typeof c.rulingName==='string'&&typeof c.armsId==='string'&&Array.isArray(c.tiles)&&c.tiles.length>=4&&c.prince&&Number.isInteger(c.prince.level)&&c.defenders&&typeof c.defenders==='object'&&c.treasury&&RESOURCE_KEYS.every(k=>Number.isFinite(c.treasury[k])&&c.treasury[k]>=0))}

const power=L=>hpForLevel(L)*powerForLevel(L);
const guardCostFor=L=>60+8*L;                               // a house's levy costs more as its prince grows
const flagOf=(w,ownerId)=>ownerId==='player'?'player':(w.castles.find(c=>c.id===ownerId)?.armsId||'');
const ownerName=(w,c)=>c.ownerId==='player'?'you':(w.castles.find(x=>x.id===c.ownerId)?.rulingName||c.rulingName);
/* Repairs old saves and adds the newer fields (fortification, alert, grudges). Safe to call every day. */
function fix(w){
 for(const c of w.castles){
  if(typeof c.ownerId!=='string')c.ownerId=c.id;
  if(typeof c.flag!=='string')c.flag=c.armsId;
  if(![0,1,2].includes(c.profile))c.profile=1;
  c.fort=fortFor(c);
  const gmax=MAX_GUARDS[c.profile];
  c.guards=Number.isInteger(c.guards)?Math.max(0,Math.min(gmax,c.guards)):0;
  for(const k of ['levelClock','buildClock','raidClock','shield','alert','warClock']){if(!Number.isFinite(c[k]))c[k]=k==='raidClock'?ri(RAID_EVERY[c.profile]):0}
  if(!c.grudge||typeof c.grudge!=='object'||Array.isArray(c.grudge))c.grudge={};
  if(c.capturedDay!==undefined&&!Number.isFinite(c.capturedDay))delete c.capturedDay;
  for(const d of Object.values(c.defenders)){if(!Number.isFinite(d.offset))d.offset=Math.max(0,Math.min(3,c.prince.level-d.level))}
 }
 return w}
function fortify(c,reserve){
 const L=c.prince.level,keys=hostableTiles(c).map(t=>t.x+','+t.y),empty=keys.filter(k=>!c.defenders[k]);
 const cost=Math.round(24+5*L)*(empty.length&&Object.keys(c.defenders).length<wantDefenders(c)?1:.8);
 if(c.treasury.gold<cost+30+(reserve||0))return false;
 if(empty.length&&Object.keys(c.defenders).length<wantDefenders(c)){newDefender(c,empty[ri(empty.length)],ri(3))}
 else{const weak=Object.values(c.defenders).filter(d=>d.level<L).sort((a,b)=>a.level-b.level)[0];if(!weak)return false;weak.level++}
 c.treasury.gold=round6(c.treasury.gold-cost);return true}
function tryBuild(c,forced){
 if(c.tiles.length>=18)return false;
 const hasBarracks=c.tiles.some(t=>t.type===1),options=forced?[forced]:shuf(PREFER[c.profile]||PREFER[1]);
 for(const type of options){
  if(type===1&&hasBarracks)continue;if(type!==16&&type!==1&&!prereqsMet(type,c.tiles))continue;
  const cost=TYPES[type];if(c.treasury.gold<cost[1]||c.treasury.stone<cost[2])continue;
  for(let n=0;n<60;n++){
   const base=c.tiles[ri(c.tiles.length)];if(base.type===0)continue;const d=ri(4),x=base.x+DIRS[d][0],y=base.y+DIRS[d][1];
   if(x<1||y<1||x>22||y>22||c.tiles.some(t=>t.x===x&&t.y===y)||c.tiles.some(t=>t.type===0&&Math.abs(t.x-x)+Math.abs(t.y-y)<=1))continue;
   const nt={x,y,type,rot:0,level:1};if(!placement(nt,c.tiles))continue;
   c.treasury.gold=round6(c.treasury.gold-cost[1]);c.treasury.stone=round6(c.treasury.stone-cost[2]);c.tiles.push(nt);
   if(![0,12,13,14,15,17].includes(type)&&Object.keys(c.defenders).length<wantDefenders(c)&&Math.random()<.5)newDefender(c,x+','+y,ri(3));
   return true}}
 return false}
/* ---- Military: army strength, target choice, resolution ---- */
const army=(c,mode)=>{const L=c.prince.level;return c.guards*power(L)+(mode==='attack'?power(L):0)+power(L)*.6*(1+(c.profile===0?.5:0))};  // plus the house's levy
function defense(t,ctx){
 const defs=Object.values(t.defenders).sort((a,b)=>b.level-a.level).slice(0,3);
 let D=defs.reduce((a,d)=>a+power(d.level),0)+power(t.prince.level)*1.2+power(1)*.5;
 if(t.ownerId==='player')D+=power(Math.max(1,Math.floor((ctx.playerLevel||1)*.8)))*.8; // your prince's name guards your outposts
 if(t.alert>0)D*=1.15;
 return D}
function pickTarget(w,c,ctx){
 const targets=w.castles.filter(t=>t!==c&&t.ownerId!==c.ownerId&&!(t.shield>0));
 let best=null;
 for(const t of targets){
  const dist=Math.hypot(t.x-c.x,t.y-c.y),A=army(c,'attack'),D=defense(t,ctx),win=A/(A+D);
  const loot=['gold','stone','food'].reduce((s,k)=>s+t.treasury[k]*(k==='food'?.4:1),0)*.12;
  let value=loot+(win>.5?60+25*t.fort:0);
  if(c.grudge&&c.grudge[t.ownerId]!==undefined&&ctx.day-c.grudge[t.ownerId]<40)value+=140;
  if(t.ownerId==='player')value+=c.profile===0?80:20;          // warlords like easy prey; every ruler fears a rising player
  if(empireSize(w,t.ownerId)>=3)value+=60;                    // gang up on the leading empire
  const score=win*value/(1+dist/9)-(1-win)*(c.guards*35);
  if(!best||score>best.score)best={t,score,win,dist}
 }
 return best}
const minWin=[.36,.48,.52];
function transferFaction(w,t,newOwner){
 // A fallen capital drops its vassals: they become independent houses again.
 for(const v of w.castles)if(v!==t&&v.ownerId===t.id)v.ownerId=v.id,v.flag=v.armsId;
 t.ownerId=newOwner;t.flag=flagOf(w,newOwner);delete t.capturedDay}
function invade(w,c,ctx){
 if(c.guards<1)return false;
 const pick=pickTarget(w,c,ctx);if(!pick||pick.win<minWin[c.profile])return false;
 const t=pick.t,L=c.prince.level;
 const mode=pick.win>=(c.profile===0?.5:.62)&&L>=t.prince.level-2?'attack':'raid';
 const A=army(c,mode),defs=shuf(Object.values(t.defenders)).slice(0,3);
 const D=defs.reduce((a,d)=>a+power(d.level),0)+(mode==='attack'?power(t.prince.level)*1.2:0)+power(1)*.5+(t.ownerId==='player'?power(Math.max(1,Math.floor((ctx.playerLevel||1)*.8)))*.8:0);
 const win=Math.random()<Math.max(.08,Math.min(.92,A/(A+D))),lost=Array.from({length:c.guards}).filter(()=>Math.random()<(win?.25:.7)).length;
 c.guards-=lost;t.shield=5;t.alert=Math.max(t.alert||0,4);t.grudge[c.ownerId]=ctx.day;
 const mine=t.ownerId==='player',loot=()=>{const got=[];for(const k of ['gold','stone','food','rp']){const amt=Math.floor(t.treasury[k]*.12);if(amt>0){t.treasury[k]=round6(t.treasury[k]-amt);c.treasury[k]=round6(c.treasury[k]+amt);got.push(amt+' '+k)}}return got};
 const verb=mode==='raid'?'raided':'attacked';
 if(!win){if(mine)ctx.notify(`${c.rulingName} ${verb} your outpost ${t.rulingName} and was driven off.`,true);return true}
 if(mode==='raid'){loot();if(mine)ctx.notify(`${c.rulingName} raided your outpost ${t.rulingName} and carried off some of its stores.`,true);return true}
 if(L>=t.prince.level-1&&Math.random()<.65){
  const wasPlayer=mine;transferFaction(w,t,c.ownerId);
  // The war leaves a mark: the conquered garrison is thinned.
  for(const k of Object.keys(t.defenders))if(Math.random()<.35)delete t.defenders[k];
  ctx.notify(wasPlayer?`${c.rulingName} seized your outpost ${t.rulingName}!`:`${c.rulingName} conquered ${t.rulingName}.`,wasPlayer)}
 else{loot();if(mine)ctx.notify(`${c.rulingName} defeated the prince of your outpost ${t.rulingName} and plundered it.`,true)}
 return true}
/* A rival house now and then sends a warband to your keep: it joins an invasion at your gate. One at a time, spaced out. */
function maybeWarband(w,ctx){
 if(!ctx.warband)return;
 if(!Number.isFinite(w.warCooldown))w.warCooldown=Math.max(2,10-ctx.day)+ri(4);
 if(--w.warCooldown>0||ctx.day<10)return;
 const pc=ctx.playerCastles||0;
 const pool=w.castles.filter(c=>c.ownerId!=='player'&&c.guards>=1).map(c=>{
  const grudge=c.grudge.player!==undefined&&ctx.day-c.grudge.player<25;
  return {c,grudge,weight:1+(c.profile===0?2:0)+(grudge?3:0)+(empireSize(w,c.ownerId)>=3?1:0)}});
 if(!pool.length){w.warCooldown=4;return}
 let r=Math.random()*pool.reduce((a,x)=>a+x.weight,0),pick=pool[0];for(const x of pool){r-=x.weight;if(r<=0){pick=x;break}}
 const c=pick.c;
 w.warCooldown=Math.max(5,12-2*pc)+ri(5);
 ctx.warband({house:c.rulingName,houseId:c.id,level:Math.max(1,Math.min(c.prince.level-1,(ctx.playerLevel||1)+5)),count:Math.min(3,1+(c.fort>=3?1:0)+(pc>=3?1:0)),vengeance:pick.grudge})}
function dayTick(w,ctx){
 fix(w);const order=shuf(w.castles);
 ctx=Object.assign({day:1,playerLevel:1,playerCastles:w.castles.filter(c=>c.ownerId==='player').length,notify:()=>{},tribute:()=>{}},ctx);
 for(const c of w.castles){if(c.shield>0)c.shield--;if(c.alert>0)c.alert--}
 for(const c of order){
  const f=c.fort,tribute=c.ownerId==='player'&&c.capturedDay!==undefined&&ctx.day>c.capturedDay;
  const gain=Object.fromEntries(RESOURCE_KEYS.map(k=>[k,0]));
  for(const t of c.tiles){const r=roomRates(t);for(const k of Object.keys(r))gain[k]+=r[k]}
  gain.gold+=4+2*f;gain.stone+=2+f;                       // every keep has some baseline trade income
  const caps={gold:DAY_LIMIT_GOLD(f),stone:DAY_LIMIT_STONE(f),food:DAY_LIMIT_FOOD(f),rp:DAY_LIMIT_RP(f)};
  for(const k of Object.keys(gain)){
   if(tribute){ctx.tribute(k,gain[k]*.25);c.treasury[k]=Math.min(caps[k],round6(c.treasury[k]+gain[k]*.75))}
   else c.treasury[k]=Math.min(Math.max(c.treasury[k],caps[k]),round6(c.treasury[k]+gain[k]))}
  // Rulers and their garrisons train toward a level set by the campaign day, their fortification, empire size and your conquests.
  const tgt=levelTarget(w,c,ctx);
  if(c.prince.level<tgt)c.prince.level=Math.min(tgt,c.prince.level+(tgt-c.prince.level>6?2:1));
  for(const d of Object.values(c.defenders)){const goal=Math.max(1,c.prince.level-(d.offset||0));if(d.level<goal)d.level++}
  // Spending order: a levy of guards first (it is what lets a house go to war), then building, then reinforcing the garrison.
  c.buildClock++;
  const hasBarracks=c.tiles.some(t=>t.type===1),wantGuard=hasBarracks&&c.guards<MAX_GUARDS[c.profile],gcost=guardCostFor(c.prince.level);
  if(wantGuard&&c.treasury.gold>=gcost){c.treasury.gold=round6(c.treasury.gold-gcost);c.guards++}
  else if(!hasBarracks&&c.treasury.gold>=60&&c.treasury.stone>=30&&tryBuild(c,1)){}
  else if(c.buildClock>=BUILD_EVERY[c.profile]){c.buildClock=0;tryBuild(c)}
  const reserve=wantGuard?gcost:0;
  fortify(c,reserve);if(c.alert>0||c.profile===2)fortify(c,reserve)       // an alerted or cautious ruler reinforces faster
 }
 for(const c of order){
  if(c.ownerId==='player')continue;
  if(++c.raidClock>=RAID_EVERY[c.profile]+ri(4)){c.raidClock=0;if(ctx.day>=8)invade(w,c,ctx)}
 }
 maybeWarband(w,ctx);
}
/* A short, player-facing summary for the world map and attack window. */
function describe(w,c){
 const defs=Object.values(c.defenders),lv=defs.map(d=>d.level);
 return {fort:c.fort||fortFor(c),temper:TEMPER[c.profile]||'Steward',empire:empireSize(w,c.ownerId),defenders:defs.length,minLevel:lv.length?Math.min(...lv):0,maxLevel:lv.length?Math.max(...lv):0,alert:c.alert||0,shield:c.shield||0}}
return {generate,valid,fix,dayTick,flagOf,ownerName,describe,fortFor,empireSize,transfer:transferFaction,TEMPER};
})();