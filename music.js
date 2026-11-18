/* Background music: one track, loops forever. Browsers only allow sound after a tap or key press, so it starts on the first one. */
const Music=(()=>{const a=new Audio('assets/frostbound.mp3');a.loop=true;a.preload='auto';let started=false;
 const vol=()=>Math.min(1,Math.max(0,Number.isFinite(settings.musicVolume)?settings.musicVolume:.4));
 const want=()=>settings.music!==false&&!document.hidden;
 function sync(){a.volume=vol();if(want()){const p=a.play();if(p&&p.catch)p.catch(()=>{started=false})}else a.pause()}
 function first(){if(started)return;started=true;sync()}
 for(const ev of['pointerdown','keydown','touchstart'])window.addEventListener(ev,first,{once:false,passive:true});
 document.addEventListener('visibilitychange',()=>{if(started)sync()});
 const on=document.getElementById('opt-music'),vs=document.getElementById('opt-music-vol');
 if(on){on.onchange=e=>{settings.music=e.target.checked;saveSettings();started=true;sync()}}
 if(vs){vs.oninput=e=>{settings.musicVolume=e.target.value/100;a.volume=vol();saveSettings()}}
 const open=document.getElementById('settings');if(open)open.addEventListener('click',()=>{if(on)on.checked=settings.music!==false;if(vs)vs.value=Math.round(vol()*100)});
 return{audio:a,sync}})();
