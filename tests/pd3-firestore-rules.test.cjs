'use strict';
// Isolated Firestore security test. Runs only against an emulator with demo-project ID.
// Never reads or writes the live P&D Firebase project or customer records.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const {doc, getDoc, setDoc, deleteDoc, serverTimestamp} = require('firebase/firestore');

test('Firestore rules restrict records to their signed-in owner', async t => {
  const projectId = 'demo-pd3-safety';
  const env = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: fs.readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8')
    }
  });
  t.after(async () => {await env.cleanup();});

  const ownerDB = env.authenticatedContext('owner-a').firestore();
  const strangerDB = env.authenticatedContext('stranger-b').firestore();
  const guestDB = env.unauthenticatedContext().firestore();
  const userDoc = db => doc(db, 'users', 'owner-a', 'settings', 'workspace-v1');
  const snapshot = revision => ({
    schemaVersion: 1, revision,
    payload: JSON.stringify({clients:[],projects:[],estimates:[],invoices:[],templates:[],feedback:[]}),
    mutationId:'mutation-test-'+revision+'-0001',
    updatedAt:serverTimestamp()
  });

  await assertSucceeds(setDoc(userDoc(ownerDB),snapshot(1)));
  const stored = await assertSucceeds(getDoc(userDoc(ownerDB)));
  assert.equal(stored.data().revision, 1);

  await assertFails(getDoc(userDoc(strangerDB)));
  await assertFails(setDoc(userDoc(strangerDB),snapshot(2)));
  await assertFails(getDoc(userDoc(guestDB)));
  await assertFails(setDoc(userDoc(guestDB),snapshot(2)));

  await assertFails(setDoc(userDoc(ownerDB),snapshot(1))); // stale revision
  await assertSucceeds(setDoc(userDoc(ownerDB),snapshot(2))); // valid increment
  await assertFails(deleteDoc(userDoc(ownerDB))); // no destructive delete
  await assertFails(setDoc(doc(ownerDB,'users','owner-a','private','other'),snapshot(1))); // deny-by-default
  await assertFails(setDoc(userDoc(ownerDB),{...snapshot(3),unexpected:true})); // whitelisted keys
  const latest = await assertSucceeds(getDoc(userDoc(ownerDB)));
  assert.equal(latest.data().revision,2);
});
