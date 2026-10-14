/* P&D 3.0 only. Opt-in Firebase workspace; guest records never silently migrate. */
(function() {
  'use strict';
  const C = window.PD3CloudCore;
  let sdk, auth, firestore, user, activeUid = '', cache, remote, unsubscribe;
  let busy = false, conflict = false, editorDirty = false, timer, session = 0;
  let message = 'Saved on this device · Cloud not connected';
  const uid = () => crypto.randomUUID();
  const cacheKey = id => 'pd3_cloud_workspace_v1_' + id;
  const draftKey = () => activeUid ? 'pd3_cloud_draft_v1_' + activeUid : 'pd3_preview_estimate_draft_v1';
  const photoDB = () => activeUid ? 'pd3-cloud-images-' + activeUid : 'pd3-preview-document-images';
  window.PD3Cloud = {draftKey,photoDB,activeUid:() => activeUid};
  const status = document.createElement('button');
  status.type = 'button'; status.className = 'pd3-cloud-status'; status.setAttribute('aria-live','polite');
  status.addEventListener('click', () => go('Settings')); document.body.appendChild(status);
  function report(text) {
    message = text; status.textContent = text;
    const out = document.getElementById('pd3CloudMessage'); if (out) out.textContent = text;
  }
  function persist() {localStorage.setItem(cacheKey(activeUid), JSON.stringify(cache));}
  function readCache(id) {
    const raw = localStorage.getItem(cacheKey(id)); if (!raw) return null;
    const value = JSON.parse(raw);
    C.validate(value.data);
    if (!Number.isSafeInteger(value.revision) || value.revision < 0) throw Error('Invalid device cache. Export before recovery.');
    return value;
  }
  const originalSave = save;
  save = function() {
    if (!activeUid) {
      try {originalSave();} catch(e) {report('NOT SAVED · Browser storage is full or unavailable'); throw e;}
      report('Saved on this device · Cloud not connected'); return;
    }
    const data = C.validate(JSON.parse(JSON.stringify(db)));
    const prior = cache;
    cache = {...cache, data, pending:true, mutationId:uid()};
    try {persist();} catch(e) {cache = prior; report('NOT SAVED · Browser storage is full or unavailable'); throw e;}
    editorDirty = false;
    report(navigator.onLine ? 'Saved on device · Waiting for cloud' : 'Saved on device · Offline');
    clearTimeout(timer); timer = setTimeout(flush, 500);
  };
  async function firebase() {
    if (window.PD3_FIREBASE_CLOUD_ENABLED !== true) throw Error('Cloud activation is pending verified Firebase rules. Local records and full backups are available.');
    if (sdk) return;
    const version = '12.4.0';
    const [app, a, f] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/' + version + '/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/' + version + '/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/' + version + '/firebase-firestore.js')
    ]);
    const instance = app.initializeApp(window.PD3_FIREBASE_CONFIG, 'pd3-workspace');
    sdk = {...a,...f}; auth = a.getAuth(instance); firestore = f.getFirestore(instance);
    // Session auth: deliberately avoid saving passwords or persistent sign-in on shared devices.
    await a.setPersistence(auth, a.browserSessionPersistence);
    await new Promise(resolve => {const off = a.onAuthStateChanged(auth, value => {user = value; off(); resolve();});});
    a.onAuthStateChanged(auth, value => {
      user = value;
      if (activeUid && (!value || value.uid !== activeUid)) leaveWorkspace();
      panel();
    });
  }
  function ref() {return sdk.doc(firestore,'users',activeUid,'settings','workspace-v1');}
  function listen(token) {
    unsubscribe?.();
    unsubscribe = sdk.onSnapshot(ref(), {includeMetadataChanges:true}, snap => {
      if (token !== session || snap.metadata.fromCache || snap.metadata.hasPendingWrites) return;
      try {if (snap.exists()) accept(snap.data()); else if (cache.revision > 0) {conflict = true; report('Cloud workspace missing · Device copy retained');}}
      catch(e) {report('Cloud read failed · ' + e.message);}
    }, e => {if (token === session) report('Cloud access failed · ' + friendly(e));});
  }
  function formOpen() {
    return !!document.querySelector('#pdBlockEditor,#pd3InvoiceEditor,#pdPaymentOverlay') || editorDirty;
  }
  function accept(value) {
    if (!value) {remote = null; return;}
    const data = C.decode(value); remote = value;
    if (busy) return;
    if (!cache.pending && !formOpen()) {
      cache = {data,revision:value.revision,pending:false}; persist(); db = data;
      render(); report('Saved in cloud · Photos stay on this device');
    } else if (cache.pending && value.mutationId !== cache.mutationId && value.revision !== cache.revision) {
      conflict = true; report('Sync conflict · Both copies retained · Open Settings');
    } else if (!cache.pending && value.revision > cache.revision) {
      report('Cloud update waiting · Finish editing, then open Settings');
    }
  }
  async function openWorkspace() {
    if (!user) throw Error('Sign in first.');
    if (activeUid) return;
    if (formOpen()) throw Error('Save or leave your current editor before opening cloud records.');
    if (!confirm('Open your account’s cloud workspace? Browser-only records will stay separate. Nothing will be uploaded automatically.')) return;
    const prior = db, id = user.uid, token = ++session;
    activeUid = id;
    try {
      cache = readCache(id);
      if (!navigator.onLine && !cache) throw Error('Connect once before opening this account offline.');
      if (navigator.onLine) {
        const snap = await sdk.getDocFromServer(ref());
        if (token !== session) return;
        remote = snap.exists() ? snap.data() : null;
        if (remote) C.decode(remote);
        if (!cache) cache = {data:remote ? C.decode(remote) : C.empty(),revision:remote?.revision || 0,pending:false};
      }
      db = cache.data; persist(); conflict = false; go('Dashboard');
      if (navigator.onLine) {
        if (cache.pending && remote && remote.mutationId === cache.mutationId) {
          cache = {data:C.decode(remote),revision:remote.revision,pending:false}; persist(); db = cache.data;
        }
        if (cache.pending && (remote?.revision || 0) !== cache.revision) conflict = true;
        if (remote) accept(remote);
        listen(token);
      }
      report(conflict ? 'Sync conflict · Both copies retained · Open Settings' : cache.pending ? 'Saved on device · Cloud changes pending' : navigator.onLine ? 'Cloud workspace open · Photos stay on this device' : 'Offline · Account records on this device');
      panel(); if (cache.pending) flush();
    } catch(e) {activeUid = ''; cache = null; db = prior; ++session; throw e;}
  }
  async function flush() {
    if (!activeUid || !cache?.pending || busy || conflict || !navigator.onLine || !user || user.uid !== activeUid) return;
    busy = true; const token = session, submitted = {...cache};
    try {
      const payload = C.encode(submitted.data), target = ref(); report('Saved on device · Saving to cloud…');
      const result = await sdk.runTransaction(firestore, async tx => {
        const snap = await tx.get(target); const current = snap.exists() ? snap.data() : null;
        if (current) C.decode(current);
        const envelope = C.next(current,submitted.revision,payload,submitted.mutationId,sdk.serverTimestamp());
        if (envelope) tx.set(target,envelope);
        return envelope ? envelope.revision : current.revision;
      });
      if (token !== session) return;
      cache = {...cache,revision:result,pending:cache.mutationId !== submitted.mutationId}; persist();
      report(cache.pending ? 'Saved on device · More changes pending' : 'Saved in cloud · Photos stay on this device');
    } catch(e) {
      if (token !== session) return;
      if (e.code === 'pd3/conflict') conflict = true;
      report('Device copy retained · ' + friendly(e));
    } finally {
      busy = false;
      if (token === session && cache?.pending && !conflict) {
        // Avoid quota/error retry loops. Retry only after a new save, an online event, or user action.
        if (cache.mutationId !== submitted.mutationId) timer = setTimeout(flush,500);
      }
    }
  }
  function friendly(e) {
    if (e.code === 'permission-denied') return 'Cloud access denied. Publish the P&D 3.0 rules first.';
    if (e.code === 'auth/invalid-credential') return 'Email or password was not accepted.';
    return e.message || 'Cloud request failed';
  }
  function leaveWorkspace() {
    ++session; clearTimeout(timer); unsubscribe?.(); unsubscribe = null;
    activeUid = ''; cache = null; remote = null; conflict = false; editorDirty = false;
    document.querySelectorAll('#pd3InvoiceEditor,#pdPaymentOverlay').forEach(el => el.remove());
    // Original guest records are restored without writing or clearing their storage key.
    db = JSON.parse(localStorage.getItem('pd3_preview_records_v1') || 'null') || C.empty();
    go('Dashboard'); report('Browser-only workspace · Cloud account closed');
  }
  async function closeWorkspace() {
    if (busy) throw Error('Wait for the current cloud save to finish.');
    if (formOpen() && !confirm('Leave the current editor? Saved records and this account’s stored draft remain on this device.')) return;
    if (cache?.pending && !confirm('Cloud changes are still pending. Keep them on this device and sign out?')) return;
    leaveWorkspace(); if (auth) await sdk.signOut(auth); user = null; panel();
  }
  function download(value,name) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
    const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url),5000);
  }
  function photos(databaseName = photoDB()) {
    return new Promise((resolve,reject) => {
      const r = indexedDB.open(databaseName,1);
      r.onupgradeneeded = () => r.result.createObjectStore('images'); r.onerror = () => reject(r.error);
      r.onsuccess = () => {
        const database = r.result, tx = database.transaction('images','readonly'), out = {};
        const cursor = tx.objectStore('images').openCursor(); cursor.onsuccess = () => {const x = cursor.result; if (x) {out[x.key] = x.value; x.continue();}};
        tx.oncomplete = () => {database.close(); resolve(out);}; tx.onerror = () => {database.close(); reject(tx.error);};
      };
    });
  }
  function putPhotos(images) {
    const name = photoDB();
    return new Promise((resolve,reject) => {
      const r = indexedDB.open(name,1); r.onupgradeneeded = () => r.result.createObjectStore('images'); r.onerror = () => reject(r.error);
      r.onsuccess = () => {const database = r.result, tx = database.transaction('images','readwrite'); for (const [id,bytes] of Object.entries(images)) tx.objectStore('images').put(bytes,id); tx.oncomplete = () => {database.close(); resolve();}; tx.onerror = () => {database.close(); reject(tx.error);};};
    });
  }
  async function backup() {
    const photoData = await photos();
    download({pd3BackupVersion:1,exportedAt:new Date().toISOString(),records:db,photos:photoData,draft:JSON.parse(localStorage.getItem(draftKey()) || 'null')},'pd3-full-device-backup-' + new Date().toISOString().slice(0,10) + '.json');
    report('Backup downloaded · Includes this device’s stored photos');
  }
  async function migrate() {
    if (!activeUid || cache.pending || busy) throw Error('Open a synced cloud workspace first.');
    const snap = await sdk.getDocFromServer(ref());
    if (snap.exists() || C.collections.some(k => cache.data[k]?.length)) throw Error('Cloud workspace already contains a saved snapshot. Restore a backup explicitly instead of importing twice.');
    const legacy = JSON.parse(localStorage.getItem('pd3_preview_records_v1') || 'null');
    if (!legacy) throw Error('No browser-only records found.'); C.encode(legacy);
    const summary = ['clients','projects','estimates','invoices','templates','feedback'].map(k => k + ': ' + (legacy[k]?.length || 0)).join('\n');
    download(legacy,'pd3-before-cloud-import.json');
    if (!confirm('A record backup was downloaded (photos are separate). Review the export before continuing.\n\n' + summary + '\n\nCopy these records to your empty cloud workspace? The original stays on this device.')) return;
    await putPhotos(await photos('pd3-preview-document-images'));
    db = C.validate(legacy); save(); render(); await flush();
  }
  async function loadRemote() {
    if (busy || formOpen()) throw Error('Finish saving or leave the current editor first.');
    const snap = await sdk.getDocFromServer(ref()); if (!snap.exists()) throw Error('Cloud workspace is missing.');
    const value = snap.data(), data = C.decode(value);
    download(db,'pd3-device-copy-before-cloud-recovery.json');
    if (!confirm('Your device copy was downloaded. Open the latest cloud copy? Existing local photos will remain.')) return;
    cache = {data,revision:value.revision,pending:false}; persist(); db = data; remote = value; conflict = false; render(); report('Latest cloud copy opened · Device backup downloaded');
  }
  async function restore(file) {
    if (busy || formOpen()) throw Error('Finish saving or leave the editor before restoring.');
    if (conflict) throw Error('Resolve the cloud conflict first. Your backup file is unchanged.');
    const value = JSON.parse(await file.text()), data = C.validate(value.records || value);
    const images = value.photos || {};
    for (const [id,bytes] of Object.entries(images)) if (!/^[a-zA-Z0-9_-]{1,160}$/.test(id) || typeof bytes !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(bytes)) throw Error('Invalid backup photo');
    if (activeUid) C.encode(data);
    await backup();
    if (!confirm('Your current full backup was downloaded. Replace records with this backup' + (activeUid ? ' and queue them for your cloud account' : ' on this device') + '?')) return;
    await putPhotos(images);
    const prior = db; db = data;
    try {save();} catch(e) {db = prior; throw e;}
    if (Object.prototype.hasOwnProperty.call(value,'draft')) {
      if (value.draft) localStorage.setItem(draftKey(),JSON.stringify(value.draft));
      else localStorage.removeItem(draftKey());
    }
    render(); report(activeUid ? 'Backup restored on device · Cloud save pending' : 'Full device backup restored');
  }
  function panel() {
    if (tab !== 'Settings') return;
    document.getElementById('pd3CloudPanel')?.remove();
    const section = document.createElement('section'); section.className = 'panel pd3-cloud-panel'; section.id = 'pd3CloudPanel';
    section.innerHTML = '<h2>Cloud account & backup</h2><p id="pd3CloudMessage" role="status"></p>' +
      '<p>Photos stay on this device. Cloud records contain photo references, so another device may show a missing-photo message. A full device backup includes locally stored photos.</p>' +
      (window.PD3_FIREBASE_CLOUD_ENABLED !== true ? '<p class="pd3-cloud-warning">Cloud activation is pending verified Firebase rules. You can keep working locally and download full backups now.</p>' : !user ? '<form id="pd3CloudLogin"><p>Use your P&D account credentials. This is separate from Google Console sign-in.</p><label>Email<input name="email" type="email" autocomplete="username" required></label><label>Password<input name="password" type="password" autocomplete="current-password" minlength="6" required></label><div class="actions"><button class="btn primary" type="submit" value="signin">Sign in</button><button class="btn" type="submit" value="signup">Create P&D account</button></div></form>' : '<p>Signed in as ' + esc(user.email || '') + '</p><div class="actions"><button class="btn primary" data-cloud="open">Open cloud workspace</button><button class="btn" data-cloud="logout">Sign out</button></div>') +
      '<div class="actions"><button class="btn" data-cloud="backup">Download full device backup</button><label class="btn">Restore backup<input id="pd3CloudRestore" type="file" accept=".json" hidden></label></div>' +
      (activeUid ? '<div class="actions"><button class="btn" data-cloud="retry">Retry cloud save</button><button class="btn" data-cloud="latest">Open latest cloud copy</button><button class="btn" data-cloud="migrate">Review browser-only records for import</button></div><p class="pd3-cloud-warning">Existing browser-only records stay separate until you export and approve their import. Concurrent edits pause cloud saving; export the device copy and open the latest cloud copy before restoring or re-entering your changes.</p>' : '<p>Cloud saving starts only after you sign in and open the cloud workspace. Existing records will not be uploaded automatically.</p>');
    document.getElementById('main').prepend(section); report(message);
    section.querySelector('form')?.addEventListener('submit', async e => {
      e.preventDefault(); const form = e.target, button = e.submitter || form.querySelector('button'); button.disabled = true;
      try {const mode = button.value; await firebase(); const action = mode === 'signup' ? sdk.createUserWithEmailAndPassword : sdk.signInWithEmailAndPassword; await action(auth,form.elements.email.value.trim(),form.elements.password.value); form.elements.password.value = ''; report('Signed in · Open cloud workspace to continue'); panel();}
      catch(error) {report('Sign-in failed · ' + friendly(error));} finally {button.disabled = false;}
    });
    const actions = {open:openWorkspace,logout:closeWorkspace,backup,retry:flush,latest:loadRemote,migrate};
    section.addEventListener('click', async e => {const b = e.target.closest('[data-cloud]'); if (!b) return; b.disabled = true; try {await actions[b.dataset.cloud]();} catch(error) {report(friendly(error));} finally {b.disabled = false;}});
    section.querySelector('#pd3CloudRestore').addEventListener('change', async e => {const file = e.target.files[0]; if (!file) return; try {await restore(file);} catch(error) {report('Restore failed · ' + friendly(error));} e.target.value = '';});
  }
  // Account-local drafts and photos retain the original guest storage unchanged.
  const formerRender = render; render = function() {formerRender(); panel(); document.getElementById('main')?.appendChild(status);};
  const formerGo = go; go = function(t) {editorDirty = false; formerGo(t);};
  document.addEventListener('input', e => {if (activeUid && e.target.closest('#main') && !e.target.closest('#pd3CloudPanel')) editorDirty = true;});
  window.addEventListener('online', () => {if (activeUid) {listen(session); report('Online · Checking pending saves'); flush();}});
  const tabIdentity = uid();
  window.addEventListener('storage', e => {
    if (!activeUid || e.key !== cacheKey(activeUid) || !e.newValue) return;
    try {localStorage.setItem('pd3_cloud_conflict_' + activeUid + '_' + tabIdentity,JSON.stringify(cache));}
    catch(_) {report('Another tab changed this account · Export this device copy immediately');}
    conflict = true; report('Another tab changed this account · Both copies retained · Open Settings');
  });
  window.addEventListener('offline', () => {if (activeUid) report('Offline · Records retained on this device');});
  window.addEventListener('beforeunload', e => {if (busy || cache?.pending || editorDirty) {e.preventDefault(); e.returnValue = '';}});
  // Route every restore entry point through validation and a pre-restore backup.
  importData = async function(input) {
    const file = input.files?.[0]; if (!file) return;
    try {await restore(file);} catch(error) {report('Restore failed · ' + friendly(error));}
    input.value = '';
  };
  report(message); panel(); document.getElementById('main')?.appendChild(status);
})();
