'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const lifecycle = require('../js/pd3-estimate-lifecycle-core.js');
const core = require('../js/pd3-cloud-core.js');

const source = (name, amount = 100) => ({
  client:name, description:'Custom cabinetry',notes:'Special finish',warranty:'1 year',
  lines:[{description:'Custom cabinet doors',quantity:2,price:amount/2}],
  total:amount,date:'2026-10-13T15:00:00.000Z',
  paymentSchedule:[{label:'Deposit',amount:amount/2,dueWhen:'milestone',milestone:'Job start'}],
  contentBlocks:[{id:'photo-1',type:'photo',src:'photo_reference_1',caption:'Before'}]
});
const workspace = () => ({
  clients:[{name:'Customer'}],projects:[],
  estimates:[source('First'),source('Second',200),source('Third',300)],
  invoices:[],templates:[],feedback:[]
});

test('conversion removes only the target from active estimates without deleting records',()=>{
  const db=workspace();
  const idx=lifecycle.convert(db,1,()=>{},'2026-10-14T18:00:00.000Z');
  assert.equal(idx,0);
  assert.deepEqual(lifecycle.active(db).map(x=>x.index),[0,2]);
  assert.equal(db.estimates.length,3,'preserve numbering and audit history');
  assert.equal(db.invoices.length,1);
  assert.equal(db.invoices[0].client,'Second');
  assert.equal(db.invoices[0].total,200);
  assert.equal(db.invoices[0].paid,0);
  assert.deepEqual(db.invoices[0].payments,[]);
  assert.equal(db.invoices[0].sourceEstimate,1);
  assert.equal(db.invoices[0].invoiceDate,'2026-10-14');
  assert.ok(db.estimates[1].convertedAt);
});

test('conversion preserves full original invoice content, terms and photo references',()=>{
  const db=workspace();
  const original=JSON.parse(JSON.stringify(db.estimates[0]));
  lifecycle.convert(db,0,()=>{},'2026-10-14T18:00:00.000Z');
  for(const field of Object.keys(original)){
    assert.deepEqual(db.invoices[0][field],original[field],field);
  }
  db.invoices[0].paymentSchedule[0].amount=999;
  db.invoices[0].lines[0].description='Changed invoice only';
  assert.equal(db.estimates[0].paymentSchedule[0].amount,50);
  assert.equal(db.estimates[0].lines[0].description,'Custom cabinet doors');
});

test('converting one of several estimates maintains stable invoice source indexes',()=>{
  const db=workspace();
  lifecycle.convert(db,1,()=>{},'2026-10-14T18:00:00.000Z');
  lifecycle.convert(db,0,()=>{},'2026-10-14T18:05:00.000Z');
  assert.deepEqual(lifecycle.active(db).map(x=>x.index),[2]);
  assert.deepEqual(db.invoices.map(x=>x.sourceEstimate),[1,0]);
  assert.deepEqual(db.estimates.map(x=>x.client),['First','Second','Third']);
});

test('legacy converted estimates automatically disappear, with no data migration',()=>{
  const db=workspace();
  db.invoices.push({...source('Second',200),sourceEstimate:1,paid:75,payments:[{amount:75,method:'Cash'}]});
  assert.equal(lifecycle.isConverted(db,1),true);
  assert.deepEqual(lifecycle.active(db).map(x=>x.index),[0,2]);
  assert.equal(db.invoices[0].paid,75);
  assert.equal(db.invoices[0].payments[0].amount,75);
  assert.throws(()=>lifecycle.convert(db,1,()=>{}),/already an invoice/);
  assert.equal(db.invoices.length,1,'no accidental duplicate');
});

test('save failures roll back both estimate and invoice changes',()=>{
  const db=workspace(),original=JSON.stringify(db);
  assert.throws(()=>lifecycle.convert(db,1,()=>{throw Error('quota exceeded');}),/quota exceeded/);
  assert.equal(JSON.stringify(db),original);
  assert.deepEqual(lifecycle.active(db).map(x=>x.index),[0,1,2]);
});

test('invalid record references cannot create invoices',()=>{
  const db=workspace();
  for(const bad of [-1,3,1.5,'1',null]){
    assert.throws(()=>lifecycle.convert(db,bad,()=>{}));
  }
  assert.equal(db.invoices.length,0);
});

test('converted records survive workspace cloud JSON roundtrip',()=>{
  const db=workspace();
  lifecycle.convert(db,2,()=>{});
  const snapshot=core.encode(db);
  const loaded=core.decode({schemaVersion:1,revision:2,payload:snapshot});
  assert.equal(loaded.invoices.length,1);
  assert.equal(loaded.estimates.length,3);
  assert.deepEqual(lifecycle.active(loaded).map(x=>x.index),[0,1]);
});

test('P&D 3.0 scripts compile, and only premium branch references new lifecycle files',()=>{
  const root=path.resolve(__dirname,'..');
  for(const file of ['js/pd3-estimate-lifecycle-core.js','js/pd3-estimate-lifecycle.js','js/pd3-experience.js']){
    new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
  }
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(html,/src="js\/pd3-estimate-lifecycle-core\.js"/);
  assert.match(html,/src="js\/pd3-estimate-lifecycle\.js"/);
  assert.ok(html.indexOf('pd3-estimate-lifecycle-core.js')<html.indexOf('pd3-experience.js'));
  assert.ok(html.indexOf('pd3-estimate-lifecycle.js')<html.indexOf('pd3-cloud.js'));
});
