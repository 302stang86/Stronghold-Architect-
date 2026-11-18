/* Render a still of the citadel for the main menu. The canvas is idle between resizes. */
window.CitadelMenuScene=(()=>{
 let renderFrame;
 function draw(){
  const canvas=document.getElementById('menu-scene');
  if(!canvas?.clientWidth||!canvas.clientHeight)return;
  if(!renderFrame)renderFrame=build(canvas);
  renderFrame?.();
 }
 function build(canvas){
  const T=window.THREE;
  if(!T||!window.Castle3D?.build)return null;
  let renderer;
  try{renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true})}
  catch{return ()=>{}}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
  renderer.outputEncoding=T.sRGBEncoding;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  const scene=new T.Scene();
  scene.fog=new T.FogExp2(0x2c2545,.019);
  scene.add(new T.HemisphereLight(0xded0ff,0x4e333b,1.15));
  const moonlight=new T.DirectionalLight(0xa4b7ff,1.25);
  moonlight.position.set(12,18,-13);
  scene.add(moonlight);
  const sunset=new T.DirectionalLight(0xffad76,1.2);
  sunset.position.set(-10,8,8);
  scene.add(sunset);
  const fortress=Castle3D.build(2,true);
  fortress.scale.setScalar(1.65);
  fortress.rotation.y=-.28;
  scene.add(fortress);

  const gateLight=new T.PointLight(0xff9b47,2,16);
  gateLight.position.set(1,3,6);
  scene.add(gateLight);
  const ground=new T.Mesh(new T.PlaneGeometry(200,170),new T.MeshStandardMaterial({color:0x333348,roughness:1}));
  ground.rotation.x=-Math.PI/2;
  ground.position.y=-.12;
  scene.add(ground);

  const peak=new T.ConeGeometry(1,1,5);
  const ridge=new T.MeshStandardMaterial({color:0x37374f,roughness:1,flatShading:true});
  for(let i=0;i<12;i++){
   const mountain=new T.Mesh(peak,ridge);
   const h=7+(i*17%13);
   mountain.scale.set(5+(i%3),h,7);
   mountain.rotation.y=i*.5;
   mountain.position.set(-46+i*8,h*.32,-22-i%3*7);
   scene.add(mountain);
  }
  const moon=new T.Mesh(new T.SphereGeometry(2.8,32,20),new T.MeshBasicMaterial({color:0xffdfbb,fog:false}));
  moon.position.set(9,18,-37);
  scene.add(moon);
  const camera=new T.PerspectiveCamera(38,1,.1,150);
  return ()=>{
   const {clientWidth:w,clientHeight:h}=canvas;
   if(!w||!h)return;
   const portrait=w/h<.85;
   camera.aspect=w/h;
   camera.position.set(portrait?10:20,portrait?11:13,portrait?37:28);
   camera.lookAt(portrait?0:-6,portrait?4.3:5.4,0);
   camera.updateProjectionMatrix();
   renderer.setSize(w,h,false);
   renderer.render(scene,camera);
   canvas.classList.add('scene-drawn');
  };
 }
 document.getElementById('menu-scene').addEventListener('webglcontextlost',e=>{
  e.preventDefault();
  e.currentTarget.classList.remove('scene-drawn');
 });
 document.getElementById('menu-scene').addEventListener('webglcontextrestored',draw);
 window.addEventListener('resize',draw);
 return {draw};
})();
