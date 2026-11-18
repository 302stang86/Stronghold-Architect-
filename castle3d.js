/* Three.js castle markers for the world map: stone towers, battlements and tiled roofs in warm painted light. */
(function(){
const T=window.THREE;if(!T){window.Castle3D={ok:()=>false};return}
let R=null,tried=false;
function ok(){if(tried)return !!R;tried=true;try{const c=document.createElement('canvas');R=new T.WebGLRenderer({canvas:c,alpha:true,antialias:true,preserveDrawingBuffer:true});R.outputEncoding=T.sRGBEncoding;R.toneMapping=T.ACESFilmicToneMapping;R.toneMappingExposure=.85;R.setClearColor(0x000000,0);R.shadowMap.enabled=true;R.shadowMap.type=T.PCFSoftShadowMap;R.setPixelRatio(1);R.setSize(300,360,false)}catch(e){R=null}return !!R}
function stoneTex(tint){const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.fillStyle=tint;g.fillRect(0,0,256,256);
 let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
 for(let y=0;y<8;y++){const off=(y%2)*16;for(let x=-1;x<8;x++){const sh=(rnd()-.5)*34;g.fillStyle=`rgba(${sh>0?255:0},${sh>0?255:0},${sh>0?255:0},${Math.abs(sh)/255})`;g.fillRect(x*32+off,y*32,32,32)}}
 g.strokeStyle='rgba(40,34,28,.55)';g.lineWidth=2.2;for(let y=0;y<=8;y++){g.beginPath();g.moveTo(0,y*32);g.lineTo(256,y*32);g.stroke()}
 for(let y=0;y<8;y++){const off=(y%2)*16;for(let x=0;x<=8;x++){g.beginPath();g.moveTo(x*32+off,y*32);g.lineTo(x*32+off,y*32+32);g.stroke()}}
 for(let i=0;i<900;i++){g.fillStyle=`rgba(0,0,0,${rnd()*.07})`;g.fillRect(rnd()*256,rnd()*256,2,2)}
 const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.encoding=T.sRGBEncoding;t.anisotropy=4;return t}
function roofTex(){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.fillStyle='#8a3a2f';g.fillRect(0,0,128,128);
 for(let y=0;y<8;y++){for(let x=0;x<8;x++){g.fillStyle=`rgba(0,0,0,${.06+((x*7+y*3)%5)*.025})`;g.beginPath();g.arc(x*16+(y%2)*8,y*16+12,9,0,Math.PI);g.fill()}}
 g.strokeStyle='rgba(50,15,10,.6)';g.lineWidth=2;for(let y=0;y<8;y++){g.beginPath();g.moveTo(0,y*16+14);g.lineTo(128,y*16+14);g.stroke()}
 const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(4,2);t.encoding=T.sRGBEncoding;return t}
function groundTex(){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');const gr=g.createRadialGradient(64,64,6,64,64,62);gr.addColorStop(0,'rgba(0,0,0,.5)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);return new T.CanvasTexture(c)}
function scaleUV(geo,sx,sy){const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*sx,uv.getY(i)*sy)}
function build(variant,home){
 const g=new T.Group(),st=stoneTex(home?'#c9a85c':'#a9a28f'),stone=new T.MeshStandardMaterial({map:st,roughness:.95,color:0xffffff}),
  roof=new T.MeshStandardMaterial({map:roofTex(),roughness:.8,color:home?0xe0a050:0xffffff}),dark=new T.MeshStandardMaterial({color:0x1b1411,roughness:1}),gold=new T.MeshStandardMaterial({color:0xd8b24a,roughness:.35,metalness:.8}),wood=new T.MeshStandardMaterial({color:0x5a3d22,roughness:.8});
 const add=(m,x,y,z)=>{m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;g.add(m);return m};
 function box(w,h,d,x,y,z){const geo=new T.BoxGeometry(w,h,d);scaleUV(geo,Math.max(w,d)/2,h/2);return add(new T.Mesh(geo,stone),x,y+h/2,z)}
 function crenels(w,d,x,y,z,s=.34){const nx=Math.max(2,Math.round(w/(s*2))),nz=Math.max(2,Math.round(d/(s*2)));
  for(let i=0;i<nx;i++){const px=x-w/2+s/2+i*((w-s)/(nx-1));for(const pz of [z-d/2+s/2,z+d/2-s/2])box(s,s*.9,s,px,y,pz)}
  for(let i=1;i<nz-1;i++){const pz=z-d/2+s/2+i*((d-s)/(nz-1));for(const px of [x-w/2+s/2,x+w/2-s/2])box(s,s*.9,s,px,y,pz)}}
 function cyl(r,h,x,y,z){const geo=new T.CylinderGeometry(r,r*1.06,h,20);scaleUV(geo,r*3,h/2);return add(new T.Mesh(geo,stone),x,y+h/2,z)}
 function ring(r,x,y,z){for(let i=0;i<10;i++){const a=i/10*Math.PI*2,m=new T.Mesh(new T.BoxGeometry(.3,.3,.3),stone);m.rotation.y=-a;add(m,x+Math.cos(a)*(r-.12),y+.15,z+Math.sin(a)*(r-.12))}}
 function cone(r,h,x,y,z){const m=new T.Mesh(new T.ConeGeometry(r*1.25,h,20),roof);return add(m,x,y+h/2,z)}
 function pyramid(w,h,x,y,z){const m=new T.Mesh(new T.ConeGeometry(w*.78,h,4),roof);m.rotation.y=Math.PI/4;return add(m,x,y+h/2,z)}
 function gate(w,h,x,z){const body=new T.Mesh(new T.BoxGeometry(w,h,.2),dark);add(body,x,h/2,z);const arch=new T.Mesh(new T.CylinderGeometry(w/2,w/2,.2,20,1,false,0,Math.PI),dark);arch.rotation.x=Math.PI/2;arch.rotation.z=0;add(arch,x,h,z);
  for(let i=-1;i<=1;i++){const b=new T.Mesh(new T.BoxGeometry(.05,h+.4,.06),wood);add(b,x+i*w/4,(h+.4)/2,z+.1)}}
 function win(x,y,z,face=1){const m=new T.Mesh(new T.BoxGeometry(.18,.42,.1),dark);add(m,x,y,z*face)}
 let topY,topX=0,topZ=0;
 if(variant===0){
  box(6.2,2.2,1.1,0,0,1.0);crenels(6.2,1.1,0,2.2,1.0);
  box(2.4,4.4,2.4,0,0,-.4);crenels(2.4,2.4,0,4.4,-.4);
  for(const s of [-1,1]){cyl(.85,3.6,s*3.1,0,1.0);ring(.85,s*3.1,3.6,1.0);cone(.85,1.7,s*3.1,3.9,1.0)}
  gate(1.15,1.35,0,1.58);for(const y of [3.1,3.8])for(const x of [-.55,.55])win(x,y,.82);
  topY=4.7;topX=0;topZ=-.4;
 }else if(variant===1){
  box(5.6,2,1,0,0,.9);crenels(5.6,1,0,2,.9);
  for(const s of [-1,1]){cyl(1,4.2,s*2.9,0,.7);ring(1,s*2.9,4.2,.7);cone(1,2,s*2.9,4.5,.7);win(s*2.9,3,1.7)}
  box(2.2,3.4,1.8,0,0,1.2);crenels(2.2,1.8,0,3.4,1.2);gate(1.1,1.4,0,2.12);
  box(1.6,3.6,1.6,0,0,-.5);pyramid(1.6,1.3,0,3.9,-.5);
  topY=5.2;topZ=-.5;
 }else if(variant===2){
  box(6.4,1.8,1.1,0,0,1.0);crenels(6.4,1.1,0,1.8,1.0);
  for(const s of [-1,1]){cyl(.65,2.8,s*3.1,0,1.0);ring(.65,s*3.1,2.8,1.0);cone(.65,1.3,s*3.1,3.1,1.0)}
  cyl(1.05,4.3,0,0,-.3);ring(1.05,0,4.3,-.3);cone(1.05,1.9,0,4.6,-.3);
  gate(1.1,1.2,0,1.58);for(const y of [3,4.2])win(0,y,.78);
  topY=6.5;topZ=-.3;
 }else{
  box(6.6,2,1.2,0,0,1);crenels(6.6,1.2,0,2,1);
  for(const s of [-1,1]){box(1.6,3.2,1.6,s*3.1,0,1);crenels(1.6,1.6,s*3.1,3.2,1)}
  box(2.2,4.2,1.9,0,0,.7);crenels(2.2,1.9,0,4.2,.7);gate(1.15,1.4,0,1.68);
  box(1.4,3.4,1.4,0,0,-.9);pyramid(1.4,1.1,0,3.7,-.9);
  topY=4.6;topZ=.7;
 }
 const pole=new T.Mesh(new T.CylinderGeometry(.05,.05,2.2,10),wood);add(pole,topX,topY+1.1,topZ);const ball=new T.Mesh(new T.SphereGeometry(.12,14,12),gold);add(ball,topX,topY+2.25,topZ);
 g.userData.tip=new T.Vector3(topX,topY+2.2,topZ);
 return g;
}
const cache=new Map();
function render(variant,home){
 if(!ok())return null;const key=variant+(home?'h':'');if(cache.has(key))return cache.get(key);
 const sc=new T.Scene(),g=build(variant,home);sc.add(g);
 sc.add(new T.HemisphereLight(0xfff1d2,0x4b5b3a,.7));
 const sun=new T.DirectionalLight(0xffe2b4,1.7);sun.position.set(-7,10,3);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);const s=sun.shadow.camera;s.left=-6;s.right=6;s.top=8;s.bottom=-6;s.near=1;s.far=30;sun.shadow.bias=-.0006;sc.add(sun);
 const rim=new T.DirectionalLight(0x8fa4ff,.4);rim.position.set(6,3,-5);sc.add(rim);
 const gp=new T.Mesh(new T.PlaneGeometry(9,6),new T.MeshBasicMaterial({map:groundTex(),transparent:true,depthWrite:false}));gp.rotation.x=-Math.PI/2;gp.position.set(.4,.01,.5);sc.add(gp);
 const sh=new T.Mesh(new T.PlaneGeometry(14,12),new T.ShadowMaterial({opacity:.24}));sh.rotation.x=-Math.PI/2;sh.receiveShadow=true;sc.add(sh);
 const hh=5.3,hw=hh*100/120,c=new T.OrthographicCamera(-hw,hw,hh,-hh,.1,60);c.position.set(0,7.2+3.9,10.5);c.lookAt(0,3.9,0);c.updateProjectionMatrix();c.updateMatrixWorld();
 R.render(sc,c);const url=R.domElement.toDataURL('image/png');
 const tip=g.userData.tip.clone().project(c),res={url,pole:{x:(tip.x+1)/2,y:(1-tip.y)/2}};
 sc.traverse(o=>{if(o.geometry)o.geometry.dispose()});cache.set(key,res);return res}
window.Castle3D={ok,render,build};
})();
