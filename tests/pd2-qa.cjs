const {chromium} = require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ORIGIN='http://127.0.0.1:8766';
const BEFORE='http://127.0.0.1:8765';
fs.mkdirSync('qa-screenshots',{recursive:true});
const demo={
 clients:[{name:'QA Example Client',phone:'254-555-0100',email:'example@test.invalid',address:'101 Example St'}],
 estimates:[{client:'QA Example Client',description:'Demonstration cabinet proposal',lines:[{description:'Fabricate base cabinets',quantity:5,price:500}],total:2500,date:'2026-10-10T14:00:00.000Z',status:'Sent'}],
 invoices:[{client:'QA Example Client',description:'Demonstration invoice',lines:[{description:'Cabinet installation',quantity:3,price:600}],total:1800,paid:400,invoiceDate:'2026-10-08',dueDate:'2026-10-09',payments:[{id:'qa-payment-1',date:'2026-10-09',amount:400,method:'Cash'}]}],
 projects:[{name:'QA Kitchen Project',client:'QA Example Client',tasks:'Install custom cabinetry',status:'In Progress',address:'101 Example St'}],
 templates:[],feedback:[]
};
function log(s){console.log('[P&D QA] '+s)}
async function seed(page){
 await page.addInitScript(data=>{localStorage.setItem('pd2_test_records_v2',JSON.stringify(data))},demo);
}
async function storage(page){return page.evaluate(()=>JSON.parse(localStorage.getItem('pd2_test_records_v2')))}
async function noJSFailures(page,origin){
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin,{waitUntil:'load',timeout:30000});
 await page.waitForTimeout(500);
 assert.equal(errors.length,0,'JavaScript errors: '+errors.join('; '));
 return errors;
}
async function run(){
 const browser=await chromium.launch({headless:true});
 try{
  const before=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1});
  await seed(before);await noJSFailures(before,BEFORE);
  await before.screenshot({path:'qa-screenshots/before-desktop.png',fullPage:true});
  log('Saved original design baseline screenshot');
  const desktop=await browser.newPage({viewport:{width:1440,height:960}});
  await seed(desktop);await noJSFailures(desktop,ORIGIN);
  assert.equal(await desktop.locator('body').evaluate(el=>el.classList.contains('pd-command-body')),true);
  assert.equal(await desktop.locator('nav#nav').evaluate(el=>getComputedStyle(el).position),'fixed');
  assert.equal(await desktop.locator('.pd-command-stats .pd-command-stat').count(),4);
  assert.match(await desktop.locator('.pd-command-hero').innerText(),/1,400\.00/);
  assert.match(await desktop.locator('.pd-command-stats').innerText(),/\$400\.00/);
  const logo=await desktop.locator('header img.pd-real-mark').evaluate(img=>({loaded:img.complete&&img.naturalWidth>0,src:img.currentSrc}));
  assert.ok(logo.loaded,'Original P&D logo is missing: '+logo.src);
  assert.ok(logo.src.includes('/assets/pd-logo.png'),'App must use the official full P&D emblem');
  const fullLogoWidth=await desktop.locator('header img.pd-real-mark').evaluate(el=>el.getBoundingClientRect().width);
  assert.ok(fullLogoWidth>=60,'App full emblem is too small: '+fullLogoWidth);
  await desktop.screenshot({path:'qa-screenshots/after-desktop.png',fullPage:true});
  log('Desktop layout and financial data checks passed');
  const baselineMobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  const oldPhone=await baselineMobile.newPage();await seed(oldPhone);await noJSFailures(oldPhone,BEFORE);
  await oldPhone.screenshot({path:'qa-screenshots/before-iphone.png',fullPage:true});
  await baselineMobile.close();
  const iphone=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  const mobile=await iphone.newPage();await seed(mobile);await noJSFailures(mobile,ORIGIN);
  assert.equal(await mobile.locator('#nav').evaluate(el=>getComputedStyle(el).position),'fixed');
  assert.equal(await mobile.locator('body > header').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(7, 24, 43)','iPhone header must provide navy contrast for white official P&D lettering');
  assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth+2),true,'Horizontal page overflow on iPhone');
  await mobile.screenshot({path:'qa-screenshots/after-iphone.png',fullPage:true});
  await mobile.locator('#pdMoreToggle').click();
  assert.equal(await mobile.locator('#pdMoreMenu').isVisible(),true);
  const menuGeometry=await mobile.locator('#pdMoreMenu').evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:r.height,viewportHeight:innerHeight,viewportWidth:innerWidth,position:s.position,display:s.display,opacity:s.opacity,zIndex:s.zIndex,parent:el.parentElement?.getBoundingClientRect().toJSON()}});
  log('More menu geometry: '+JSON.stringify(menuGeometry));
  assert.ok(menuGeometry.top>=0&&menuGeometry.bottom<=menuGeometry.viewportHeight&&menuGeometry.left>=0&&menuGeometry.right<=menuGeometry.viewportWidth,'More menu not fully inside iPhone viewport');
  assert.equal(await mobile.locator('#pdMoreMenu [data-pd-extra="Projects"]').count(),1);
  await mobile.screenshot({path:'qa-screenshots/after-iphone-more-menu.png',fullPage:false});
  // Regression: the menu must be genuinely usable, not merely visible to the DOM.
  await mobile.locator('#pdMoreMenu [data-pd-extra="Projects"]').click();
  assert.equal(await mobile.locator('#main h1').first().innerText(),'Projects','More > Projects failed to open the project workspace');
  assert.equal(await mobile.locator('.project-card').count(),1,'Project records disappeared during mobile navigation');
  assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+2),true,'Horizontal overflow after navigating to Projects');
  await mobile.locator('#pdMoreToggle').click();
  assert.equal(await mobile.locator('#pdMoreMenu').isVisible(),true,'More menu cannot reopen on Projects');
  await mobile.locator('#pdMoreToggle').click();
  assert.equal(await mobile.locator('#pdMoreMenu').isVisible(),false,'More menu does not close on repeat tap');
  log('Mobile navigation, usable More menu and overflow checks passed');
  await iphone.close();
  const flow=await browser.newPage({viewport:{width:1024,height:850}});
  const flowErrors=[];flow.on('pageerror',e=>flowErrors.push(e.message));
  flow.on('dialog',d=>d.accept());
  await flow.goto(ORIGIN,{waitUntil:'load'});
  const brandLayout=await flow.locator('header .pd-brand-copy strong').evaluate(el=>{
    const header=document.querySelector('body > header').getBoundingClientRect();
    const range=document.createRange();range.selectNodeContents(el);
    return {contentRight:Math.max(...[...range.getClientRects()].map(r=>r.right)),headerRight:header.right,text:el.textContent};
  });
  assert.ok(brandLayout.contentRight<=brandLayout.headerRight-5,'Full P&D name is clipped by compact sidebar: '+JSON.stringify(brandLayout));
  await flow.locator('.pd-hero-actions [data-pd-action="invoice"]').click();
  await flow.locator('#pdInvoiceEditor').waitFor();
  await flow.locator('#eclient').fill('QA New Invoice Client');
  await flow.locator('#edesc').fill('Custom cabinet fabrication');
  await flow.locator('#lines .ldesc').first().fill('Build cabinet doors');
  await flow.locator('#lines .lqty').first().fill('2');
  await flow.locator('#lines .lprice').first().fill('375.50');
  await flow.locator('#pdInvoicePlan').selectOption('three');
  const testPhotoBase64=await flow.evaluate(()=>{
    const c=document.createElement('canvas');c.width=700;c.height=440;
    const ctx=c.getContext('2d');ctx.fillStyle='#e2e9ee';ctx.fillRect(0,0,700,440);
    ctx.fillStyle='#28455f';ctx.fillRect(75,60,550,315);
    ctx.fillStyle='#b8ccd9';ctx.fillRect(94,85,512,75);
    for(let i=0;i<4;i++){ctx.fillStyle='#8faebb';ctx.fillRect(100+i*128,175,118,177);
      ctx.fillStyle='#ffffff';ctx.fillRect(108+i*128,183,102,161);
      ctx.fillStyle='#a0b0b9';ctx.fillRect(194+i*128,247,6,28);}
    ctx.fillStyle='#162b3d';ctx.font='bold 26px sans-serif';ctx.fillText('SAMPLE PROJECT REFERENCE',150,411);
    return c.toDataURL('image/png').split(',')[1];
  });
  await flow.locator('#pdInvoicePhotoUpload').setInputFiles({
    name:'sample-project-reference.png',mimeType:'image/png',buffer:Buffer.from(testPhotoBase64,'base64')
  });
  await flow.locator('#pdInvoicePhotoState').getByText('1 photo saved on this device',{exact:false}).waitFor({timeout:18000});
  await flow.locator('#pdInvoicePhotoItems .pd-invoice-photo-caption').fill('Example cabinet installation photo - completed doors and gold handles.');
  await flow.locator('#pdPreviewInvoice').click();
  const draftCaption=flow.locator('#pdInvoicePreview .pd-doc-photo figcaption');
  assert.match(await draftCaption.innerText(),/Example cabinet installation photo/);
  assert.equal(await flow.locator('#pdInvoicePreview .pd-doc-photo img').evaluate(img=>img.complete&&img.naturalWidth>0),true,'Uploaded project photo missing from draft preview');
  const draftOrder=await flow.locator('#pdInvoicePreview').evaluate(root=>{
    const items=root.querySelector('.paper-table'),photo=root.querySelector('.pd-doc-photo'),totals=root.querySelector('.paper-totals');
    return !!(items&&photo&&totals&&(items.compareDocumentPosition(photo)&Node.DOCUMENT_POSITION_FOLLOWING)&&(photo.compareDocumentPosition(totals)&Node.DOCUMENT_POSITION_FOLLOWING));
  });
  assert.equal(draftOrder,true,'Invoice photo must render below work items and above totals');
  await flow.locator('#pdCloseInvoicePreview').click();
  await flow.locator('#pdInvoiceEditor button[type="submit"]').click();
  let data=await storage(flow);
  assert.equal(data.invoices.length,1,'Invoice not stored');
  assert.equal(data.invoices[0].total,751,'Incorrect invoice calculation');
  assert.equal(data.invoices[0].paid,0);
  assert.equal(data.invoices[0].contentBlocks?.filter(b=>b.type==='photo').length,1,'Photo reference not saved with invoice');
  assert.equal(data.invoices[0].contentBlocks[0].caption,'Example cabinet installation photo - completed doors and gold handles.');
  assert.equal(data.invoices[0].contentBlocks[0].captionPosition,'below','Photo description should be below image');
  assert.equal(data.invoices[0].paymentSchedule.length,3,'Payment plan not saved');
  assert.equal(Math.round(data.invoices[0].paymentSchedule.reduce((sum,p)=>sum+p.amount,0)*100),75100,'Schedule does not equal total');
  log('Invoice creation, pricing, and payment requests passed');
  await flow.locator('#invoice-list .invoice-card .actions').first().getByRole('button',{name:'Record Payment'}).click();
  await flow.locator('#pdReceivedAmount').fill('100.00');
  await flow.locator('#pdReceivedMethod').selectOption({label:'Cash'});
  await flow.locator('#pdRecordPaymentForm button[type="submit"]').click();
  data=await storage(flow);
  assert.equal(data.invoices[0].paid,100,'Ledger did not record received payment');
  assert.equal(data.invoices[0].payments.length,1);
  await flow.locator('#invoice-list .invoice-card .actions').first().getByRole('button',{name:'Edit',exact:true}).click();
  await flow.locator('#lines .lprice').first().fill('400.00');
  assert.equal(await flow.locator('#pdInvoicePhotoItems .pd-invoice-photo-caption').inputValue(),'Example cabinet installation photo - completed doors and gold handles.','Photo caption missing when re-editing invoice');
  await flow.locator('#pdInvoicePhotoItems .pd-invoice-photo-caption').fill('Updated: cabinet doors installed, aligned and finished.');
  await flow.locator('#pdInvoiceEditor button[type="submit"]').click();
  data=await storage(flow);
  assert.equal(data.invoices[0].total,800,'Invoice price changes did not save');
  assert.equal(data.invoices[0].paid,100,'Invoice edit changed actual payments');
  assert.equal(data.invoices[0].payments.length,1,'Invoice edit discarded payment history');
  assert.equal(data.invoices[0].contentBlocks?.filter(b=>b.type==='photo').length,1,'Invoice editing removed saved photo');
  assert.equal(data.invoices[0].contentBlocks[0].caption,'Updated: cabinet doors installed, aligned and finished.','Invoice edit failed to save revised photo description');
  log('Payment ledger, invoice editing and history preservation passed');
  // Branding regression: never substitute the dark master logo on a white invoice.
  await flow.locator('#invoice-list .invoice-card .actions').first().getByRole('button',{name:'Preview',exact:true}).click();
  const invoiceLogo=await flow.locator('.paper .doc-brand img').evaluate(async image=>{await image.decode();const r=image.getBoundingClientRect();return {width:r.width,height:r.height,naturalWidth:image.naturalWidth,src:image.currentSrc}});
  assert.ok(invoiceLogo.src.endsWith('/assets/pd-invoice-roof.webp'),'Invoice is not using the official light-background P&D roofline logo: '+invoiceLogo.src);
  assert.ok(invoiceLogo.width>=290 && invoiceLogo.naturalWidth>=400,'Invoice logo is missing or too small: '+JSON.stringify(invoiceLogo));
  await flow.screenshot({path:'qa-screenshots/after-invoice-branded-preview.png',fullPage:true});
  assert.equal(await flow.locator('.paper .doc-brand .sub').innerText(),'Precision & Design','Invoice heading must say Precision & Design');
  assert.equal(await flow.locator('.paper .pd-doc-photo figcaption').innerText(),'Updated: cabinet doors installed, aligned and finished.');
  assert.equal(await flow.locator('.paper .pd-doc-photo img').evaluate(img=>img.complete&&img.naturalWidth>0),true,'Saved invoice photo did not load on preview');
  const invoicePaper=await flow.evaluate(()=>({html:documentHTML('invoice',db.invoices[0],0),css:[...document.querySelectorAll('style')].map(el=>el.textContent).join(' ')}));
  const printPage=await browser.newPage({viewport:{width:900,height:1100}});
  await printPage.setContent('<!doctype html><html><head><meta charset="utf-8"><style>'+invoicePaper.css+'</style></head><body><main>'+invoicePaper.html+'</main></body></html>',{waitUntil:'load'});
  const printableLogo=await printPage.locator('.paper .doc-brand img').evaluate(async image=>{await image.decode();return {width:image.getBoundingClientRect().width,naturalWidth:image.naturalWidth,src:image.currentSrc}});
  assert.ok(printableLogo.src.endsWith('/assets/pd-invoice-roof.webp') && printableLogo.width>=290,'Printable PDF logo is incorrect or too small: '+JSON.stringify(printableLogo));
  const storedPhotoData=await flow.evaluate(async()=>{
    const block=db.invoices[0].contentBlocks.find(b=>b.type==='photo');
    return PDEditor.loadPhoto(block.src);
  });
  assert.ok(storedPhotoData?.startsWith('data:image/'),'Cannot read saved photo before printing');
  await printPage.locator('.pd-doc-photo img[data-pd-photo]').evaluate((img,data)=>{img.src=data},storedPhotoData);
  await printPage.locator('.pd-doc-photo img').evaluate(async img=>{await img.decode()});
  assert.match(await printPage.locator('.pd-doc-photo figcaption').innerText(),/Updated: cabinet doors installed/);
  await printPage.pdf({path:'qa-screenshots/pd2-branded-invoice-test.pdf',format:'Letter',printBackground:true});
  const singlePagePDF=fs.readFileSync('qa-screenshots/pd2-branded-invoice-test.pdf','latin1');
  const pdfPageCount=(singlePagePDF.match(/\/Type\s*\/Page\b/g)||[]).length;
  assert.ok(pdfPageCount>=1&&pdfPageCount<=3,'Small invoice has unexpected page count: '+pdfPageCount);
  await printPage.emulateMedia({media:'print'});
  const printMetrics=await printPage.locator('.paper').evaluate(paper=>{
    const row=paper.querySelector('.paper-table tbody td');
    const thead=paper.querySelector('.paper-table thead');
    const table=paper.querySelector('.paper-table');
    const size=parseFloat(getComputedStyle(row).fontSize);
    const docSize=parseFloat(getComputedStyle(paper).fontSize);
    return {size,docSize,tableHead:getComputedStyle(thead).display,paperBreak:getComputedStyle(paper).breakInside,rowBreak:getComputedStyle(row.parentElement).breakInside,tableWidth:table.getBoundingClientRect().width};
  });
  assert.ok(printMetrics.size>=14.8,'Invoice line item text is too small for printing: '+JSON.stringify(printMetrics));
  assert.ok(printMetrics.docSize>=15.5,'Invoice base font is too small: '+JSON.stringify(printMetrics));
  assert.equal(printMetrics.tableHead,'table-header-group','Invoice table headings must repeat on subsequent printed pages');
  assert.equal(printMetrics.paperBreak,'auto','Print layout must not force entire invoice onto one page');
  assert.equal(printMetrics.rowBreak,'avoid','Individual invoice line items should not split between pages');
  log('Readable invoice print font and natural page-break rules passed');
  const longRows=Array.from({length:45},(_,i)=>({description:'Custom cabinet installation and finishing service #'+String(i+1).padStart(2,'0')+' including fitted hardware and final jobsite adjustments',quantity:2,price:145}));
  const longPrint=await flow.evaluate(rows=>{
    const record={...db.invoices[0],lines:rows,total:rows.reduce((sum,r)=>sum+r.quantity*r.price,0),
      notes:'Long-form workmanship notes and project installation specifications for verification.',warranty:'Workmanship warranty terms apply to completed services.'};
    return documentHTML('invoice',record,0);
  },longRows);
  const longPrintPage=await browser.newPage({viewport:{width:900,height:1100}});
  await longPrintPage.setContent('<!doctype html><html><head><meta charset="utf-8"><style>'+invoicePaper.css+'</style></head><body><main>'+longPrint+'</main></body></html>',{waitUntil:'load'});
  await longPrintPage.emulateMedia({media:'print'});
  await longPrintPage.pdf({path:'qa-screenshots/pd2-multipage-invoice-test.pdf',format:'Letter',printBackground:true});
  const longPDF=fs.readFileSync('qa-screenshots/pd2-multipage-invoice-test.pdf','latin1');
  const longPageCount=(longPDF.match(/\/Type\s*\/Page\b/g)||[]).length;
  assert.ok(longPageCount>=3,'Detailed invoice did not flow naturally across pages: '+longPageCount);
  const rowCount=await longPrintPage.locator('.paper-table tbody tr').count();
  assert.equal(rowCount,45,'Detailed invoice must retain all 45 distinct line items');
  const longSize=await longPrintPage.locator('.paper-table tbody tr').last().locator('td').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  assert.ok(longSize>=14.8,'Multipage invoice line item text shrank unexpectedly: '+longSize);
  await longPrintPage.screenshot({path:'qa-screenshots/after-invoice-multipage-paper.png',fullPage:true});
  await longPrintPage.close();
  log('Long invoice generated '+longPageCount+' readable letter-size pages without shrinking items');
  await printPage.emulateMedia({media:'print'});
  await printPage.screenshot({path:'qa-screenshots/after-invoice-paper.png',fullPage:true});
  await printPage.close();
  await flow.locator('nav [data-pd-tab="Invoices"]').click();
  log('Official invoice branding, captioned project photo and printed PDF passed');
  await flow.locator('nav [data-pd-tab="Estimates"]').click();
  await flow.getByRole('button',{name:/New Estimate/}).first().click();
  await flow.locator('#eclient').fill('QA Estimate Customer');
  await flow.locator('#edesc').fill('Cabinet paint');
  await flow.locator('#lines .ldesc').first().fill('Sand and paint cabinet doors');
  await flow.locator('#lines .lprice').first().fill('225.00');
  await flow.getByRole('button',{name:'Save Estimate',exact:true}).click();
  data=await storage(flow);assert.equal(data.estimates.length,1);
  assert.equal(data.estimates[0].status,'Draft');
  log('Estimate creation and Draft tracking passed');
  await flow.locator('#estimate-list .invoice-card').first().getByRole('button',{name:'Preview',exact:true}).click();
  const estimateLogo=await flow.locator('.paper .doc-brand img').evaluate(async image=>{await image.decode();return {width:image.getBoundingClientRect().width,src:image.currentSrc}});
  assert.ok(estimateLogo.src.endsWith('/assets/pd-invoice-roof.webp')&&estimateLogo.width>=290,'Estimate logo missing or too small: '+JSON.stringify(estimateLogo));
  await flow.locator('nav [data-pd-tab="Estimates"]').click();
  log('Official P&D estimate branding passed');
  await flow.locator('nav [data-pd-tab="Clients"]').click();
  await flow.locator('#cname').fill('QA Additional Client');
  await flow.getByRole('button',{name:/Save Client/}).click();
  data=await storage(flow);assert.equal(data.clients.length,1);
  await flow.locator('nav [data-pd-tab="Projects"]').click();
  await flow.locator('#pname').fill('QA Customer Kitchen');
  await flow.locator('#pclient').fill('QA Additional Client');
  await flow.getByRole('button',{name:/Add Project/}).click();
  data=await storage(flow);assert.equal(data.projects.length,1);
  log('Client and project creation passed');
  assert.deepEqual(flowErrors,[],'Runtime JavaScript errors: '+flowErrors.join('; '));
  await flow.screenshot({path:'qa-screenshots/after-projects-desktop.png',fullPage:true});
  const liveUrl='https://pd2-editor-preview.onrender.com';
  const published=await browser.newPage({viewport:{width:1440,height:900}});
  await seed(published);await noJSFailures(published,liveUrl);
  assert.equal(await published.locator('body').evaluate(el=>el.classList.contains('pd-command-body')),true,'Published Render site is missing redesigned shell');
  assert.equal(await published.locator('.pd-command-stats .pd-command-stat').count(),4,'Published Render dashboard missing statistics');
  const realLogo=await published.locator('header img.pd-real-mark').evaluate(img=>img.complete&&img.naturalWidth>0);
  assert.ok(realLogo,'Published Render site missing original logo');
  await published.screenshot({path:'qa-screenshots/live-render-desktop.png',fullPage:true});
  const liveLogoAsset=await published.request.get(liveUrl+'/assets/pd-invoice-roof.webp');
  assert.equal(liveLogoAsset.status(),200,'Deployed P&D invoice logo asset is not accessible');
  assert.ok((liveLogoAsset.headers()['content-type']||'').includes('image/webp'),'Deployed P&D invoice logo is not served as an image');
  await published.locator('nav [data-pd-tab="Invoices"]').click();
  await published.locator('#invoice-list .invoice-card .actions').first().getByRole('button',{name:'Preview',exact:true}).click();
  const liveInvoiceLogo=await published.locator('.paper .doc-brand img').evaluate(async img=>{await img.decode();return {src:img.currentSrc,width:img.getBoundingClientRect().width,naturalWidth:img.naturalWidth}});
  assert.ok(liveInvoiceLogo.src.endsWith('/assets/pd-invoice-roof.webp')&&liveInvoiceLogo.width>=290&&liveInvoiceLogo.naturalWidth>=400,'LIVE invoice branding is missing or too small: '+JSON.stringify(liveInvoiceLogo));
  await published.screenshot({path:'qa-screenshots/live-render-invoice-preview.png',fullPage:true});
  log('LIVE Render invoice logo asset and document preview verified');
  const livePhone=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  const liveMobile=await livePhone.newPage();await seed(liveMobile);await noJSFailures(liveMobile,liveUrl);
  assert.equal(await liveMobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,'Published Render iPhone has horizontal overflow');
  await liveMobile.locator('nav [data-pd-tab="Invoices"]').click();
  await liveMobile.locator('#invoice-list .invoice-card .actions').first().getByRole('button',{name:'Preview',exact:true}).click();
  const livePhoneLogo=await liveMobile.locator('.paper .doc-brand img').evaluate(async img=>{await img.decode();return {src:img.currentSrc,width:img.getBoundingClientRect().width,naturalWidth:img.naturalWidth}});
  assert.ok(livePhoneLogo.src.endsWith('/assets/pd-invoice-roof.webp')&&livePhoneLogo.width>=220&&livePhoneLogo.naturalWidth>=400,'LIVE iPhone invoice logo is missing or too small: '+JSON.stringify(livePhoneLogo));
  assert.equal(await liveMobile.locator('.paper .paper-table th').first().evaluate(el=>getComputedStyle(el).whiteSpace),'nowrap','Mobile document table headings should not break mid-word');
  assert.equal(await liveMobile.locator('body > header').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(7, 24, 43)','LIVE iPhone official logo contrast is missing');
  await liveMobile.screenshot({path:'qa-screenshots/live-render-iphone-invoice-preview.png',fullPage:true});
  await liveMobile.locator('#pdMoreToggle').click();
  const liveMenu=await liveMobile.locator('#pdMoreMenu').evaluate(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,h:innerHeight,w:innerWidth}});
  assert.ok(liveMenu.top>=0&&liveMenu.bottom<=liveMenu.h&&liveMenu.left>=0&&liveMenu.right<=liveMenu.w,'Published Render iPhone More menu is off-screen');
  await liveMobile.screenshot({path:'qa-screenshots/live-render-iphone-more-menu.png'});
  await livePhone.close();await published.close();
  log('LIVE Render preview desktop and iPhone checks passed');
  await browser.close();
  log('ALL TESTS PASSED');
 }catch(error){await browser.close();throw error}
}
run().catch(err=>{console.error('[P&D QA] FAILED',err);process.exit(1)});
