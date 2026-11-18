/* A still rendered from a lit, textured 3D scene. No animation loop is needed. */
window.CitadelMenuScene=(()=>{
 const canvas=document.getElementById('menu-scene');
 let renderFrame;
 function draw(){
  if(!canvas.clientWidth||!canvas.clientHeight)return;
  renderFrame??=build(window.THREE);
  renderFrame?.();
 }

 function build(T){
  if(!T)return;
  let renderer;
  try{renderer=new T.WebGLRenderer({canvas,alpha:false,antialias:true})}
  catch{return ()=>{}}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));
  renderer.outputEncoding=T.sRGBEncoding;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFSoftShadowMap;

  const scene=new T.Scene();
  scene.background=new T.Color(0x252438);
  scene.fog=new T.FogExp2(0x272638,.018);
  const fortress=new T.Group();
  scene.add(fortress);

  const masonry=new T.MeshStandardMaterial({color:0x89817a,roughness:.95});
  const trim=new T.MeshStandardMaterial({color:0xb3a28f,roughness:.94});
  const groundMat=new T.MeshStandardMaterial({color:0x5b545c,roughness:1});
  const pathMat=new T.MeshStandardMaterial({color:0x756e65,roughness:.82});
  const iron=new T.MeshStandardMaterial({color:0x29242a,metalness:.56,roughness:.48});
  const fabric=new T.MeshStandardMaterial({color:0x492037,side:T.DoubleSide,roughness:1});
  const gold=new T.MeshStandardMaterial({color:0xa67a3b,metalness:.55,roughness:.55});
  const dark=new T.MeshStandardMaterial({color:0x161018,roughness:1});
  const glow=new T.MeshBasicMaterial({color:0xffa347,fog:false});
  const core=new T.MeshBasicMaterial({color:0xffdf9f,fog:false});
  let seed=212;
  function random(){seed=(seed*16807)%2147483647;return seed/2147483647}
  const flare=document.createElement('canvas');
  flare.width=flare.height=64;
  const brush=flare.getContext('2d');
  const halo=brush.createRadialGradient(32,32,0,32,32,32);
  halo.addColorStop(0,'rgba(255,163,87,.45)');
  halo.addColorStop(.28,'rgba(244,126,54,.2)');
  halo.addColorStop(1,'rgba(244,126,54,0)');
  brush.fillStyle=halo;
  brush.fillRect(0,0,64,64);
  const flareMaterial=new T.SpriteMaterial({map:new T.CanvasTexture(flare),transparent:true,
   depthWrite:false,blending:T.AdditiveBlending,fog:false});

  const sky=document.createElement('canvas');
  sky.width=1024;sky.height=640;
  const skyBrush=sky.getContext('2d');
  const twilight=skyBrush.createLinearGradient(0,0,0,sky.height);
  twilight.addColorStop(0,'#1c1d31');
  twilight.addColorStop(.54,'#37334b');
  twilight.addColorStop(.81,'#635567');
  twilight.addColorStop(1,'#292538');
  skyBrush.fillStyle=twilight;
  skyBrush.fillRect(0,0,sky.width,sky.height);
  for(let i=0;i<210;i++){
   const x=random()*1024,y=125+random()*370,w=45+random()*200,h=7+random()*39;
   skyBrush.save();skyBrush.translate(x,y);skyBrush.scale(w,h);
   const vapor=skyBrush.createRadialGradient(0,0,0,0,0,1);
   vapor.addColorStop(0,i%3?'rgba(127,105,137,.063)':'rgba(22,18,40,.17)');
   vapor.addColorStop(1,'rgba(0,0,0,0)');
   skyBrush.fillStyle=vapor;
   skyBrush.fillRect(-1,-1,2,2);
   skyBrush.restore();
  }
  const skyMap=new T.CanvasTexture(sky);
  skyMap.encoding=T.sRGBEncoding;
  scene.background=skyMap;

  function mesh(geometry,material,x,y,z,parent=fortress,shadow=true){
   const model=new T.Mesh(geometry,material);
   model.position.set(x,y,z);
   model.castShadow=shadow;
   model.receiveShadow=true;
   parent.add(model);
   return model;
  }
  function tileUV(geometry,u,v){
   const uv=geometry.attributes.uv;
   for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*u,uv.getY(i)*v);
   return geometry;
  }
  function block(w,h,d,x,y,z,material=masonry){
   const geometry=new T.BoxGeometry(w,h,d);
   const uv=geometry.attributes.uv;
   [[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]].forEach(([u,v],side)=>{
    for(let i=side*4;i<side*4+4;i++)uv.setXY(i,uv.getX(i)*u/3.5,uv.getY(i)*v/3.5);
   });
   return mesh(geometry,material,x,y+h/2,z);
  }
  function archShape(w,spring){
   const s=new T.Shape();
   s.moveTo(-w,0);s.lineTo(-w,spring);
   s.absarc(0,spring,w,Math.PI,0,true);
   s.lineTo(w,0);s.closePath();
   return s;
  }
  function opening(x,y,z,w,spring,lit=false){
   mesh(new T.ShapeGeometry(archShape(w,spring)),lit?glow:dark,x,y,z,fortress,false);
   for(const side of [-1,1])block(.16,spring,.16,x+side*(w+.08),y,z,trim);
   for(let i=0;i<11;i++){
    const a=(i+.5)*Math.PI/11;
    const wedge=block((w+.08)*Math.PI/11+.02,.17,.2,
     x+Math.cos(a)*(w+.085),y+spring+Math.sin(a)*(w+.085)-.085,z,trim);
    wedge.rotation.z=a-Math.PI/2;
   }
   if(lit){
    block(.075,spring+w*.82,.08,x,y,z+.06,iron);
    block(w*1.97,.07,.08,x,y+spring*.65,z+.06,iron);
   }
  }
  function turret(x,z,r,h){
   const shell=tileUV(new T.CylinderGeometry(r,r*1.05,h,40),r*1.8,h/3.5);
   mesh(shell,masonry,x,h/2,z);
   for(const y of [2,h-1.05,h-.8]){
    mesh(tileUV(new T.CylinderGeometry(r+.12,r+.12,.2,40),r*1.8,.2),trim,x,y,z);
   }
   mesh(tileUV(new T.CylinderGeometry(r+.22,r+.1,.5,40),r*2,.2),masonry,x,h-.33,z);
   for(let i=0;i<14;i++){
    const a=i*Math.PI/7;
    const merlon=block(.51,.68,.55,x+Math.sin(a)*r,h-.1,z+Math.cos(a)*r);
    merlon.rotation.y=a;
   }
   opening(x,h-3.22,z+r*1.005,.24,.83,true);
   opening(x,2.55,z+r*1.025,.13,.63);
  }
  function battlements(x,y,z,width,count){
   block(width+.22,.24,.74,x,y-.24,z,trim);
   block(width,.34,.63,x,y,z);
   for(let i=0;i<count;i++)block(.78,.66,.65,x-width/2+(i+.5)*width/count,y+.34,z);
  }
  function banner(x,y,z){
   const cloth=new T.PlaneGeometry(1.12,2.4,18,24);
   const position=cloth.attributes.position;
   for(let i=0;i<position.count;i++){
    const u=position.getX(i),v=position.getY(i);
    position.setXYZ(i,u,v+Math.max(0,-v)*.17*Math.abs(u)*2,Math.cos(u*12)*.085);
   }
   cloth.computeVertexNormals();
   mesh(cloth,fabric,x,y,z);
   block(1.44,.075,.09,x,y+1.21,z,gold);
   const emblem=new T.Shape();
   emblem.moveTo(0,.38);emblem.lineTo(.22,.01);emblem.lineTo(0,-.36);
   emblem.lineTo(-.22,.01);emblem.closePath();
   mesh(new T.ShapeGeometry(emblem),gold,x,y+.12,z+.1);
  }
  function torch(x,y,z){
   block(.09,.47,.1,x,y-.45,z,iron);
   mesh(new T.CylinderGeometry(.21,.1,.17,10),iron,x,y,z);
   mesh(new T.SphereGeometry(.14,12,8),glow,x,y+.19,z,fortress,false).scale.set(.72,1.76,.66);
   mesh(new T.SphereGeometry(.075,10,8),core,x,y+.14,z+.045,fortress,false).scale.y=1.45;
   const flareSprite=new T.Sprite(flareMaterial);
   flareSprite.position.set(x,y+.18,z+.22);
   flareSprite.scale.set(1.9,2.2,1);
   fortress.add(flareSprite);
   const light=new T.PointLight(0xff9b50,5.3,9,1.42);
   light.position.set(x,y+.29,z+.36);
   fortress.add(light);
  }

  block(22,5.65,2.15,0,0,1);
  battlements(0,5.65,2.03,21.3,17);
  block(6.35,8.8,3.65,0,0,1.7);
  battlements(0,8.8,3.48,6.38,5);
  for(const x of [-7.7,7.7])turret(x,2.2,1.78,8.7);
  for(const x of [-5.4,5.4])turret(x,-5.3,1.45,x<0?12.8:14.1);
  block(8,11.15,5,0,0,-5.2);
  battlements(0,11.15,-2.63,8,7);
  for(const x of [-2.6,0,2.6])opening(x,8.75,-2.68,.26,1.08,true);
  opening(0,0,3.59,1.65,2.86);
  for(let i=-5;i<=5;i++){
   const x=i*.268;
   block(.07,2.82+Math.sqrt(2.4-x*x),.075,x,0,3.7,iron);
  }
  for(const y of [.66,1.6,2.63])block(3.23,.11,.09,0,y,3.75,iron);
  opening(0,6.5,3.59,.33,.87,true);
  for(const x of [-2.47,2.47]){
   banner(x,6.25,3.72);
   torch(x,2.36,3.9);
  }

  const yard=mesh(tileUV(new T.PlaneGeometry(120,120),24,24),groundMat,0,-.08,0,scene,false);
  yard.rotation.x=-Math.PI/2;
  const path=mesh(tileUV(new T.PlaneGeometry(5.5,26),1.7,7.5),pathMat,0,-.065,16,scene,false);
  path.rotation.x=-Math.PI/2;
  for(let i=0;i<12;i++){
   const rock=new T.IcosahedronGeometry(.34+random()*.4,1);
   const x=(3.6+random()*5)*(i%2?1:-1);
   mesh(rock,groundMat,x,.09,5+random()*13,scene).scale.set(1.5,.65,1);
  }

  const ridgeMat=new T.MeshStandardMaterial({color:0x474556,roughness:1});
  const ridge=new T.PlaneGeometry(150,54,65,24);
  ridge.rotateX(-Math.PI/2);
  const points=ridge.attributes.position;
  for(let i=0;i<points.count;i++){
   const x=points.getX(i),z=points.getZ(i);
   const envelope=Math.sin(Math.PI*(z+27)/54);
   points.setY(i,envelope*(7+5*Math.sin(x*.17)+3*Math.sin(x*.43+z*.18)+random()*2.7));
  }
  ridge.computeVertexNormals();
  mesh(ridge,ridgeMat,0,-.7,-39,scene,false);
  const moon=mesh(new T.SphereGeometry(1.62,32,20),
   new T.MeshBasicMaterial({color:0xffe0bd,fog:false}),13,18,-46,scene,false);

  scene.add(new T.HemisphereLight(0xb7c6ff,0x674c59,.82));
  const moonlight=new T.DirectionalLight(0xa8bdff,1.48);
  moonlight.position.set(-13,24,15);
  moonlight.castShadow=true;
  moonlight.shadow.mapSize.set(1024,1024);
  Object.assign(moonlight.shadow.camera,{left:-22,right:22,top:20,bottom:-15,near:1,far:60});
  moonlight.shadow.normalBias=.055;
  scene.add(moonlight);
  const rim=new T.DirectionalLight(0xe1a4ad,.8);
  rim.position.set(9,13,-16);
  scene.add(rim);

  const camera=new T.PerspectiveCamera(41,1,.1,170);
  const frame=()=>{
   const {clientWidth:w,clientHeight:h}=canvas;
   if(!w||!h)return;
   const portrait=w/h<.85;
   camera.aspect=w/h;
   camera.position.set(portrait?8:14,portrait?6.4:7.6,portrait?37:28.5);
   camera.lookAt(portrait?0:-6.8,portrait?4.9:6.9,0);
   moon.position.set(portrait?-6:-14,portrait?20:24,-46);
   camera.updateProjectionMatrix();
   renderer.setSize(w,h,false);
   renderer.render(scene,camera);
   canvas.classList.add('scene-drawn');
  };
  new T.TextureLoader().load('assets/3bee2f5c96545af0613c.png',texture=>{
   texture.wrapS=texture.wrapT=T.RepeatWrapping;
   texture.encoding=T.sRGBEncoding;
   texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
   const bump=texture.clone();
   bump.encoding=T.LinearEncoding;
   bump.needsUpdate=true;
   for(const material of [masonry,trim,groundMat,pathMat]){
    material.map=texture;
    material.bumpMap=bump;
    material.bumpScale=material===groundMat?.09:.065;
    material.needsUpdate=true;
   }
   frame();
  });
  return frame;
 }
 canvas.addEventListener('webglcontextlost',e=>{
  e.preventDefault();
  canvas.classList.remove('scene-drawn');
 });
 canvas.addEventListener('webglcontextrestored',draw);
 window.addEventListener('resize',draw);
 return {draw};
})();
