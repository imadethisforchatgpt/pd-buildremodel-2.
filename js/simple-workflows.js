/* Simplified default workflow: three payment choices, three photo layouts.
   Advanced controls remain available for older saved estimates. */
(function(){
'use strict';
const previousControls=pdPaymentControls;
pdPaymentControls=function(){
 previousControls();
 const plan=document.getElementById('pdPaymentPlan');if(!plan||plan.dataset.simple)return;
 plan.dataset.simple='1';
 const builder=plan.querySelector('.pd-pay-builder');
 const heading=plan.querySelector('.pd-pay-sub');
 if(heading)heading.textContent='Pick a plan. We calculate the payments automatically.';
 const select=document.getElementById('pdPlanType');
 const quick=document.createElement('div');quick.className='pd-simple-plan-choices';
 quick.innerHTML='<label class="pd-simple-choice"><input type="radio" name="pdSimplePlan" value="deposit" checked><span><strong>Deposit + balance</strong><small>Deposit now, remainder when work is complete</small></span></label>'+
 '<label class="pd-simple-choice"><input type="radio" name="pdSimplePlan" value="three"><span><strong>3 payments</strong><small>Three equal installments</small></span></label>'+
 '<label class="pd-simple-choice"><input type="radio" name="pdSimplePlan" value="ten-thirty"><span><strong>10% / 30% / 60%</strong><small>Deposit, progress payment, final balance</small></span></label>';
 builder.before(quick);
 const detail=document.createElement('details');detail.className='pd-advanced-settings';
 detail.innerHTML='<summary>More payment options</summary>';
 quick.after(detail);
 detail.appendChild(builder);
 const preview=document.createElement('div');preview.className='pd-simple-payment-preview';
 preview.innerHTML='<div class="pd-pay-eyebrow">PAYMENT BREAKDOWN</div>';
 detail.after(preview);
 const list=document.getElementById('pdInstallments');preview.appendChild(list);
 const action=document.createElement('div');action.className='pd-simple-actions';
 action.innerHTML='<button type="button" class="btn" id="pdEditPayments">Edit payment details</button>';
 preview.appendChild(action);
 const note=document.createElement('p');note.className='pd-payment-note';
 note.textContent='Payment schedules are requests. Actual payments are recorded separately on the invoice.';
 preview.appendChild(note);
 const depositRow=document.createElement('div');depositRow.className='pd-simple-deposit';
 depositRow.innerHTML='<label>Deposit percentage <input id="pdSimpleDeposit" type="number" min="0" max="100" step="1" value="10" inputmode="numeric"></label>';
 quick.after(depositRow);
 function sync(){
  const value=select.value;
  const radio=quick.querySelector('input[value="'+value+'"]');
  if(radio)radio.checked=true;
  else quick.querySelectorAll('input[name="pdSimplePlan"]').forEach(input=>input.checked=false);
  depositRow.hidden=value!=='deposit';
  const advanced=detail.open||preview.classList.contains('pd-is-editing');
  list.classList.toggle('pd-simple-readonly',!advanced);
  const edit=document.getElementById('pdEditPayments');
  if(edit)edit.textContent=advanced?'Done editing':'Edit payment details';
 }
 quick.addEventListener('change',event=>{
  const input=event.target.closest('input[name="pdSimplePlan"]');if(!input)return;
  select.value=input.value;
  pdRecalculatePlan();detail.open=false;preview.classList.remove('pd-is-editing');sync();
 });
 document.getElementById('pdSimpleDeposit').addEventListener('change',event=>{
  const value=Math.max(0,Math.min(100,Number(event.target.value)||0));
  event.target.value=String(value);
  document.getElementById('pdDepositMode').value='percent';
  document.getElementById('pdDepositValue').value=String(value);
  if(select.value==='deposit')pdRecalculatePlan();
 });
 document.getElementById('pdEditPayments').addEventListener('click',()=>{
  if(detail.open||preview.classList.contains('pd-is-editing')){detail.open=false;preview.classList.remove('pd-is-editing')}
  else preview.classList.add('pd-is-editing');
  sync();
 });
 detail.addEventListener('toggle',sync);
 select.addEventListener('change',()=>{pdRecalculatePlan();sync()});
 sync();
};
const previousEdit=editEstimate;
editEstimate=function(i){
 previousEdit(i);
 const saved=db.estimates[i]||{};
 const select=document.getElementById('pdPlanType');
 if(!select)return;
 const simple=document.querySelector('.pd-simple-plan-choices');
 const radio=simple?.querySelector('input[value="'+select.value+'"]');
 if(radio)radio.checked=true;
 else document.querySelector('.pd-advanced-settings')?.setAttribute('open','');
 const deposit=document.getElementById('pdSimpleDeposit');
 if(deposit&&select.value==='deposit'){
  const first=(saved.paymentSchedule||[]).find(p=>p.depositRequest);
  const total=Number(saved.total)||0;
  if(first&&total>0)deposit.value=String(Math.round(Number(first.amount)/total*100));
 }
};
const priorEditor=estimateForm;
estimateForm=function(){
 priorEditor();
 const panel=document.getElementById('pdBlockEditor');if(!panel)return;
 const oldButtons=panel.querySelector('.pd-add-actions');
 if(oldButtons)oldButtons.remove();
 const title=panel.querySelector('h2');if(title)title.textContent='Project photos';
 const intro=panel.querySelector('.muted');
 if(intro)intro.textContent='Upload pictures and write a description above or below each one.';
 const simple=document.createElement('div');simple.className='pd-simple-photo-tools';
 simple.innerHTML='<div class="pd-photo-layout-choices">'+
 '<label class="pd-photo-layout"><input type="radio" name="pdPhotoLayout" value="full" checked><span>▣<strong>Large photos</strong><small>One per row</small></span></label>'+
 '<label class="pd-photo-layout"><input type="radio" name="pdPhotoLayout" value="pair"><span>▦<strong>Two side by side</strong><small>Compact gallery</small></span></label>'+
 '<label class="pd-photo-layout"><input type="radio" name="pdPhotoLayout" value="before"><span>◫<strong>Before & after</strong><small>Paired comparison</small></span></label></div>'+
 '<label class="pd-upload-photos">+ Add photos<input id="pdQuickPhotos" type="file" accept="image/*" multiple></label><p class="pd-payment-note">Add photos, then type your description and choose Above or Below for each.</p>';
 panel.querySelector('h2')?.after(simple);
 const items=panel.querySelector('#pdBlockItems');
 if(items){
  const observer=new MutationObserver(()=>{
   items.querySelectorAll('.pd-block-card').forEach(card=>{
    const type=card.querySelector('.pd-block-top strong')?.textContent;
    if(type!=='Photo'){card.hidden=true;return}
    const width=card.querySelector('.pd-block-width');
    if(width){width.setAttribute('aria-label','Photo layout')}
   });
  });
  observer.observe(items,{childList:true}); 
  items.querySelectorAll('.pd-block-card').forEach(card=>{if(card.querySelector('.pd-block-top strong')?.textContent!=='Photo')card.hidden=true});
 }
 const input=simple.querySelector('#pdQuickPhotos');
 input.addEventListener('change',async()=>{
  if(!input.files?.length)return;
  const layout=simple.querySelector('input[name="pdPhotoLayout"]:checked').value;
  const files=[...input.files];input.disabled=true;
  try{
   for(let i=0;i<files.length;i++){
    await PDEditor.addPhoto(files[i],layout==='full'?'full':'half',layout==='before'?(i%2===0?'Before':'After'):'');
   }
  }catch(err){alert('Some photos could not be added: '+err.message)}
  finally{input.disabled=false;input.value=''}
 });
};
})();

/* P&D DIRECT INVOICE WORKFLOWS | Preserves existing invoice/payment/photo metadata.
   No customer portal and no localStorage key changes to the original data store. */
(function(){
'use strict';
const DRAFT_NEW='pd2_invoice_draft_v1';
const BRAND_LOGO=location.origin+'/assets/pd-invoice-roof.webp';
let editingInvoice=null,draftTimeout=null;
const validArray=v=>Array.isArray(v)?v:[];
const day=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const cents=v=>Math.round((Number(v)||0)*100);
const moneyText=v=>money(Number(v)||0);
const draftKey=()=>editingInvoice===null?DRAFT_NEW:'pd2_invoice_edit_draft_'+editingInvoice;
const option=(value,title)=>'<option value="'+esc(value)+'">'+esc(title)+'</option>';
function note(text,error=false){
 const el=document.getElementById('pdInvoiceDraftState');
 if(el){el.textContent=text;el.dataset.state=error?'error':'saved'}
}
function formValues(){
 const val=id=>document.getElementById(id)?.value?.trim()||'';
 const lines=getLines();
 return {client:val('eclient'),customerPhone:val('pdInvoicePhone'),customerEmail:val('pdInvoiceEmail'),
 projectAddress:val('pdInvoiceAddress'),projectName:val('pdInvoiceProject'),description:val('edesc'),
 invoiceDate:val('pdInvoiceDate')||day(),dueDate:val('pdInvoiceDue'),notes:val('enotes'),warranty:val('ewarranty'),
 lines,total:cents(lines.reduce((sum,l)=>sum+l.quantity*l.price,0))/100};
}
function saveDraft(){
 const editor=document.getElementById('pdInvoiceEditor');if(!editor)return;
 try{localStorage.setItem(draftKey(),JSON.stringify({at:new Date().toISOString(),values:formValues(),plan:document.getElementById('pdInvoicePlan')?.value,deposit:document.getElementById('pdInvoiceDeposit')?.value}));note('Draft saved on this device')}
 catch(error){note('Unable to save draft — check browser storage',true)}
}
function scheduleDraft(){clearTimeout(draftTimeout);draftTimeout=setTimeout(saveDraft,700)}
function setFields(x){
 const map={eclient:'client',pdInvoicePhone:'customerPhone',pdInvoiceEmail:'customerEmail',pdInvoiceAddress:'projectAddress',
 pdInvoiceProject:'projectName',edesc:'description',pdInvoiceDate:'invoiceDate',pdInvoiceDue:'dueDate',enotes:'notes',ewarranty:'warranty'};
 Object.entries(map).forEach(([id,key])=>{const el=document.getElementById(id);if(el&&x[key]!==undefined&&x[key]!==null)el.value=x[key]});
 const host=document.getElementById('lines');if(!host)return;host.innerHTML='';
 const saved=validArray(x.lines);(saved.length?saved:[{description:'',quantity:1,price:0}]).forEach(line=>{
  addLine();const card=host.querySelector('.item-row:last-child');if(!card)return;
  card.querySelector('.ldesc').value=line.description||'';
  card.querySelector('.lqty').value=line.quantity??1;
  card.querySelector('.lprice').value=line.price??0;
 });
 currencyInputs(host);updateTotal();window.PDCommandCenter?.refreshLines();
}
function paymentPlan(total,kind,depositPct){
 const totalCents=Math.max(0,cents(total)),pct=Math.max(0,Math.min(100,Number(depositPct)||0));
 let values=[],labels=[];
 if(kind==='deposit'){const first=Math.min(totalCents,Math.round(totalCents*pct/100));values=[first,totalCents-first];labels=['Deposit','Remaining balance']}
 if(kind==='three'){const first=Math.floor(totalCents/3),second=Math.floor(totalCents/3);values=[first,second,totalCents-first-second];labels=['First payment','Second payment','Final payment']}
 if(kind==='ten-thirty'){const first=Math.round(totalCents*.1),second=Math.round(totalCents*.3);values=[first,second,totalCents-first-second];labels=['10% deposit','30% progress','60% final']}
 return values.map((c,i)=>({label:labels[i],amount:c/100,dueDate:''}));
}
function updatePlanPreview(){
 const box=document.getElementById('pdInvoicePlanPreview');if(!box)return;
 const kind=document.getElementById('pdInvoicePlan').value,deposit=document.getElementById('pdInvoiceDeposit').value;
 const amount=cents(getLines().reduce((sum,l)=>sum+l.quantity*l.price,0))/100;
 const depositWrap=document.getElementById('pdInvoiceDepositWrap');if(depositWrap)depositWrap.hidden=kind!=='deposit';
 if(kind==='keep'){box.textContent='Existing payment schedule and requests will be preserved.';return}
 if(kind==='none'){box.textContent='No payment schedule requested. Record received payments separately on this invoice.';return}
 box.innerHTML=paymentPlan(amount,kind,deposit).map(x=>'<div class="pd-command-row"><span class="pd-row-main"><strong>'+esc(x.label)+'</strong></span><strong class="pd-row-value">'+moneyText(x.amount)+'</strong></div>').join('');
}
function invoicePreview(){
 const root=document.getElementById('main');const existing=document.getElementById('pdInvoicePreview');
 if(existing){existing.remove();return}
 const x=formValues(),old=editingInvoice===null?{}:(db.invoices[editingInvoice]||{});
 const body=document.createElement('section');body.id='pdInvoicePreview';body.className='pd-inline-doc-preview';
 body.innerHTML='<div class="pd-command-heading"><div><h2>Document preview</h2><p>Review your invoice before saving</p></div><button type="button" class="btn" id="pdCloseInvoicePreview">Close</button></div>'+documentHTML('invoice',{...old,...x,paid:old.paid||0},editingInvoice===null?db.invoices.length:editingInvoice);
 root.appendChild(body);
 body.querySelector('#pdCloseInvoicePreview').addEventListener('click',()=>body.remove());
 window.PDEditor?.hydrate(body);
 body.scrollIntoView({behavior:'smooth',block:'start'});
}
function invoiceForm(index){
 const editing=Number.isInteger(index)&&index>=0&&!!db.invoices[index];
 editingInvoice=editing?index:null;
 go('Invoices');
 const old=editing?db.invoices[index]:null;
 let saved=null;try{saved=JSON.parse(localStorage.getItem(draftKey())||'null')}catch(_){}
 const starting=saved?.values||old||{},clients=validArray(db.clients),projects=validArray(db.projects);
 const main=document.getElementById('main');
 main.innerHTML='<div class="pd-page-heading"><div><div class="pd-overline">P&D / DOCUMENT WORKSPACE</div><h1>'+(editing?'Edit invoice':'New invoice')+'</h1><div class="pd-page-sub muted">Create and edit detailed invoices without losing recorded payments.</div></div></div>'+
 '<div class="form-intro"><h2>Invoice studio</h2><p>Fill in the project, add work items, and let P&D calculate the balance. Money received is recorded in the invoice payment ledger.</p></div>'+
 '<form class="panel" id="pdInvoiceEditor" novalidate><div class="section-head"><h2>01 · Customer & project</h2><span class="pill">Job details</span></div>'+
 (clients.length?'<label for="pdInvoiceClientSelect">Choose a saved customer</label><select id="pdInvoiceClientSelect"><option value="">Select existing customer (optional)</option>'+clients.map((c,i)=>option(String(i),c.name||'Customer')).join('')+'</select>':'')+
 '<label for="eclient">Customer name</label><input id="eclient" autocomplete="name" required placeholder="Customer or company name">'+
 '<div class="two"><div><label for="pdInvoicePhone">Customer phone</label><input id="pdInvoicePhone" type="tel" autocomplete="tel"></div><div><label for="pdInvoiceEmail">Customer email</label><input id="pdInvoiceEmail" type="email" autocomplete="email"></div></div>'+
 (projects.length?'<label for="pdInvoiceProject">Connected project</label><select id="pdInvoiceProject"><option value="">No linked project</option>'+projects.map(p=>option(p.name||'',p.name||'Project')).join('')+'</select>':'<input id="pdInvoiceProject" type="hidden" value="">')+
 '<label for="pdInvoiceAddress">Jobsite address</label><input id="pdInvoiceAddress" placeholder="Street address, city, ZIP">'+
 '<label for="edesc">Project description</label><textarea id="edesc" rows="3" placeholder="Custom cabinets, materials, fabrication, installation..."></textarea>'+
 '<div class="two"><div><label for="pdInvoiceDate">Invoice date</label><input id="pdInvoiceDate" type="date" value="'+day()+'"></div><div><label for="pdInvoiceDue">Payment due date</label><input id="pdInvoiceDue" type="date"></div></div>'+
 '<div class="form-section"><div class="section-head"><h2>02 · Scope & pricing</h2><span class="pill">Calculated automatically</span></div><div id="lines"></div><div class="actions"><button type="button" id="pdAddInvoiceLine" class="btn">+ Add line item</button></div></div>'+
 '<div class="form-section"><div class="section-head"><h2>03 · Payment requests</h2><span class="pill">Optional</span></div>'+
 '<p class="pd-payment-note">Choose how much the customer is expected to pay. Actual money received belongs in the separate payment ledger.</p>'+
 '<label for="pdInvoicePlan">Payment schedule</label><select id="pdInvoicePlan">'+(editing&&validArray(old?.paymentSchedule).length?option('keep','Keep existing payment schedule'):'')+option('none','No schedule')+option('deposit','Deposit + final balance')+option('three','Three equal payments')+option('ten-thirty','10% deposit / 30% progress / 60% final')+'</select>'+
 '<div id="pdInvoiceDepositWrap" hidden><label for="pdInvoiceDeposit">Requested deposit percentage</label><input id="pdInvoiceDeposit" type="number" min="0" max="100" step="1" value="10"></div><div id="pdInvoicePlanPreview" class="pd-command-panel pd-plan-preview"></div></div>'+
 '<div class="form-section"><h2>04 · Notes & warranty</h2><label for="enotes">Notes / terms (optional)</label><textarea id="enotes" rows="3"></textarea><label for="ewarranty">Warranty (optional)</label><textarea id="ewarranty" rows="3"></textarea></div>'+
 '<div class="form-section"><div class="section-head"><h2>05 · Review & save</h2><span class="pill">Final</span></div><div class="total" id="etotal">$0.00</div><p class="form-field-note">Invoice balance excludes payments not yet recorded.</p><div class="actions"><button type="button" class="btn" id="pdPreviewInvoice">Preview</button><button type="submit" class="btn primary">'+(editing?'Save invoice changes':'Save new invoice')+'</button><button type="button" id="pdCancelInvoice" class="btn">Cancel</button></div><p id="pdInvoiceDraftState" class="pd-autosave-tag" aria-live="polite"></p></div></form>';
 setFields(starting);
 const plan=document.getElementById('pdInvoicePlan');
 if(saved?.plan&&[...plan.options].some(o=>o.value===saved.plan))plan.value=saved.plan;
 if(saved?.deposit!==undefined)document.getElementById('pdInvoiceDeposit').value=saved.deposit;
 if(!saved&&editing&&validArray(old.paymentSchedule).length)plan.value='keep';
 updatePlanPreview();
 const input=document.getElementById('pdInvoiceClientSelect');
 input?.addEventListener('change',()=>{
  if(input.value==='')return;
  const c=clients[Number(input.value)];if(!c)return;
  document.getElementById('eclient').value=c.name||'';
  document.getElementById('pdInvoicePhone').value=c.phone||'';
  document.getElementById('pdInvoiceEmail').value=c.email||'';
  document.getElementById('pdInvoiceAddress').value=c.address||'';
  scheduleDraft();
 });
 document.getElementById('pdInvoiceProject').addEventListener('change',e=>{
  const p=projects.find(x=>x.name===e.target.value);if(!p)return;
  if(p.address)document.getElementById('pdInvoiceAddress').value=p.address;
  if(p.client&&!document.getElementById('eclient').value)document.getElementById('eclient').value=p.client;
  scheduleDraft();
 });
 document.getElementById('pdAddInvoiceLine').addEventListener('click',()=>{addLine();scheduleDraft();updatePlanPreview()});
 document.getElementById('pdPreviewInvoice').addEventListener('click',invoicePreview);
 document.getElementById('pdCancelInvoice').addEventListener('click',()=>{clearTimeout(draftTimeout);editingInvoice=null;go('Invoices')});
 document.getElementById('pdInvoiceEditor').addEventListener('input',()=>{scheduleDraft();updatePlanPreview()});
 document.getElementById('pdInvoiceEditor').addEventListener('change',()=>{scheduleDraft();updatePlanPreview()});
 document.getElementById('pdInvoiceEditor').addEventListener('submit',e=>{e.preventDefault();submitInvoice()});
 note(saved?'Recovered your unsaved changes from this browser':editing?'Editing saved invoice — changes are protected as a draft until saved':'Draft will save to this device as you type');
 main.scrollIntoView({behavior:'smooth',block:'start'});
}
function validPrices(){
 return [...document.querySelectorAll('#lines .lprice')].every(el=>/^\d+(\.\d{1,2})?$/.test(el.value.trim()));
}
function submitInvoice(){
 const x=formValues(),old=editingInvoice===null?null:db.invoices[editingInvoice],index=editingInvoice;
 if(!x.client)return alert('Enter a customer name.');
 if(!x.lines.length||x.lines.some(l=>!l.description.trim()||l.quantity<=0||l.price<0)||!validPrices())return alert('Each line needs a description, positive quantity and a valid price with at most two decimal places.');
 if(x.dueDate&&x.invoiceDate&&x.dueDate<x.invoiceDate&&!confirm('Payment due date is before the invoice date. Save anyway?'))return;
 if(old&&cents(old.paid||0)>cents(x.total)&&!confirm('The revised invoice total is lower than payments already received. Save this customer credit?'))return;
 const record=old?{...old,...x}:{...x,paid:0,payments:[]};
 const plan=document.getElementById('pdInvoicePlan').value;
 if(plan!=='keep'){
  record.paymentPlanType=plan;record.paymentSchedule=paymentPlan(record.total,plan,document.getElementById('pdInvoiceDeposit').value);
  record.deposit=plan==='deposit'?record.paymentSchedule[0]?.amount||0:plan==='ten-thirty'?record.paymentSchedule[0]?.amount||0:0;
  record.schedule=plan==='none'?'':plan==='deposit'?'Deposit + final balance':plan==='three'?'Three equal payments':'10% / 30% / 60%';
 }
 if(index===null)db.invoices.push(record);else db.invoices[index]=record;
 try{save()}catch(error){
  if(index===null)db.invoices.pop();else db.invoices[index]=old;
  note('Invoice could not save — browser storage unavailable',true);
  return alert('Save failed. Your previous invoice records have not been overwritten.');
 }
 clearTimeout(draftTimeout);
 try{localStorage.removeItem(draftKey())}catch(_){}
 editingInvoice=null;
 go('Invoices');
}
function currencyInputs(scope){
 (scope||document).querySelectorAll('.lprice,#pdReceivedAmount,#pbudget,#tprice').forEach(el=>{
  if(el instanceof HTMLInputElement&&el.type==='number'){el.type='text';el.inputMode='decimal';}
 });
}
const beforeAddLine=addLine;
addLine=function(){beforeAddLine();currencyInputs(document)};
document.addEventListener('focusin',e=>{
 const input=e.target;
 if(!(input instanceof HTMLInputElement))return;
 if(input.matches('.lprice,#pdReceivedAmount,#pbudget,#tprice,#edeposit,#pdDepositValue,#pdSimpleDeposit')){
  currencyInputs(document);
  try{input.select()}catch(_){}
 }
},true);
document.addEventListener('pointerup',e=>{
 const input=e.target;
 if(input instanceof HTMLInputElement&&input.matches('.lprice,#pdReceivedAmount,#pbudget,#tprice')&&/^(0|0\.00?)$/.test(input.value.trim())){
  try{input.select()}catch(_){}
 }
},true);
const beforeSaveEstimate=saveEstimate;
saveEstimate=function(){
 const index=editingEstimateIndex,count=db.estimates.length;
 const former=index===null?null:db.estimates[index],status=former?.status;
 if(!validPrices()&&document.getElementById('lines'))return alert('Enter valid line-item prices using at most two decimal places.');
 beforeSaveEstimate();
 if(document.getElementById('lines'))return;
 const record=index===null?db.estimates[count]:db.estimates[index];
 if(record){
  if(index===null&&!record.status)record.status='Draft';
  if(index!==null&&status!==undefined)record.status=status;
  try{save()}catch(_){}
  if(tab==='Estimates')render();
 }
};
const beforeDocHTML=documentHTML;
documentHTML=function(type,x,i){
 let content=beforeDocHTML(type,x,i);
 content=content.replace(/src="\.\/assets\/pd-roof-reference\.svg"/g,'src="'+BRAND_LOGO+'" data-pd-official-invoice-logo="true"');
 content=content.replace('alt="Original P&D logo"','alt="Official P&D invoice roofline and lettering"');
 const fields=[];
 if(x.projectName)fields.push('<span><b>Project</b> '+esc(x.projectName)+'</span>');
 if(x.projectAddress)fields.push('<span><b>Jobsite</b> '+esc(x.projectAddress)+'</span>');
 if(x.customerPhone)fields.push('<span><b>Phone</b> '+esc(x.customerPhone)+'</span>');
 if(x.customerEmail)fields.push('<span><b>Email</b> '+esc(x.customerEmail)+'</span>');
 if(type==='invoice'&&x.dueDate)fields.push('<span><b>Due</b> '+esc(x.dueDate)+'</span>');
 if(fields.length)content=content.replace('<table class="paper-table">','<div class="pd-doc-extras">'+fields.join('')+'</div><table class="paper-table">');
 const paperCSS = \`<style id="pd-premium-paper-styles">
  /* Screen previews maintain their branded, readable document layout. */
  .paper { background: #fff !important; border: 1px solid #dde7ef; box-shadow: none; }
  .paper .paper-top { background: #103c62 !important; }
  .paper .paper-head { border-bottom: 2px solid #dceaf4; }
  .paper .paper-head .doc-brand img {
    display: block !important; width: min(100%, 400px) !important;
    height: auto !important; max-width: 100% !important; max-height: 152px !important;
    object-fit: contain !important; background: #fff !important; margin: 0 auto !important;
  }
  .paper .firm { color: #143955 !important; font-weight: 800; }
  .paper .paper-title h2 { color: #113e60 !important; letter-spacing: 2px; }
  .paper .pd-doc-extras { display: flex; flex-wrap: wrap; gap: 8px 17px; font-size: 12px;
    color: #45657e; margin: 12px 0 19px; }
  .paper .pd-doc-extras b { color: #143c5b; margin-right: 4px; }
  .paper .paper-table { width: 100%; border-collapse: collapse; }
  .paper .paper-table thead th { background: #eaf3fa !important; color: #16486c !important;
    border-bottom: 1px solid #c6dbe9 !important; }
  .paper .paper-table td { border-bottom: 1px solid #e9eef3; vertical-align: top; }
  .paper .paper-totals { background: #f2f8fc !important; border-radius: 10px; }
  .paper img { max-width: 100%; }
  @media screen and (max-width: 860px) {
    .paper .paper-table th { white-space: nowrap !important; letter-spacing: 0 !important;
      font-size: 9px !important; }
  }
  /*
    LETTER-SIZE PRINT: never shrink the entire invoice into one page.
    Use legible type, normal-sized line items and natural page breaks.
    Only individual rows, metadata groups and payment totals stay together.
  */
  @media print {
    @page { size: letter; margin: 13mm 14mm; }
    html, body { background: #fff !important; margin: 0 !important; padding: 0 !important;
      width: auto !important; }
    body > main, main { margin: 0 !important; padding: 0 !important;
      width: 100% !important; max-width: none !important; }
    .paper { box-sizing: border-box !important; display: block !important;
      font-family: Arial, Helvetica, sans-serif !important;
      font-size: 12pt !important; line-height: 1.46 !important;
      width: 100% !important; max-width: none !important; min-width: 0 !important;
      border: 0 !important; border-radius: 0 !important; box-shadow: none !important;
      overflow: visible !important; break-inside: auto !important; page-break-inside: auto !important; }
    .paper .paper-inner { padding: 0 !important; width: 100% !important;
      max-width: none !important; overflow: visible !important; }
    .paper .paper-top { height: 6px !important; min-height: 6px !important;
      margin: 0 0 12px !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .paper .paper-head { display: flex !important; flex-direction: column !important;
      align-items: center !important; gap: 6px !important;
      margin: 0 0 17px !important; padding: 0 0 12px !important;
      border-bottom: 2px solid #dceaf4 !important;
      break-inside: avoid !important; page-break-inside: avoid !important; }
    .paper .doc-brand { display: flex !important; flex-direction: column !important;
      align-items: center !important; gap: 4px !important; text-align: center !important; }
    .paper .paper-head .doc-brand img { display: block !important;
      width: 365px !important; height: auto !important;
      max-width: 100% !important; max-height: 140px !important;
      object-fit: contain !important; margin: 0 auto !important; }
    .paper .doc-brand .firm { font-size: 17pt !important; line-height: 1.15 !important; }
    .paper .doc-brand .sub { font-size: 10pt !important; line-height: 1.2 !important; }
    .paper .paper-title { text-align: center !important; }
    .paper .paper-title h2 { margin: 3px 0 !important; font-size: 24pt !important;
      line-height: 1.12 !important; letter-spacing: 2px !important; }
    .paper .paper-title small { font-size: 11pt !important; color: #596f84 !important; }
    .paper .paper-meta { display: grid !important; grid-template-columns: 1fr 1fr !important;
      gap: 25px !important; margin: 17px 0 22px !important;
      break-inside: avoid !important; page-break-inside: avoid !important; }
    .paper .paper-meta .caption-label { margin: 0 0 5px !important;
      font-size: 10pt !important; letter-spacing: 0.7px !important; }
    .paper .paper-meta strong { font-size: 13pt !important; line-height: 1.3 !important; }
    .paper .paper-meta p { font-size: 11.5pt !important; line-height: 1.42 !important;
      margin: 5px 0 !important; overflow-wrap: anywhere !important; }
    .paper .pd-doc-extras { font-size: 10.5pt !important; line-height: 1.4 !important;
      gap: 7px 17px !important; margin: 9px 0 19px !important;
      break-inside: avoid !important; }
    .paper .paper-table { width: 100% !important; table-layout: fixed !important;
      margin: 14px 0 24px !important; border-collapse: collapse !important; }
    .paper .paper-table thead { display: table-header-group !important; }
    .paper .paper-table tbody { display: table-row-group !important; }
    .paper .paper-table th { font-size: 10.5pt !important; letter-spacing: .25px !important;
      white-space: nowrap !important; padding: 11px 8px !important; line-height: 1.25 !important;
      background: #eaf3fa !important; color: #16486c !important;
      print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .paper .paper-table td { font-size: 11.5pt !important; line-height: 1.48 !important;
      padding: 11px 8px !important; overflow-wrap: anywhere !important;
      vertical-align: top !important; }
    .paper .paper-table th:nth-child(1), .paper .paper-table td:nth-child(1) { width: 49% !important; }
    .paper .paper-table th:nth-child(2), .paper .paper-table td:nth-child(2) { width: 11% !important; text-align: center !important; }
    .paper .paper-table th:nth-child(3), .paper .paper-table td:nth-child(3) { width: 19% !important; text-align: right !important; }
    .paper .paper-table th:nth-child(4), .paper .paper-table td:nth-child(4) { width: 21% !important; text-align: right !important; }
    .paper .paper-table tbody tr { break-inside: avoid !important;
      page-break-inside: avoid !important; }
    .paper .paper-totals { width: 360px !important; max-width: 100% !important;
      margin: 20px 0 22px auto !important; padding: 16px 19px !important;
      background: #f2f8fc !important; border: 1px solid #dfeaf3 !important;
      break-inside: avoid !important; page-break-inside: avoid !important; }
    .paper .paper-totals .line { display: flex !important; justify-content: space-between !important;
      font-size: 12pt !important; line-height: 1.42 !important;
      margin: 6px 0 !important; padding: 4px 0 !important; }
    .paper .paper-totals .grand { font-size: 17pt !important;
      margin: 11px 0 0 !important; padding-top: 13px !important; }
    .paper .paper-foot { font-size: 11.5pt !important; line-height: 1.52 !important;
      margin: 20px 0 0 !important; padding: 14px 0 0 !important;
      border-top: 1px solid #e3ebf3 !important;
      break-inside: auto !important; overflow-wrap: anywhere !important; }
    .paper .paper-foot strong { display: block; font-size: 12pt !important;
      margin: 0 0 5px !important; }
    .paper .pd-doc-heading { break-after: avoid !important; }
    .paper .pd-doc-photo { max-width: 100% !important; break-inside: avoid !important;
      page-break-inside: avoid !important; }
    .paper .pd-doc-photo img { max-height: 160mm !important; object-fit: contain !important; }
    .paper .pd-doc-photo figcaption { font-size: 10.5pt !important; }
    .paper .paper-top, .paper .paper-table th, .paper .paper-totals {
      print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
    }
  }
  </style>\`;
 return paperCSS+content;
};
window.pdInvoiceForm=invoiceForm;
window.pdSaveInvoice=submitInvoice;
window.PDInvoicePreview=invoicePreview;
})();
