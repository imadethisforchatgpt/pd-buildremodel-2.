/* P&D block editor: development preview, browser test storage only */
(function(){
'use strict';
const escape=s=>window.PDBlocks.escape(s);
let blocks=[];
let editing=null;
const imgDB=()=>new Promise((resolve,reject)=>{
 const req=indexedDB.open('pd3-preview-document-images',1);
 req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('images'))req.result.createObjectStore('images')};
 req.onsuccess=()=>resolve(req.result);
 req.onerror=()=>reject(req.error);
});
async function storePhoto(id,data){
 const database=await imgDB();
 return new Promise((resolve,reject)=>{
  const tx=database.transaction('images','readwrite');
  tx.objectStore('images').put(data,id);
  tx.oncomplete=()=>{database.close();resolve()};
  tx.onerror=()=>{database.close();reject(tx.error)};
 });
}
async function loadPhoto(id){
 const database=await imgDB();
 return new Promise((resolve,reject)=>{
  const tx=database.transaction('images','readonly');
  const req=tx.objectStore('images').get(id);
  req.onsuccess=()=>{database.close();resolve(req.result||null)};
  req.onerror=()=>{database.close();reject(req.error)};
 });
}
async function compress(file){
 if(!file.type.startsWith('image/'))throw Error('Choose an image file');
 const raw=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(file)});
 const picture=new Image();
 picture.src=raw;
 await picture.decode();
 const max=1800,scale=Math.min(1,max/Math.max(picture.naturalWidth,picture.naturalHeight));
 const c=document.createElement('canvas');c.width=Math.max(1,Math.round(picture.naturalWidth*scale));c.height=Math.max(1,Math.round(picture.naturalHeight*scale));
 const ctx=c.getContext('2d');if(!ctx)throw Error('Image conversion unavailable');
 ctx.drawImage(picture,0,0,c.width,c.height);
 return c.toDataURL('image/jpeg',.82);
}
const htmlForEditor=b=>'<div class="pd-block-card" data-block="'+escape(b.id)+'"><div class="pd-block-top"><strong>'+({heading:'Heading',text:'Description',photo:'Photo',divider:'Divider'}[b.type])+'</strong><div class="pd-block-actions"><button type="button" data-op="up">Move up</button><button type="button" data-op="down">Move down</button><button type="button" data-op="remove">Remove</button></div></div>'+
 (b.type==='heading'?'<input class="pd-block-text" aria-label="Section heading" placeholder="Section heading" value="'+escape(b.text)+'">':
 b.type==='text'?'<textarea class="pd-block-text" aria-label="Section description" rows="5" placeholder="Write your detailed description here...">'+escape(b.text)+'</textarea>':
 b.type==='photo'?'<div class="pd-photo-controls"><input type="file" accept="image/*" class="pd-block-file" aria-label="Upload project photo"><select class="pd-block-width" aria-label="Photo width"><option value="full"'+(b.width==='full'?' selected':'')+'>Full width</option><option value="half"'+(b.width==='half'?' selected':'')+'>Half width</option></select><textarea rows="3" class="pd-block-caption" placeholder="Photo caption (optional)">'+escape(b.caption||'')+'</textarea><div class="pd-block-image" data-photo-preview="'+escape(b.id)+'"></div></div>':'<hr>')+'</div>';
function draw(){
 const host=document.getElementById('pdBlockItems');if(!host)return;
 host.innerHTML=blocks.map(htmlForEditor).join('')||'<p class="muted">Add a heading, description, or photo to begin.</p>';
 host.querySelectorAll('.pd-block-image').forEach(async el=>{const b=blocks.find(x=>x.id===el.dataset.photoPreview);if(!b?.src)return;try{const data=await loadPhoto(b.src);if(data)el.innerHTML='<img alt="Attached photo" src="'+data+'">';else el.textContent='Image missing from this device'}catch(_){el.textContent='Photo storage unavailable'}});
}
function add(type){blocks.push(PDBlocks.make(type));draw();changed()}
function changed(){editing=true;const note=document.getElementById('pdBlocksState');if(note)note.textContent='Changes pending save';}
function bind(){
 const host=document.getElementById('pdBlockItems');if(!host)return;
 host.addEventListener('input',e=>{
  const parent=e.target.closest('[data-block]');if(!parent)return;
  const b=blocks.find(x=>x.id===parent.dataset.block);if(!b)return;
  if(e.target.classList.contains('pd-block-text'))b.text=e.target.value;
  if(e.target.classList.contains('pd-block-caption'))b.caption=e.target.value;
  changed();
 });
 host.addEventListener('change',async e=>{
  const parent=e.target.closest('[data-block]');if(!parent)return;
  const b=blocks.find(x=>x.id===parent.dataset.block);if(!b)return;
  if(e.target.classList.contains('pd-block-width')){b.width=e.target.value;changed()}
  if(e.target.classList.contains('pd-caption-position')){b.captionPosition=e.target.value;changed()}
  if(e.target.classList.contains('pd-block-file')&&e.target.files?.[0]){
   const input=e.target;input.disabled=true;
   try{const data=await compress(input.files[0]);const photoId=PDBlocks.make('photo').id;await storePhoto(photoId,data);b.src=photoId;changed();draw()}
   catch(error){alert('Photo could not be saved: '+error.message);input.disabled=false}
  }
 });
 host.addEventListener('click',e=>{
  const button=e.target.closest('button[data-op]');if(!button)return;
  const card=button.closest('[data-block]');const id=card?.dataset.block;if(!id)return;
  if(button.dataset.op==='remove'){blocks=blocks.filter(b=>b.id!==id)}
  if(button.dataset.op==='up')blocks=PDBlocks.move(blocks,id,-1);
  if(button.dataset.op==='down')blocks=PDBlocks.move(blocks,id,1);
  draw();changed();
 });
}
const oldForm=estimateForm;
estimateForm=function(){
 oldForm();
 blocks=[];editing=false;
 const before=document.querySelector('#enotes')?.closest('.form-section')||document.getElementById('enotes')?.parentElement;
 if(!before)return;
 const panel=document.createElement('section');panel.id='pdBlockEditor';panel.className='panel';
 panel.innerHTML='<h2>Document sections and photos</h2><p class="muted">Add detailed descriptions and photos in the order they should appear in your estimate.</p><div class="pd-add-actions"><button type="button" class="btn" onclick="PDEditor.add(\'heading\')">+ Heading</button><button type="button" class="btn" onclick="PDEditor.add(\'text\')">+ Description</button><button type="button" class="btn" onclick="PDEditor.add(\'photo\')">+ Photo</button><button type="button" class="btn" onclick="PDEditor.add(\'divider\')">+ Divider</button></div><div id="pdBlockItems"></div><p id="pdBlocksState" class="muted">Changes will be stored when you save this estimate.</p>';
 before.parentNode.insertBefore(panel,before);
 bind();draw();
};
const oldDraft=draftData;
draftData=function(){const draft=oldDraft();draft.contentBlocks=PDBlocks.clean(blocks);return draft};
const oldEdit=editEstimate;
editEstimate=function(i){oldEdit(i);blocks=PDBlocks.clean(db.estimates[i]?.contentBlocks);editing=false;draw()};
const oldPreview=previewDraft;
previewDraft=function(){
 const existing=document.getElementById('draftPreview');if(existing){existing.remove();return}
 oldPreview();
 PDEditor.hydrate(document.getElementById('draftPreview'));
 const pane=document.getElementById('draftPreview');if(pane){const back=document.createElement('button');back.type='button';back.className='btn';back.textContent='← Return to Editing';back.onclick=()=>{pane.remove();document.getElementById('pdBlockEditor')?.scrollIntoView({behavior:'smooth',block:'start'})};pane.insertBefore(back,pane.firstChild)}
};
const oldHTML=documentHTML;
documentHTML=function(type,x,i){
 let html=oldHTML(type,x,i);
 const content=PDBlocks.html(x.contentBlocks);
 if(content)html=html.replace('<div class="paper-totals">',content+'<div class="paper-totals">');
 return html;
};
async function hydrate(root){
 if(!root)return;
 await Promise.all([...root.querySelectorAll('img[data-pd-photo]')].map(async img=>{
  const id=img.dataset.pdPhoto;try{const data=await loadPhoto(id);if(data)img.src=data;else img.replaceWith(document.createTextNode('Photo unavailable on this device'))}
  catch(_){img.replaceWith(document.createTextNode('Photo storage unavailable'))}
 }));
}
const oldSavedPreview=previewDoc;
previewDoc=function(type,i){oldSavedPreview(type,i);hydrate(document.getElementById('main'))};

async function addPhoto(file,width,caption,captionPosition){
 const b=PDBlocks.make('photo');b.width=width==='half'?'half':'full';b.caption=caption||'';b.captionPosition=captionPosition==='above'?'above':'below';
 const data=await compress(file);const photoId=PDBlocks.make('photo').id;
 await storePhoto(photoId,data);b.src=photoId;blocks.push(b);draw();changed();
}
window.PDEditor={add,addPhoto,hydrate,loadPhoto};

/* Draft recovery stores text, calculations, and photo references.
   Actual photos remain in the same browser's IndexedDB in test mode. */
const DRAFT_KEY='pd3_preview_estimate_draft_v1';
let draftTimer=null,restoringDraft=false;
function saveWorkingDraft(){
 if(restoringDraft||editingEstimateIndex!==null||!document.getElementById('pdBlockEditor'))return;
 try{
  const x=draftData();
  localStorage.setItem(DRAFT_KEY,JSON.stringify({version:1,savedAt:new Date().toISOString(),estimate:x}));
  const note=document.getElementById('pdBlocksState');if(note)note.textContent='Draft saved on this device';
 }catch(error){
  const note=document.getElementById('pdBlocksState');if(note)note.textContent='Draft not saved: browser storage is unavailable';
 }
}
function scheduleDraftSave(){clearTimeout(draftTimer);draftTimer=setTimeout(saveWorkingDraft,700)}
document.addEventListener('input',e=>{if(e.target.closest('#main')&&document.getElementById('pdBlockEditor'))scheduleDraftSave()});
document.addEventListener('change',e=>{if(e.target.closest('#main')&&document.getElementById('pdBlockEditor'))scheduleDraftSave()});
const previousChange=changed;
changed=function(){previousChange();scheduleDraftSave()};
const priorForm=estimateForm;
estimateForm=function(){
 priorForm();
 if(editingEstimateIndex!==null)return;
 let entry;try{entry=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null')}catch(_){}
 const saved=entry?.estimate;if(!saved)return;
 restoringDraft=true;
 try{
  for(const [id,key] of [['eclient','client'],['edesc','description'],['enotes','notes'],['ewarranty','warranty'],['edeposit','deposit'],['eschedule','schedule'],['pdCustomerPhone','customerPhone'],['pdCustomerEmail','customerEmail'],['pdJobAddress','projectAddress']]){
   const el=document.getElementById(id);if(el&&saved[key]!==undefined)el.value=saved[key];
  }
  const list=document.getElementById('lines');
  if(list&&Array.isArray(saved.lines)){list.innerHTML='';saved.lines.forEach(line=>{
   addLine();const row=list.lastElementChild;
   if(row){row.querySelector('.ldesc').value=line.description||'';row.querySelector('.lqty').value=line.quantity??1;row.querySelector('.lprice').value=line.price??0}
  });}
  blocks=PDBlocks.clean(saved.contentBlocks);draw();
  const type=document.getElementById('pdPlanType');
  if(type&&Array.isArray(saved.paymentSchedule)&&saved.paymentSchedule.length){type.value=saved.paymentPlanType||'custom';pdScheduleRows(saved.paymentSchedule);pdPlanCustomized=true}
  updateTotal();
  const note=document.getElementById('pdBlocksState');if(note)note.textContent='Unsaved draft restored from this device';
 }finally{restoringDraft=false}
};
const priorSave=saveEstimate;
saveEstimate=function(){
 priorSave();
 if(!document.getElementById('pdBlockEditor')){
  clearTimeout(draftTimer);
  try{localStorage.removeItem(DRAFT_KEY)}catch(_){}
 }
};


const previousSavedPreview=previewDoc;
previewDoc=function(type,i){
 previousSavedPreview(type,i);
 PDEditor.hydrate(document.getElementById('main'));
};
/* A single documentHTML layout powers on-screen preview and print/PDF.
   The new window opens synchronously on the user's tap, then images load
   from browser image storage before triggering the print dialog. */
printStyled=function(type,i){
 const record=(type==='estimate'?db.estimates:db.invoices)[i];
 if(!record)return;
 const popup=window.open('','_blank');
 if(!popup){alert('Allow popups to print or save this document');return}
 const css=[...document.querySelectorAll('style')].map(x=>x.textContent).join('\n');
 const documentBody=documentHTML(type,record,i).replace(/src="\.\/assets\//g,'src="'+location.origin+'/assets/');
 popup.document.open();
 popup.document.write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>P&D '+type+'</title><style>'+css+'body{background:white!important}.paper{box-shadow:none!important;border:0!important}@page{size:letter;margin:12mm}@media print{.paper{break-inside:auto}.pd-doc-photo,.pd-doc-heading{break-inside:avoid}}</style></head><body><main>'+documentBody+'</main></body></html>');
 popup.document.close();
 (async()=>{
  try{
   await PDEditor.hydrate(popup.document);
   await Promise.all([...popup.document.images].map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;setTimeout(resolve,5000)})));
   popup.focus();popup.print();
  }catch(e){popup.document.body.insertAdjacentHTML('afterbegin','<p>Could not prepare print preview. Please close and try again.</p>')}
 })();
};

})();
