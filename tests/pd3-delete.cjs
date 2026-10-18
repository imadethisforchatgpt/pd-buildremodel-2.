const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.PD3_CHROMIUM_EXECUTABLE});
 try {
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.goto('http://127.0.0.1:8767');
 await page.evaluate(()=>{db={clients:[],projects:[],templates:[],feedback:[],estimates:[{client:'First',total:100},{client:'Second',total:200}],invoices:[{client:'Paid invoice',total:200,paid:50,payments:[{amount:50}],sourceEstimate:1}]};save();go('Estimates')});
 page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Delete estimate',exact:true}).first().click();
 assert.equal(await page.evaluate(()=>!!db.estimates[0].deletedAt),false);
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Delete estimate',exact:true}).first().click();
 assert.equal(await page.evaluate(()=>db.estimates.length),2);
 assert.equal(await page.evaluate(()=>db.invoices[0].sourceEstimate),1);
 assert.equal(await page.locator('#estimate-list .invoice-card').first().isVisible(),false);
 await page.reload();await page.evaluate(()=>go('Estimates'));
 assert.equal(await page.locator('#estimate-list .invoice-card').first().isVisible(),false);
 await page.locator('#pd3DeletedDocuments summary').click();await page.getByRole('button',{name:'Restore',exact:true}).click();
 assert.equal(await page.locator('#estimate-list .invoice-card').first().isVisible(),true);
 await page.evaluate(()=>go('Invoices'));page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Delete invoice',exact:true}).click();
 assert.equal(await page.locator('.estimate-summary strong').first().innerText(),'0');
 await page.evaluate(()=>filterCards('Paid','invoice-list'));
 assert.equal(await page.locator('#invoice-list .invoice-card').first().isVisible(),false);
 await page.locator('#pd3DeletedDocuments summary').click();await page.getByRole('button',{name:'Restore',exact:true}).click();
 assert.equal(await page.evaluate(()=>db.invoices[0].paid),50);
 assert.equal(await page.evaluate(()=>db.invoices[0].payments.length),1);
 await page.evaluate(()=>{window.testOriginalSave=save;save=()=>{throw Error('quota')}});
 let n=0;page.on('dialog',d=>{n++;return d.accept()});await page.getByRole('button',{name:'Delete invoice',exact:true}).click();
 assert.equal(await page.evaluate(()=>!!db.invoices[0].deletedAt),false);
 console.log('PASS: cancel, delete, reload, restore, stable links, paid history, search hiding, save failure rollback at mobile width');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
