/* P&D 3.0 document controls: branded sender identity and editable payment wording.
   This file loads last, affects only the PD3 branch, and does not change payment ledgers. */
(function () {
  'use strict';

  const APP_NAME = 'P&D Build&Remodel';
  const DEFAULT_PREPARER = 'Papo Delvalle';
  function profileName() {
    // A previously saved owner preference always takes precedence over the default.
    const saved = typeof db.businessProfile?.preparedBy === 'string'
      ? db.businessProfile.preparedBy.trim() : '';
    return saved || DEFAULT_PREPARER;
  }
  function displayName(record) {
    return (typeof record?.preparedBy === 'string' && record.preparedBy.trim()) || profileName();
  }
  function fiftyFifty(total) {
    const cents = Math.max(0, Math.round((Number(total) || 0) * 100));
    const first = Math.round(cents / 2), last = cents - first;
    return [
      {label:'Deposit (50%)',amount:first / 100,amountType:'amount',
       dueWhen:'milestone',milestone:'Upon start of work',depositRequest:true},
      {label:'Remaining balance (50%)',amount:last / 100,amountType:'amount',
       dueWhen:'milestone',milestone:'Upon completion of work',depositRequest:false}
    ];
  }

  function restoredDraftName() {
    try {
      const raw = localStorage.getItem('pd3_preview_estimate_draft_v1');
      const draft = raw && JSON.parse(raw);
      return typeof draft?.estimate?.preparedBy === 'string' ? draft.estimate.preparedBy : null;
    } catch (_) {return null;}
  }
  const formerForm = estimateForm;
  estimateForm = function () {
    formerForm();
    const customer = document.querySelector('#eclient');
    if (!customer || document.getElementById('pd3PreparedBy')) return;
    const field = document.createElement('div');
    field.className = 'pd3-sender-field';
    const savedDraft = restoredDraftName();
    field.innerHTML =
      '<label for="pd3PreparedBy">Prepared by (your name on the estimate and invoice)</label>' +
      '<input id="pd3PreparedBy" type="text" autocomplete="name" maxlength="120" placeholder="Your name" value="' +
      esc(savedDraft === null ? profileName() : savedDraft) + '">' +
      '<p class="muted">The document will display ' + esc(APP_NAME) + ' and your name. ' +
      'Set your usual name in Settings; change it for an individual job here.</p>';
    const description = document.getElementById('edesc');
    if (description) description.insertAdjacentElement('afterend', field);
    else customer.insertAdjacentElement('afterend',field);
  };
  const formerDraftData = draftData;
  draftData = function () {
    const record = formerDraftData();
    const nameInput = document.getElementById('pd3PreparedBy');
    if (nameInput) record.preparedBy = nameInput.value.trim();
    return record;
  };
  const formerEditEstimate = editEstimate;
  editEstimate = function (index) {
    formerEditEstimate(index);
    const input = document.getElementById('pd3PreparedBy');
    const record = db.estimates[index];
    if (input && record) input.value = displayName(record);
  };

  const formerDocumentHTML = documentHTML;
  documentHTML = function (type, record, index) {
    let html = formerDocumentHTML(type, record, index);
    if (Array.isArray(record?.paymentSchedule) && record.paymentSchedule.length) {
      // Avoid displaying conflicting legacy and modern payment-terms sections.
      html = html.replace(/<div class="paper-foot"><strong>Payment terms<\/strong>[\s\S]*?<\/div>/, '');
    }
    const name = displayName(record);
    if (!name) return html;
    const byline = '<p style="font-size:12px;color:#526c83;margin:6px 0 7px;line-height:1.45">' +
      '<strong style="color:#1c4665">Prepared by:</strong> ' + esc(name) + '</p>';
    return html.replace('<strong>' + APP_NAME + '</strong><p>(254) 535-7623</p>',
      '<strong>' + APP_NAME + '</strong>' + byline + '<p>(254) 535-7623</p>');
  };

  const formerRender = render;
  render = function () {
    formerRender();
    const main = document.getElementById('main');
    if (!main) return;
    if (tab === 'Settings' && !document.getElementById('pd3BusinessIdentity')) {
      const section = document.createElement('section');
      section.id = 'pd3BusinessIdentity';
      section.className = 'panel pd3-identity-settings';
      section.innerHTML =
        '<h2>Document branding</h2>' +
        '<p class="muted">Your invoices and estimates show ' + esc(APP_NAME) + ' as the business. ' +
        'Add your name beneath it as the person preparing the document.</p>' +
        '<label for="pd3SettingsPreparedBy">Your name on invoices and estimates</label>' +
        '<input id="pd3SettingsPreparedBy" type="text" maxlength="120" autocomplete="name" ' +
        'placeholder="Full name as it should appear" value="' + esc(profileName()) + '">' +
        '<div class="actions"><button class="btn primary" type="button" id="pd3SaveIdentity">Save document name</button></div>' +
        '<p class="muted" id="pd3IdentityStatus" role="status"></p>' +
        '<p class="muted">This is saved in 3.0 browser test data and included in the JSON backup. ' +
        'It does not change existing invoice amounts or payments.</p>';
      main.insertAdjacentElement('afterbegin', section);
    }
    if (tab === 'Invoices') {
      main.querySelectorAll('#invoice-list .invoice-card').forEach(function (card, index) {
        const actions = card.querySelector('.actions');
        if (!actions || actions.querySelector('[data-pd3-edit-invoice]')) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn small-action';
        button.textContent = 'Edit payment terms / prepared by';
        button.dataset.pd3EditInvoice = String(index);
        actions.appendChild(button);
      });
    }
  };

  const formerPreview = previewDoc;
  previewDoc = function (type, index) {
    formerPreview(type, index);
    if (type !== 'invoice') return;
    const toolbar = document.querySelector('#main .doc-actions');
    if (toolbar && !toolbar.querySelector('[data-pd3-edit-invoice]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn';
      button.textContent = 'Edit payment terms / prepared by';
      button.dataset.pd3EditInvoice = String(index);
      toolbar.appendChild(button);
    }
  };

  function editInvoice(index) {
    const record = db.invoices[index];
    if (!record) return;
    document.getElementById('pd3InvoiceEditor')?.remove();
    const modal = document.createElement('div');
    modal.id = 'pd3InvoiceEditor';
    modal.className = 'pd3-editor-overlay';
    const existing = Array.isArray(record.paymentSchedule) && record.paymentSchedule.length ?
      record.paymentSchedule : fiftyFifty(record.total);
    let draftRows = existing.map(function (x) {return {...x};});
    const rowHTML = function (row, i) {
      const condition = row.dueWhen === 'date' ? (row.dueDate || '') :
        row.dueWhen === 'interval' ? (row.dueDate || row.milestone || '') :
        (row.milestone || row.dueDate || '');
      return '<div class="pd3-term-edit-row" data-pd3-term="' + i + '">' +
        '<div class="pd3-term-top"><strong>Payment ' + (i + 1) + '</strong><span>' +
        money(row.amount || 0) + ' scheduled</span></div>' +
        '<label>Payment description<input type="text" maxlength="150" class="pd3-edit-label" value="' +
        esc(row.label || 'Payment ' + (i + 1)) + '" required></label>' +
        '<label>Due condition / wording<input type="text" maxlength="240" class="pd3-edit-due" value="' +
        esc(condition) + '" placeholder="Example: Upon completion of work" required></label></div>';
    };
    modal.innerHTML =
      '<div class="pd3-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="pd3InvoiceEditTitle">' +
      '<div class="pd3-editor-top"><div><span class="pd3-kicker">INVOICE DETAILS</span>' +
      '<h2 id="pd3InvoiceEditTitle">Edit invoice wording</h2>' +
      '<p class="muted">' + esc(record.client || 'Customer') + ' · Invoice ' +
      String(index + 1).padStart(4,'0') + '</p></div>' +
      '<button type="button" class="pd3-close-editor" aria-label="Close editor">×</button></div>' +
      '<form id="pd3InvoiceEditForm">' +
      '<label>Prepared by<input type="text" id="pd3InvoicePreparedBy" maxlength="120" placeholder="Your name" value="' +
      esc(displayName(record)) + '"></label>' +
      '<div class="pd3-terms-head"><strong>Payment conditions</strong>' +
      '<button type="button" id="pd3Invoice5050" class="btn">Use 50% / 50% template</button></div>' +
      '<div id="pd3InvoiceTerms">' + draftRows.map(rowHTML).join('') + '</div>' +
      '<p class="muted">Change the descriptions and due wording here. ' +
      'The 50/50 template updates scheduled requests but never changes received payments.</p>' +
      '<div class="pd3-editor-actions"><button type="button" class="btn pd3-cancel-editor">Cancel</button>' +
      '<button type="submit" class="btn primary">Save invoice details</button></div></form></div>';
    document.body.appendChild(modal);
    const close = function () {modal.remove();document.removeEventListener('keydown', escapeClose);};
    const escapeClose = function (event) {if (event.key === 'Escape') close();};
    document.addEventListener('keydown', escapeClose);
    modal.querySelector('.pd3-close-editor').addEventListener('click', close);
    modal.querySelector('.pd3-cancel-editor').addEventListener('click', close);
    modal.addEventListener('click', function (event) {if (event.target === modal) close();});
    modal.querySelector('#pd3Invoice5050').addEventListener('click', function () {
      // Confirm before overwriting a saved invoice's proposed payment schedule.
      if (Array.isArray(record.paymentSchedule) && record.paymentSchedule.length &&
        !confirm('Replace this invoice\'s scheduled payment requests with 50% at start and 50% at completion? Money already received will stay unchanged.')) return;
      draftRows = fiftyFifty(record.total);
      modal.querySelector('#pd3InvoiceTerms').innerHTML = draftRows.map(rowHTML).join('');
    });
    modal.querySelector('form').addEventListener('submit', function (event) {
      event.preventDefault();
      const rows = [...modal.querySelectorAll('[data-pd3-term]')];
      if (rows.some(function (row) {
        return !row.querySelector('.pd3-edit-label').value.trim() ||
          !row.querySelector('.pd3-edit-due').value.trim();
      })) {
        alert('Please enter both a description and due condition for every payment.');
        return;
      }
      const nextSchedule = draftRows.map(function (row, i) {
        const label = rows[i].querySelector('.pd3-edit-label').value.trim();
        const condition = rows[i].querySelector('.pd3-edit-due').value.trim();
        const isDate = /^\d{4}-\d{2}-\d{2}$/.test(condition) &&
          !Number.isNaN(Date.parse(condition + 'T12:00:00'));
        return {...row, label, dueWhen:isDate?'date':'milestone',
          dueDate:isDate?condition:'',milestone:isDate?'':condition};
      });
      const original = {...record};
      record.preparedBy = modal.querySelector('#pd3InvoicePreparedBy').value.trim();
      record.paymentSchedule = nextSchedule;
      record.paymentPlanType = nextSchedule.length === 2 ? 'custom' : (record.paymentPlanType || 'custom');
      record.deposit = nextSchedule.find(x => x.depositRequest)?.amount || 0;
      try {save();}
      catch (error) {Object.assign(record, original);alert('Changes could not be saved. Check browser storage.');return;}
      close();
      render();
    });
    modal.querySelector('#pd3InvoicePreparedBy')?.focus();
  }

  const main = document.getElementById('main');
  main?.addEventListener('click', function (event) {
    if (event.target.id === 'pd3SaveIdentity') {
      const value = main.querySelector('#pd3SettingsPreparedBy')?.value.trim() || '';
      db.businessProfile = {...(db.businessProfile || {}),preparedBy:value};
      try {save();main.querySelector('#pd3IdentityStatus').textContent = 'Saved. New documents will use this name by default.';}
      catch (_) {main.querySelector('#pd3IdentityStatus').textContent = 'Could not save. Check browser storage.';}
    }
    const edit = event.target.closest('[data-pd3-edit-invoice]');
    if (edit) editInvoice(Number(edit.dataset.pd3EditInvoice));
  });
  render();
})();
