/* Deterministic browser integration with synthetic Firebase SDK/transport.
   This tests app behavior; it does not claim the live Firebase project works. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
let cloud=null;
const fakeApp='export function initializeApp(){return {}}';
const fakeAuth=`const auth={currentUser:null};const observers=[];
export const browserSessionPersistence={};export function getAuth(){return auth};export async function setPersistence(){};
export function onAuthStateChanged(a,cb){observers.push(cb);queueMicrotask(()=>cb(a.currentUser));return ()=>{}};
export async function signInWithEmailAndPassword(a,email,password){a.currentUser={uid:'synthetic-owner',email};observers.forEach(cb=>cb(a.currentUser));return {user:a.currentUser}};
export async function signOut(a){a.currentUser=null;observers.forEach(cb=>cb(null))};`;
const fakeFirestore=`export function getFirestore(){return {}};export function doc(db,...parts){return parts.join('/')};export function serverTimestamp(){return 'fake-server-time'};
function snap(v){return {exists:()=>!!v,data:()=>v,metadata:{fromCache:false,hasPendingWrites:false}}};
export async function getDocFromServer(){const r=await fetch('/__synthetic-cloud');return snap(await r.json())};
export function onSnapshot(ref,opts,cb,error){let last='';const timer=setInterval(async()=>{try{const s=await getDocFromServer();const j=JSON.stringify(s.data());if(j!==last){last=j;cb(s)}}catch(e){}},100);return ()=>clearInterval(timer)};
export async function runTransaction(db,fn){let write;const result=await fn({get:getDocFromServer,set:(r,v)=>{write=v}});if(write){const r=await fetch('/__synthetic-cloud',{method:'POST',body:JSON.stringify(write)});if(!r.ok){const e=Error('Another device changed this workspace');e.code='pd3/conflict';throw e}}return result};`;
const server=http.createServer((req,res)=>{
 if(req.url==='/__synthetic-cloud'){
  if(req.method==='POST'){let body='';req.on('data',x=>body+=x);req.on('end',()=>{const v=JSON.parse(body);if(v.revision!==(cloud?.revision||0)+1){res.writeHead(409);res.end();return}cloud=v;res.end('{}')});return}
  res.setHeader('content-type','application/json');res.end(JSON.stringify(cloud));return;
 }
 const target=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);
 if(!target.startsWith(root+path.sep)||!fs.existsSync(target)){res.writeHead(404);res.end();return}
 res.setHeader('content-type',target.endsWith('.js')?'application/javascript':target.endsWith('.css')?'text/css':target.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(target));
});
async function wait(test,label){for(let i=0;i<60;i++){if(await test())return;await new Promise(r=>setTimeout(r,100));}throw Error('Timed out: '+label)}
(async()=>{
 await new Promise(r=>server.listen(8768,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.PD3_CHROMIUM_EXECUTABLE||undefined});
 try {
  async function device(guest){
   const context=await browser.newContext({acceptDownloads:true});
   await context.route('https://www.gstatic.com/firebasejs/**',route=>{const url=route.request().url();return route.fulfill({contentType:'application/javascript',body:url.endsWith('firebase-app.js')?fakeApp:url.endsWith('firebase-auth.js')?fakeAuth:fakeFirestore})});
   const page=await context.newPage();page.on('dialog',d=>d.accept());
   if(guest)await page.addInitScript(v=>localStorage.setItem('pd3_preview_records_v1',JSON.stringify(v)),guest);
   await page.goto('http://127.0.0.1:8768/');
   // Explicit test-only enablement. Published builds keep cloud activation off.
   await page.evaluate(()=>{window.PD3_FIREBASE_CLOUD_ENABLED=true;go('Settings')});
   await page.locator('#pd3CloudLogin [name=email]').fill('synthetic@example.test');
   await page.locator('#pd3CloudLogin [name=password]').fill('synthetic-test-only');
   await page.locator('#pd3CloudLogin button[value=signin]').click();
   await page.locator('[data-cloud=open]').waitFor();await page.locator('[data-cloud=open]').click();
   await wait(()=>page.evaluate(()=>PD3Cloud.activeUid()==='synthetic-owner'),'open account');return {page,context};
  }
  const C=require('../js/pd3-cloud-core.js');
  const guest={...C.empty(),clients:[{name:'Original browser-only customer'}]};
  const a=await device(guest),b=await device();
  assert.equal(cloud,null,'Sign-in and activation never upload guest records');
  assert.equal(await a.page.evaluate(()=>db.clients.length),0);
  await a.page.evaluate(()=>{db.clients.push({name:'Cloud customer',notes:'Saved'});db.invoices.push({client:'Cloud customer',total:100,paid:120,payments:[{amount:120}]});save();});
  await wait(()=>cloud?.revision===1,'initial cloud save');
  await wait(()=>b.page.evaluate(()=>db.clients[0]?.name==='Cloud customer'),'second device synchronization');
  assert.equal(await b.page.evaluate(()=>db.invoices[0].paid),120);
  await b.context.setOffline(true);
  await b.page.evaluate(()=>{db.clients[0].notes='Offline edit';save()});
  assert.equal(await b.page.evaluate(()=>JSON.parse(localStorage.getItem('pd3_cloud_workspace_v1_synthetic-owner')).pending),true);
  await a.page.evaluate(()=>{db.clients[0].notes='Newer online edit';save()});
  await wait(()=>cloud?.revision===2,'second online save');
  await b.context.setOffline(false);
  await b.page.evaluate(()=>window.dispatchEvent(new Event('online')));
  await wait(async()=>/conflict|Another device/i.test(await b.page.locator('.pd3-cloud-status').innerText()),'offline conflict');
  assert.equal(JSON.parse(cloud.payload).clients[0].notes,'Newer online edit');
  assert.equal(await b.page.evaluate(()=>db.clients[0].notes),'Offline edit','Conflict retains local copy');
  await a.page.evaluate(()=>go('Settings'));
  await a.page.locator('[data-cloud=logout]').click();
  await wait(()=>a.page.evaluate(()=>!PD3Cloud.activeUid()),'sign out');
  assert.equal(await a.page.evaluate(()=>db.clients[0].name),'Original browser-only customer');
  await a.page.evaluate(()=>go('Settings'));
  await a.page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('pd3-preview-document-images',1);r.onupgradeneeded=()=>r.result.createObjectStore('images');r.onsuccess=()=>{const tx=r.result.transaction('images','readwrite');tx.objectStore('images').put('data:image/jpeg;base64,AAAA','photo-local-1');tx.oncomplete=()=>{r.result.close();resolve()};tx.onerror=()=>reject(tx.error)}}));
  const [download]=await Promise.all([a.page.waitForEvent('download'),a.page.locator('[data-cloud=backup]').click()]);
  const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
  assert.equal(exported.pd3BackupVersion,1);assert.equal(exported.records.clients[0].name,'Original browser-only customer');
  assert.equal(exported.photos['photo-local-1'],'data:image/jpeg;base64,AAAA');
  await a.page.evaluate(()=>localStorage.setItem('pd3_preview_estimate_draft_v1',JSON.stringify({estimate:{client:'Old draft'}})));
  const restored={...exported,records:{...exported.records,clients:[{name:'Restored customer'}]}};
  await a.page.locator('#pd3CloudRestore').setInputFiles({name:'synthetic-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(restored))});
  await wait(()=>a.page.evaluate(()=>db.clients[0]?.name==='Restored customer'),'full backup restore');
  assert.equal(await a.page.evaluate(()=>localStorage.getItem('pd3_preview_estimate_draft_v1')),null,'Full backup with no draft clears stale draft');
  assert.equal(JSON.parse(cloud.payload).clients[0].notes,'Newer online edit','Guest restore does not overwrite cloud');
  // Exercise actual client/project forms and imported legacy payment totals.
  await a.page.evaluate(()=>go('Clients'));
  await a.page.locator('#cname').fill('Sweep customer');
  await a.page.locator('#cemail').fill('customer@example.test');
  await a.page.evaluate(()=>addClient());
  await a.page.evaluate(()=>pdEditClient(1));
  await a.page.locator('#cnotes').fill('Edited customer notes');
  await a.page.evaluate(()=>addClient());
  assert.equal(await a.page.evaluate(()=>db.clients[1].notes),'Edited customer notes');
  await a.page.evaluate(()=>go('Projects'));
  await a.page.locator('#pname').fill('Sweep cabinetry');
  await a.page.locator('#pclient').fill('Sweep customer');
  await a.page.evaluate(()=>addProject());
  await a.page.evaluate(()=>pdEditProject(0));
  await a.page.locator('#ptasks').fill('Install cabinet doors');
  await a.page.evaluate(()=>addProject());
  assert.equal(await a.page.evaluate(()=>db.projects[0].tasks),'Install cabinet doors');
  await a.page.evaluate(()=>{db.invoices=[{client:'Legacy customer',total:100,paid:40,payments:[]}];save();go('Invoices');payment(0)});
  await a.page.locator('#pdReceivedAmount').fill('10.00');
  await a.page.locator('#pdReceivedMethod').selectOption('Cash');
  await a.page.locator('#pdRecordPaymentForm button[type=submit]').click();
  assert.equal(await a.page.evaluate(()=>db.invoices[0].paid),50,'Existing paid total survives first detailed payment');
  assert.equal(await a.page.evaluate(()=>db.invoices[0].paymentOpeningBalance),40);
  console.log('PASS: browser opt-in, guest isolation, cross-device records/payments, offline conflict retention, sign-out isolation, full backup download');
 } finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1)});
