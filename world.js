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
function rival(id,p,name,arms){
 const tiles=layout(),defenders={},hostable=tiles.filter(t=>![0,12,13,14,15,17].includes(t.type));
 for(const t of shuf(hostable).slice(0,Math.min(hostable.length,1+ri(3))))defenders[t.x+','+t.y]={name:SERVANT_NAMES[ri(SERVANT_NAMES.length)],level:1+ri(3),variant:ri(4)};
 return {id,x:p.x,y:p.y,rulingName:name,armsId:arms,owner:'rival',prince:{name:PRINCE_NAMES[ri(PRINCE_NAMES.length)],level:2,variant:ri(4)},tiles,defenders,treasury:{gold:120+ri(200),stone:60+ri(100),food:60+ri(100),rp:10+ri(30)},profile:ri(3)};
}
function generate(){
 const count=7+ri(7),cand=[];for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++)cand.push({x,y});
 const placed=[];for(const p of shuf(cand)){if(sep(p,HOME)&&placed.every(q=>sep(p,q)))placed.push(p);if(placed.length===count)break}
 const names=shuf(NAMES),arms=shuf(ARMS);
 return fix({version:1,id:Date.now().toString(36)+'-'+ri(1e9).toString(36),createdAt:new Date().toISOString(),castles:placed.map((p,i)=>rival('castle-'+(i+1),p,names[i],arms[i]))});
}
function valid(w){return !!w&&w.version===1&&typeof w.id==='string'&&Array.isArray(w.castles)&&w.castles.length>=7&&w.castles.length<=13&&w.castles.every(c=>c&&Number.isInteger(c.x)&&Number.isInteger(c.y)&&typeof c.id==='string'&&typeof c.rulingName==='string'&&typeof c.armsId==='string'&&Array.isArray(c.tiles)&&c.tiles.length>=4&&c.prince&&Number.isInteger(c.prince.level)&&c.defenders&&typeof c.defenders==='object'&&c.treasury&&RESOURCE_KEYS.every(k=>Number.isFinite(c.treasury[k])&&c.treasury[k]>=0))}

const PROFILE=[{lvl:6,build:8,raid:24},{lvl:4,build:6,raid:16},{lvl:3,build:4,raid:11}];
const BUILD_POOL=[18,18,2,2,19,5,16,1,3,4,10];
function fix(w){for(const c of w.castles){if(typeof c.ownerId!=='string')c.ownerId=c.id;if(typeof c.flag!=='string')c.flag=c.armsId;c.guards=Number.isInteger(c.guards)?Math.max(0,Math.min(2,c.guards)):0;const P=PROFILE[c.profile]||PROFILE[1];for(const k of ['levelClock','buildClock','raidClock','shield']){if(!Number.isFinite(c[k]))c[k]=k==='raidClock'?ri(P.raid):0}if(c.capturedDay!==undefined&&!Number.isFinite(c.capturedDay))delete c.capturedDay}return w}
const power=L=>hpForLevel(L)*powerForLevel(L);
const guardCostFor=L=>30+10*(L-1);
const flagOf=(w,ownerId)=>ownerId==='player'?'player':(w.castles.find(c=>c.id===ownerId)?.armsId||'');
const ownerName=(w,c)=>c.ownerId==='player'?'you':(w.castles.find(x=>x.id===c.ownerId)?.rulingName||c.rulingName);
function tryBuild(c,cap){
 if(c.tiles.length>=18)return;
 const hasBarracks=c.tiles.some(t=>t.type===1),options=shuf(BUILD_POOL);
 for(const type of options){
  if(type===1&&hasBarracks)continue;if(type!==16&&type!==1&&!prereqsMet(type,c.tiles))continue;
  const cost=TYPES[type];if(c.treasury.gold<cost[1]||c.treasury.stone<cost[2])continue;
  for(let n=0;n<60;n++){
   const base=c.tiles[ri(c.tiles.length)];if(base.type===0)continue;const d=ri(4),x=base.x+DIRS[d][0],y=base.y+DIRS[d][1];
   if(x<1||y<1||x>22||y>22||c.tiles.some(t=>t.x===x&&t.y===y)||c.tiles.some(t=>t.type===0&&Math.abs(t.x-x)+Math.abs(t.y-y)<=1))continue;
   const nt={x,y,type,rot:0,level:1};if(!placement(nt,c.tiles))continue;
   c.treasury.gold=Math.round((c.treasury.gold-cost[1])*1e6)/1e6;c.treasury.stone=Math.round((c.treasury.stone-cost[2])*1e6)/1e6;c.tiles.push(nt);
   if(![0,12,13,14,15,17].includes(type)&&Math.random()<.5)c.defenders[x+','+y]={name:SERVANT_NAMES[ri(SERVANT_NAMES.length)],level:Math.max(1,Math.min(cap,c.prince.level-ri(2))),variant:ri(4)};
   return}}
}
function invade(w,c,ctx){
 if(c.guards<1)return; // an NPC prince needs 1-2 guards available before any attack or raid
 const targets=w.castles.filter(t=>t!==c&&t.ownerId!==c.ownerId&&!(t.shield>0));if(!targets.length)return;
 const wts=targets.map(t=>1/(1+Math.hypot(t.x-c.x,t.y-c.y)));let r=Math.random()*wts.reduce((a,b)=>a+b,0),t=targets[0];for(let i=0;i<targets.length;i++){r-=wts[i];if(r<=0){t=targets[i];break}}
 const mode=c.guards>=1&&Math.random()<.6?'raid':'attack',L=Math.min(c.prince.level,ctx.cap);
 const A=c.guards*power(L)+(mode==='attack'?power(L):0),defs=shuf(Object.values(t.defenders)).slice(0,3);
 const D=defs.reduce((a,d)=>a+power(Math.min(d.level,ctx.cap)),0)+(mode==='attack'?power(Math.min(t.prince.level,ctx.cap))*1.2:0)+power(1)*.5;
 const win=Math.random()<Math.max(.1,Math.min(.9,A/(A+D))),lost=Array.from({length:c.guards}).filter(()=>Math.random()<(win?.25:.7)).length;
 c.guards-=lost;t.shield=5;
 const mine=t.ownerId==='player',loot=()=>{const got=[];for(const k of ['gold','stone','food','rp']){const amt=Math.floor(t.treasury[k]*.12);if(amt>0){t.treasury[k]=Math.round((t.treasury[k]-amt)*1e6)/1e6;c.treasury[k]=Math.round((c.treasury[k]+amt)*1e6)/1e6;got.push(amt+' '+k)}}return got};
 if(!win){if(mine)ctx.notify(`${c.rulingName} ${mode==='raid'?'raided':'attacked'} your outpost ${t.rulingName} and was driven off.`,true);return}
 if(mode==='raid'){loot();if(mine)ctx.notify(`${c.rulingName} raided your outpost ${t.rulingName} and carried off some of its stores.`,true);return}
 if(c.prince.level>=t.prince.level&&Math.random()<.5){t.ownerId=c.ownerId;t.flag=flagOf(w,c.ownerId);delete t.capturedDay;ctx.notify(mine?`${c.rulingName} seized your outpost ${t.rulingName}!`:`${c.rulingName} conquered ${t.rulingName}.`,mine)}
 else{loot();if(mine)ctx.notify(`${c.rulingName} defeated the prince of your outpost ${t.rulingName} and plundered it.`,true)}
}
function dayTick(w,ctx){
 fix(w);const cap=ctx.cap,order=shuf(w.castles);
 for(const c of w.castles){if(c.shield>0)c.shield--}
 for(const c of order){
  const P=PROFILE[c.profile]||PROFILE[1],tribute=c.ownerId==='player'&&c.capturedDay!==undefined&&ctx.day>c.capturedDay;
  for(const t of c.tiles){const r=roomRates(t);for(const k of Object.keys(r)){if(tribute){ctx.tribute(k,r[k]*.25);c.treasury[k]=Math.round((c.treasury[k]+r[k]*.75)*1e6)/1e6}else c.treasury[k]=Math.round((c.treasury[k]+r[k])*1e6)/1e6}}
  if(++c.levelClock>=P.lvl){c.levelClock=0;if(c.prince.level<cap)c.prince.level++;for(const d of Object.values(c.defenders))if(d.level<cap&&d.level<c.prince.level&&Math.random()<.6)d.level++}
  if(++c.buildClock>=P.build){c.buildClock=0;tryBuild(c,cap)}
  if(c.tiles.some(t=>t.type===1)&&c.guards<2&&c.treasury.gold>=guardCostFor(c.prince.level)+60){c.treasury.gold=Math.round((c.treasury.gold-guardCostFor(c.prince.level))*1e6)/1e6;c.guards++}
 }
 for(const c of order){if(c.ownerId==='player')continue;const P=PROFILE[c.profile]||PROFILE[1];if(++c.raidClock>=P.raid+ri(5)){c.raidClock=0;invade(w,c,ctx)}}
}
return {generate,valid,fix,dayTick,flagOf,ownerName};
})();
