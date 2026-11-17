/* New stronghold setup: name, motto and banner designer. */
(function(){
const B=window.Banner,SWATCHES=['#1b3b2b','#4a1515','#152a4a','#32154a','#4a3815','#2b2b2b','#6b531d','#822626'];
let dlg,pending=null,cfg;
function opt(list,val){return list.map(([v,l])=>`<option value="${v}"${v===val?' selected':''}>${l}</option>`).join('')}
function build(){
 dlg=document.createElement('dialog');dlg.id='setupdialog';dlg.setAttribute('aria-labelledby','setup-title');
 dlg.innerHTML=`<div class="setup-wrap">
 <div class="setup-head"><small>A NEW STRONGHOLD</small><h2 id="setup-title">Found your stronghold</h2><p class="muted">Choose a name and design your banner. It flies over your castle on the world map.</p></div>
 <div class="setup-main">
  <section class="setup-preview"><canvas id="setup-canvas" width="800" height="1000" aria-label="Banner preview"></canvas><h3 id="setup-showname">Your Stronghold</h3><p id="setup-showmotto" class="muted"></p></section>
  <section class="setup-controls">
   <div class="sgroup"><label for="s-name">Stronghold name</label><input id="s-name" maxlength="30" autocomplete="off" placeholder="The Ashen Keep"><label for="s-motto">Motto (optional)</label><input id="s-motto" maxlength="40" autocomplete="off" placeholder="Vigilance &amp; Steel"></div>
   <div class="sgroup"><label for="s-pattern">Field pattern</label><select id="s-pattern">${opt(B.PATTERNS,cfg.fieldPattern)}</select>
    <div class="srow"><div><label for="s-c1">Primary color</label><input type="color" id="s-c1"></div><div><label for="s-c2">Secondary color</label><input type="color" id="s-c2"></div></div>
    <div class="swatches" id="s-swatches">${SWATCHES.map(c=>`<button type="button" class="swatch" data-c="${c}" style="background:${c}" aria-label="Use ${c}"></button>`).join('')}</div></div>
   <div class="sgroup"><label for="s-emblem">Central emblem</label><select id="s-emblem">${opt(B.EMBLEMS,cfg.emblem)}</select>
    <div class="srow"><div><label for="s-e1">Emblem color</label><input type="color" id="s-e1"></div><div><label for="s-e2">Accent color</label><input type="color" id="s-e2"></div></div>
    <label for="s-scale">Emblem size <span id="s-scaleval"></span></label><input type="range" id="s-scale" min="0.5" max="1.4" step="0.05"></div>
   <div class="sgroup"><label for="s-border">Border</label><select id="s-border">${opt(B.BORDERS,cfg.borderStyle)}</select>
    <div class="srow"><div><label for="s-bc">Border tint</label><input type="color" id="s-bc"></div><label class="check"><input type="checkbox" id="s-cloth"> Woven cloth shading</label></div></div>
   <div class="setup-actions"><button type="button" id="s-random">Randomize banner</button><button type="button" id="s-cancel" hidden>Back to my stronghold</button><button type="button" id="s-begin" class="primary">Begin stronghold</button></div>
  </section>
 </div></div>`;
 document.body.append(dlg);
 const $=id=>dlg.querySelector('#'+id);
 const map={'s-pattern':'fieldPattern','s-c1':'colorPrimary','s-c2':'colorSecondary','s-emblem':'emblem','s-e1':'emblemColor1','s-e2':'emblemColor2','s-border':'borderStyle','s-bc':'borderColor'};
 function redraw(){B.draw($('setup-canvas'),cfg);$('s-scaleval').textContent=Number(cfg.emblemScale).toFixed(2)+'x';$('setup-showname').textContent=$('s-name').value.trim()||'Your Stronghold';$('setup-showmotto').textContent=$('s-motto').value.trim()}
 function sync(){for(const [id,k] of Object.entries(map))$(id).value=cfg[k];$('s-scale').value=cfg.emblemScale;$('s-cloth').checked=cfg.cloth;redraw()}
 for(const [id,k] of Object.entries(map))$(id).addEventListener('input',()=>{cfg[k]=$(id).value;redraw()});
 $('s-scale').addEventListener('input',()=>{cfg.emblemScale=Number($('s-scale').value);redraw()});
 $('s-cloth').addEventListener('change',()=>{cfg.cloth=$('s-cloth').checked;redraw()});
 $('s-name').addEventListener('input',redraw);$('s-motto').addEventListener('input',redraw);
 $('s-swatches').addEventListener('click',e=>{const b=e.target.closest('.swatch');if(b){cfg.colorPrimary=b.dataset.c;sync()}});
 $('s-random').onclick=()=>{const r=a=>a[Math.floor(Math.random()*a.length)],col=()=>'#'+[0,0,0].map(()=>Math.floor(40+Math.random()*130).toString(16).padStart(2,'0')).join('');
  cfg=B.clean({fieldPattern:r(B.PATTERNS)[0],colorPrimary:r(SWATCHES),colorSecondary:col(),emblem:r(B.EMBLEMS)[0],emblemColor1:r(['#d4af37','#e8e0c8','#c0c8d0','#e2a24a']),emblemColor2:col(),emblemScale:1,borderStyle:r(B.BORDERS)[0],borderColor:r(['#d4af37','#c0c8d0','#a9743a']),cloth:true});sync()};
 $('s-begin').onclick=()=>finish({name:$('s-name').value.trim().slice(0,30)||'Your Stronghold',motto:$('s-motto').value.trim().slice(0,40),banner:B.clean(cfg)});
 $('s-cancel').onclick=()=>finish(null);
 dlg.addEventListener('cancel',e=>{e.preventDefault();if(!$('s-cancel').hidden)finish(null)});
 dlg._sync=sync;dlg._q=$;
}
function finish(result){if(dlg.open)dlg.close();const p=pending;pending=null;if(p)p(result)}
window.openSetup=function({canCancel=false}={}){
 if(pending)return Promise.resolve(null);
 cfg=B.clean(null);
 if(!dlg)build();
 for(const d of document.querySelectorAll('dialog[open]'))if(d!==dlg)d.close();
 dlg._q('s-name').value='';dlg._q('s-motto').value='';dlg._q('s-cancel').hidden=!canCancel;dlg._sync();
 dlg.showModal();dlg._q('s-name').focus();
 return new Promise(res=>{pending=res});
};
})();
