/* NPC chatter: a short speech bubble pops up over each NPC on the keep map.
   Each NPC waits a random 30 to 75 seconds of active play between bubbles. */
(function(){
const QUIPS=[
"My wallet is like an onion—opening it makes me cry.",
"I’m not lazy, I’m on energy-saving mode.",
"My bed is a magical place where I suddenly remember everything I forgot to do.",
"I put the \"pro\" in procrastinate.",
"Adulting is just Googling how to do stuff.",
"I’m at that age where my back goes out more than I do.",
"My brain has too many tabs open.",
"I followed my heart and it led me to the fridge.",
"I need a six-month vacation twice a year.",
"Common sense is like deodorant; the people who need it most never use it.",
"I’m not arguing, I’m just explaining why I’m right.",
"If I agreed with you, we’d both be wrong.",
"I’d love to help you out—which way did you come in?",
"Not my circus, not my monkeys.",
"I’m silently correcting your grammar.",
"Sarcasm is my love language.",
"Don’t worry, I’m a professional overthinker.",
"I used to be indecisive, now I’m not so sure.",
"That sounds like a tomorrow problem.",
"Sorry I’m late, I didn’t want to come.",
"Never trust an atom; they make up everything.",
"I’m just a potato waiting to become fries.",
"My spirit animal is a slightly confused pigeon.",
"Warning: May spontaneously talk about snacks.",
"Even my imaginary friends think I’m weird.",
"Hold my coffee, I’m about to make a bad decision.",
"Powered by caffeine and questionable choices.",
"I came, I saw, I forgot what I was doing.",
"Reality called, so I hung up.",
"Born to nap, forced to work.",
"Math is hard, naps are easy.",
"Always give 100%—unless you’re donating blood.",
"I’m on a seafood diet: I see food and I eat it.",
"Light travels faster than sound, which is why some people appear bright until they speak.",
"If at first you don’t succeed, skydiving is not for you.",
"A balanced diet is a cookie in each hand.",
"I’m not short, I’m concentrated awesome.",
"My favorite exercise is a cross between a lunge and a crunch—I call it lunch.",
"Everything is a boomerang if you throw it straight up.",
"Keep your friends close and your snacks closer.",
"Running on empty and pure spite.",
"Professional nap taker.",
"Mentally at the beach.",
"Out of order—please try again later.",
"Error 404: Motivation not found.",
"Too glam to give a damn.",
"Chaos coordinator.",
"Fluent in movie quotes.",
"Surviving, not thriving.",
"Just winging it."
];
const MIN_MS=30000,MAX_MS=75000;
const rand=(a,b)=>a+Math.random()*(b-a);
const timers=new WeakMap();
let clock=0;
function wait(){return rand(MIN_MS,MAX_MS)}
function show(actor,t){
  let text;do{text=QUIPS[Math.floor(Math.random()*QUIPS.length)]}while(QUIPS.length>1&&text===t.last);
  t.last=text;
  hide(t);
  const el=document.createElement('span');
  el.className='npc-bubble';el.setAttribute('aria-hidden','true');el.textContent=text;
  actor.append(el);t.el=el;
  requestAnimationFrame(()=>el.classList.add('on'));
  t.hideAt=clock+Math.min(6000,3000+text.length*45);
}
function hide(t){
  if(t.el){t.el.remove();t.el=null}
  t.hideAt=0;
}
function usable(actor){
  return actor.isConnected&&actor.style.display!=='none'&&!actor.classList.contains('knocked-out');
}
function tick(dt){
  clock+=dt;
  const actors=document.querySelectorAll('#npc-layer .collector-sprite,#invader-sprite');
  for(const actor of actors){
    let t=timers.get(actor);
    if(!t){t={next:clock+wait(),hideAt:0,el:null,last:''};timers.set(actor,t)}
    if(t.el&&(clock>=t.hideAt||!usable(actor))){hide(t);t.next=clock+wait()}
    if(!t.el&&clock>=t.next){
      if(usable(actor)&&!document.body.classList.contains('at-main-menu'))show(actor,t);
      else t.next=clock+1000;
    }
  }
}
let lastTick=performance.now();
setInterval(()=>{
  const now=performance.now(),dt=now-lastTick;
  lastTick=now;
  if(document.hidden||document.body.classList.contains('at-main-menu')||document.querySelector('dialog[open]')){
    for(const bubble of document.querySelectorAll('.npc-bubble')){
      const t=timers.get(bubble.parentElement);
      hide(t);
      t.next=clock+wait();
    }
    return;
  }
  tick(Math.min(250,dt));
},200);
})();
