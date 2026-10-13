/* P&D COMMAND CENTER / Stage 1
   Presentation and honest data summaries only. The existing storage key, ledgers,
   project records, estimate handlers and IndexedDB photo storage are untouched. */
(function(){
'use strict';
const LOGO='https://raw.githubusercontent.com/imadethisforchatgpt/pd-build-remodel-website/main/assets/pd-logo.png';
const GLYPHS={
 Dashboard:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 Estimates:'<path d="M8 3h8l4 4v14H8a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z"/><path d="M16 3v5h5M9 13h8M9 17h6"/>',
 Invoices:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
 Clients:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M18 15a4 4 0 0 1 3 4v1"/>',
 Projects:'<path d="M4 7h16v13H4zM8 7V4h8v3M4 12h16M10 12v2h4v-2"/>',
 More:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'
};
function icon(name){return '<span class="pd-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24">'+(GLYPHS[name]||GLYPHS.More)+'</svg></span>'}
function safe(v){return esc(v)}
function amt(v){return money(Number(v)||0)}
function list(v){return Array.isArray(v)?v:[]}
function normalizedStatus(x){return ['Draft','Sent','Approved','Declined'].includes(x.status)?x.status:'Not set'}
function day(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function invoiceStatus(x){const due=Math.max(0,Number(x.total||0)-Number(x.paid||0));if(due<=.005)return 'Paid';return x.dueDate&&x.dueDate<day()?'Overdue':'Unpaid'}
function isoValue(x){const d=Date.parse(x||'');return Number.isFinite(d)?d:0}
function formattedDate(s){if(!s)return 'No date';const d=new Date(s.length===10?s+'T12:00:00':s);return Number.isFinite(d.getTime())?d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'No date'}
function updateBrand(){
 document.body.classList.add('pd-command-body');
 const header=document.querySelector('body > header');
 if(!header)return;
 const brand=header.querySelector('.brand');
 if(brand&&!brand.querySelector('.pd-real-mark')){
  brand.innerHTML='<img class="pd-real-mark" src="'+LOGO+'" alt="Original P&D Build&Remodel company logo"><span class="pd-brand-copy"><strong>P&D Build&Remodel</strong><small>PRECISION & DETAIL</small></span>';
 }
 const tag=header.querySelector('.tag');if(tag)tag.textContent='P&D 2.0 · PRIVATE';
 document.title='P&D Command Center | Build&Remodel';
}
function upgradeNav(){
 const nav=document.getElementById('nav');if(!nav)return;
 const labels={Dashboard:'Overview',Estimates:'Estimates',Invoices:'Invoices',Clients:'Clients',Projects:'Projects'};
 nav.querySelectorAll('[data-pd-tab]').forEach(b=>{
  const t=b.dataset.pdTab;
  if(!GLYPHS[t])return;
  b.innerHTML=icon(t)+'<span class="pd-nav-label">'+labels[t]+'</span>';
  b.setAttribute('aria-label',labels[t]);
 });
 const more=nav.querySelector('#pdMoreToggle');
 if(more){
  more.innerHTML=icon('More')+'<span class="pd-nav-label">More</span><span class="pd-more-caret" aria-hidden="true">⌄</span>';
  more.setAttribute('aria-label','More tools and projects');
  more.setAttribute('aria-expanded','false');
 }
 const menu=nav.querySelector('#pdMoreMenu');
 if(menu&&!menu.querySelector('[data-pd-extra="Projects"]')){
  const b=document.createElement('button');b.type='button';b.dataset.pdExtra='Projects';b.textContent='Projects';b.className=tab==='Projects'?'active':'';
  b.addEventListener('click',()=>go('Projects'));
  menu.insertBefore(b,menu.firstChild);
 }
 if(tab==='Projects'&&more)more.classList.add('active');
}
function commandHeader(name,sub){
 return '<div class="pd-page-heading"><div><div class="pd-overline">P&D / WORKSPACE</div><h1>'+safe(name)+'</h1><div class="pd-page-sub muted">'+safe(sub)+'</div></div><span class="pd-record-source">Data stored on this device</span></div>';
}
function dashboard(){
 const invoices=list(db.invoices),estimates=list(db.estimates),projects=list(db.projects),clients=list(db.clients);
 const balance=invoices.reduce((a,x)=>a+Math.max(0,(Number(x.total)||0)-(Number(x.paid)||0)),0);
 const received=invoices.reduce((a,x)=>a+Math.max(0,Number(x.paid)||0),0);
 const billed=invoices.reduce((a,x)=>a+Math.max(0,Number(x.total)||0),0);
 const openInvoices=invoices.filter(x=>invoiceStatus(x)!=='Paid');
 const overdue=openInvoices.filter(x=>invoiceStatus(x)==='Overdue');
 const knownDates=openInvoices.filter(x=>x.dueDate);
 const sent=estimates.filter(x=>normalizedStatus(x)==='Sent');
 const approved=estimates.filter(x=>normalizedStatus(x)==='Approved');
 const active=projects.filter(x=>x.status==='In Progress');
 const recent=[...estimates.map((x,i)=>({sort:isoValue(x.date),type:'Estimate',client:x.client||'Customer',text:x.description||'Project proposal',value:Number(x.total)||0,index:i})),
               ...invoices.map((x,i)=>({sort:isoValue(x.invoiceDate||x.date),type:'Invoice',client:x.client||'Customer',text:x.description||'Invoice issued',value:Number(x.total)||0,index:i}))];
 invoices.forEach(x=>list(x.payments).forEach(p=>recent.push({sort:isoValue(p.date),type:'Payment',client:x.client||'Customer',text:p.method||'Payment received',value:Number(p.amount)||0})));
 recent.sort((a,b)=>b.sort-a.sort);
 const activity=recent.slice(0,5).map(x=>'<div class="pd-command-row"><div class="pd-row-main"><strong>'+safe(x.client)+'</strong><small>'+safe(x.type)+' · '+safe(x.text)+' · '+formattedDate(x.sort?new Date(x.sort).toISOString():'')+'</small></div><span class="pd-row-value">'+amt(x.value)+'</span></div>').join('');
 const waiting=estimates.filter(x=>normalizedStatus(x)==='Sent').slice(-3).reverse().map(x=>'<div class="pd-command-row pd-attention"><div class="pd-row-main"><strong>'+safe(x.client||'Customer')+'</strong><small>Estimate awaiting decision</small></div><span class="pd-row-value">'+amt(x.total)+'</span></div>').join('');
 const dueRows=invoices.map(x=>({x,balance:Math.max(0,(Number(x.total)||0)-(Number(x.paid)||0))})).filter(v=>v.balance>.005).sort((a,b)=>(a.x.dueDate||'9999').localeCompare(b.x.dueDate||'9999')).slice(0,3).map(v=>'<div class="pd-command-row '+(invoiceStatus(v.x)==='Overdue'?'pd-attention':'')+'"><div class="pd-row-main"><strong>'+safe(v.x.client||'Customer')+'</strong><small>'+safe(invoiceStatus(v.x))+' invoice'+(v.x.dueDate?' · Due '+formattedDate(v.x.dueDate):' · Due date not set')+'</small></div><span class="pd-row-value">'+amt(v.balance)+'</span></div>').join('');
 const customerRows=clients.slice(-3).reverse().map(x=>'<div class="pd-command-row"><div class="pd-row-main"><strong>'+safe(x.name||'Customer')+'</strong><small>'+safe(x.phone||x.email||'Customer profile')+'</small></div><span class="pd-row-value">Client</span></div>').join('');
 const overdueText=!openInvoices.length?'No open invoices':(!knownDates.length?'Due dates not tracked':overdue.length+' overdue');
 const root=document.getElementById('main');
 root.innerHTML=commandHeader('Overview','The important numbers, jobs, and next actions in one place.')+
 '<section class="pd-command-hero"><div><div class="pd-overline">PRECISION IN EVERY DETAIL</div><h1>Your business.<br>Your command center.</h1><p>Track what has been quoted, what is underway, and what still needs payment.</p><div class="pd-hero-actions"><button type="button" data-pd-action="estimate">+ New estimate</button><button type="button" data-pd-action="invoice">+ New invoice</button></div></div><div class="pd-hero-money"><div class="pd-overline">OUTSTANDING RECEIVABLES</div><strong>'+amt(balance)+'</strong><span>'+openInvoices.length+' open '+(openInvoices.length===1?'invoice':'invoices')+' · '+safe(overdueText)+'</span></div></section>'+
 '<div class="pd-command-stats">'+
 '<div class="pd-command-stat"><div class="pd-stat-top"><span class="pd-stat-label">Payments received</span><span class="pd-stat-icon">↗</span></div><strong>'+amt(received)+'</strong><small>Recorded invoice payments, all time</small></div>'+
 '<div class="pd-command-stat"><div class="pd-stat-top"><span class="pd-stat-label">Approved estimates</span><span class="pd-stat-icon">✓</span></div><strong>'+approved.length+'</strong><small>'+estimates.length+' total estimates</small></div>'+
 '<div class="pd-command-stat"><div class="pd-stat-top"><span class="pd-stat-label">Pending estimates</span><span class="pd-stat-icon">◷</span></div><strong>'+sent.length+'</strong><small>Marked as sent and awaiting response</small></div>'+
 '<div class="pd-command-stat"><div class="pd-stat-top"><span class="pd-stat-label">Active projects</span><span class="pd-stat-icon">▣</span></div><strong>'+active.length+'</strong><small>'+projects.length+' projects on record</small></div></div>'+
 '<div class="pd-command-heading"><div><h2>Needs your attention</h2><p>Outstanding balances and proposals awaiting an answer</p></div><button type="button" class="btn" data-pd-action="invoices">View invoices →</button></div>'+
 '<div class="pd-command-columns"><section class="pd-command-panel"><h3>Money to collect</h3><p class="pd-panel-sub">'+amt(billed)+' invoiced · '+amt(received)+' received</p>'+(dueRows||'<div class="pd-command-empty">No outstanding invoice balances on this device.</div>')+'</section><section class="pd-command-panel"><h3>Estimates in review</h3><p class="pd-panel-sub">Only estimates marked Sent appear here</p>'+(waiting||'<div class="pd-command-empty">Nothing pending approval. Set estimate statuses to track responses.</div>')+'</section></div>'+
 '<div class="pd-command-heading"><div><h2>Quick launch</h2><p>Start the tasks you use every day</p></div></div>'+
 '<div class="pd-command-shortcuts"><button type="button" data-pd-action="estimate"><span class="pd-shortcut-icon">＋</span><strong>Create estimate</strong></button><button type="button" data-pd-action="invoice"><span class="pd-shortcut-icon">▤</span><strong>Create invoice</strong></button><button type="button" data-pd-action="client"><span class="pd-shortcut-icon">♙</span><strong>Add customer</strong></button><button type="button" data-pd-action="project"><span class="pd-shortcut-icon">▣</span><strong>New project</strong></button></div>'+
 '<div class="pd-command-heading"><div><h2>Latest activity</h2><p>Records visible in this browser</p></div></div>'+
 '<div class="pd-command-columns"><section class="pd-command-panel"><h3>Recent business activity</h3><p class="pd-panel-sub">Estimates, invoices, and recorded payments</p>'+(activity||'<div class="pd-command-empty">Your activity will appear as you save real estimates and invoices.</div>')+'</section><section class="pd-command-panel"><h3>Recent customers</h3><p class="pd-panel-sub">'+clients.length+' customer profiles</p>'+(customerRows||'<div class="pd-command-empty">Add a customer to build your directory.</div>')+'</section></div>'+
 '<div class="pd-status-bar"><span>P&D Build&Remodel · Private development workspace</span><span>Browser-only records · Export a backup from Settings</span></div>';
 root.querySelectorAll('[data-pd-action]').forEach(b=>b.addEventListener('click',()=>{
  const action=b.dataset.pdAction;
  if(action==='estimate'){go('Estimates');estimateForm()}
  if(action==='invoice'){if(typeof window.pdInvoiceForm==='function')window.pdInvoiceForm();else go('Invoices')}
  if(action==='invoices')go('Invoices');
  if(action==='client'){go('Clients');document.getElementById('cname')?.focus()}
  if(action==='project'){go('Projects');document.getElementById('pname')?.focus()}
 }));
}
function enhanceHeading(){
 const main=document.getElementById('main');if(!main)return;
 const heading=main.querySelector(':scope > h1');if(!heading||main.querySelector(':scope > .pd-page-heading'))return;
 const next=heading.nextElementSibling;
 const wrapper=document.createElement('div');wrapper.className='pd-page-heading';
 const left=document.createElement('div');left.innerHTML='<div class="pd-overline">P&D / WORKSPACE</div>';
 heading.parentNode.insertBefore(wrapper,heading);left.appendChild(heading);
 if(next&&next.classList.contains('muted')){next.classList.add('pd-page-sub');left.appendChild(next)}
 wrapper.appendChild(left);
 const note=document.createElement('span');note.className='pd-record-source';note.textContent='Data stored on this device';wrapper.appendChild(note);
}
function enhancer(kind){
 const invoices=kind==='Invoices';
 const root=document.getElementById(invoices?'invoice-list':'estimate-list');
 if(!root)return;
 const docs=invoices?list(db.invoices):list(db.estimates);
 const cards=[...root.querySelectorAll('.invoice-card')];
 cards.forEach((card,i)=>{
  card.dataset.pdIndex=String(i);
  const x=docs[i];if(!x)return;
  const s=invoices?invoiceStatus(x):normalizedStatus(x);
  const badge=document.createElement('span');badge.className='pd-record-pill';badge.dataset.status=s;badge.textContent=s;
  const title=card.querySelector('h2');
  if(title)title.appendChild(document.createTextNode(' ')),title.appendChild(badge);
  if(invoices){
   const row=document.createElement('div');row.className='pd-due-row';
   row.innerHTML='<label for="pdInvoiceDue'+i+'">Due date</label><input aria-label="Invoice due date" type="date" id="pdInvoiceDue'+i+'" value="'+safe(x.dueDate||'')+'">';
   card.appendChild(row);
   row.querySelector('input').addEventListener('change',ev=>{x.dueDate=ev.target.value;save();render()});
   const controls=card.querySelector('.actions');
   if(controls&&typeof window.pdInvoiceForm==='function'){
    const edit=document.createElement('button');edit.className='btn small-action';edit.type='button';edit.textContent='Edit';edit.addEventListener('click',()=>window.pdInvoiceForm(i));controls.appendChild(edit);
   }
  }else{
   const field=document.createElement('div');field.className='pd-status-change';
   field.innerHTML='<label for="pdStatus'+i+'">Estimate status</label><select id="pdStatus'+i+'" aria-label="Estimate status">'+['Not set','Draft','Sent','Approved','Declined'].map(v=>'<option value="'+v+'" '+(s===v?'selected':'')+'>'+v+'</option>').join('')+'</select>';
   card.appendChild(field);
   field.querySelector('select').addEventListener('change',ev=>{const v=ev.target.value;x.status=v==='Not set'?'':v;save();render()});
  }
 });
 const toolbar=document.querySelector('#main .toolbar');
 if(!toolbar)return;
 const filter=document.createElement('div');filter.className='pd-inline-filter';
 filter.innerHTML=invoices?'<select aria-label="Filter invoices by status" id="pdFilterStatus"><option value="all">All invoices</option><option value="Unpaid">Unpaid</option><option value="Overdue">Overdue</option><option value="Paid">Paid</option></select>':'<select aria-label="Filter estimates by status" id="pdFilterStatus"><option value="all">All statuses</option><option value="Not set">Not set</option><option value="Draft">Draft</option><option value="Sent">Sent</option><option value="Approved">Approved</option><option value="Declined">Declined</option></select>';
 filter.innerHTML+='<select aria-label="Sort documents" id="pdSortRecords"><option value="recent">Newest first</option><option value="oldest">Oldest first</option><option value="amount">Highest amount</option><option value="customer">Customer A–Z</option></select>';
 toolbar.appendChild(filter);
 if(invoices&&typeof window.pdInvoiceForm==='function'){
  const b=document.createElement('button');b.className='btn primary';b.type='button';b.textContent='+ New Invoice';b.addEventListener('click',()=>window.pdInvoiceForm());toolbar.insertBefore(b,toolbar.firstChild);
 }
 function apply(){
  const status=filter.querySelector('#pdFilterStatus').value,sort=filter.querySelector('#pdSortRecords').value;
  const search=(toolbar.querySelector('input.search')?.value||'').toLowerCase().trim();
  cards.sort((a,b)=>{
   const ax=docs[Number(a.dataset.pdIndex)]||{},bx=docs[Number(b.dataset.pdIndex)]||{};
   if(sort==='amount')return (Number(bx.total)||0)-(Number(ax.total)||0);
   if(sort==='customer')return String(ax.client||'').localeCompare(String(bx.client||''));
   if(sort==='oldest')return Number(a.dataset.pdIndex)-Number(b.dataset.pdIndex);
   return Number(b.dataset.pdIndex)-Number(a.dataset.pdIndex);
  }).forEach(card=>{
   const x=docs[Number(card.dataset.pdIndex)]||{};
   const recordStatus=invoices?invoiceStatus(x):normalizedStatus(x);
   const text=String(x.client||'')+' '+String(x.description||'');
   card.style.display=(status==='all'||status===recordStatus)&&text.toLowerCase().includes(search)?'':'none';
   root.appendChild(card);
  });
 }
 filter.addEventListener('change',apply);
 const searchBox=toolbar.querySelector('input.search');
 if(searchBox)searchBox.addEventListener('input',apply);
 apply();
}
function lineControls(){
 const lines=document.getElementById('lines');if(!lines)return;
 const cards=[...lines.querySelectorAll(':scope > .item-row')];
 cards.forEach((card,i)=>{
  let controls=card.querySelector(':scope > .pd-line-controls');
  if(!controls){
   controls=document.createElement('div');controls.className='pd-line-controls';
   controls.innerHTML='<span class="pd-line-amount" aria-live="polite">Line total: $0.00</span><button type="button" class="pd-move-up" aria-label="Move line item up">↑</button><button type="button" class="pd-move-down" aria-label="Move line item down">↓</button>';
   card.appendChild(controls);
   controls.querySelector('.pd-move-up').addEventListener('click',()=>{const prev=card.previousElementSibling;if(prev&&prev.classList.contains('item-row')){lines.insertBefore(card,prev);lineControls();updateTotal()}});
   controls.querySelector('.pd-move-down').addEventListener('click',()=>{const next=card.nextElementSibling;if(next&&next.classList.contains('item-row')){lines.insertBefore(next,card);lineControls();updateTotal()}});
  }
  const qty=Number(card.querySelector('.lqty')?.value)||0,price=Number(card.querySelector('.lprice')?.value)||0;
  controls.querySelector('.pd-line-amount').textContent='Line total: '+amt(qty*price);
  controls.querySelector('.pd-move-up').disabled=i===0;
  controls.querySelector('.pd-move-down').disabled=i===cards.length-1;
 });
}
const previousAddLine=addLine;
addLine=function(){previousAddLine();lineControls()};
const previousForm=estimateForm;
estimateForm=function(){previousForm();lineControls();const ed=document.getElementById('pdBlocksState');if(ed)ed.classList.add('pd-autosave-tag')};
const previousEditEstimate=editEstimate;
editEstimate=function(i){previousEditEstimate(i);lineControls()};
const previousRender=render;
render=function(){
 previousRender();
 updateBrand();upgradeNav();
 if(tab==='Dashboard')dashboard();
 else {enhanceHeading();if(tab==='Estimates'||tab==='Invoices')enhancer(tab)}
};
document.addEventListener('input',e=>{if(e.target.closest('#lines')&&(e.target.matches('.lqty,.lprice')))lineControls()});
document.addEventListener('click',e=>{if(e.target.closest('#lines')&&e.target.closest('.item-row .btn'))queueMicrotask(lineControls)});
window.PDCommandCenter={renderDashboard:dashboard,refreshLines:lineControls,logoUrl:LOGO};
render();
})();
