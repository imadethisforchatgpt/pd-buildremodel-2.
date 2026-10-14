const fs=require('node:fs');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,getDoc,setDoc,deleteDoc,serverTimestamp}=require('firebase/firestore');
(async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-pd3-rules',firestore:{rules:fs.readFileSync('firestore.rules','utf8')}});
 try {
  const owner=env.authenticatedContext('owner').firestore(),other=env.authenticatedContext('other').firestore(),guest=env.unauthenticatedContext().firestore();
  const path='users/owner/settings/workspace-v1';
  const v={schemaVersion:1,revision:1,payload:'{}',mutationId:'mutation-123456',updatedAt:serverTimestamp()};
  await assertFails(setDoc(doc(guest,path),v)); await assertFails(setDoc(doc(other,path),v));
  await assertSucceeds(setDoc(doc(owner,path),v)); await assertSucceeds(getDoc(doc(owner,path)));
  await assertFails(getDoc(doc(other,path))); await assertFails(getDoc(doc(guest,path)));
  for(const patch of [{revision:3},{revision:2,role:'admin'},{revision:2,payload:12},{revision:2,payload:'x'.repeat(700001)}]) await assertFails(setDoc(doc(owner,path),{...v,...patch}));
  await assertSucceeds(setDoc(doc(owner,path),{...v,revision:2}));
  await assertFails(deleteDoc(doc(owner,path))); await assertFails(setDoc(doc(owner,'users/owner/settings/other'),v));
  await assertFails(setDoc(doc(owner,'users/other/settings/workspace-v1'),v));
  console.log('PASS: owner isolation, revision validation, update field/type/size rejection, no deletion, unrelated paths denied');
 } finally {await env.cleanup();}
})().catch(e=>{console.error(e);process.exit(1)});
