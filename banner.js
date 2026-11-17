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
let canvas,ctx;
function drawFlag(cfg) {
      const w = canvas.width;
      const h = canvas.height;
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
      if ((cfg.cloth!==false)) {
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
      drawSculptedBorder(w, h, cfg.borderStyle, cfg.borderColor);

      // 4. Central Heraldic Emblem
      ctx.save();
      ctx.translate(w/2, h/2);
      const scale = parseFloat(cfg.emblemScale);
      ctx.scale(scale, scale);
      drawEmblem(cfg.emblem, cfg.emblemColor1, cfg.emblemColor2);
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

    function drawEmblem(type, c1, c2) {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 25;
      ctx.shadowOffsetY = 12;

      if (type === 'citadel') {
        // Stone Citadel Castle
        ctx.fillStyle = c1;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.rect(-160, -100, 320, 200);
        ctx.fill(); ctx.stroke();

        // Towers
        ctx.beginPath();
        ctx.rect(-200, -160, 80, 260);
        ctx.rect(120, -160, 80, 260);
        ctx.fill(); ctx.stroke();

        // Gate
        ctx.fillStyle = c2;
        ctx.beginPath();
        ctx.arc(0, 60, 50, Math.PI, 0, false);
        ctx.lineTo(50, 100); ctx.lineTo(-50, 100);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Turret Roofs
        ctx.fillStyle = c2;
        ctx.beginPath();
        ctx.moveTo(-200, -160); ctx.lineTo(-160, -260); ctx.lineTo(-120, -160); ctx.closePath();
        ctx.moveTo(120, -160); ctx.lineTo(160, -260); ctx.lineTo(200, -160); ctx.closePath();
        ctx.fill(); ctx.stroke();

      } else if (type === 'swords') {
        // Crossed Swords
        ctx.fillStyle = c1;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 6;
        
        // Sword 1
        ctx.save();
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-15, -180, 30, 300);
        ctx.strokeRect(-15, -180, 30, 300);
        // Hilt
        ctx.fillStyle = c2;
        ctx.fillRect(-60, -40, 120, 16);
        ctx.beginPath(); ctx.arc(0, 40, 25, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.restore();

        // Sword 2
        ctx.save();
        ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = c1;
        ctx.fillRect(-15, -180, 30, 300);
        ctx.strokeRect(-15, -180, 30, 300);
        ctx.fillStyle = c2;
        ctx.fillRect(-60, -40, 120, 16);
        ctx.beginPath(); ctx.arc(0, 40, 25, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.restore();

      } else if (type === 'dragon') {
        // Heraldic Wyrm Dragon
        ctx.fillStyle = c1;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 6;
        // Body curve
        ctx.beginPath();
        ctx.moveTo(-40, 120);
        ctx.bezierCurveTo(-160, 120, -180, -60, -100, -140);
        ctx.bezierCurveTo(-40, -180, 0, -100, 60, -140);
        ctx.bezierCurveTo(160, -180, 180, 0, 100, 120);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Wings
        ctx.fillStyle = c2;
        ctx.beginPath();
        ctx.moveTo(-20, -40); ctx.lineTo(-180, -160); ctx.lineTo(-120, 20); ctx.closePath();
        ctx.moveTo(20, -40); ctx.lineTo(180, -160); ctx.lineTo(120, 20); ctx.closePath();
        ctx.fill(); ctx.stroke();

      } else if (type === 'lion') {
        // Lion Rampant
        ctx.fillStyle = c1;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 6;
        // Simplified majestic lion silhouette
        ctx.beginPath();
        ctx.moveTo(-40, 150);
        ctx.lineTo(-80, 40);
        ctx.lineTo(-120, -40);
        ctx.lineTo(-80, -120);
        ctx.lineTo(-20, -140);
        ctx.lineTo(20, -80);
        ctx.lineTo(80, -140);
        ctx.lineTo(140, -40);
        ctx.lineTo(100, 60);
        ctx.lineTo(60, 150);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Mane & Details
        ctx.fillStyle = c2;
        ctx.beginPath();
        ctx.arc(40, -80, 45, 0, Math.PI*2);
        ctx.fill(); ctx.stroke();

      } else if (type === 'stag') {
        // Royal Stag
        ctx.fillStyle = c1;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 6;
        // Head & neck
        ctx.beginPath();
        ctx.moveTo(-30, 160); ctx.lineTo(-30, 40); ctx.lineTo(-70, -40); ctx.lineTo(-40, -80);
        ctx.lineTo(20, -80); ctx.lineTo(50, -20); ctx.lineTo(30, 160); ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Majestic Antlers
        ctx.strokeStyle = c2;
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.moveTo(0, -70); ctx.lineTo(-100, -220);
        ctx.moveTo(0, -70); ctx.lineTo(100, -220);
        ctx.stroke();

      } else if (type === 'wolf') {
        // Dire Wolf Head
        ctx.fillStyle = c1;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(0, 120);
        ctx.lineTo(-90, -40);
        ctx.lineTo(-120, -180);
        ctx.lineTo(-30, -100);
        ctx.lineTo(0, -140);
        ctx.lineTo(30, -100);
        ctx.lineTo(120, -180);
        ctx.lineTo(90, -40);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Glowing eyes / accents
        ctx.fillStyle = c2;
        ctx.beginPath();
        ctx.arc(-35, -90, 12, 0, Math.PI*2);
        ctx.arc(35, -90, 12, 0, Math.PI*2);
        ctx.fill();

      } else if (type === 'griffin') {
        // Winged Griffin
        ctx.fillStyle = c1;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(-50, 140); ctx.lineTo(-80, 20); ctx.lineTo(-40, -80);
        ctx.lineTo(-100, -140); ctx.lineTo(0, -100); ctx.lineTo(80, -140);
        ctx.lineTo(50, 20); ctx.lineTo(50, 140); ctx.closePath();
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = c2;
        ctx.beginPath();
        ctx.moveTo(0, -40); ctx.lineTo(-160, -180); ctx.lineTo(-100, 0); ctx.closePath();
        ctx.moveTo(0, -40); ctx.lineTo(160, -180); ctx.lineTo(100, 0); ctx.closePath();
        ctx.fill(); ctx.stroke();

      } else if (type === 'helm') {
        // Knight's Great Helm
        ctx.fillStyle = c1;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.roundRect(-90, -120, 180, 240, 20);
        ctx.fill(); ctx.stroke();

        // Visor slit
        ctx.fillStyle = c2;
        ctx.fillRect(-70, -30, 140, 25);
        ctx.strokeRect(-70, -30, 140, 25);

        // Cross vents
        ctx.fillRect(-20, -5, 40, 70);
        ctx.strokeRect(-20, -5, 40, 70);

      } else if (type === 'axe') {
        // Battle Axe & Shield
        ctx.fillStyle = c1;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 6;
        // Handle
        ctx.fillRect(-12, -180, 24, 360);
        ctx.strokeRect(-12, -180, 24, 360);

        // Double Axe Blade
        ctx.fillStyle = c2;
        ctx.beginPath();
        ctx.moveTo(0, -140);
        ctx.bezierCurveTo(120, -180, 140, -60, 0, -40);
        ctx.moveTo(0, -140);
        ctx.bezierCurveTo(-120, -180, -140, -60, 0, -40);
        ctx.fill(); ctx.stroke();

      } else if (type === 'eagle') {
        // Crowned Imperial Eagle
        ctx.fillStyle = c1;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 6;
        // Body & spread wings
        ctx.beginPath();
        ctx.moveTo(0, 140);
        ctx.lineTo(-40, 20);
        ctx.lineTo(-180, -60);
        ctx.lineTo(-80, -100);
        ctx.lineTo(-40, -60);
        ctx.lineTo(0, -140);
        ctx.lineTo(40, -60);
        ctx.lineTo(80, -100);
        ctx.lineTo(180, -60);
        ctx.lineTo(40, 20);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Crown
        ctx.fillStyle = c2;
        ctx.beginPath();
        ctx.moveTo(-30, -140); ctx.lineTo(-40, -190); ctx.lineTo(-10, -165); ctx.lineTo(0, -195); ctx.lineTo(10, -165); ctx.lineTo(40, -190); ctx.lineTo(30, -140); ctx.closePath();
        ctx.fill(); ctx.stroke();
      }

      ctx.restore();
    }

    
function draw(cv,cfg){canvas=cv;ctx=cv.getContext('2d');drawFlag(clean(cfg))}
const cache=new Map();
function url(cfg,w=80,h=100){const c=clean(cfg),key=JSON.stringify(c)+w+'x'+h;if(cache.has(key))return cache.get(key);
 const big=document.createElement('canvas');big.width=800;big.height=1000;draw(big,c);
 const small=document.createElement('canvas');small.width=w;small.height=h;const g=small.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(big,0,0,w,h);
 const u=small.toDataURL('image/png');cache.set(key,u);return u}
window.Banner={DEFAULT,FIELD,EMBLEMS,BORDERS,PATTERNS,clean,draw,url};
})();
