/* Banner drawing, shared by the setup screen, the header and the world map. */
(function(){
const FIELD=['solid','vertical','horizontal','diagonal','quarterer'];
const EMBLEMS=[['citadel','Stone Citadel'],['swords','Forged Swords'],['dragon','Heraldic Dragon'],['lion','Lion Rampant'],['stag','Royal Stag'],['wolf','Dire Wolf'],['griffin','Winged Griffin'],['helm',"Knight's Helm"],['axe','Axe & Shield'],['eagle','Crowned Eagle']];
const BORDERS=[['chains','Forged Chains'],['ivy','Creeping Ivy'],['bones','Skull & Bones'],['spikes','Forged Spikes'],['stone','Rough-Hewn Stone'],['rope','Braided Rope'],['filigree','Gilded Filigree'],['double','Classic Double Trim'],['none','None']];
const PATTERNS=[['solid','Solid Color'],['vertical','Vertical Split'],['horizontal','Horizontal Split'],['diagonal','Diagonal Split'],['quarterer','Quartered']];
const DEFAULT={fieldPattern:'solid',colorPrimary:'#1b3b2b',colorSecondary:'#0d1b13',emblem:'citadel',emblemColor1:'#d4af37',emblemColor2:'#8c7322',emblemScale:1,borderStyle:'chains',borderColor:'#d4af37',cloth:true};
const HEX=/^#[0-9a-f]{6}$/i;
function clean(c){const o={...DEFAULT};if(c&&typeof c==='object'){
 if(FIELD.includes(c.fieldPattern))o.fieldPattern=c.fieldPattern;
 for(const k of ['colorPrimary','colorSecondary','emblemColor1','emblemColor2','borderColor'])if(HEX.test(c[k]))o[k]=c[k];
 if(EMBLEMS.some(e=>e[0]===c.emblem))o.emblem=c.emblem;
 if(BORDERS.some(e=>e[0]===c.borderStyle))o.borderStyle=c.borderStyle;
 const sc=Number(c.emblemScale);if(Number.isFinite(sc))o.emblemScale=Math.min(1.4,Math.max(.5,sc));
 if(typeof c.cloth==='boolean')o.cloth=c.cloth}
 return o}
let canvas,ctx,K=1,OPT={};
function drawFlag(cfg) {
      const w = 800;
      const h = 1000;
      ctx.clearRect(0, 0, w, h);

      const pat = cfg.fieldPattern;
      const c1 = cfg.colorPrimary;
      const c2 = cfg.colorSecondary;

      // 1. Draw Field Background with Patterns
      ctx.save();
      if (pat === 'solid') {
        ctx.fillStyle = c1;
        ctx.fillRect(0, 0, w, h);
      } else if (pat === 'vertical') {
        ctx.fillStyle = c1; ctx.fillRect(0, 0, w/2, h);
        ctx.fillStyle = c2; ctx.fillRect(w/2, 0, w/2, h);
      } else if (pat === 'horizontal') {
        ctx.fillStyle = c1; ctx.fillRect(0, 0, w, h/2);
        ctx.fillStyle = c2; ctx.fillRect(0, h/2, w, h/2);
      } else if (pat === 'diagonal') {
        ctx.fillStyle = c1; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = c2;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
      } else if (pat === 'quarterer') {
        ctx.fillStyle = c1; ctx.fillRect(0, 0, w/2, h/2); ctx.fillRect(w/2, h/2, w/2, h/2);
        ctx.fillStyle = c2; ctx.fillRect(w/2, 0, w/2, h/2); ctx.fillRect(0, h/2, w/2, h/2);
      }
      ctx.restore();

      // 2. Optional Cloth Texture & Lighting Gradient
      if ((cfg.cloth!==false)&&!OPT.noCloth) {
        ctx.save();
        // Subtle vertical stripe folds
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        for(let i=0; i<w; i+=40) {
          ctx.fillRect(i, 0, 20, h);
        }
        // Vignette & drape lighting
        const grad = ctx.createRadialGradient(w/2, h/2, h/4, w/2, h/2, h*0.8);
        grad.addColorStop(0, 'rgba(255,255,255,0.1)');
        grad.addColorStop(0.5, 'rgba(0,0,0,0.15)');
        grad.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = grad;
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      // 3. Sculpted 3D Inner Border
      if(!OPT.noBorder)drawSculptedBorder(w, h, cfg.borderStyle, cfg.borderColor);

      // 4. Central Heraldic Emblem
      ctx.save();
      ctx.translate(w/2, h/2);
      const scale = parseFloat(cfg.emblemScale);
      ctx.scale(scale, scale);
      if(!OPT.noEmblem)drawEmblem(cfg.emblem, cfg.emblemColor1, cfg.emblemColor2);
      ctx.restore();
    }

    function drawSculptedBorder(w, h, style, tint) {
      if (style === 'none') return;
      ctx.save();
      const margin = 40;
      const bw = w - margin * 2;
      const bh = h - margin * 2;

      if (style === 'double') {
        ctx.strokeStyle = tint;
        ctx.lineWidth = 10;
        ctx.strokeRect(margin, margin, bw, bh);
        ctx.lineWidth = 4;
        ctx.strokeRect(margin + 16, margin + 16, bw - 32, bh - 32);
      } else if (style === 'chains') {
        // Metallic chain links
        ctx.strokeStyle = tint;
        ctx.lineWidth = 14;
        ctx.strokeRect(margin, margin, bw, bh);
        // Link highlights
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.setLineDash([16, 20]);
        ctx.strokeRect(margin, margin, bw, bh);
        ctx.setLineDash([]);
      } else if (style === 'stone') {
        // Rough hewn blocks
        ctx.fillStyle = '#2b2f38';
        ctx.strokeStyle = tint;
        ctx.lineWidth = 12;
        ctx.strokeRect(margin, margin, bw, bh);
        // Stone texture dashes
        ctx.strokeStyle = '#111317';
        ctx.lineWidth = 6;
        ctx.setLineDash([40, 20]);
        ctx.strokeRect(margin, margin, bw, bh);
        ctx.setLineDash([]);
      } else if (style === 'spikes') {
        ctx.strokeStyle = tint;
        ctx.lineWidth = 16;
        ctx.strokeRect(margin, margin, bw, bh);
        // Draw triangular spikes along border
        ctx.fillStyle = '#1c1f26';
        ctx.strokeStyle = tint;
        ctx.lineWidth = 3;
        const step = 45;
        // Top & bottom
        for(let x = margin + 20; x < w - margin - 20; x += step) {
          ctx.beginPath(); ctx.moveTo(x-12, margin+8); ctx.lineTo(x, margin-12); ctx.lineTo(x+12, margin+8); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x-12, h-margin-8); ctx.lineTo(x, h-margin+12); ctx.lineTo(x+12, h-margin-8); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        // Left & right
        for(let y = margin + 20; y < h - margin - 20; y += step) {
          ctx.beginPath(); ctx.moveTo(margin+8, y-12); ctx.lineTo(margin-12, y); ctx.lineTo(margin+8, y+12); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(w-margin-8, y-12); ctx.lineTo(w-margin+12, y); ctx.moveTo(w-margin-8, y+12); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      } else if (style === 'ivy') {
        ctx.strokeStyle = tint;
        ctx.lineWidth = 12;
        ctx.strokeRect(margin, margin, bw, bh);
        // Green leaves
        ctx.fillStyle = '#388a44';
        const step = 50;
        for(let x = margin; x <= w - margin; x += step) {
          ctx.beginPath(); ctx.arc(x, margin, 8, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(x, h-margin, 8, 0, Math.PI*2); ctx.fill();
        }
        for(let y = margin; y <= h - margin; y += step) {
          ctx.beginPath(); ctx.arc(margin, y, 8, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(w-margin, y, 8, 0, Math.PI*2); ctx.fill();
        }
      } else if (style === 'bones') {
        ctx.strokeStyle = tint;
        ctx.lineWidth = 14;
        ctx.strokeRect(margin, margin, bw, bh);
        // Corner skulls / accents
        ctx.fillStyle = '#e0e0e0';
        [ [margin, margin], [w-margin, margin], [margin, h-margin], [w-margin, h-margin] ].forEach(([cx, cy]) => {
          ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI*2); ctx.fill();
          ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.stroke();
        });
      } else if (style === 'rope') {
        ctx.strokeStyle = tint;
        ctx.lineWidth = 16;
        ctx.setLineDash([10, 8]);
        ctx.strokeRect(margin, margin, bw, bh);
        ctx.setLineDash([]);
      } else if (style === 'filigree') {
        ctx.strokeStyle = tint;
        ctx.lineWidth = 8;
        ctx.strokeRect(margin, margin, bw, bh);
        ctx.lineWidth = 3;
        ctx.strokeRect(margin+8, margin+8, bw-16, bh-16);
      }
      ctx.restore();
    }

function P(d,fill,lw,stroke){const p=new Path2D(d);if(fill){ctx.fillStyle=fill;ctx.fill(p)}if(lw!==0){ctx.lineWidth=lw||6;ctx.strokeStyle=stroke||'#000';ctx.stroke(p)}}
function L(d,color,lw){ctx.save();ctx.shadowColor='transparent';ctx.strokeStyle=color;ctx.lineWidth=lw||6;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke(new Path2D(d));ctx.restore()}
function C(x,y,r,fill,lw){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(lw!==0){ctx.lineWidth=lw||5;ctx.strokeStyle='#000';ctx.stroke()}}
function mirror(fn){fn();ctx.save();ctx.scale(-1,1);fn();ctx.restore()}
function drawEmblem(type,c1,c2){
 ctx.save();
 ctx.shadowColor='rgba(0,0,0,0.7)';ctx.shadowBlur=25*K;ctx.shadowOffsetY=12*K;
 ctx.lineJoin='round';ctx.lineCap='round';
 const dark='rgba(0,0,0,.35)';
 if(type==='citadel'){
  let bat='';for(let x=-160;x<=100;x+=60)bat+=`M${x} -100V-128H${x+36}V-100Z`;
  P(bat,c1,5);P('M-160 -100H160V100H-160Z',c1);
  P('M-215 -150H-105V100H-215ZM105 -150H215V100H105Z',c1);
  let bt='';for(const x of [-215,105])for(let i=0;i<3;i++)bt+=`M${x+i*40} -150V-176H${x+i*40+30}V-150Z`;P(bt,c1,5);
  P('M-225 -176L-160 -280L-95 -176ZM95 -176L160 -280L225 -176Z',c2);
  L('M-160 -280V-320','#d9d3c0',5);P('M-160 -320L-120 -306L-160 -292Z',c2,3);
  P('M-60 100V40A60 60 0 0 1 60 40V100Z',c2);L('M-30 0V100M0 -15V100M30 0V100M-60 55H60M-55 80H55','#000',4);
  for(const x of [-120,-70,70,120])P(`M${x-12} -60V-20A12 12 0 0 1 ${x+12} -20V-60A12 12 0 0 1 ${x-12} -60Z`,c2,4);
  for(const x of [-160,160])P(`M${x-6} -110V-70H${x+6}V-110Z`,'#000',0);
  ctx.save();ctx.globalAlpha=.3;for(let y=-90;y<100;y+=28)L(`M-160 ${y}H160`,'#000',3);ctx.restore();
  L('M-215 100H215','#000',8);
 }else if(type==='swords'){
  const sword=()=>{
   P('M-16 -195L0 -225L16 -195V45H-16Z',c1);L('M0 -190V35',c2,7);
   P('M-70 45H70V65H-70Z',c2);C(-70,55,13,c2,4);C(70,55,13,c2,4);
   P('M-9 65H9V128H-9Z',c2);L('M-9 80H9M-9 95H9M-9 110H9','#000',3);C(0,142,16,c2,5)};
  ctx.save();ctx.rotate(Math.PI/4);sword();ctx.restore();
  ctx.save();ctx.rotate(-Math.PI/4);sword();ctx.restore();
  C(0,0,34,c1,6);C(0,0,20,c2,4);

 }else if(type==='dragon'){
  mirror(()=>{P('M-30 -40L-225 -205Q-205 -135-195 -100Q-172 -122-165 -66Q-140 -92-128 -36Q-104 -58-88 8Q-60 -12-30 20Z',c2);L('M-30 -40L-222 -202M-40 -30L-193 -98M-45 -20L-163 -64M-50 -5L-126 -34','#000',4);});
  P('M-70 160C-100 130-90 70-45 30C-15 5-25 -45 5 -80C20 -100 45 -105 62 -120L110 -160L98 -120C112 -105 100 -78 70 -62C52 -50 45 -20 52 25C62 80 55 120 15 150C-5 165-25 190-55 205L-45 160Z',c1);
  P('M12 -100L8 -150L38 -112Z',c2,4);P('M62 -120L110 -160L96 -122Z',c2,0);C(62,-104,7,c2,3);
  for(let i=0;i<6;i++)P(`M${6-i*2} ${-60+i*30}C${40} ${-52+i*30} ${45} ${-38+i*30} ${6-i*2} ${-28+i*30}Z`,c2,3);
  P('M-60 205L-120 215L-80 180Z',c2,4);
  P('M-45 105L-100 125L-82 95Z',c1);P('M-100 125L-122 132L-108 108Z',c2,3);
  P('M40 105L95 125L80 90Z',c1);P('M95 125L118 134L104 108Z',c2,3);
 
 }else if(type==='lion'){
  P('M-70 -5C-130 -30-135 -110-95 -135C-80 -105-105 -55-55 -35Z',c1);C(-95,-140,18,c2,4);
  P('M35 -60C70 -45 105 -45 130 -90L158 -70C140 -20 100 5 70 10C75 60 80 105 62 155L20 155C25 115 5 90-15 85C-25 120-45 140-85 155L-105 140C-70 105-60 40-50 5C-70 -25 -30 -60 35 -60Z',c1);
  P('M125 -88L165 -118L172 -88L150 -72Z',c1);P('M158 -70L195 -85L178 -55Z',c2,4);
  P('M-85 155L-125 160L-100 130Z',c2,4);P('M62 155L102 160L80 128Z',c2,4);
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;C(30+Math.cos(a)*52,-118+Math.sin(a)*52,19,c2,4)}
  C(32,-118,44,c1,5);
  P('M2 -150L6 -185L30 -158Z',c1,4);P('M50 -158L72 -185L68 -146Z',c1,4);
  C(18,-122,6,'#000',0);C(48,-125,6,'#000',0);P('M24 -100H44L34 -86Z','#000',2);
  P('M28 -86Q34 -66 42 -80',c2,3);
  L('M-10 20C20 30 45 20 55 5M-20 55C10 65 40 55 55 40','#000',3);
  }else if(type==='stag'){
  P('M-45 170L-60 40L-95 -30L-50 -100H55L100 -30L65 40L45 170Z',c1);
  mirror(()=>{L('M-30 -90L-60 -150L-65 -215M-60 -150L-110 -170M-45 -125L-95 -120M-62 -190L-100 -205M-30 -90L-95 -75','#000',18);L('M-30 -90L-60 -150L-65 -215M-60 -150L-110 -170M-45 -125L-95 -120M-62 -190L-100 -205M-30 -90L-95 -75',c2,10)});
  P('M-60 -75L-120 -100L-95 -45Z',c1);P('M-60 -75L-103 -92L-90 -58Z',c2,0);
  P('M60 -75L120 -100L95 -45Z',c1);P('M60 -75L103 -92L90 -58Z',c2,0);
  P('M-30 -20L0 130L30 -20Q0 -60 -30 -20Z',c2,4);
  C(-28,-50,7,c2,3);C(28,-50,7,c2,3);C(-28,-50,3,'#000',0);C(28,-50,3,'#000',0);
  P('M-15 20Q0 40 15 20Q0 5 -15 20Z','#000',0);
 }else if(type==='wolf'){
  P('M0 150L-70 75L-105 -20L-135 -190L-45 -110L0 -135L45 -110L135 -190L105 -20L70 75Z',c1);
  mirror(()=>P('M-110 -150L-80 -112L-122 -45Z',c2,0));
  P('M0 150L-45 60L-20 10H20L45 60Z',c2);
  mirror(()=>{P('M-58 -55L-20 -35L-30 -15L-70 -30Z','#000',4);P('M-48 -50L-28 -40L-34 -30L-56 -38Z',c2,0)});
  P('M-14 15H14L0 40Z','#000',3);
  P('M-22 70L-14 98L-6 70ZM22 70L14 98L6 70Z','#f4f0e4',3);
  L('M-30 -80L-20 -60M30 -80L20 -60M-85 0L-55 15M85 0L55 15','#000',4);

 }else if(type==='griffin'){
  mirror(()=>{P('M-30 -40L-225 -205Q-205 -135-195 -100Q-172 -122-165 -66Q-140 -92-128 -36Q-104 -58-88 8Q-60 -12-30 20Z',c2);L('M-30 -40L-222 -202M-40 -30L-193 -98M-45 -20L-163 -64M-50 -5L-126 -34','#000',4);P('M-225 -205Q-205 -135-195 -100L-175 -150Z',c1,3)});
  P('M-50 170L-70 85C-85 50-60 5-30 -20L-20 -70H20L30 -20C60 5 85 50 70 85L50 170L12 130L-12 170Z',c1);
  P('M-60 -60L-45 -120C-20 -150 20 -150 45 -120L60 -60Q30 -85 0 -85Q-30 -85 -60 -60Z',c1);
  P('M-12 -108L45 -90L8 -48Z',c2,4);C(-16,-112,6,'#000',0);
  P('M-38 -128L-52 -178L-18 -145Z',c1,4);P('M38 -128L52 -178L18 -145Z',c1,4);
  P('M-45 170L-90 200L-70 160ZM45 170L90 200L70 160Z',c2,4);
  P('M68 85C115 70 140 20 125 -35C150 15 160 75 95 120Z',c1);C(128,-40,15,c2,4);
  L('M-35 -5C-10 5 10 5 35 -5M-45 35C-15 50 15 50 45 35M-40 80C-10 95 10 95 40 80','#000',3);
  }else if(type==='helm'){
  P('M-70 -190C-110 -200-135 -240-95 -270C-40 -250-30 -215-35 -190Z',c2,5);
  P('M-95 -160C-95 -215 95 -215 95 -160V90C95 130 60 150 0 160C-60 150 -95 130 -95 90Z',c1);
  P('M-95 -40H95V-5H-95Z',c2,5);
  P('M-80 -35H80V-12H-80Z','#000',0);
  P('M-10 -5H10V140H-10Z',c2,4);
  for(const [x,y] of [[-78,-160],[78,-160],[-78,80],[78,80]])C(x,y,7,c2,3);
  for(let i=0;i<4;i++){C(-55+i*0,20+i*28,4,'#000',0);C(55,20+i*28,4,'#000',0)}
  L('M-60 -150C-40 -185 40 -185 60 -150','#000',4);
  P('M-95 90Q0 60 95 90','#000',0);
 }else if(type==='axe'){
  const axe=()=>{P('M-9 -180H9V180H-9Z',c2,5);P('M-9 -150C-120 -200-170 -90-110 -20C-80 -45-40 -45-9 -70Z',c1);L('M-20 -140C-90 -165-130 -100-100 -45','#000',3);P('M-12 150H12V190H-12Z',c1,4)};
  ctx.save();ctx.rotate(Math.PI/6);axe();ctx.restore();ctx.save();ctx.rotate(-Math.PI/6);ctx.scale(-1,1);axe();ctx.restore();
  P('M-85 -85H85V20C85 80 40 125 0 145C-40 125 -85 80 -85 20Z',c1);
  P('M-70 -70H70V20C70 68 34 108 0 125C-34 108 -70 68 -70 20Z',c1,4);
  P('M-10 -70H10V125H-10ZM-70 -20H70V0H-70Z',c2,4);C(0,-10,20,c2,5);C(0,-10,8,c1,3);
 }else if(type==='eagle'){
  mirror(()=>{P('M-28 -40C-90 -70-170 -60-215 -10C-190 -10-175 0-165 8C-185 15-170 30-150 40C-165 50-145 70-125 75C-135 88-110 100-90 98C-80 120-50 120-30 105Z',c1);
   P('M-215 -10C-190 -10-175 0-165 8C-185 15-170 30-150 40C-170 20-200 10-215 -10Z',c2,3);
   L('M-60 -35L-165 10M-55 -5L-145 42M-48 25L-122 76','#000',3)});
  P('M-38 -75C-40 20-48 90-30 135L0 175L30 135C48 90 40 20 38 -75Q0 -110 -38 -75Z',c1);
  P('M-26 -70L0 -45L26 -70L22 -100C10 -115-10 -115-22 -100Z',c1);
  P('M4 -108L40 -90L5 -72Z',c2,4);C(-6,-98,5,'#000',0);
  P('M-30 -130L-42 -190L-14 -158L0 -200L14 -158L42 -190L30 -130Z',c2);
  P('M-30 -130H30V-118H-30Z',c2,3);
  P('M-20 135L-50 190L-28 160L-24 195L-8 150Z',c2,4);P('M20 135L50 190L28 160L24 195L8 150Z',c2,4);
  ctx.save();ctx.globalAlpha=.9;P('M-22 -20L0 0L22 -20L0 -40Z','#000',0);ctx.restore();
  L('M-24 30H24M-24 60H24M-20 90H20','#000',3);
 }
 ctx.restore();
}

function draw(cv,cfg,opt){canvas=cv;ctx=cv.getContext('2d');OPT=opt||{};if(OPT.bump)cfg={...clean(cfg),fieldPattern:'solid',colorPrimary:'#3a3a3a',colorSecondary:'#3a3a3a',emblemColor1:'#ffffff',emblemColor2:'#d0d0d0',borderColor:'#ffffff',cloth:false};K=cv.width/800;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);ctx.setTransform(cv.width/800,0,0,cv.height/1000,0,0);drawFlag(clean(cfg));ctx.setTransform(1,0,0,1,0,0)}
const cache=new Map();
function url(cfg,w=80,h=100){const c=clean(cfg),key=JSON.stringify(c)+w+'x'+h;if(cache.has(key))return cache.get(key);
 const big=document.createElement('canvas');big.width=800;big.height=1000;draw(big,c);
 const small=document.createElement('canvas');small.width=w;small.height=h;const g=small.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(big,0,0,w,h);
 const u=small.toDataURL('image/png');cache.set(key,u);return u}
window.Banner={DEFAULT,FIELD,EMBLEMS,BORDERS,PATTERNS,clean,draw,url};
})();
