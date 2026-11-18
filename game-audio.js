/* Original synthesized ambient score and UI/combat sounds. */
window.StrongholdAudio=(()=>{
 const defaults={music:30,effects:55,mute:false};
 let ctx,music,effects,loop,values=defaults;
 const notes={click:[330,440],save:[330,440,587],attack:[110,62],defense:[220,155],healing:[390,520,659],energy:[247,370,494]};
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
 function score(){
  const rate=ctx.sampleRate,bar=4,length=32,buffer=ctx.createBuffer(1,rate*length,rate);
  const signal=buffer.getChannelData(0);
  const chords=[[45,52,57],[41,48,57],[48,55,60],[43,50,55],[45,52,60],[41,48,57],[50,57,62],[43,50,59]];
  const tone=(midi,start,duration,amount,pad)=>{
   const hz=440*2**((midi-69)/12),steps=Math.floor(duration*rate);
   for(let i=0;i<steps;i++){
    const t=i/rate,phase=2*Math.PI*hz*t;
    const envelope=pad?Math.sin(Math.PI*i/steps)**1.3:Math.min(1,t/.045)*Math.exp(-2.8*t);
    const wave=Math.sin(phase)+.22*Math.sin(2*phase)+.08*Math.sin(3*phase);
    signal[(Math.floor(start*rate)+i)%signal.length]+=amount*envelope*wave;
   }
  };
  chords.forEach((chord,i)=>{
   chord.forEach(n=>tone(n,i*bar,5.5,.053,true));
   [0,2,1,2].forEach((n,j)=>tone(chord[n]+12,i*bar+.35+j*.92,2,.039,false));
  });
  loop=ctx.createBufferSource();
  loop.buffer=buffer;
  loop.loop=true;
  loop.connect(music);
  loop.start();
 }
 function unlock(event){
  if(!event.isTrusted||document.hidden)return;
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio)return;
  if(!ctx){
   try{ctx=new Audio()}catch{return}
   music=ctx.createGain();
   effects=ctx.createGain();
   music.connect(ctx.destination);
   effects.connect(ctx.destination);
   set(values);
  }
  if(ctx.state!=='running')ctx.resume().then(()=>{if(document.hidden)ctx.suspend()}).catch(()=>{});
  if(!loop)score();
 }
 function play(name){
  if(!ctx||ctx.state!=='running'||values.mute||values.effects===0||document.hidden||!notes[name])return;
  const now=ctx.currentTime;
  notes[name].forEach((hz,i)=>{
   const start=now+i*.065,osc=ctx.createOscillator(),env=ctx.createGain();
   osc.type=name==='attack'?'triangle':'sine';
   osc.frequency.value=hz;
   env.gain.setValueAtTime(.001,start);
   env.gain.exponentialRampToValueAtTime(.12,start+.012);
   env.gain.exponentialRampToValueAtTime(.001,start+.13);
   osc.connect(env).connect(effects);
   osc.start(start);
   osc.stop(start+.14);
  });
 }
 document.addEventListener('pointerdown',unlock,{capture:true});
 document.addEventListener('keydown',unlock,{capture:true});
 document.addEventListener('click',e=>{
  if(e.target.closest('button:not(:disabled):not(.hand-card):not(#save-game)'))play('click');
 });
 function setVisibility(){
  if(!ctx)return;
  (document.hidden?ctx.suspend():ctx.resume()).catch(()=>{});
 }
 document.addEventListener('visibilitychange',setVisibility);
 window.addEventListener('pagehide',()=>ctx?.suspend().catch(()=>{}));
 window.addEventListener('pageshow',setVisibility);
 return {set,normalize,play};
})();
