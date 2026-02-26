/**
 * Barbell Bahri — Google Sheets Web App (backup from phone)
 * 
 * Setup:
 * 1. Go to script.google.com → New Project
 * 2. Delete the default myFunction() and paste this entire file
 * 3. Deploy → New Deployment → Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the Web App URL
 * 5. In Barbell Bahri app: Data tab → paste URL → SAVE & CONNECT
 * 
 * Your phone will send workout logs here each time you finish a workout.
 */

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = body.sheet || 'Logs';
    const sh = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);

    if (body.action === 'append') {
      const rows = body.rows || [];
      if (rows.length) {
        // Create headers if sheet is empty
        if (sh.getLastRow() === 0) {
          sh.appendRow(['ts', 'date', 'dk', 'dn', 'wk', 'bl', 'ex', 'sn', 'w', 'r', 'e1rm']);
        }
        rows.forEach(function(r) {
          sh.appendRow([r.ts, r.date, r.dk, r.dn, r.wk, r.bl, r.ex, r.sn, r.w, r.r, r.e1rm]);
        });
      }
      return _ok({ appended: rows.length });
    }

    return _ok({ noop: true });
  } catch (err) {
    return _err(err);
  }
}

function _ok(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, data: data || null }))
    .setMimeType(ContentService.MimeType.JSON);
}

function _err(err) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, error: String(err) }))
    .setMimeType(ContentService.MimeType.JSON);
}
