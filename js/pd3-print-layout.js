/* P&D 3.0 — premium estimate/invoice print template.
   Uses existing record data and existing uploaded photos only; no sample data. */
(function(){
 'use strict';
 const E = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money = value => '$'+(Number(value)||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
 function date(value){
   if(!value)return '';
   const d=new Date(value);
   return Number.isNaN(d.getTime())?'':d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
 }
 function render(type,record,index){
   const invoice=type==='invoice';
   const label=invoice?'INVOICE':'ESTIMATE';
   const number=(invoice?'INV-':'EST-')+String(index+1).padStart(4,'0');
   const lines=Array.isArray(record.lines)?record.lines:[];
   const subtotal=lines.reduce((n,l)=>n+(Number(l.quantity)||0)*(Number(l.price)||0),0);
   const total=Number.isFinite(Number(record.total))?Number(record.total):subtotal;
   const paid=Number(record.paid)||0;
   const balance=Math.max(0,total-paid);
   const owner=(typeof record.preparedBy==='string'&&record.preparedBy.trim()) ||
     (typeof db.businessProfile?.preparedBy==='string'&&db.businessProfile.preparedBy.trim()) || 'Papo Delvalle';
   const issued=date(record.invoiceDate||record.date)||date(new Date().toISOString());
   const valid=date(record.validUntil||record.expirationDate||record.expiryDate);
   const blocks=Array.isArray(record.contentBlocks)?record.contentBlocks:[];
   const photoBlocks=blocks.filter(b=>b?.type==='photo'&&b.src);
   const otherBlocks=blocks.filter(b=>b?.type!=='photo');
   const notes=record.notes||'';
   const warranty=record.warranty||'';
   const schedule=Array.isArray(record.paymentSchedule)?record.paymentSchedule:[];
   const terms=schedule.length?schedule.map(p=>{
     const condition=p.dueWhen==='date'?(p.dueDate||'As agreed'):(p.milestone||p.dueDate||'As agreed');
     return '<p><strong>'+E(p.label||'Payment')+':</strong> '+E(condition)+'</p>';
   }).join(''):'<p><strong>Payment terms:</strong> As agreed in the project contract.</p>';
   const pageHeader='<div class="paper-head pd3-template-head"><div class="doc-brand">' +
     '<img src="./assets/pd-roof-reference.svg" alt="P&D Build&Remodel logo">' +
     '<div class="firm">P&D Build&Remodel</div><div class="sub">PRECISION &amp; DETAIL</div></div>' +
     '<div class="paper-title"><h2>'+label+'</h2><small>'+number+'</small></div></div>';
   const metadata='<div class="paper-meta pd3-template-meta">' +
     '<div><div class="caption-label">PREPARED FOR</div><strong>'+E(record.client||'Customer')+'</strong>' +
     (record.customerAddress?'<p>'+E(record.customerAddress)+'</p>':'') +
     (record.customerPhone?'<p>'+E(record.customerPhone)+'</p>':'') +
     (record.customerEmail?'<p>'+E(record.customerEmail)+'</p>':'')+'</div>' +
     '<div><div class="caption-label">FROM</div><strong>P&D Build&Remodel</strong>' +
     '<p class="pd3-preparer">'+E(owner)+'</p><p>(254) 535-7623</p>' +
     '<p>info@pdbuildremodel.com</p></div>' +
     '<div class="pd3-date-meta"><div class="caption-label">DATE</div><p>'+E(issued)+'</p>' +
     (valid?'<div class="caption-label pd3-valid-label">VALID UNTIL</div><p>'+E(valid)+'</p>':'')+'</div></div>';
   const table='<table class="paper-table pd3-template-table"><thead><tr><th>#</th><th>DESCRIPTION</th>' +
     '<th>QTY</th><th>UNIT PRICE</th><th>TOTAL</th></tr></thead><tbody>'+
     lines.map((l,i)=>'<tr><td>'+(i+1)+'</td><td>'+E(l.description||'Service')+'</td>' +
       '<td>'+E(l.quantity??1)+'</td><td>'+money(l.price)+'</td>' +
       '<td>'+money((Number(l.quantity)||0)*(Number(l.price)||0))+'</td></tr>').join('') +
     '</tbody></table>';
   const summary='<div class="paper-totals pd3-template-totals">' +
     '<div class="line"><span>Subtotal</span><strong>'+money(subtotal)+'</strong></div>' +
     (invoice?'<div class="line"><span>Payments received</span><strong>'+money(paid)+'</strong></div>':'') +
     '<div class="line grand"><span>'+(invoice?'Balance due':'Total')+'</span><strong>'+money(invoice?balance:total)+'</strong></div></div>';
   const hasSecondPage=photoBlocks.length>0;
   const intro=record.description?'<section class="pd3-template-project"><h3>PROJECT DETAILS</h3>' +
     '<p>'+E(record.description)+'</p></section>':'';
   const detailBlocks=otherBlocks.length&&window.PDBlocks?PDBlocks.html(otherBlocks):'';
   const photos=photoBlocks.length&&window.PDBlocks?PDBlocks.html(photoBlocks):'';
   const details=(intro+detailBlocks+(notes?'<section class="pd3-template-section"><h3>PROJECT NOTES</h3><p>'+E(notes)+'</p></section>':'')+
     (warranty?'<section class="pd3-template-section"><h3>TERMS &amp; WARRANTY</h3><p>'+E(warranty)+'</p></section>':''));
   const termsPanel='<section class="pd3-template-terms"><h3>PAYMENT CONDITIONS</h3>'+terms+'</section>';
   const pageOne='<div class="paper pd3-template-paper"><div class="paper-top"></div>' +
     '<div class="paper-inner">'+pageHeader+metadata+table+
     '<div class="pd3-template-bottom">'+termsPanel+summary+'</div>' +
     (!hasSecondPage?details:'') +
     '<footer class="pd3-page-footer">P&D Build&Remodel'+(hasSecondPage?' · Page 1 of 2':'')+'</footer></div></div>';
   if(!hasSecondPage)return pageOne;
   const pageTwo='<div class="paper pd3-template-paper pd3-template-continuation">' +
     '<div class="paper-top"></div><div class="paper-inner">' +
     '<div class="pd3-continuation-head"><img src="./assets/pd-roof-reference.svg" alt="P&D logo">' +
     '<div><strong>P&D Build&Remodel</strong><small>PRECISION &amp; DETAIL</small></div></div>' +
     (details||'<section class="pd3-template-section"><h3>PROJECT DETAILS</h3><p>Project photo references</p></section>') +
     '<section class="pd3-template-gallery"><h3>PROJECT PHOTOS</h3>'+photos+'</section>' +
     '<footer class="pd3-page-footer">P&D Build&Remodel · Page 2 of 2</footer>' +
     '</div></div>';
   return pageOne+pageTwo;
 }
 window.PD3PrintLayout={render};
})();