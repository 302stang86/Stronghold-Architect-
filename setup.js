/* New stronghold setup: name, motto and banner designer. */
(function(){
const B=window.Banner,SWATCHES=['#d4af37','#e2c04a','#c0c8d0','#f4f0e4','#15151a','#5b5f68','#8b1e1e','#b32a2a','#c4651e','#a9743a','#5a3a1c','#6b6b2a','#1b3b2b','#2f7a3f','#1f6b6b','#2a5aa8','#152a4a','#32154a','#6b3d8c','#b25a7a'];
const TARGETS=[['colorPrimary','Field'],['colorSecondary','Field 2'],['emblemColor1','Emblem'],['emblemColor2','Accent']];
let dlg,pending=null,cfg;
function build(){
 dlg=document.createElement('dialog');dlg.id='setupdialog';dlg.setAttribute('aria-labelledby','setup-title');
 dlg.innerHTML=`<div class="setup-scroll" tabindex="0" role="region" aria-label="Stronghold and banner options"><div class="setup-wrap">
 <div class="setup-head"><small>A NEW STRONGHOLD</small><h2 id="setup-title">Found your stronghold</h2><p class="muted">Choose a name and design your banner. It flies over your castle on the world map.</p></div>
 <div class="setup-main">
  <section class="setup-preview"><canvas id="setup-canvas" width="800" height="1000" aria-label="Banner preview"></canvas><h3 id="setup-showname">Your Stronghold</h3><p id="setup-showmotto" class="muted"></p></section>
  <section class="setup-controls"><div class="sc-col">
   <div class="sgroup"><label for="s-name">Stronghold name</label><input id="s-name" maxlength="30" autocomplete="off" placeholder="The Ashen Keep"><label for="s-motto">Motto (optional)</label><input id="s-motto" maxlength="40" autocomplete="off" placeholder="Vigilance &amp; Steel"></div>
   <div class="sgroup"><label>Colors</label><div class="targets" id="s-targets">${TARGETS.map(([k,l])=>`<button type="button" class="target" data-k="${k}"><i></i><span>${l}</span></button>`).join('')}</div>
    <p class="muted" id="s-hint"></p>
    <div class="swatches" id="s-swatches">${SWATCHES.map(c=>`<button type="button" class="swatch" data-c="${c}" style="background:${c}" aria-label="Use ${c}"></button>`).join('')}<label class="custom">Custom <input type="color" id="s-custom"></label></div>
    <label class="check"><input type="checkbox" id="s-cloth"> Woven cloth shading</label></div>
      </div><div class="sc-col">
   <div class="sgroup"><label>Field pattern</label><div class="tiles" id="s-pattern"></div></div>
   <div class="sgroup"><label>Central emblem</label><div class="tiles" id="s-emblem"></div>
    <label for="s-scale">Emblem size <span id="s-scaleval"></span></label><input type="range" id="s-scale" min="0.5" max="1.4" step="0.05"></div>
   </div>
  </section>
 </div></div></div>
 <div class="setup-actions"><button type="button" id="s-random">Randomize banner</button><button type="button" id="s-cancel" hidden>Back to my stronghold</button><button type="button" id="s-begin" class="primary">Begin stronghold</button></div>`;
 document.body.append(dlg);
 const $=id=>dlg.querySelector('#'+id);
 let target='colorPrimary',raf=0;const use3d=!!(window.Banner3D&&Banner3D.ok());let live=null;if(use3d){const cv=$('setup-canvas');cv.width=640;cv.height=800;live=Banner3D.live(cv)}
 const tileSets={'s-pattern':['fieldPattern',B.PATTERNS,{noEmblem:true,noBorder:true}],'s-emblem':['emblem',B.EMBLEMS,{noBorder:true}]};
 for(const [id,[key,list]] of Object.entries(tileSets)){const box=$(id);for(const [v,l] of list){const b=document.createElement('button');b.type='button';b.className='tile';b.dataset.v=v;b.title=l;b.setAttribute('aria-label',l);b.innerHTML=(use3d?'<img width="84" height="105" alt="">':'<canvas width="84" height="105"></canvas>')+'<span>'+l+'</span>';box.append(b)}
  box.addEventListener('click',e=>{const t=e.target.closest('.tile');if(t){cfg[key]=t.dataset.v;redraw()}})}
 function thumbs(){for(const [id,[key,list,opt]] of Object.entries(tileSets)){for(const t of $(id).children){const c={...cfg,[key]:t.dataset.v,emblemScale:id==='s-emblem'?1.15:1};if(use3d)t.querySelector('img').src=Banner3D.still(c,168,210,opt);else B.draw(t.querySelector('canvas'),c,opt);t.classList.toggle('on',cfg[key]===t.dataset.v)}}}
 function chips(){for(const t of $('s-targets').children){t.querySelector('i').style.background=cfg[t.dataset.k];t.classList.toggle('on',t.dataset.k===target)}$('s-custom').value=cfg[target];$('s-hint').textContent=(target==='colorSecondary'&&cfg.fieldPattern==='solid')?'The second field color shows on split and quartered patterns. Pick one below.':''}
 function fixBorder(){cfg.borderStyle='double';cfg.borderColor=cfg.emblemColor1}
 function redraw(){fixBorder();if(live)live.set(cfg);else B.draw($('setup-canvas'),cfg);$('s-scaleval').textContent=Number(cfg.emblemScale).toFixed(2)+'x';$('setup-showname').textContent=$('s-name').value.trim()||'Your Stronghold';$('setup-showmotto').textContent=$('s-motto').value.trim();chips();cancelAnimationFrame(raf);raf=requestAnimationFrame(thumbs)}
 function sync(){$('s-scale').value=cfg.emblemScale;$('s-cloth').checked=cfg.cloth;redraw()}
 $('s-targets').addEventListener('click',e=>{const t=e.target.closest('.target');if(t){target=t.dataset.k;chips()}});
 $('s-scale').addEventListener('input',()=>{cfg.emblemScale=Number($('s-scale').value);redraw()});
 $('s-cloth').addEventListener('change',()=>{cfg.cloth=$('s-cloth').checked;redraw()});
 $('s-name').addEventListener('input',redraw);$('s-motto').addEventListener('input',redraw);
 $('s-swatches').addEventListener('click',e=>{const b=e.target.closest('.swatch');if(b){cfg[target]=b.dataset.c;redraw()}});
 $('s-custom').addEventListener('input',()=>{cfg[target]=$('s-custom').value;redraw()});
 $('s-random').onclick=()=>{const r=a=>a[Math.floor(Math.random()*a.length)],col=()=>'#'+[0,0,0].map(()=>Math.floor(40+Math.random()*130).toString(16).padStart(2,'0')).join('');
  cfg=B.clean({fieldPattern:r(B.PATTERNS)[0],colorPrimary:r(SWATCHES),colorSecondary:col(),emblem:r(B.EMBLEMS)[0],emblemColor1:r(['#d4af37','#e8e0c8','#c0c8d0','#e2a24a']),emblemColor2:col(),emblemScale:1,cloth:true});sync()};
 $('s-begin').onclick=()=>finish({name:$('s-name').value.trim().slice(0,30)||'Your Stronghold',motto:$('s-motto').value.trim().slice(0,40),banner:(fixBorder(),B.clean(cfg))});
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
 dlg.showModal();
 dlg.querySelector('.setup-scroll').scrollTop=0;
 dlg._q('s-name').focus({preventScroll:true});
 return new Promise(res=>{pending=res});
};
})();
