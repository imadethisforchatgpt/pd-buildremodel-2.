/* P&D 3.0 only — converted estimates disappear from active lists.
   Their original records remain in backups so document links and invoice history stay stable. */
(function () {
  'use strict';
  const lifecycle = window.PD3EstimateLifecycle;

  const previousConvert = convert;
  convert = function (index) {
    if (!lifecycle || !db?.estimates?.[index]) return;
    try {
      lifecycle.convert(db, index, save);
      go('Invoices');
    } catch (error) {
      alert(error?.message || 'The estimate could not be converted. No changes were saved.');
    }
  };

  function updateEstimateList() {
    if (tab !== 'Estimates') return;
    const list = document.getElementById('estimate-list');
    if (!list) return;
    const active = lifecycle.active(db);
    const activeIndexes = new Set(active.map(item => item.index));
    const cards = [...list.querySelectorAll('.invoice-card')];
    cards.forEach((card, index) => {
      // Do not remove/reindex cards; all existing Preview, PDF, and Edit actions
      // still address their original estimate indices.
      if (!activeIndexes.has(index)) {
        card.hidden = true;
        card.style.display = 'none';
      } else {
        card.hidden = false;
      }
    });

    const totals = active.reduce((amount, item) => amount + (Number(item.estimate.total) || 0), 0);
    const stats = document.querySelectorAll('.estimate-summary strong');
    if (stats[0]) stats[0].textContent = String(active.length);
    if (stats[1]) stats[1].textContent = money(totals);
    if (stats[2]) stats[2].textContent = money(active.length ? totals / active.length : 0);

    const section = list.closest('.panel')?.querySelector('.section-head');
    const heading = section?.querySelector('h2');
    if (heading) heading.textContent = 'Active estimates';
    const count = section?.querySelector('.count');
    if (count) count.textContent = active.length + (active.length === 1 ? ' estimate' : ' estimates');

    let empty = list.querySelector('.pd3-active-estimate-empty');
    if (!active.length) {
      if (!empty) {
        empty = document.createElement('div');
        empty.className = 'empty pd3-active-estimate-empty';
        empty.textContent = 'No active estimates. Estimates converted to invoices are in the Invoices tab.';
        list.appendChild(empty);
      }
    } else {
      empty?.remove();
    }
  }

  const previousRender = render;
  render = function () {
    previousRender();
    updateEstimateList();
  };

  const previousFilter = filterCards;
  filterCards = function (value, id) {
    previousFilter(value, id);
    if (id === 'estimate-list') updateEstimateList();
  };

  render();
})();
