/**
 * Paste into: Black Rabbit PNW • Client Database
 *   Extensions → Apps Script → new project → paste this file → Deploy → New deployment
 *     Type: Web app
 *     Execute as: Me
 *     Who has access: Anyone  (the site only POSTs JSON; no PII form)
 * Copy the web app URL → Vercel env GOOGLE_SHEETS_WEBHOOK → Redeploy
 *
 * Creates / updates tab "Web Leads".
 * Pipeline replace writes tab "Commercial Pipeline".
 */
function doPost(e) {
  const data = JSON.parse(e.postData.contents || '{}');
  const ss = SpreadsheetApp.getActive();
  const action = String(data.action || 'upsertLead');

  if (action === 'replacePipeline') {
    const tabName = data.tab || 'Commercial Pipeline';
    let sh = ss.getSheetByName(tabName) || ss.getSheetByName('Commercial Pipline');
    if (!sh) sh = ss.insertSheet(tabName);
    const header = [
      'ID', 'Property / Company Name', 'Address', 'City', 'Type',
      'Est. Size / Complexity', 'Property Manager / Owner', 'Decision Maker',
      'Contact Method', 'Contact Details', 'Recent Signal / Why Target',
      'Suggested Angle', 'Priority', 'Status', 'Last Touch Date', 'Notes', 'Source of Data'
    ];
    const rows = (data.rows || []).map(function (r) {
      return [
        r.id, r.name, r.address, r.city, r.type, r.size, r.manager,
        r.decisionMaker, r.contactMethod, r.contact, r.signal, r.angle,
        r.priority, r.status, r.lastTouch || '', r.notes || '', r.source || ''
      ];
    });
    sh.clearContents();
    sh.getRange(1, 1, 1 + rows.length, header.length).setValues([header].concat(rows));
    return ContentService.createTextOutput(JSON.stringify({ ok: true, rows: rows.length }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const tab = data.tab || 'Web Leads';
  let sh = ss.getSheetByName(tab);
  if (!sh) {
    sh = ss.insertSheet(tab);
    sh.appendRow([
      'Timestamp', 'Source', 'Name', 'Phone', 'Address', 'Service', 'Notes',
      'Status', 'Track token', 'Deposit paid?', 'Assigned', 'Next action', 'Lead ID'
    ]);
  }
  const values = [
    data.timestamp || new Date().toISOString(),
    data.source || '',
    data.name || '',
    data.phone || '',
    data.address || '',
    data.service || '',
    data.notes || '',
    data.status || '',
    data.trackToken || '',
    data.depositPaid || '',
    data.assigned || '',
    data.nextAction || '',
    data.leadId || ''
  ];
  const last = sh.getLastRow();
  const ids = last > 1 ? sh.getRange(2, 13, last - 1, 1).getValues() : [];
  let found = 0;
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(data.leadId || '')) {
      found = i + 2;
      break;
    }
  }
  if (found) sh.getRange(found, 1, 1, values.length).setValues([values]);
  else sh.appendRow(values);

  return ContentService.createTextOutput(JSON.stringify({ ok: true, row: found || last + 1 }))
    .setMimeType(ContentService.MimeType.JSON);
}
