/* Cloud save (Firebase Auth + Firestore Spark plan). Works only when firebase-config.js holds your settings. */
(()=>{
const SDK='https://www.gstatic.com/firebasejs/10.14.1/',DEV_KEY='stronghold-architect-device',LINK_KEY='stronghold-architect-linked',PUSH_MS=30000;
let device=null;try{device=localStorage.getItem(DEV_KEY);if(!device){device=Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem(DEV_KEY,device)}}catch{device='nodevice'}
let backend=null,user=null,status='off',lastHash='',lastPushAt=0,pushing=false,lastSynced=0,errorShown=false,pushTimer=null;
const linked=()=>{try{return localStorage.getItem(LINK_KEY)}catch{return null}},setLinked=v=>{try{v?localStorage.setItem(LINK_KEY,v):localStorage.removeItem(LINK_KEY)}catch{}};
const hashOf=()=>JSON.stringify({...state,savedAt:0});
const isPristine=s=>s.day===1&&s.log.length<=1&&(s.prince?.xp||0)===0;
const when=ms=>ms?new Date(ms).toLocaleString():'unknown time';
async function realBackend(cfg){const appM=await import(SDK+'firebase-app.js'),authM=await import(SDK+'firebase-auth.js'),fsM=await import(SDK+'firebase-firestore.js');const app=appM.initializeApp(cfg),auth=authM.getAuth(app),db=fsM.getFirestore(app);
 return {onAuth(cb){return authM.onAuthStateChanged(auth,u=>cb(u?{uid:u.uid,name:u.displayName||u.email||'Signed in'}:null))},
  async signIn(){const p=new authM.GoogleAuthProvider();try{await authM.signInWithPopup(auth,p)}catch(e){if(['auth/popup-blocked','auth/operation-not-supported-in-this-environment','auth/web-storage-unsupported'].includes(e.code))await authM.signInWithRedirect(auth,p);else if(e.code!=='auth/popup-closed-by-user'&&e.code!=='auth/cancelled-popup-request')throw e}},
  signOut(){return authM.signOut(auth)},
  async load(uid){const snap=await fsM.getDoc(fsM.doc(db,'saves',uid));return snap.exists()?snap.data():null},
  async save(uid,data){await fsM.setDoc(fsM.doc(db,'saves',uid),{...data,updatedAt:fsM.serverTimestamp()})}}}
function ui(){const t=document.getElementById('cloud-status'),a=document.getElementById('cloud-signin'),s=document.getElementById('cloud-sync');if(!t)return;
 const map={off:'Cloud save is not set up yet. Add your Firebase settings to firebase-config.js to turn it on.',loading:'Connecting to cloud save…',signedout:'Sign in with Google to keep this stronghold in the cloud and continue on any device. The newest save always wins.',syncing:'Syncing…',ok:`Signed in as ${user?.name||''}. Last synced ${lastSynced?new Date(lastSynced).toLocaleTimeString():'just now'}. Saves about every 30 seconds.`,error:'Cloud save could not sync. The game still saves on this device. It will retry automatically.',unavailable:'Cloud save could not load. Check your connection. The game still saves on this device.'};
 t.textContent=map[status]||'';a.hidden=status==='off'||status==='unavailable';a.disabled=status==='loading'||status==='syncing';a.textContent=user?'Sign out':'Sign in with Google';s.hidden=!user}
async function applyRemote(remote){const next=validate(JSON.parse(remote.state));next.savedAt=remote.savedAt||next.savedAt||0;state=next;needsSetup=false;updateMainMenu();for(const id of ['battle-dialog','expdialog','roomdialog','builddialog','rosterdialog','servantdialog','researchdialog'])if(document.getElementById(id)?.open)document.getElementById(id).close();resetDayClock();selected=null;blueprint=null;relocating=false;buildTarget=null;save();state.savedAt=remote.savedAt||state.savedAt;lastHash=hashOf();render();if(window.showExpedition)showExpedition();renderBattle();scheduleThroneCenter()}
async function push(force=false){if(!backend||!user||pushing||needsSetup)return false;save();const h=hashOf();if(!force&&h===lastHash)return true;pushing=true;try{await backend.save(user.uid,{state:JSON.stringify(state),savedAt:state.savedAt||Date.now(),deviceId:device,version:5});lastHash=h;lastPushAt=Date.now();lastSynced=lastPushAt;status='ok';errorShown=false;return true}catch(e){status='error';if(!errorShown){errorShown=true;toast('Cloud save failed. Your progress is still saved on this device.')}return false}finally{pushing=false;ui()}}
async function firstSync(){status='syncing';ui();try{const remote=await backend.load(user.uid);const ls=state.savedAt||0,rs=remote?.savedAt||0;
 if(!remote){await push(true)}
 else if(needsSetup||isPristine(state)){await applyRemote(remote);toast(`Loaded your cloud save (day ${state.day}).`);status='ok';lastSynced=Date.now()}
 else{let useRemote=rs>ls;if(linked()!==user.uid){const info=`Cloud save: saved ${when(rs)}. This device: saved ${when(ls)}. The newest save will be used and the other replaced.`;if(!await askConfirm('Two saves found',info,'Use newest save','Not now')){await backend.signOut();return}}
  if(useRemote){await applyRemote(remote);toast(`Loaded the newer cloud save (day ${state.day}).`);status='ok';lastSynced=Date.now()}else await push(true)}
 setLinked(user.uid);lastHash=hashOf()}catch(e){status='error'}ui()}
async function onUser(u){user=u;if(!u){status='signedout';ui();return}await firstSync()}
window.cloudPull=async()=>{if(!backend||!user)return;try{const remote=await backend.load(user.uid);if(remote&&(remote.savedAt||0)>(state.savedAt||0)){await applyRemote(remote);toast(`Loaded a newer save from the cloud (day ${state.day}).`);lastSynced=Date.now();status='ok';ui()}}catch{}};
window.cloudPushSoon=()=>{if(!backend||!user||pushTimer||Date.now()-lastPushAt<10000)return;pushTimer=setTimeout(()=>{pushTimer=null;push()},3000)};
window.cloudSignedIn=()=>!!user;
async function init(){const cfg=window.FIREBASE_CONFIG;if(!window.CLOUD_BACKEND_OVERRIDE&&(!cfg||!cfg.apiKey||!cfg.projectId)){status='off';ui();return}status='loading';ui();try{backend=window.CLOUD_BACKEND_OVERRIDE||await realBackend(cfg)}catch{status='unavailable';ui();return}backend.onAuth(onUser)}
document.getElementById('cloud-signin').onclick=async()=>{if(!backend)return;if(user){if(await askConfirm('Sign out?','Your stronghold stays on this device. Cloud saving stops until you sign in again.','Sign out','Stay signed in')){await backend.signOut();setLinked(null);lastHash=''}}else{try{await backend.signIn()}catch{toast('Sign-in did not finish. Try again.')}}};
document.getElementById('cloud-sync').onclick=async()=>{if(!user)return;status='syncing';ui();await cloudPull();await push(true)};
document.addEventListener('visibilitychange',()=>{if(document.hidden)push()});
window.addEventListener('pagehide',()=>{push()});
setInterval(()=>{if(!document.hidden&&!awaitingResume)push()},PUSH_MS);
init();
})();
