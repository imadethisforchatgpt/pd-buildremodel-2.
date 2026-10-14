/* P&D 3.0 snapshot protocol. No Firebase or browser dependency. */
(function(root) {
  'use strict';
  const collections = ['clients','projects','estimates','invoices','templates','feedback'];
  const empty = () => Object.fromEntries(collections.map(k => [k, []]));
  function validate(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid workspace');
    for (const key of ['clients','estimates','invoices','templates','feedback']) {
      if (!Array.isArray(value[key])) throw Error('Invalid ' + key + ' records');
    }
    if (value.projects !== undefined && !Array.isArray(value.projects)) throw Error('Invalid projects records');
    for (const key of collections) {
      for (const record of value[key] || []) {
        if (!record || typeof record !== 'object' || Array.isArray(record)) throw Error('Invalid ' + key + ' record');
      }
    }
    function visit(v) {
      if (typeof v === 'string' && /^data:image\//i.test(v)) throw Error('Photo bytes must stay on this device');
      if (v && typeof v === 'object') for (const [k,x] of Object.entries(v)) {
        if (['__proto__','prototype','constructor'].includes(k)) throw Error('Unsafe backup field');
        visit(x);
      }
    }
    visit(value);
    return {...value, projects:Array.isArray(value.projects) ? value.projects : []};
  }
  function encode(data) {
    const json = JSON.stringify(validate(data));
    if (new TextEncoder().encode(json).length > 700000) throw Error('Workspace exceeds the cloud limit (700 KB). Export a backup; your local records are retained.');
    return json;
  }
  function decode(envelope) {
    if (!envelope || envelope.schemaVersion !== 1 || !Number.isSafeInteger(envelope.revision) || envelope.revision < 1 || typeof envelope.payload !== 'string') throw Error('Unsupported cloud record format');
    return validate(JSON.parse(envelope.payload));
  }
  // Transaction callback: rejects stale snapshots instead of replacing newer records.
  function next(remote, expectedRevision, payload, mutationId, updatedAt) {
    const revision = remote ? remote.revision : 0;
    if (remote && remote.mutationId === mutationId) return null; // Retry after an uncertain acknowledgement.
    if (revision !== expectedRevision) {const e = Error('Another device changed this workspace. Both copies are retained.'); e.code = 'pd3/conflict'; throw e;}
    return {schemaVersion:1, revision:revision + 1, payload, mutationId, updatedAt};
  }
  const api = {collections,empty,validate,encode,decode,next};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PD3CloudCore = api;
})(typeof window === 'undefined' ? globalThis : window);
