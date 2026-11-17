/* Three.js banner rendering: a hanging cloth banner with embroidered relief and warm painted lighting. */
(function(){
const T=window.THREE;if(!T||!window.Banner){window.Banner3D={ok:()=>false};return}
let R=null,tried=false;
function ok(){if(tried)return !!R;tried=true;try{const c=document.createElement('canvas');R=new T.WebGLRenderer({canvas:c,alpha:true,antialias:true,preserveDrawingBuffer:true});R.outputEncoding=T.sRGBEncoding;R.toneMapping=T.ACESFilmicToneMapping;R.toneMappingExposure=1.1;R.setClearColor(0x000000,0);R.setPixelRatio(1)}catch(e){R=null}return !!R}
const W=2,H=2.5,SX=20,SY=25;
function scene(tex,bump){
 const sc=new T.Scene();
 const geo=new T.PlaneGeometry(W,H,SX,SY);
 const mat=new T.MeshStandardMaterial({map:tex,bumpMap:bump,bumpScale:1.6,roughness:.88,metalness:0,side:T.DoubleSide});
 const cloth=new T.Mesh(geo,mat);cloth.position.y=-.05;sc.add(cloth);
 const wood=new T.MeshStandardMaterial({color:0x5a3d22,roughness:.7,metalness:.05}),gold=new T.MeshStandardMaterial({color:0xd8b24a,roughness:.32,metalness:.85});
 const bar=new T.Mesh(new T.CylinderGeometry(.05,.05,W+.5,16),wood);bar.rotation.z=Math.PI/2;bar.position.y=H/2-.02;sc.add(bar);
 for(const s of [-1,1]){const e=new T.Mesh(new T.SphereGeometry(.1,20,16),gold);e.position.set(s*(W/2+.27),H/2-.02,0);sc.add(e)}
 const loop=new T.Mesh(new T.TorusGeometry(.12,.025,10,24),gold);loop.position.set(0,H/2+.1,0);sc.add(loop);
 sc.add(new T.HemisphereLight(0xfff0d8,0x3a2a4a,.85));
 const key=new T.DirectionalLight(0xffe0ae,1.7);key.position.set(-3,4,5);sc.add(key);
 const fill=new T.DirectionalLight(0x8fa4ff,.35);fill.position.set(4,-1,3);sc.add(fill);
 const base=geo.attributes.position.array.slice();
 function wave(t,amp){const p=geo.attributes.position.array;for(let i=0;i<p.length;i+=3){const x=base[i],y=base[i+1],v=(H/2-y)/H;p[i+2]=amp*v*(Math.sin(x*3.1+y*1.4-t*2.3)+.45*Math.sin(x*6.2-y*2.1-t*3.1))}geo.attributes.position.needsUpdate=true;geo.computeVertexNormals()}
 return {sc,cloth,wave,dispose(){geo.dispose();mat.dispose()}};
}
function cam(aspect){const c=new T.PerspectiveCamera(30,aspect,.1,50);const need=2.95/2,fitW=(W+.75)/2/aspect;c.position.set(0,.05,Math.max(need,fitW)/Math.tan(15*Math.PI/180)+.2);c.lookAt(0,.05,0);return c}
function texOf(cfg,w,h,opt){const c=document.createElement('canvas');const tw=Math.min(800,Math.max(256,Math.round(w*2)));c.width=tw;c.height=Math.round(tw*1.25);Banner.draw(c,cfg,{...(opt||{}),noCloth:true});const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.anisotropy=4;const bc=document.createElement('canvas');bc.width=c.width;bc.height=c.height;Banner.draw(bc,cfg,{...(opt||{}),bump:true});const bt=new T.CanvasTexture(bc);bt.anisotropy=4;t.userData={bump:bt};return t}
const cache=new Map();
function still(cfg,w,h,opt){
 if(!ok())return null;const clean=Banner.clean(cfg),key=JSON.stringify(clean)+w+'x'+h+JSON.stringify(opt||{});if(cache.has(key))return cache.get(key);
 const tex=texOf(clean,w,h,opt),S=scene(tex,tex.userData.bump);S.wave(.9,.1);S.cloth.rotation.y=-.2;
 R.setSize(w,h,false);R.render(S.sc,cam(w/h));
 const url=R.domElement.toDataURL('image/png');tex.userData.bump.dispose();tex.dispose();S.dispose();cache.set(key,url);return url}
/* Live preview: waves gently unless motion is reduced. */
function live(canvas){
 if(!ok())return null;
 const r=new T.WebGLRenderer({canvas,alpha:true,antialias:true});r.outputEncoding=T.sRGBEncoding;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.1;r.setClearColor(0x000000,0);
 let S=null,tex=null,c=cam(canvas.width/canvas.height),raf=0,stopped=false,t0=performance.now();
 const calm=()=>!(window.motionOK?window.motionOK():true);
 function frame(now){if(stopped)return;if(!canvas.isConnected||!canvas.offsetParent){raf=requestAnimationFrame(frame);return}
  const t=(now-t0)/1000;S.wave(calm()?.9:t,calm()?.1:.13);S.cloth.rotation.y=calm()?-.2:-.2+Math.sin(t*.7)*.05;r.render(S.sc,c);raf=requestAnimationFrame(frame)}
 return{set(cfg){const clean=Banner.clean(cfg);if(S){S.dispose();tex.userData.bump.dispose();tex.dispose()}tex=texOf(clean,canvas.width,canvas.height);S=scene(tex,tex.userData.bump);if(!raf)raf=requestAnimationFrame(frame)},stop(){stopped=true;cancelAnimationFrame(raf);r.dispose()}};
}
const plain=Banner.url;
Banner.url=function(cfg,w=80,h=100){return still(cfg,w,h)||plain(cfg,w,h)};
window.Banner3D={ok,still,live};
})();
