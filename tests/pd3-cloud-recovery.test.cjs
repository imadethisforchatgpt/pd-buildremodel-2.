'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../js/pd3-cloud-core.js');
const original = fs.readFileSync(path.join(__dirname,'..','js','pd3-cloud.js'),'utf8');

// Inject a testing-only probe into the cloud module; production source is not modified.
const injected = original.replace(/\}\)\(\);\s*$/, `window.__pd3Probe = {
  mount(data, sdk, revision = 0) {
    activeUid = 'isolated-test-owner'; user = {uid:activeUid};
    cache = {data,revision,pending:false}; db = data; firestore = {}; 
    persist(); window.__testingSdk = sdk; 
  },
  setSdk(value){ sdk = value; }, 
  state(){ return {db,cache,conflict,busy,message}; },
  flush, restore
};})();`);
assert.notEqual(injected,original,'test probe injection must succeed');

function harness() {
  const stored=new Map(),downloads=[],urlBlobs=new Map(),images=new Map();
  const localStorage={
    getItem:key => stored.has(key)?stored.get(key):null,
    setItem:(key,value)=>stored.set(key,String(value)),
    removeItem:key=>stored.delete(key)
  };
  const document={
    body:{appendChild(){}},
    createElement(tag){
      if(tag==='a')return {click(){downloads.push({filename:this.download,blob:urlBlobs.get(this.href)})}};
      return {type:tag,className:'',setAttribute(){},addEventListener(){},appendChild(){}};
    },
    getElementById(){return null},
    querySelector(){return null},
    querySelectorAll(){return []},
    addEventListener(){}
  };
  const indexedDB={open(name){
    const request={};
    Promise.resolve().then(()=>{
      const table=images.get(name)||new Map();images.set(name,table);
      request.result={
        close(){},createObjectStore(){},
        transaction(){
          const tx={};
          tx.objectStore=()=>({
            put(bytes,id){table.set(id,bytes)},
            openCursor(){const c={result:null};Promise.resolve().then(()=>c.onsuccess?.());return c}
          });
          Promise.resolve().then(()=>Promise.resolve().then(()=>tx.oncomplete?.()));
          return tx;
        }
      };
      request.onsuccess?.();
    });
    return request;
  }};
  const win={PD3CloudCore:core,PD3_FIREBASE_CLOUD_ENABLED:false,addEventListener(){}};
  const network={onLine:false};
  class TestBlob{constructor(parts){this.parts=parts}}
  const url={createObjectURL(blob){const key='blob:'+urlBlobs.size;urlBlobs.set(key,blob);return key},revokeObjectURL(){}};
  const uuid={randomUUID:()=> 'test-mutation-'+Math.random().toString(36).slice(2)};
  const setup=new Function('window','document','localStorage','navigator','indexedDB','crypto',
    'setTimeout','clearTimeout','URL','Blob','confirm',`
    let db={clients:[],projects:[],estimates:[],invoices:[],templates:[],feedback:[]};
    let tab='Dashboard';let render=()=>{};let go=t=>{tab=t};
    let save=()=>localStorage.setItem('guest',JSON.stringify(db));
    let importData=()=>{};
    ${injected}
    return {
      probe:window.__pd3Probe,
      addInvoice:x=>db.invoices.push(x),
      save:()=>save(),
      setDb:x=>{db=x},
      readDb:()=>db
    };
  `);
  const app=setup(win,document,localStorage,network,indexedDB,uuid,()=>1,()=>{},url,TestBlob,()=>true);
  return {...app,stored,downloads,images,network};
}

function firestoreHarness(){
  let remote=null,writes=0;
  const sdk={
    doc:()=>({}),serverTimestamp:()=>({timestamp:'server'}),
    runTransaction:async (_,task)=>task({
      get:async()=>({exists:()=>remote!==null,data:()=>remote}),
      set:(_,data)=>{writes++;remote=data}
    })
  };
  return {sdk,state:()=>({remote,writes}),setRemote:data=>{remote=data}};
}

test('offline invoice payment stays local, syncs once, and rejects a conflicting write', async()=>{
  const a=harness(), f=firestoreHarness(), data=core.empty();
  data.clients.push({name:'Offline safety test'});
  a.probe.mount(data,f.sdk);a.probe.setSdk(f.sdk);
  a.addInvoice({client:'Offline safety test',total:125,paid:25,payments:[{amount:25,method:'Cash'}]});
  a.save();
  assert.equal(JSON.parse(a.stored.get('pd3_cloud_workspace_v1_isolated-test-owner')).data.invoices[0].payments[0].amount,25);
  assert.equal(a.probe.state().cache.pending,true);
  await a.probe.flush();
  assert.equal(f.state().writes,0,'offline should not reach the cloud');
  a.network.onLine=true;
  await a.probe.flush();
  assert.equal(f.state().writes,1);
  assert.equal(JSON.parse(f.state().remote.payload).invoices[0].payments[0].amount,25);
  assert.equal(a.probe.state().cache.pending,false);
  assert.equal(a.probe.state().cache.revision,1);

  a.network.onLine=false;
  a.addInvoice({client:'Offline safety test',total:50,paid:0,payments:[]});
  a.save();
  f.setRemote({...f.state().remote,revision:2,mutationId:'different-device-write'});
  a.network.onLine=true;
  await a.probe.flush();
  assert.equal(f.state().writes,1,'a conflict must not overwrite another device');
  assert.equal(a.probe.state().cache.pending,true,'local changes must remain pending');
  assert.equal(a.probe.state().conflict,true);
  assert.equal(a.readDb().invoices.length,2);
});

test('backup restoration preserves customers, payments, photos and rejects invalid files',async()=>{
  const a=harness(),old=core.empty(),replacement=core.empty();
  old.clients.push({name:'Original customer'});
  a.setDb(old);
  replacement.clients.push({name:'Recovered customer'});
  replacement.invoices.push({client:'Recovered customer',total:250,paid:75,payments:[{amount:75,method:'Card'}]});
  const photo='data:image/png;base64,iVBORw0KGgo=';
  await a.probe.restore({text:async()=>JSON.stringify({
    pd3BackupVersion:1,records:replacement,photos:{test_photo:photo},draft:null
  })});
  assert.equal(a.downloads.length,1,'restore must export current records first');
  assert.match(a.downloads[0].blob.parts[0],/Original customer/);
  assert.equal(a.readDb().clients[0].name,'Recovered customer');
  assert.equal(JSON.parse(a.stored.get('guest')).invoices[0].payments[0].amount,75);
  assert.equal(a.images.get('pd3-preview-document-images').get('test_photo'),photo);

  const saved=JSON.stringify(a.readDb()),count=a.downloads.length;
  await assert.rejects(a.probe.restore({text:async()=>JSON.stringify({records:{clients:[]}})}));
  assert.equal(JSON.stringify(a.readDb()),saved);
  assert.equal(a.downloads.length,count,'invalid file must fail before restore');
  await assert.rejects(a.probe.restore({text:async()=>JSON.stringify({
    records:core.empty(),photos:{'unsafe/photo':'data:image/png;base64,abcd'}
  })}));
  assert.equal(JSON.stringify(a.readDb()),saved);
});
