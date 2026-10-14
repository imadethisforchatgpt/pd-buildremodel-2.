'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const core = require(path.join(root, 'js', 'pd3-cloud-core.js'));
const cloud = fs.readFileSync(path.join(root, 'js', 'pd3-cloud.js'), 'utf8');
const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
const config = fs.readFileSync(path.join(root, 'js', 'pd3-firebase-config.js'), 'utf8');
const empty = () => ({clients:[],projects:[],estimates:[],invoices:[],templates:[],feedback:[]});
const mut = () => 'safe-mutation-001';

test('app cloud scripts are valid JavaScript', () => {
  new vm.Script(cloud, { filename:'pd3-cloud.js' });
  new vm.Script(config, { filename:'pd3-firebase-config.js' });
});
test('workspace protocol rejects malformed and prototype-polluting records', () => {
  assert.throws(() => core.validate(null));
  assert.throws(() => core.validate({clients:'not-an-array'}));
  const poisoned = JSON.parse('{"clients":[{"__proto__":{"polluted":true}}],"estimates":[],"invoices":[],"templates":[],"feedback":[]}');
  assert.throws(() => core.encode(poisoned), /Unsafe backup field/);
  const withImage=empty();withImage.estimates.push({image:'data:image/png;base64,ABCDEF'});
  assert.throws(() => core.encode(withImage), /Photo bytes/);
});
test('workspace snapshots roundtrip including payments', () => {
  const x=empty();x.clients.push({name:'Test'});
  x.invoices.push({client:'Test',total:100,paid:25,payments:[{amount:25,date:'2026-10-14',method:'Cash'}]});
  const payload=core.encode(x);
  assert.deepEqual(core.decode({schemaVersion:1,revision:2,payload}),x);
});
test('large workspaces are rejected before cloud write', () => {
  const x=empty();x.clients.push({notes:'x'.repeat(701000)});
  assert.throws(() => core.encode(x), /exceeds the cloud limit/);
});
test('concurrent writes cannot overwrite a newer revision', () => {
  const p=core.encode(empty());
  const first=core.next(null,0,p,mut(),{stamp:1});
  assert.equal(first.revision,1);
  const second=core.next(first,1,p,'safe-mutation-002',{stamp:2});
  assert.equal(second.revision,2);
  assert.throws(() => core.next(second,1,p,'safe-mutation-003',{stamp:3}),e=>e.code==='pd3/conflict');
  assert.equal(core.next(second,1,p,'safe-mutation-002',{stamp:3}),null);
});
test('cloud adapter keeps previous records accessible during reconnect failure', () => {
  assert.match(cloud,/if \(!cache\) throw error;/);
  assert.match(cloud,/Cloud unavailable · Safe device copy loaded/);
  assert.match(cloud,/if \(remote && remote\.revision < cache\.revision\) conflict = true/);
  assert.match(cloud,/if \(value\.revision < cache\.revision\)/);
});
test('app does not discard unsaved form edits or redraw identical snapshots', () => {
  assert.match(cloud,/value\.revision === cache\.revision/);
  assert.match(cloud,/if \(editorDirty && tab !== t && !confirm\(/);
  assert.match(cloud,/if \(formOpen\(\)\)/);
});
test('auth remains account scoped with no guest auto upload', () => {
  assert.match(cloud,/a\.browserLocalPersistence/);
  assert.match(cloud,/autoOpenForExistingUser/);
  assert.match(cloud,/!localStorage\.getItem\(cacheKey\(account\.uid\)\)/);
  assert.match(cloud,/if \(!automatic && !confirm\(/);
  assert.match(rules,/request\.auth\.uid == uid/);
  assert.match(rules,/match \/users\/\{uid\}\/settings\/workspace-v1/);
  assert.match(rules,/allow delete: if false/);
  assert.match(rules,/match \/\{document=\*\*\} \{ allow read, write: if false; \}/);
});
