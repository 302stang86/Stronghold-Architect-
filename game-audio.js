/* Frostbound background music and synthesized UI/combat sounds. */
window.StrongholdAudio=(()=>{
 const defaults={music:30,effects:55,mute:false};
 const track=new Audio('assets/frostbound.mp3');
 track.loop=true;
 track.preload='auto';
 let ctx,music,effects,noise,atmosphere,values=defaults;
 let unlocked=false;
 let scene='menu',lastActionCue=-Infinity;
 // Tone layers: delay, duration, volume, start/end pitch, waveform.
 const tone=(delay,duration,volume,pitch,end=pitch,wave='sine')=>({delay,duration,volume,pitch,end,wave});
 // Noise layers: delay, duration, volume, band-pass frequency and resonance.
 const texture=(delay,duration,volume,hz,q=1)=>({delay,duration,volume,hz,q});
 const coin=(delay=.06,volume=.09)=>[
  tone(delay,.1,volume,1430,1280,'triangle'),tone(delay+.048,.15,volume*.7,1820,1620,'triangle'),
 ];
 const cues={
  click:[tone(0,.05,.045,410,280,'triangle')],
  save:[tone(0,.18,.075,330),tone(.08,.2,.07,440),tone(.16,.26,.07,587)],
  card:[texture(0,.08,.055,2100,.85)],
  hit:[texture(0,.12,.17,550),tone(0,.15,.16,126,48,'triangle')],
  block:[texture(0,.18,.1,2400,2),tone(0,.3,.1,876,842,'triangle'),tone(.014,.2,.055,1420,1360)],
  defense:[tone(0,.16,.09,183,137,'triangle'),texture(0,.12,.055,976)],
  healing:[tone(0,.26,.07,390),tone(.08,.31,.06,520),tone(.15,.35,.065,659)],
  energy:[tone(0,.25,.08,247,370,'triangle'),tone(.14,.26,.07,370,494)],
  victory:[tone(0,.31,.097,392,392,'triangle'),tone(.12,.32,.087,494),tone(.23,.55,.075,587)],
  defeat:[tone(0,.32,.1,260,221,'triangle'),tone(.21,.54,.105,196,112,'triangle')],
  door:[texture(0,.22,.06,490),tone(.05,.14,.055,135,77,'triangle')],
  chest:[texture(0,.24,.095,625),tone(.11,.15,.07,155,81,'triangle'),...coin(.23)],
  unlock:[texture(0,.07,.085,2700,2),texture(.14,.08,.09,1900,2),tone(.18,.16,.09,285,122,'triangle'),...coin(.3,.105),...coin(.44,.07)],
  locked:[texture(0,.09,.1,1800,2),texture(.12,.08,.085,1400,2)],
  alarm:[tone(0,.84,.14,247,241,'triangle'),tone(0,.52,.066,519,501),tone(.45,.9,.13,247,241,'triangle'),tone(.45,.42,.055,519,501)],
  'dungeon-low':[texture(0,.25,.1,811,2),tone(.08,.6,.13,138,103,'triangle')],
  'dungeon-medium':[tone(0,.57,.09,277,322),tone(.05,.67,.07,392,350),texture(.17,.37,.085,1800)],
  'dungeon-high':[tone(0,.77,.16,78,44,'triangle'),texture(.04,.6,.14,270,.85)],
  trade:coin(0),
  build:[texture(0,.19,.14,420),tone(0,.17,.13,100,49,'triangle')],
  upgrade:[texture(0,.105,.12,1870,2),tone(.01,.18,.085,698,661,'triangle'),texture(.19,.09,.1,1620,2)],
  spikes:[texture(0,.14,.14,2250,2),tone(0,.19,.11,327,171,'triangle')],
  gas:[texture(0,.38,.16,3000,1.2)],
  flame:[texture(0,.51,.21,460,.6),texture(.07,.24,.085,1500)],
  acid:[texture(0,.21,.12,1950,1.7),texture(.1,.45,.1,3100,2)],
 };

 function normalize(raw){
  function volume(key){return Number.isFinite(raw?.[key])?Math.min(100,Math.max(0,raw[key])):defaults[key]}
  return {music:volume('music'),effects:volume('effects'),mute:raw?.mute===true};
 }
 function set(raw){
  values=normalize(raw);
  if(!ctx)return;
  const now=ctx.currentTime;
  music.gain.setTargetAtTime(values.mute?0:values.music/100,now,.05);
  effects.gain.setTargetAtTime(values.mute?0:values.effects/100,now,.025);
 }
 function syncTrack(){
  if(!unlocked||document.hidden){track.pause();return}
  if(track.paused)track.play().catch(()=>{});
 }
 function unlock(event){
  if(!event.isTrusted||document.hidden)return;
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;
  if(!AudioContextClass)return;
  if(!ctx){
   try{ctx=new AudioContextClass()}catch{return}
   music=ctx.createGain();
   effects=ctx.createGain();
   ctx.createMediaElementSource(track).connect(music);
   music.connect(ctx.destination);
   effects.connect(ctx.destination);
   set(values);
   applyScene();
  }
  if(ctx.state!=='running')ctx.resume().then(()=>{if(document.hidden)ctx.suspend()}).catch(()=>{});
  unlocked=true;
  syncTrack();
 }
 function noiseBuffer(){
  if(noise)return noise;
  noise=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate);
  const samples=noise.getChannelData(0);
  for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
  return noise;
 }
 function play(name){
  if(!ctx||ctx.state!=='running'||values.mute||values.effects===0||document.hidden||!cues[name])return;
  const now=ctx.currentTime;
  if(name!=='click')lastActionCue=now;
  for(const layer of cues[name]){
   const start=now+layer.delay,end=start+layer.duration,env=ctx.createGain();
   env.gain.setValueAtTime(.001,start);
   env.gain.exponentialRampToValueAtTime(layer.volume,start+Math.min(.017,layer.duration/3));
   env.gain.exponentialRampToValueAtTime(.001,end);
   env.connect(effects);
   let source;
   if(layer.hz){
    source=ctx.createBufferSource();
    source.buffer=noiseBuffer();
    const filter=ctx.createBiquadFilter();
    filter.type='bandpass';filter.frequency.value=layer.hz;filter.Q.value=layer.q;
    source.connect(filter).connect(env);
   }else{
    source=ctx.createOscillator();
    source.type=layer.wave;
    source.frequency.setValueAtTime(layer.pitch,start);
    source.frequency.exponentialRampToValueAtTime(layer.end,end);
    source.connect(env);
   }
   source.start(start);
   source.stop(end);
  }
 }
 function applyScene(){
  if(!ctx)return;
  const now=ctx.currentTime;
  const presets={menu:[0,450],keep:[.034,390],map:[.055,490],dungeon:[.055,950],expedition:[.045,670]};
  const [volume,hz]=presets[scene];
  if(!atmosphere){
   const wind=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
   wind.buffer=noiseBuffer();wind.loop=true;
   filter.type='bandpass';filter.Q.value=.7;
   gain.gain.value=0;
   wind.connect(filter).connect(gain).connect(effects);
   const flutter=ctx.createOscillator(),flutterDepth=ctx.createGain();
   flutter.frequency.value=2.1;flutterDepth.gain.value=0;
   flutter.connect(flutterDepth).connect(gain.gain);
   wind.start();flutter.start();
   atmosphere={filter,gain,flutterDepth};
  }
  atmosphere.filter.frequency.setTargetAtTime(hz,now,.24);
  atmosphere.gain.gain.setTargetAtTime(volume,now,.24);
  atmosphere.flutterDepth.gain.setTargetAtTime(volume*(scene==='dungeon'?.4:.18),now,.24);
 }
 function setScene(next){
  if(scene===next)return;
  scene=next;
  applyScene();
 }
 document.addEventListener('pointerdown',unlock,{capture:true});
 document.addEventListener('keydown',unlock,{capture:true});
 document.addEventListener('click',e=>{
  if(ctx&&ctx.currentTime-lastActionCue>.08&&e.target.closest('button:not(:disabled):not(.hand-card):not(#save-game)'))play('click');
 });
 function setVisibility(){
  syncTrack();
  if(!ctx)return;
  (document.hidden?ctx.suspend():ctx.resume()).catch(()=>{});
 }
 document.addEventListener('visibilitychange',setVisibility);
 window.addEventListener('pagehide',()=>{
  track.pause();
  ctx?.suspend().catch(()=>{});
 });
 window.addEventListener('pageshow',setVisibility);
 return {set,normalize,play,setScene};
})();
