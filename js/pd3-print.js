/* P&D 3.0 standalone US Letter print/PDF workflow.
   No 2.0 service changes and no changes to customer data. */
(function() {
 'use strict';
 const BASE = location.origin;
 function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(date);
 }
 function documentMarkup(type, record, index) {
  let markup = documentHTML(type, record, index);
  markup = markup.replace(/src="\.\/assets\//g, 'src="' + BASE + '/assets/');
  const date = formatDate(type === 'invoice' ? (record.invoiceDate || record.date) : record.date);
  if (date) {
   markup = markup.replace(/(<div class="paper-title">[\s\S]*?<small>[^<]*<\/small>)/,
    '$1<p class="pd3-issued">Issued: ' + esc(date) + '</p>');
  }
  return markup;
 }
 function fitPage(popup) {
  if (!popup || popup.closed) return;
  const frame = popup.document.getElementById('pd3PrintFrame');
  const paper = popup.document.querySelector('#pd3PrintFrame .paper');
  if (!frame || !paper) return;
  const available = Math.max(260, popup.innerWidth - 24);
  const ratio = Math.min(1, available / 816);
  if (ratio < 0.995) {
   paper.style.transformOrigin = 'top left';
   paper.style.transform = 'scale(' + ratio + ')';
   frame.style.width = Math.round(816 * ratio) + 'px';
   frame.style.height = Math.ceil(paper.scrollHeight * ratio) + 'px';
  } else {
   paper.style.transform = '';
   frame.style.width = '';
   frame.style.height = '';
  }
 }
 function buildPrintHTML(type,record,index) {
  const name = type === 'invoice' ? 'Invoice' : 'Estimate';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
   '<meta name="viewport" content="width=device-width,initial-scale=1">' +
   '<title>' + name + ' | P&D Build&Remodel</title>' +
   '<link rel="stylesheet" href="' + BASE + '/css/pd3-print.css"></head>' +
   '<body class="pd3-document-print">' +
   '<div class="pd3-print-toolbar"><div class="pd3-print-title"><strong>P&D Build&Remodel · ' +
    name + '</strong><small>US Letter (8.5 × 11 in) · Print-ready document</small></div>' +
   '<div class="pd3-print-actions"><button id="pd3PrintNow" type="button">Print / Save as PDF</button>' +
    '<button id="pd3ClosePreview" type="button">Close preview</button></div></div>' +
   '<p class="pd3-print-tip">This is a paper-size preview, not an iPhone screenshot. ' +
    'On iPhone, tap Print / Save as PDF and use the print sheet to save or share a PDF.</p>' +
   '<div id="pd3PrintFrame" class="pd3-print-frame">' + documentMarkup(type,record,index) +
   '</div></body></html>';
 }
 printStyled = function(type,index) {
  const records = type === 'estimate' ? db.estimates : db.invoices;
  const record = records?.[index];
  if (!record) return;
  // The new tab opens synchronously on the tap, keeping iPhone popup behavior reliable.
  const popup = window.open('', '_blank');
  if (!popup) {
   alert('Allow popups for P&D 3.0 to open the letter-size print/PDF preview.');
   return;
  }
  popup.document.open();
  popup.document.write(buildPrintHTML(type,record,index));
  popup.document.close();
  popup.document.getElementById('pd3PrintNow')?.addEventListener('click', () => popup.print());
  popup.document.getElementById('pd3ClosePreview')?.addEventListener('click', () => popup.close());
  popup.addEventListener('resize', () => fitPage(popup));
  (async function() {
   try {
    if (window.PDEditor?.hydrate) await window.PDEditor.hydrate(popup.document);
    // Wait until the standalone print stylesheet and project photos have loaded.
    const link = popup.document.querySelector('link[href*="pd3-print.css"]');
    if (link) await Promise.race([
     new Promise(resolve => {if (link.sheet) return resolve();link.addEventListener('load',resolve,{once:true});link.addEventListener('error',resolve,{once:true});}),
     new Promise(resolve => setTimeout(resolve,4500))
    ]);
    const images = [...popup.document.querySelectorAll('.paper img')];
    await Promise.all(images.map(img => new Promise(resolve => {
     if (img.complete) {resolve();return;}
     img.addEventListener('load',resolve,{once:true});
     img.addEventListener('error',resolve,{once:true});
     setTimeout(resolve,4500);
    })));
    fitPage(popup);
   } catch (error) {
    const tip = popup.document.querySelector('.pd3-print-tip');
    if (tip) tip.textContent = 'Some project images could not load. Please check the preview before printing.';
    fitPage(popup);
   }
  })();
 };
 const priorPreview = previewDoc;
 previewDoc = function(type,index) {
  priorPreview(type,index);
  const actions = document.querySelector('#main .doc-actions');
  if (!actions || actions.querySelector('.pd3-print-explainer')) return;
  const info = document.createElement('p');
  info.className = 'pd3-print-explainer';
  info.textContent = 'Print / Save PDF opens a US Letter document. Long invoices automatically continue onto additional pages.';
  actions.insertAdjacentElement('afterend',info);
 };
})();