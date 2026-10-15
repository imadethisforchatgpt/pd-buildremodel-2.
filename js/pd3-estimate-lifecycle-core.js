/* P&D 3.0: moving an estimate into an invoice without shifting document indices.
   Keep the source estimate as a hidden audit record so old invoice links and backups remain valid. */
(function (root) {
  'use strict';

  function isConverted(workspace, index) {
    const estimate = workspace?.estimates?.[index];
    if (!estimate) return false;
    if (estimate.convertedAt || estimate.convertedToInvoiceIndex !== undefined) return true;
    // Invoices created before this update already reference the source estimate by array index.
    return Array.isArray(workspace.invoices) && workspace.invoices.some(
      invoice => invoice && Number.isInteger(invoice.sourceEstimate) &&
        invoice.sourceEstimate === index
    );
  }

  function active(workspace) {
    return (workspace?.estimates || []).flatMap((estimate, index) =>
      !isConverted(workspace, index) ? [{estimate, index}] : []);
  }

  function convert(workspace, index, persist, timestamp) {
    if (!Number.isInteger(index) || index < 0 || !workspace?.estimates?.[index] ||
        !Array.isArray(workspace.invoices)) {
      throw Error('The selected estimate could not be found.');
    }
    if (isConverted(workspace, index)) {
      throw Error('This estimate is already an invoice. Find it in Invoices.');
    }
    const source = workspace.estimates[index];
    const invoiceIndex = workspace.invoices.length;
    const time = timestamp || new Date().toISOString();
    const invoice = {
      ...source,
      sourceEstimate: index,
      paid: 0,
      payments: [],
      invoiceDate: time.slice(0, 10)
    };
    const archived = {
      ...source,
      convertedAt: time,
      convertedToInvoiceIndex: invoiceIndex
    };
    workspace.invoices.push(invoice);
    workspace.estimates[index] = archived;
    try {
      persist();
    } catch (error) {
      // Cloud/device storage failure must not leave a half-converted document in memory.
      workspace.invoices.pop();
      workspace.estimates[index] = source;
      throw error;
    }
    return invoiceIndex;
  }

  const api = {isConverted, active, convert};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PD3EstimateLifecycle = api;
})(typeof window === 'undefined' ? globalThis : window);
