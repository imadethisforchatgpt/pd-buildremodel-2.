/* P&D 3.0 standalone smoke checks. Never connects to the 2.0 deployment or records. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const APP = 'http://127.0.0.1:8767/';
const KEY = 'pd3_preview_records_v1';
const LEGACY = 'pd2_test_records_v2';
fs.mkdirSync('qa-screenshots/pd3', { recursive: true });
function log(message) { console.log('[PD3 QA] ' + message); }
async function open(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(APP, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(350);
  assert.deepEqual(errors, [], 'Uncaught JavaScript errors: ' + errors.join('; '));
  return errors;
}
async function data(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
}
async function run() {
  const browser = await chromium.launch({ headless: true });
  try {
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    const protected2 = '{"this":"is data belonging to another preview"}';
    await desktop.addInitScript(({ name, value }) => localStorage.setItem(name, value), { name: LEGACY, value: protected2 });
    const errors = await open(desktop);
    assert.equal(await desktop.locator('body').evaluate(el => el.classList.contains('pd3-app')), true);
    assert.match(await desktop.title(), /P&D 3.0/);
    assert.equal(await desktop.locator('nav#nav').evaluate(el => getComputedStyle(el).position), 'fixed');
    assert.equal(await desktop.locator('.pd3-stat').count(), 4);
    assert.equal(await desktop.locator('.pd3-desktop-links [data-pd3-page="Dashboard"]').count(), 1);
    assert.equal(await desktop.locator('.pd3-mobile-links').isVisible(), false);
    await desktop.screenshot({ path: 'qa-screenshots/pd3/desktop-dashboard.png', fullPage: true });
    log('Desktop premium dashboard renders');

    await desktop.locator('.pd3-desktop-links [data-pd3-page="Clients"]').click();
    assert.equal(await desktop.locator('#cname').isVisible(), true);
    await desktop.locator('.pd3-desktop-links [data-pd3-more]').click();
    assert.equal(await desktop.locator('#pd3MorePanel').isVisible(), true);
    await desktop.locator('#pd3MorePanel [data-pd3-page="Settings"]').click();
    assert.equal(await desktop.locator('#pd3MorePanel').isHidden(), true);
    assert.match(await desktop.locator('#main').innerText(), /Data protection|Export Test Data/);
    log('Desktop navigation and contextual menu work');
    assert.equal(await desktop.locator('#pd3SettingsPreparedBy').inputValue(), 'Papo Delvalle', 'Expected P&D 3.0 default preparer name');
    await desktop.locator('#pd3SettingsPreparedBy').fill('PD3 QA Owner');
    await desktop.locator('#pd3SaveIdentity').click();
    assert.equal((await data(desktop)).businessProfile.preparedBy, 'PD3 QA Owner', 'Sender identity not stored');
    log('Sender identity setting saves separately in 3.0');

    await desktop.locator('.pd3-desktop-links [data-pd3-page="Dashboard"]').click();
    await desktop.locator('[data-pd3-action="new-estimate"]').first().click();
    assert.equal(await desktop.locator('#pd3PreparedBy').inputValue(), 'PD3 QA Owner');
    assert.equal(await desktop.locator('#pdPlanType').inputValue(), 'deposit');
    assert.equal(await desktop.locator('#pdDepositValue').inputValue(), '50');
    assert.equal(await desktop.locator('#pdSimpleDeposit').inputValue(), '50');
    assert.equal(await desktop.locator('#pdInstallments .pd-installment').count(), 2, 'Expected 50/50 schedule');
    assert.equal(await desktop.locator('#pdInstallments .pd-pay-milestone').first().inputValue(), 'Upon start of work');
    assert.equal(await desktop.locator('#pdInstallments .pd-pay-milestone').nth(1).inputValue(), 'Upon completion of work');
    await desktop.locator('#eclient').fill('PD3 QA Customer');
    await desktop.locator('#edesc').fill('Custom cabinet fabrication');
    await desktop.locator('#lines .ldesc').first().fill('Build custom cabinet doors');
    await desktop.locator('#lines .lqty').first().fill('2');
    await desktop.locator('#lines .lprice').first().fill('375.50');
    assert.match(await desktop.locator('#etotal').innerText(), /751\.00/);
    await desktop.locator('#pdEditPayments').click();
    await desktop.locator('#pdInstallments .pd-pay-milestone').nth(1).fill('Upon final customer walkthrough');
    await desktop.getByRole('button', { name: 'Save Estimate', exact: true }).click();
    let records = await data(desktop);
    assert.equal(records.estimates.length, 1, 'Estimate did not save to PD3 namespace');
    assert.equal(records.estimates[0].total, 751);
    assert.equal(records.estimates[0].client, 'PD3 QA Customer');
    assert.equal(records.estimates[0].preparedBy, 'PD3 QA Owner', 'Preparer missing from saved estimate');
    assert.equal(records.estimates[0].paymentSchedule[0].amount, 375.5);
    assert.equal(records.estimates[0].paymentSchedule[1].amount, 375.5);
    assert.equal(records.estimates[0].paymentSchedule[0].milestone, 'Upon start of work');
    assert.equal(records.estimates[0].paymentSchedule[1].milestone, 'Upon final customer walkthrough');
    await desktop.getByRole('button', {name:'Preview', exact:true}).first().click();
    assert.match(await desktop.locator('#main').innerText(), /Prepared by:\s*PD3 QA Owner/);
    assert.match(await desktop.locator('#main').innerText(), /Upon final customer walkthrough/);
    await desktop.getByRole('button', {name:/Back/}).first().click();
    log('Estimate preview reflects editable payment milestones and sender identity');
    assert.equal(await desktop.evaluate(key => localStorage.getItem(key), LEGACY), protected2, '2.0 records changed');
    assert.equal(await desktop.evaluate(() => localStorage.getItem('pd2_estimate_draft_1')), null, '2.0 draft key was used');
    log('Estimate save, amounts, and separate PD3 namespace work');

    await desktop.getByRole('button', { name: 'Convert to Invoice' }).first().click();
    records = await data(desktop);
    assert.equal(records.invoices.length, 1, 'Estimate was not converted');
    assert.equal(records.invoices[0].total, 751);
    assert.equal(records.invoices[0].preparedBy, 'PD3 QA Owner');
    assert.equal(records.invoices[0].paymentSchedule[1].milestone, 'Upon final customer walkthrough');
    await desktop.getByRole('button', { name: 'Record Payment' }).first().click();
    await desktop.locator('#pdReceivedAmount').fill('200.00');
    await desktop.locator('#pdReceivedMethod').selectOption({ label: 'Cash' });
    await desktop.locator('#pdRecordPaymentForm button[type="submit"]').click();
    records = await data(desktop);
    assert.equal(records.invoices[0].paid, 200, 'Payment was not saved');
    assert.equal(records.invoices[0].payments.length, 1, 'Payment ledger not saved');
    await desktop.locator('[data-pd3-edit-invoice]').first().click();
    assert.equal(await desktop.locator('#pd3InvoicePreparedBy').inputValue(), 'PD3 QA Owner');
    await desktop.locator('#pd3InvoicePreparedBy').fill('PD3 QA Owner Revised');
    await desktop.locator('.pd3-edit-due').nth(1).fill('Upon client sign-off');
    await desktop.getByRole('button', {name:'Save invoice details',exact:true}).click();
    records = await data(desktop);
    assert.equal(records.invoices[0].preparedBy, 'PD3 QA Owner Revised');
    assert.equal(records.invoices[0].paymentSchedule[1].milestone, 'Upon client sign-off');
    assert.equal(records.invoices[0].paid, 200, 'Editing wording changed a recorded payment');
    await desktop.locator('[data-pd3-edit-invoice]').first().click();
    desktop.once('dialog', d => d.accept());
    await desktop.locator('#pd3Invoice5050').click();
    await desktop.getByRole('button', {name:'Save invoice details',exact:true}).click();
    records = await data(desktop);
    assert.equal(records.invoices[0].paymentSchedule[0].milestone, 'Upon start of work');
    assert.equal(records.invoices[0].paymentSchedule[1].milestone, 'Upon completion of work');
    assert.equal(records.invoices[0].paid, 200, 'Applying 50/50 template changed actual payments');
    await desktop.getByRole('button', {name:'Preview',exact:true}).first().click();
    assert.match(await desktop.locator('#main').innerText(), /Prepared by:\s*PD3 QA Owner Revised/);
    assert.match(await desktop.locator('#main').innerText(), /Upon completion of work/);
    log('Invoice editing, 50/50 reset, branded preview and payment isolation work');

    // PDF printing must be sized as US Letter, not an enlarged mobile web page.
    let popupReady = desktop.waitForEvent('popup');
    await desktop.getByRole('button', {name:'Print / Save PDF'}).first().click();
    let printPage = await popupReady;
    await printPage.locator('#pd3PrintFrame .paper').waitFor();
    await printPage.waitForFunction(() => Boolean(document.querySelector('link[href*="pd3-print.css"]')?.sheet));
    assert.match(await printPage.title(), /Invoice/);
    assert.equal(await printPage.locator('.pd3-print-actions #pd3PrintNow').isVisible(), true);
    const previewWidth = await printPage.locator('.paper').evaluate(el => Math.round(el.getBoundingClientRect().width));
    assert.equal(previewWidth, 816, 'Desktop document preview should show a physical Letter-sized page');
    assert.equal(await printPage.locator('.paper-head .doc-brand img').evaluate(el => Math.round(el.getBoundingClientRect().height)), 55,
      'Print logo should be document-sized rather than giant mobile branding');
    await printPage.screenshot({path:'qa-screenshots/pd3/letter-invoice-preview.png',fullPage:true});
    const singlePdfPath = 'qa-screenshots/pd3/letter-invoice.pdf';
    await printPage.pdf({path:singlePdfPath, preferCSSPageSize:true, printBackground:true});
    const details = execFileSync('pdfinfo',[singlePdfPath],{encoding:'utf8'});
    assert.match(details,/Page size:\s+612 x 792 pts/, 'PDF must be 8.5 x 11 inches');
    assert.equal(Number(details.match(/Pages:\s+(\d+)/)?.[1]), 1, 'Short invoice should use exactly one Letter page');
    const contents = execFileSync('pdftotext',['-layout',singlePdfPath,'-'],{encoding:'utf8'});
    assert.match(contents,/Prepared by:\s*PD3 QA Owner Revised/);
    assert.match(contents,/Upon completion of work/);
    await printPage.close();
    log('Single-page invoice prints on US Letter with correctly sized branding and complete payment terms');

    // A longer invoice must paginate cleanly instead of zooming to one page.
    await desktop.evaluate(() => {
      const original = db.invoices[0];
      const lines = Array.from({length:54}, (_,i) => ({
        description:'Custom carpentry installation line '+String(i+1).padStart(2,'0')+' — materials and finish details',
        quantity:1,price:35
      }));
      db.invoices.push({...original,client:'PD3 Multi-page QA',description:'Full kitchen cabinetry project',
        lines,total:lines.length*35,paid:0,payments:[],paymentSchedule:[],
        preparedBy:'PD3 QA Owner Revised',invoiceDate:'2026-10-13'});
      save();
      render();
    });
    await desktop.locator('.invoice-card').nth(1).getByRole('button',{name:'Preview',exact:true}).click();
    popupReady = desktop.waitForEvent('popup');
    await desktop.getByRole('button',{name:'Print / Save PDF'}).first().click();
    printPage = await popupReady;
    await printPage.waitForFunction(() => Boolean(document.querySelector('link[href*="pd3-print.css"]')?.sheet));
    const multipagePdfPath = 'qa-screenshots/pd3/letter-multi-page-invoice.pdf';
    await printPage.pdf({path:multipagePdfPath,preferCSSPageSize:true,printBackground:true});
    const multiDetails = execFileSync('pdfinfo',[multipagePdfPath],{encoding:'utf8'});
    const pageCount = Number(multiDetails.match(/Pages:\s+(\d+)/)?.[1]);
    assert.ok(pageCount >= 2, 'A 54-line invoice should continue onto multiple pages; got '+pageCount);
    assert.match(multiDetails,/Page size:\s+612 x 792 pts/);
    const multiText = execFileSync('pdftotext',['-layout',multipagePdfPath,'-'],{encoding:'utf8'});
    assert.match(multiText,/Custom carpentry installation line 01/,'First line missing');
    assert.match(multiText,/Custom carpentry installation line 54/,'Final line missing from continuation page');
    assert.match(multiText,/PD3 Multi-page QA/);
    await printPage.close();
    log('Long invoices automatically paginate across '+pageCount+' US Letter pages with all line items');
    await desktop.reload();
    assert.equal((await data(desktop)).invoices[0].paid, 200, 'Refresh lost payment records');
    assert.deepEqual(errors, [], 'Application errors during desktop workflow');
    log('Conversion, payment tracking, and persistence work');

    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true
    });
    const iphone = await mobileContext.newPage();
    await open(iphone);
    assert.equal(await iphone.locator('.pd3-mobile-links').isVisible(), true);
    assert.equal(await iphone.locator('.pd3-desktop-links').isVisible(), false);
    assert.equal(await iphone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), true, 'Horizontal overflow on iPhone');
    const position = await iphone.locator('#nav').evaluate(el => getComputedStyle(el).position);
    assert.equal(position, 'fixed', 'Mobile navigation not fixed');
    await iphone.screenshot({ path: 'qa-screenshots/pd3/iphone-dashboard.png', fullPage: true });
    await iphone.locator('.pd3-mobile-links [data-pd3-more]').click();
    assert.equal(await iphone.locator('#pd3MorePanel').isVisible(), true);
    const menu = await iphone.locator('#pd3MorePanel').evaluate(el => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: innerHeight, width: innerWidth };
    });
    assert.ok(menu.top >= 0 && menu.bottom <= menu.height && menu.left >= 0 && menu.right <= menu.width,
      'P&D 3.0 mobile More menu off-screen: ' + JSON.stringify(menu));
    await iphone.screenshot({ path: 'qa-screenshots/pd3/iphone-more-menu.png' });
    await iphone.locator('#pd3MorePanel [data-pd3-page="Projects"]').click();
    assert.equal(await iphone.locator('#pname').isVisible(), true);
    await iphone.locator('.pd3-mobile-links [data-pd3-page="Dashboard"]').click();
    assert.equal(await iphone.locator('.pd3-stat').count(), 4);
    log('iPhone dashboard, fixed navigation, menu geometry and routes work');

    await mobileContext.close();
    await desktop.close();
    log('ALL P&D 3.0 CHECKS PASSED');
  } finally { await browser.close(); }
}
run().catch(error => { console.error('[PD3 QA] FAILED', error); process.exitCode = 1; });
