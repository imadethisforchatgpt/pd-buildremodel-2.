/* P&D 3.0 payment schedule — professional editor, keeps existing data structure. */
(function(){
'use strict';
const e=s=>esc(s);
const cur=v=>money(Number(v)||0);
function projectTotal(){return getLines().reduce((sum,x)=>sum+(Number(x.quantity)||0)*(Number(x.price)||0),0)}
function daysFrom(start,count,unit){
 if(!start||!count)return '';
 const date=new Date(start+'T12:00:00');
 if(Number.isNaN(date.getTime()))return '';
 if(unit==='months')date.setMonth(date.getMonth()+count);
 else date.setDate(date.getDate()+count*(unit==='weeks'?7:1));
 return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
}
function enhancedRow(r,i){
 const amount=Number(r.amount)||0;
 const mode=r.amountType==='percent'?'percent':'amount';
 const pct=r.percentage!==undefined?r.percentage:(projectTotal()>0?Math.round(amount/projectTotal()*10000)/100:0);
 const condition=r.dueWhen||((r.dueDate||'')?'date':'milestone');
 const milestone=r.milestone||((i===0)?'Upon start of work':'Upon completion of work');
 const interval=r.intervalValue||i;
 const unit=r.intervalUnit||'weeks';
 return '<article class="pd-installment" data-payment="'+i+'">'+
 '<div class="pd-installment-head"><div><div class="pd-pay-eyebrow">Payment '+(i+1)+'</div><strong class="pd-installment-value">'+cur(amount)+'</strong></div><label class="pd-deposit-toggle"><input type="checkbox" class="pd-pay-deposit" '+(r.depositRequest?'checked':'')+'><span>Deposit request</span></label></div>'+
 '<div class="pd-installment-fields"><div><label>Payment name</label><input class="pd-pay-label" placeholder="Progress payment" value="'+e(r.label||'Payment '+(i+1))+'"></div>'+
 '<div><label>Amount type</label><select class="pd-pay-mode"><option value="amount"'+(mode==='amount'?' selected':'')+'>Fixed amount ($)</option><option value="percent"'+(mode==='percent'?' selected':'')+'>Percentage (%)</option></select></div>'+
 '<div><label class="pd-value-label">'+(mode==='percent'?'Percentage (%)':'Amount ($)')+'</label><input class="pd-pay-value" type="number" min="0" step=".01" inputmode="decimal" value="'+(mode==='percent'?pct:amount.toFixed(2))+'"></div>'+
 '<div><label>Due when</label><select class="pd-pay-duewhen"><option value="milestone"'+(condition==='milestone'?' selected':'')+'>Project milestone</option><option value="date"'+(condition==='date'?' selected':'')+'>Specific date</option><option value="interval"'+(condition==='interval'?' selected':'')+'>Time after start</option></select></div></div>'+
 '<div class="pd-due-extra pd-due-milestone"'+(condition!=='milestone'?' hidden':'')+'><label>Milestone / condition</label><input class="pd-pay-milestone" value="'+e(milestone)+'" placeholder="e.g. Upon project completion"></div>'+
 '<div class="pd-due-extra pd-due-date"'+(condition!=='date'?' hidden':'')+'><label>Due date</label><input class="pd-pay-date" type="date" value="'+e(r.dueDate||'')+'"></div>'+
 '<div class="pd-due-extra pd-due-interval"'+(condition!=='interval'?' hidden':'')+'><div class="two"><div><label>After how many?</label><input class="pd-pay-interval" type="number" inputmode="numeric" min="0" step="1" value="'+interval+'"></div><div><label>Unit</label><select class="pd-pay-unit"><option value="days"'+(unit==='days'?' selected':'')+'>Days</option><option value="weeks"'+(unit==='weeks'?' selected':'')+'>Weeks</option><option value="months"'+(unit==='months'?' selected':'')+'>Months</option></select></div></div></div>'+
 '</article>';
}
pdPaymentControls=function(){
 const host=document.getElementById('edeposit');
 if(!host||document.getElementById('pdPaymentPlan'))return;
 const wrap=document.createElement('section');
 wrap.className='payment-box';wrap.id='pdPaymentPlan';
 wrap.innerHTML='<div class="pd-pay-head"><div><div class="pd-pay-eyebrow">P&D DOCUMENT BUILDER</div><h2>Payment schedule</h2><div class="pd-pay-sub">Choose a plan. Payments are calculated for you, and you can adjust each one below.</div></div></div>'+
 '<div class="pd-pay-builder"><div class="pd-installment-fields"><div><label>Choose a payment plan</label><select id="pdPlanType"><option value="deposit">Deposit + final balance</option><option value="two">Two equal payments</option><option value="three">Three equal payments</option><option value="ten-thirty">10% deposit + 30% progress + remainder</option><option value="interval">Deposit + scheduled installments</option><option value="custom">Custom payment schedule</option></select></div>'+
 '<div><label>Schedule start date</label><input id="pdScheduleStart" type="date"></div></div>'+
 '<div class="two"><div><label>Deposit calculation</label><select id="pdDepositMode"><option value="percent">Percentage (%)</option><option value="amount">Fixed amount ($)</option></select></div><div><label>Deposit amount / percentage</label><input id="pdDepositValue" type="number" min="0" step=".01" inputmode="decimal" value="50"></div></div>'+
 '<div class="pd-interval-builder"><div class="two"><div><label>Installments after deposit</label><input id="pdIntervalCount" type="number" min="1" max="24" step="1" value="3"></div><div><label>Every</label><div class="pd-inline-controls"><input id="pdEvery" type="number" min="1" step="1" value="1"><select id="pdUnit"><option value="weeks">Weeks</option><option value="days">Days</option><option value="months">Months</option></select></div></div></div></div>'+
 '<div class="pd-pay-actions"><button class="btn primary" type="button" onclick="pdRecalculatePlan()">Generate payment plan</button></div></div>'+
 '<div class="pd-pay-summary"><div><span>Project total</span><strong id="pdPaymentTotal">$0.00</strong></div><div><span>Scheduled</span><strong id="pdPaymentScheduled">$0.00</strong></div></div>'+
 '<div class="pd-pay-eyebrow" style="margin:18px 0 6px">PAYMENT DETAILS</div><div id="pdInstallments"></div>'+
 '<div class="pd-pay-actions"><button type="button" class="btn" onclick="pdAddInstallment()">+ Add payment</button><button type="button" class="btn" onclick="pdRecalculatePlan()">Reset to selected plan</button></div>'+
 '<p class="pd-payment-note">Custom edits stay in place until you choose Generate or Reset. Scheduled payments are separate from payments already received.</p>'+
 '<p id="pdScheduleCheck" aria-live="polite"></p>';
 host.closest('.payment-box')?.insertAdjacentElement('afterend',wrap);
 for(const id of ['pdPlanType','pdDepositMode','pdDepositValue','pdIntervalCount','pdEvery','pdUnit','pdScheduleStart']){
  document.getElementById(id)?.addEventListener('change',()=>{if(id==='pdPlanType'){showPlanOptions()}else if(id==='pdScheduleStart'){pdPlanCustomized=true;pdCheckSchedule()}else pdPlanCustomized=true});
 }
 showPlanOptions();pdRecalculatePlan();
};
function showPlanOptions(){
 const t=document.getElementById('pdPlanType')?.value;
 const deposit=t==='deposit'||t==='interval';
 document.querySelector('#pdDepositMode')?.closest('.two')?.classList.toggle('pd-hidden',!deposit);
 document.querySelector('.pd-interval-builder')?.classList.toggle('pd-hidden',t!=='interval');
}
pdScheduleRows=function(rows){
 const root=document.getElementById('pdInstallments');if(!root)return;
 root.innerHTML=rows.map(enhancedRow).join('');
 root.querySelectorAll('.pd-installment').forEach(card=>{
  card.addEventListener('input',()=>{pdPlanCustomized=true;pdCheckSchedule()});
  card.addEventListener('change',e=>{
   if(e.target.classList.contains('pd-pay-mode')){
    const value=card.querySelector('.pd-pay-value'),amount=Number(card.querySelector('.pd-installment-value').textContent.replace(/[^0-9.-]/g,''))||0;
    value.value=e.target.value==='percent'?(projectTotal()>0?(amount/projectTotal()*100).toFixed(2):'0'):(amount.toFixed(2));
    card.querySelector('.pd-value-label').textContent=e.target.value==='percent'?'Percentage (%)':'Amount ($)';
   }
   if(e.target.classList.contains('pd-pay-duewhen')){
    const type=e.target.value;
    card.querySelector('.pd-due-milestone').hidden=type!=='milestone';
    card.querySelector('.pd-due-date').hidden=type!=='date';
    card.querySelector('.pd-due-interval').hidden=type!=='interval';
   }
   if(e.target.classList.contains('pd-pay-deposit')&&e.target.checked){
    root.querySelectorAll('.pd-pay-deposit').forEach(x=>{if(x!==e.target)x.checked=false});
   }
   pdPlanCustomized=true;pdCheckSchedule();
  });
 });
 pdCheckSchedule();
};
pdReadSchedule=function(){
 const total=projectTotal(),start=document.getElementById('pdScheduleStart')?.value||'';
 return [...document.querySelectorAll('#pdInstallments .pd-installment')].map((row,i)=>{
  const mode=row.querySelector('.pd-pay-mode').value,raw=Number(row.querySelector('.pd-pay-value').value)||0;
  const amount=mode==='percent'?pdMoneyFromCents(Math.round(pdCents(total)*raw/100)):pdMoneyFromCents(pdCents(raw));
  const when=row.querySelector('.pd-pay-duewhen').value;
  const intervalValue=Math.max(0,Math.floor(Number(row.querySelector('.pd-pay-interval').value)||0));
  const intervalUnit=row.querySelector('.pd-pay-unit').value;
  return {label:row.querySelector('.pd-pay-label').value.trim()||'Payment '+(i+1),amount,
   amountType:mode,percentage:mode==='percent'?raw:null,dueWhen:when,
   milestone:row.querySelector('.pd-pay-milestone').value.trim(),intervalValue,intervalUnit,
   dueDate:when==='date'?row.querySelector('.pd-pay-date').value:when==='interval'?daysFrom(start,intervalValue,intervalUnit):'',
   depositRequest:row.querySelector('.pd-pay-deposit').checked};
 });
};
pdCheckSchedule=function(){
 const total=pdCents(projectTotal()),rows=pdReadSchedule(),scheduled=rows.reduce((sum,r)=>sum+pdCents(r.amount),0);
 const difference=total-scheduled;
 const a=document.getElementById('pdPaymentTotal'),b=document.getElementById('pdPaymentScheduled'),note=document.getElementById('pdScheduleCheck');
 if(a)a.textContent=money(total/100);if(b)b.textContent=money(scheduled/100);
 if(note){note.textContent=difference===0?'✓ Schedule matches the project total.':(difference>0?'Unallocated: ':'Overallocated: ')+money(Math.abs(difference)/100)+' — adjust payments or regenerate plan.';note.style.color=difference===0?'#206a49':'#9d4130'}
 document.querySelectorAll('.pd-installment').forEach((card,i)=>{const el=card.querySelector('.pd-installment-value');if(el)el.textContent=money(rows[i].amount)});
};
pdRecalculatePlan=function(){
 const type=document.getElementById('pdPlanType')?.value||'deposit';
 const total=projectTotal(),cents=pdCents(total),mode=document.getElementById('pdDepositMode')?.value||'percent';
 const val=Number(document.getElementById('pdDepositValue')?.value)||0;
 let rows=[];
 if(type==='custom'){
  rows=pdReadSchedule();
  if(!rows.length)rows=pdBuildSchedule(total,'two');
 }else if(type==='ten-thirty'){
  const a=Math.round(cents*.1),b=Math.round(cents*.3);
  rows=[{label:'Deposit',amount:a/100,amountType:'percent',percentage:10,dueWhen:'milestone',milestone:'Upon acceptance',depositRequest:true},
   {label:'Progress payment',amount:b/100,amountType:'percent',percentage:30,dueWhen:'milestone',milestone:'Work in progress'},
   {label:'Final payment',amount:(cents-a-b)/100,dueWhen:'milestone',milestone:'Upon project completion'}];
 }else if(type==='interval'){
  const dep=Math.min(cents,Math.max(0,mode==='percent'?Math.round(cents*val/100):pdCents(val)));
  const count=Math.min(24,Math.max(1,Math.floor(Number(document.getElementById('pdIntervalCount')?.value)||3)));
  const every=Math.max(1,Math.floor(Number(document.getElementById('pdEvery')?.value)||1));
  const unit=document.getElementById('pdUnit')?.value||'weeks';
  const parts=pdSplitCents(cents-dep,count);
  rows=[{label:'Deposit',amount:dep/100,dueWhen:'milestone',milestone:'Upon acceptance',depositRequest:true},
    ...parts.map((v,i)=>({label:i===count-1?'Final payment':'Progress payment '+(i+1),amount:v/100,dueWhen:'interval',intervalValue:every*(i+1),intervalUnit:unit}))];
 }else{
  rows=pdBuildSchedule(total,type,val,mode).map((x,i)=>{
   const pct=total>0?Math.round(Number(x.amount)/total*10000)/100:(i===0?50:50);
   const shownPct=String(Number(pct.toFixed(2)))+'%';
   return {...x,
    label:type==='deposit'?(i===0?'Deposit ('+shownPct+')':'Remaining balance ('+shownPct+')'):x.label,
    dueWhen:'milestone',
    milestone:type==='deposit'?(i===0?'Upon start of work':'Upon completion of work'):
      i===0?'Upon acceptance':i===1?'Upon start of work':'Upon project completion',
    depositRequest:type==='deposit'&&i===0};
  });
 }
 pdPlanCustomized=false;pdLastTotalCents=pdCents(total);pdScheduleRows(rows);
 const deposit=document.getElementById('edeposit');if(deposit){const first=rows.find(r=>r.depositRequest);deposit.value=(first?.amount||0).toFixed(2)}
 pdCheckSchedule();
};
const priorPaymentDraft=draftData;
draftData=function(){
 const x=priorPaymentDraft();if(document.getElementById('pdPaymentPlan')){
  x.paymentStartDate=document.getElementById('pdScheduleStart')?.value||'';
  x.paymentIntervalCount=Number(document.getElementById('pdIntervalCount')?.value)||3;
  x.paymentEvery=Number(document.getElementById('pdEvery')?.value)||1;
  x.paymentIntervalUnit=document.getElementById('pdUnit')?.value||'weeks';
  x.deposit=x.paymentSchedule.find(p=>p.depositRequest)?.amount||0;
 }
 return x;
};
const priorPaymentEdit=editEstimate;
editEstimate=function(i){
 priorPaymentEdit(i);const x=db.estimates[i]||{};
 if(!document.getElementById('pdPaymentPlan'))return;
 for(const [id,val] of [['pdScheduleStart',x.paymentStartDate||''],['pdIntervalCount',x.paymentIntervalCount||3],['pdEvery',x.paymentEvery||1],['pdUnit',x.paymentIntervalUnit||'weeks']]){
  const el=document.getElementById(id);if(el)el.value=val;
 }
 showPlanOptions();
 if(Array.isArray(x.paymentSchedule)&&x.paymentSchedule.length){pdScheduleRows(x.paymentSchedule);pdPlanCustomized=true}
};
const oldPaymentHTML=documentHTML;
documentHTML=function(type,x,i){
 let html=oldPaymentHTML(type,x,i);
 if(!Array.isArray(x.paymentSchedule)||!x.paymentSchedule.length)return html;
 const terms='<div class="paper-foot"><strong>Payment conditions</strong>'+x.paymentSchedule.map(p=>'<p>'+e(p.label||'Payment')+': '+e(p.dueWhen==='date'?(p.dueDate||'As agreed'):p.dueWhen==='interval'?(p.dueDate||p.milestone||'As agreed'):(p.milestone||p.dueDate||'As agreed'))+'</p>').join('')+'</div>';
 return html.replace('<div class="paper-foot"><strong>Thank you',terms+'<div class="paper-foot"><strong>Thank you');
};
})();
