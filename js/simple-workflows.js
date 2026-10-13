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
 const oldRows=pdScheduleRows;
 pdScheduleRows=function(rows){oldRows(rows);sync()};
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
 if(oldButtons)oldButtons.classList.add('pd-advanced-block-tools');
 const intro=panel.querySelector('.muted');
 if(intro)intro.textContent='Choose a photo layout, upload pictures, and we arrange them for you.';
 const simple=document.createElement('div');simple.className='pd-simple-photo-tools';
 simple.innerHTML='<div class="pd-photo-layout-choices">'+
 '<label class="pd-photo-layout"><input type="radio" name="pdPhotoLayout" value="full" checked><span>▣<strong>Large photos</strong><small>One per row</small></span></label>'+
 '<label class="pd-photo-layout"><input type="radio" name="pdPhotoLayout" value="pair"><span>▦<strong>Two side by side</strong><small>Compact gallery</small></span></label>'+
 '<label class="pd-photo-layout"><input type="radio" name="pdPhotoLayout" value="before"><span>◫<strong>Before & after</strong><small>Paired comparison</small></span></label></div>'+
 '<label class="pd-upload-photos">+ Add photos<input id="pdQuickPhotos" type="file" accept="image/*" multiple></label><p class="pd-payment-note">Choose several photos at once. Tap any photo to replace it.</p>'+
 '<details class="pd-extra-document-tools"><summary>Add text, headings or dividers</summary></details>';
 panel.querySelector('h2')?.after(simple);
 simple.querySelector('details').appendChild(oldButtons);
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
