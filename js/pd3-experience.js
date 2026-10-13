/* P&D 3.0 — independent premium workspace shell. No 2.0 branch or data dependencies. */
(function () {
  'use strict';

  const allPages = ['Dashboard', 'Estimates', 'Invoices', 'Clients', 'Projects', 'Material Planner', 'Price Templates', 'Customer Care', 'Settings'];
  const primaryPages = ['Dashboard', 'Estimates', 'Invoices', 'Clients', 'Projects', 'Material Planner'];
  const mobilePages = ['Dashboard', 'Estimates', 'Invoices', 'Clients'];
  const extraPages = ['Projects', 'Material Planner', 'Price Templates', 'Customer Care', 'Settings'];
  const labels = {
    Dashboard: 'Home', Estimates: 'Estimates', Invoices: 'Invoices', Clients: 'Clients',
    Projects: 'Projects', 'Material Planner': 'Materials', 'Price Templates': 'Price templates',
    'Customer Care': 'Customer care', Settings: 'Settings'
  };
  const paths = {
    Dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    Estimates: '<path d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    Invoices: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    Clients: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 6a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5"/>',
    Projects: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18M10 13v2h4v-2"/>',
    'Material Planner': '<path d="M4 20 20 4M5 4h5v5H5zM14 15h5v5h-5zM3 16l5 5M16 3l5 5"/>',
    'Price Templates': '<path d="M12 3v18M16.5 7.5a4 4 0 0 0-4-2h-2a3 3 0 0 0 0 6h3a3 3 0 0 1 0 6h-2a5 5 0 0 1-4-2"/>',
    'Customer Care': '<path d="M4 5h16v12H8l-4 4V5Z"/><path d="M8 10h8M8 13h5"/>',
    Settings: '<circle cx="12" cy="12" r="3"/><path d="M10 2h4l1 3 3 1 3-1 2 4-2 2v2l2 2-2 4-3-1-3 1-1 3h-4l-1-3-3-1-3 1-2-4 2-2v-2L1 9l2-4 3 1 3-1 1-3Z"/>',
    More: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    Arrow: '<path d="M5 12h14m-7-7 7 7-7 7"/>',
    Plus: '<path d="M12 5v14M5 12h14"/>',
    Check: '<path d="m5 12 4 4L19 6"/>'
  };
  function glyph(name) {
    return '<svg class="pd3-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.Dashboard) + '</svg>';
  }
  function item(page, mobile) {
    return '<button type="button" class="pd3-nav-item' + (tab === page ? ' active' : '') +
      (mobile ? ' pd3-mobile-item' : ' pd3-desktop-item') +
      '" data-pd3-page="' + esc(page) + '"' + (tab === page ? ' aria-current="page"' : '') + '>' +
      glyph(page) + '<span>' + esc(labels[page]) + '</span></button>';
  }
  function moreButton(mobile) {
    const selected = mobile ? extraPages.includes(tab) : ['Price Templates', 'Customer Care', 'Settings'].includes(tab);
    return '<button type="button" class="pd3-nav-item pd3-more-trigger ' + (mobile ? 'pd3-mobile-item' : 'pd3-desktop-item') + (selected ? ' active' : '') +
      '" data-pd3-more="true" aria-expanded="false" aria-controls="pd3MorePanel">' +
      glyph('More') + '<span>More</span></button>';
  }
  function drawNavigation() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    nav.className = 'pd3-nav';
    nav.setAttribute('aria-label', 'P&D 3.0 workspace');
    nav.innerHTML =
      '<div class="pd3-sidebar-brand"><span class="pd3-brand-symbol" aria-hidden="true">P<span>&</span>D</span>' +
      '<span class="pd3-brand-text"><strong>P&D Studio</strong><small>BUILD & REMODEL · 3.0</small></span></div>' +
      '<div class="pd3-nav-label">WORKSPACE</div>' +
      '<div class="pd3-desktop-links">' + primaryPages.map(function (p) { return item(p, false); }).join('') +
      '<div class="pd3-nav-label pd3-tools-label">MORE TOOLS</div>' + moreButton(false) + '</div>' +
      '<div class="pd3-sidebar-foot"><span class="pd3-status-dot"></span><div><strong>3.0 Development Preview</strong>' +
      '<small>Test records stay in this browser</small></div></div>' +
      '<div class="pd3-mobile-links">' + mobilePages.map(function (p) { return item(p, true); }).join('') +
      moreButton(true) + '</div>' +
      '<div class="pd3-more-panel" id="pd3MorePanel" hidden role="region" aria-label="More workspace sections">' +
      '<div class="pd3-more-heading">Explore workspace <button type="button" data-pd3-close aria-label="Close more menu">×</button></div>' +
      extraPages.map(function (p) { return '<button class="pd3-extra-link' + (tab === p ? ' active' : '') + '" type="button" data-pd3-page="' +
      esc(p) + '">' + glyph(p) + '<span>' + esc(labels[p]) + '</span>' + glyph('Arrow') + '</button>'; }).join('') + '</div>';
  }
  function closeMore() {
    const panel = document.getElementById('pd3MorePanel');
    if (panel) panel.hidden = true;
    document.querySelectorAll('[data-pd3-more]').forEach(function (button) { button.setAttribute('aria-expanded', 'false'); });
  }
  function toggleMore() {
    const panel = document.getElementById('pd3MorePanel');
    if (!panel) return;
    const open = panel.hidden;
    panel.hidden = !open;
    document.querySelectorAll('[data-pd3-more]').forEach(function (button) { button.setAttribute('aria-expanded', String(open)); });
    if (open) panel.querySelector('[data-pd3-page]')?.focus();
  }

  function recentActivity() {
    const records = [];
    (db.estimates || []).forEach(function (x, i) {
      records.push({type: 'Estimate', person: x.client, description: x.description, amount: x.total, date: x.date || '', index: i});
    });
    (db.invoices || []).forEach(function (x, i) {
      records.push({type: 'Invoice', person: x.client, description: x.description, amount: x.total, date: x.invoiceDate || x.date || '', index: i});
    });
    records.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    if (!records.length) return '<div class="pd3-empty">' + glyph('Estimates') +
      '<strong>Your next project starts here</strong><p>Write your first estimate to start building your project history.</p>' +
      '<button class="pd3-text-button" data-pd3-action="new-estimate">Create an estimate ' + glyph('Arrow') + '</button></div>';
    return records.slice(0, 5).map(function (x) {
      return '<button type="button" class="pd3-activity" data-pd3-action="preview" data-pd3-kind="' + x.type.toLowerCase() +
        '" data-pd3-index="' + x.index + '">' +
        '<span class="pd3-activity-icon">' + glyph(x.type === 'Estimate' ? 'Estimates' : 'Invoices') + '</span>' +
        '<span class="pd3-activity-details"><strong>' + esc(x.person || 'Customer') + '</strong>' +
        '<small>' + x.type + ' · ' + esc(x.description || 'Project document') + '</small></span>' +
        '<span class="pd3-activity-amount">' + money(x.amount) + '</span>' + glyph('Arrow') + '</button>';
    }).join('');
  }
  function stat(label, value, foot, iconName, variant) {
    return '<article class="pd3-stat pd3-stat-' + variant + '"><div class="pd3-stat-top"><span>' + label + '</span>' +
      '<span class="pd3-stat-icon">' + glyph(iconName) + '</span></div><strong>' + value +
      '</strong><small>' + foot + '</small></article>';
  }
  function drawDashboard() {
    const root = document.getElementById('main');
    const estimates = db.estimates || [], invoices = db.invoices || [], clients = db.clients || [];
    const quoteAmount = estimates.reduce(function (s, x) { return s + (Number(x.total) || 0); }, 0);
    const billed = invoices.reduce(function (s, x) { return s + (Number(x.total) || 0); }, 0);
    const paid = invoices.reduce(function (s, x) { return s + Math.max(0, Number(x.paid) || 0); }, 0);
    const due = invoices.reduce(function (s, x) { return s + Math.max(0, (Number(x.total) || 0) - (Number(x.paid) || 0)); }, 0);
    const progress = billed > 0 ? Math.min(100, Math.max(0, Math.round((paid / billed) * 100))) : 0;
    root.innerHTML =
      '<section class="pd3-heading"><div><span class="pd3-kicker">YOUR BUSINESS, BEAUTIFULLY ORGANIZED</span>' +
      '<h1>Good to have you here.</h1><p>Every project. Every client. One place to keep moving forward.</p></div>' +
      '<span class="pd3-preview-mark"><span class="pd3-status-dot"></span> PRIVATE PREVIEW · 3.0</span></section>' +
      '<section class="pd3-hero"><div><div class="pd3-hero-kicker">P&D BUILD&REMODEL / WORKSPACE</div>' +
      '<h2>Build with precision.<br><em>Run business with ease.</em></h2>' +
      '<p>Make your next estimate, follow up on invoices, and keep every job on track.</p>' +
      '<div class="pd3-hero-actions"><button class="pd3-action-primary" data-pd3-action="new-estimate">' + glyph('Plus') + ' New estimate</button>' +
      '<button class="pd3-action-outline" data-pd3-action="invoices">View invoices ' + glyph('Arrow') + '</button></div></div>' +
      '<div class="pd3-hero-art" aria-hidden="true"><span class="pd3-art-top">P&D</span><span class="pd3-art-line"></span>' +
      '<span class="pd3-art-bottom">PRECISION<br>AND DESIGN</span></div></section>' +
      '<section class="pd3-stats" aria-label="Business summary">' +
      stat('Open balance', money(due), 'Across unpaid invoices', 'Invoices', 'balance') +
      stat('Total estimates', String(estimates.length), money(quoteAmount) + ' quoted', 'Estimates', 'estimates') +
      stat('Invoice payments', money(paid), money(billed) + ' invoiced', 'Invoices', 'payments') +
      stat('Saved clients', String(clients.length), 'People you work with', 'Clients', 'clients') +
      '</section>' +
      '<div class="pd3-lower-grid"><section class="pd3-surface pd3-recent"><div class="pd3-surface-head">' +
      '<div><span class="pd3-kicker">STAY IN THE LOOP</span><h2>Recent activity</h2></div>' +
      '<button class="pd3-text-button" data-pd3-action="estimates">All estimates ' + glyph('Arrow') + '</button></div>' +
      recentActivity() + '</section><section class="pd3-surface pd3-finances"><div class="pd3-surface-head">' +
      '<div><span class="pd3-kicker">THE BIG PICTURE</span><h2>Financial snapshot</h2></div></div>' +
      '<div class="pd3-finance-big"><span>Payments collected</span><strong>' + money(paid) + '</strong></div>' +
      '<div class="pd3-meter" role="progressbar" aria-label="Payments collected as percentage of invoices" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
      progress + '"><div style="width:' + progress + '%"></div></div><p class="pd3-finance-note">' + progress + '% of invoiced amount collected</p>' +
      '<div class="pd3-finance-line"><span>Total invoiced</span><strong>' + money(billed) + '</strong></div>' +
      '<div class="pd3-finance-line"><span>Outstanding</span><strong>' + money(due) + '</strong></div>' +
      '<div class="pd3-finance-line"><span>Projects</span><strong>' + String((db.projects || []).length) + '</strong></div>' +
      '<button class="pd3-finance-button" data-pd3-action="invoices">Manage invoices ' + glyph('Arrow') + '</button>' +
      '</section></div><p class="pd3-data-note">P&D 3.0 development version · Browser-only test records · Not connected to your original app.</p>';
  }
  const previousRender = render;
  render = function () {
    previousRender();
    drawNavigation();
    const main = document.getElementById('main');
    if (!main) return;
    main.classList.toggle('pd3-dashboard', tab === 'Dashboard');
    if (tab === 'Dashboard') drawDashboard();
    else {
      main.insertAdjacentHTML('afterbegin', '<div class="pd3-page-top"><span class="pd3-kicker">P&D STUDIO / ' +
        esc(tab).toUpperCase() + '</span><span class="pd3-page-version">3.0 PRIVATE PREVIEW</span></div>');
    }
  };

  const header = document.querySelector('body > header');
  if (header) {
    header.innerHTML = '<div class="pd3-mobile-brand"><span class="pd3-mobile-monogram">P&D</span>' +
      '<span><strong>P&D Studio</strong><small>ESTIMATES & INVOICES</small></span></div>' +
      '<span class="pd3-mobile-version">3.0</span>';
  }
  document.body.classList.add('pd3-app');
  document.getElementById('nav')?.addEventListener('click', function (event) {
    const close = event.target.closest('[data-pd3-close]');
    if (close) { closeMore(); return; }
    const more = event.target.closest('[data-pd3-more]');
    if (more) { toggleMore(); return; }
    const button = event.target.closest('[data-pd3-page]');
    if (!button) return;
    const page = button.dataset.pd3Page;
    if (allPages.indexOf(page) < 0) return;
    closeMore();
    go(page);
    window.scrollTo(0, 0);
  });
  document.addEventListener('pointerdown', function (event) {
    const panel = document.getElementById('pd3MorePanel');
    if (!panel || panel.hidden || event.target.closest('#pd3MorePanel') || event.target.closest('[data-pd3-more]')) return;
    closeMore();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeMore();
  });
  document.getElementById('main')?.addEventListener('click', function (event) {
    const button = event.target.closest('[data-pd3-action]');
    if (!button) return;
    const action = button.dataset.pd3Action;
    if (action === 'new-estimate') { go('Estimates'); estimateForm(); window.scrollTo(0, 0); }
    else if (action === 'invoices') { go('Invoices'); window.scrollTo(0, 0); }
    else if (action === 'estimates') { go('Estimates'); window.scrollTo(0, 0); }
    else if (action === 'preview') {
      const kind = button.dataset.pd3Kind, index = Number(button.dataset.pd3Index);
      const list = kind === 'invoice' ? db.invoices : db.estimates;
      if (!Number.isInteger(index) || index < 0 || index >= list.length) return;
      previewDoc(kind, index);
    }
  });
  render();
})();
