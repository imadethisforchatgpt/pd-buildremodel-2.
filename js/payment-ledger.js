/* P&D payment ledger: actual money received, separate from scheduled installments. */
(function(){
'use strict';
const cents=n=>Math.round(Number(n)*100);
const currency=n=>money(n/100);
const escText=s=>esc(s);
const dateToday=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
function records(x){return Array.isArray(x.payments)?x.payments:[]}
function totalReceived(x){
 const legacy=Number(x.paymentOpeningBalance)||0;
 return Math.round((legacy+records(x).reduce((a,p)=>a+(Number(p.amount)||0),0))*100)/100;
}
function ensureLedger(x){
 if(!Array.isArray(x.payments)){x.paymentOpeningBalance=Number(x.paid)||0;x.payments=[]}
}
function summary(x){
 const paid=cents(x.paid||0),total=cents(x.total||0);
 return {paid:currency(paid),due:currency(Math.max(0,total-paid)),credit:currency(Math.max(0,paid-total))};
}
function showLedger(i){
 const x=db.invoices[i];if(!x)return;
 const totals=summary(x);
 const rows=records(x).slice().reverse().map(p=>'<div class="pd-ledger-row"><div><strong>'+currency(cents(p.amount))+'</strong><div class="muted">'+escText(p.date||'')+' · '+escText(p.method||'Other')+(p.reference?' · '+escText(p.reference):'')+'</div>'+(p.note?'<div class="muted">'+escText(p.note)+'</div>':'')+'</div><span class="pd-ledger-tag">Received</span></div>').join('');
 const overlay=document.createElement('div');overlay.id='pdPaymentOverlay';overlay.className='pd-payment-overlay';
 overlay.innerHTML='<div class="pd-payment-modal" role="dialog" aria-modal="true" aria-labelledby="pdPaymentTitle">'+
 '<div class="pd-payment-modal-head"><div><div class="pd-pay-eyebrow">INVOICE PAYMENT</div><h2 id="pdPaymentTitle">Record a payment</h2><p class="muted">'+escText(x.client||'Customer')+' · INV-'+String(i+1).padStart(4,'0')+'</p></div><button type="button" class="pd-close-payment" aria-label="Close payment form">Close ✕</button></div>'+
 '<div class="pd-ledger-stats"><div><span>Invoice total</span><strong>'+money(x.total)+'</strong></div><div><span>Received</span><strong>'+totals.paid+'</strong></div><div><span>Balance due</span><strong>'+totals.due+'</strong></div>'+(cents(x.paid||0)>cents(x.total||0)?'<div><span>Customer credit</span><strong>'+totals.credit+'</strong></div>':'')+'</div>'+
 '<form id="pdRecordPaymentForm"><div class="two"><div><label>Amount received ($)</label><input id="pdReceivedAmount" type="number" min=".01" step=".01" inputmode="decimal" required placeholder="e.g. 1500.00"></div><div><label>Date received</label><input id="pdReceivedDate" type="date" required value="'+dateToday()+'"></div></div>'+
 '<div class="two"><div><label>Payment method</label><select id="pdReceivedMethod" required><option value="">Select method</option><option>Cash</option><option>Check</option><option>Zelle</option><option>ACH / Bank Transfer</option><option>Credit Card</option><option>Debit Card</option><option>Cash App</option><option>Venmo</option><option>PayPal</option><option>Other</option></select></div><div><label>Transaction / check number (optional)</label><input id="pdReceivedReference" placeholder="Reference or confirmation #"></div></div>'+
 '<label>Notes (optional)</label><textarea id="pdReceivedNote" rows="2" placeholder="Example: Additional payment toward cabinet materials"></textarea>'+
 '<div id="pdPaymentImpact" class="pd-payment-impact">Enter an amount to see the updated balance.</div>'+
 '<div class="pd-pay-actions"><button type="button" class="btn pd-cancel-payment">Cancel</button><button type="submit" class="btn primary">Save Payment</button></div></form>'+
 '<div class="pd-ledger-history"><h3>Payment history</h3>'+(rows||'<p class="muted">No individually recorded payments yet.</p>')+
 ((Number(x.paymentOpeningBalance)||0)>0?'<div class="pd-ledger-row"><div><strong>'+money(x.paymentOpeningBalance)+'</strong><div class="muted">Previous payments (before detailed tracking)</div></div></div>':'')+'</div></div>';
 document.body.appendChild(overlay);
 const close=()=>overlay.remove();
 overlay.querySelector('.pd-close-payment').onclick=close;
 overlay.querySelector('.pd-cancel-payment').onclick=close;
 overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
 const amountInput=overlay.querySelector('#pdReceivedAmount');
 amountInput.addEventListener('input',()=>{
  const amount=cents(amountInput.value||0),due=cents(x.total||0)-cents(x.paid||0);
  const next=due-amount,impact=overlay.querySelector('#pdPaymentImpact');
  impact.textContent=amount<=0?'Enter an amount to see the updated balance.':next>=0?'Remaining balance after payment: '+currency(next):'Payment exceeds the balance. Customer credit: '+currency(-next);
  impact.classList.toggle('pd-payment-credit',next<0&&amount>0);
 });
 overlay.querySelector('form').addEventListener('submit',event=>{
  event.preventDefault();
  const raw=amountInput.value.trim(),amount=Number(raw),method=overlay.querySelector('#pdReceivedMethod').value;
  const date=overlay.querySelector('#pdReceivedDate').value;
  if(!/^\d+(\.\d{1,2})?$/.test(raw)||!Number.isFinite(amount)||amount<=0||cents(amount)<=0)return alert('Enter a valid positive amount with no more than two decimal places.');
  if(!method||!date)return alert('Choose a payment method and date.');
  ensureLedger(x);
  const record={id:'pay-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),amount:cents(amount)/100,date,method,reference:overlay.querySelector('#pdReceivedReference').value.trim(),note:overlay.querySelector('#pdReceivedNote').value.trim(),recordedAt:new Date().toISOString()};
  x.payments.push(record);x.paid=totalReceived(x);
  try{save()}catch(error){x.payments.pop();x.paid=totalReceived(x);alert('Payment could not be saved. Check available browser storage.');return}
  close();render();
 });
 amountInput.focus();
}
payment=function(i){showLedger(i)};
const previousPaymentHTML=documentHTML;
documentHTML=function(type,x,i){
 let html=previousPaymentHTML(type,x,i);
 if(type!=='invoice'||!records(x).length)return html;
 const ledger='<div class="paper-foot"><strong>Payments received</strong>'+records(x).map(p=>'<p>'+escText(p.date)+' — '+money(p.amount)+' via '+escText(p.method)+(p.reference?' ('+escText(p.reference)+')':'')+'</p>').join('')+'</div>';
 const credit=Math.max(0,cents(x.paid||0)-cents(x.total||0));
 if(credit)html=html.replace('<div class="line grand">','<div class="line"><span>Customer credit</span><strong>'+currency(credit)+'</strong></div><div class="line grand">');
 return html.replace('<div class="paper-foot"><strong>Thank you',ledger+'<div class="paper-foot"><strong>Thank you');
};
})();
