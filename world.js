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
 return {version:1,id:Date.now().toString(36)+'-'+ri(1e9).toString(36),createdAt:new Date().toISOString(),castles:placed.map((p,i)=>rival('castle-'+(i+1),p,names[i],arms[i]))};
}
function valid(w){return !!w&&w.version===1&&typeof w.id==='string'&&Array.isArray(w.castles)&&w.castles.length>=7&&w.castles.length<=13&&w.castles.every(c=>c&&Number.isInteger(c.x)&&Number.isInteger(c.y)&&typeof c.id==='string'&&typeof c.rulingName==='string'&&typeof c.armsId==='string'&&Array.isArray(c.tiles)&&c.tiles.length>=4&&c.prince&&Number.isInteger(c.prince.level)&&c.defenders&&typeof c.defenders==='object'&&c.treasury&&RESOURCE_KEYS.every(k=>Number.isFinite(c.treasury[k])&&c.treasury[k]>=0))}
function daily(w){for(const c of w.castles)for(const t of c.tiles){const r=roomRates(t);for(const k of Object.keys(r))c.treasury[k]=Math.round((c.treasury[k]+r[k])*1e6)/1e6}}
return {generate,valid,daily};
})();
