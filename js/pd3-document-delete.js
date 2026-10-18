/* Recoverable document deletion. Array positions remain stable for document numbers and links. */
(function () {
  'use strict';
  function change(kind, index, restoring) {
    const record = db[kind]?.[index];
    if (!record) return;
    const label = kind === 'invoices' ? 'invoice' : 'estimate';
    if (!restoring && !confirm('Delete this ' + label + ' for ' + (record.client || 'this customer') + '? It will leave active lists and totals. You can restore it from Deleted documents below. Related documents and photos will remain.')) return;
    const previous = record.deletedAt;
    if (restoring) delete record.deletedAt;
    else record.deletedAt = new Date().toISOString();
    try {save();} catch (error) {
      if (previous === undefined) delete record.deletedAt; else record.deletedAt = previous;
      alert('The change could not be saved. Your document has not been changed.'); return;
    }
    render();
  }
  function decorate() {
    const kind = tab === 'Estimates' ? 'estimates' : tab === 'Invoices' ? 'invoices' : null;
    if (!kind) return;
    const list = document.getElementById(kind === 'estimates' ? 'estimate-list' : 'invoice-list');
    if (!list) return;
    list.querySelectorAll('.invoice-card').forEach((card,index) => {
      const record = db[kind][index];
      if (record.deletedAt) {card.hidden = true; card.style.display = 'none';}
      if (!card.querySelector('[data-pd3-delete]')) {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'btn small-action'; button.dataset.pd3Delete = '';
        button.textContent = kind === 'invoices' ? 'Delete invoice' : 'Delete estimate';
        button.style.color = '#a32d35'; button.onclick = () => change(kind,index,false);
        card.querySelector('.actions')?.appendChild(button);
      }
    });
    if (kind === 'invoices') {
      const active = db.invoices.filter(x => !x.deletedAt);
      const stats = document.querySelectorAll('.estimate-summary strong');
      const totals = [String(active.length),money(active.reduce((a,x)=>a+Math.max(0,(+x.total||0)-(+x.paid||0)),0)),money(active.reduce((a,x)=>a+(+x.paid||0),0))];
      stats.forEach((el,i)=>{if(totals[i]!==undefined)el.textContent=totals[i];});
      const count = list.closest('.panel')?.querySelector('.count'); if(count)count.textContent=active.length+' records';
      if (!active.length && !list.querySelector('.empty')) {const empty=document.createElement('div');empty.className='empty';empty.textContent='No active invoices.';list.appendChild(empty);}
    }
    document.getElementById('pd3DeletedDocuments')?.remove();
    const deleted = db[kind].map((record,index)=>({record,index})).filter(x=>x.record.deletedAt);
    if (!deleted.length) return;
    const section = document.createElement('details'); section.id='pd3DeletedDocuments';section.className='panel';
    const heading=document.createElement('summary');heading.textContent='Deleted documents ('+deleted.length+')';section.appendChild(heading);
    deleted.forEach(({record,index})=>{
      const row=document.createElement('div');row.className='entry row';
      const name=document.createElement('span');name.textContent=(kind==='invoices'?'INV-':'EST-')+String(index+1).padStart(4,'0')+' · '+(record.client||'Customer')+' · '+money(record.total);
      const restore=document.createElement('button');restore.type='button';restore.className='btn';restore.textContent='Restore';restore.onclick=()=>change(kind,index,true);
      row.append(name,restore);section.appendChild(row);
    });
    list.closest('.panel').after(section);
  }
  const priorRender=render;render=function(){priorRender();decorate();};
  const priorFilter=filterCards;filterCards=function(value,id){priorFilter(value,id);decorate();};
  render();
})();
