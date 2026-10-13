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
  await desktop.screenshot({path:'qa-screenshots/after-desktop.png',fullPage:true});
  log('Desktop layout and financial data checks passed');
  const baselineMobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  const oldPhone=await baselineMobile.newPage();await seed(oldPhone);await noJSFailures(oldPhone,BEFORE);
  await oldPhone.screenshot({path:'qa-screenshots/before-iphone.png',fullPage:true});
  await baselineMobile.close();
  const iphone=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  const mobile=await iphone.newPage();await seed(mobile);await noJSFailures(mobile,ORIGIN);
  assert.equal(await mobile.locator('#nav').evaluate(el=>getComputedStyle(el).position),'fixed');
  assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth+2),true,'Horizontal page overflow on iPhone');
  await mobile.screenshot({path:'qa-screenshots/after-iphone.png',fullPage:true});
  await mobile.locator('#pdMoreToggle').click();
  assert.equal(await mobile.locator('#pdMoreMenu').isVisible(),true);
  assert.equal(await mobile.locator('#pdMoreMenu [data-pd-extra="Projects"]').count(),1);
  await mobile.screenshot({path:'qa-screenshots/after-iphone-more-menu.png',fullPage:false});
  log('Mobile navigation and overflow checks passed');
  await iphone.close();
  const flow=await browser.newPage({viewport:{width:1024,height:850}});
  const flowErrors=[];flow.on('pageerror',e=>flowErrors.push(e.message));
  flow.on('dialog',d=>d.accept());
  await flow.goto(ORIGIN,{waitUntil:'load'});
  await flow.locator('.pd-hero-actions [data-pd-action="invoice"]').click();
  await flow.locator('#pdInvoiceEditor').waitFor();
  await flow.locator('#eclient').fill('QA New Invoice Client');
  await flow.locator('#edesc').fill('Custom cabinet fabrication');
  await flow.locator('#lines .ldesc').first().fill('Build cabinet doors');
  await flow.locator('#lines .lqty').first().fill('2');
  await flow.locator('#lines .lprice').first().fill('375.50');
  await flow.locator('#pdInvoicePlan').selectOption('three');
  await flow.locator('#pdInvoiceEditor button[type="submit"]').click();
  let data=await storage(flow);
  assert.equal(data.invoices.length,1,'Invoice not stored');
  assert.equal(data.invoices[0].total,751,'Incorrect invoice calculation');
  assert.equal(data.invoices[0].paid,0);
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
  await flow.locator('#pdInvoiceEditor button[type="submit"]').click();
  data=await storage(flow);
  assert.equal(data.invoices[0].total,800,'Invoice price changes did not save');
  assert.equal(data.invoices[0].paid,100,'Invoice edit changed actual payments');
  assert.equal(data.invoices[0].payments.length,1,'Invoice edit discarded payment history');
  log('Payment ledger, invoice editing and history preservation passed');
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
  await browser.close();
  log('ALL TESTS PASSED');
 }catch(error){await browser.close();throw error}
}
run().catch(err=>{console.error('[P&D QA] FAILED',err);process.exit(1)});
