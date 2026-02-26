/**
 * Barbell Bahri — Google Sheets Web App (backup from phone)
 * 
 * Setup:
 * 1. Create a new Google Sheet (drive.google.com)
 * 2. Extensions → Apps Script → delete default code, paste this entire file
 * 3. Deploy → New Deployment → Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the Web App URL
 * 5. In Barbell Bahri app: Data tab → paste URL → SAVE & CONNECT
 * 6. Tap "Sync All to Sheets" to send your past logs
 * 
 * New workouts auto-sync when you finish. The script writes to a "Logs" sheet.
 */

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = body.sheet || 'Logs';
    var sh = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    var HEADERS = ['ts', 'date', 'dk', 'dn', 'wk', 'bl', 'ex', 'sn', 'w', 'r', 'e1rm', 'rpe', 'dur_min'];

    if (body.action === 'append') {
      var rows = body.rows || [];
      if (rows.length) {
        if (sh.getLastRow() === 0) {
          sh.appendRow(HEADERS);
        }
        rows.forEach(function(r) {
          sh.appendRow([r.ts, r.date, r.dk, r.dn, r.wk, r.bl, r.ex, r.sn, r.w, r.r, r.e1rm, r.rpe || '', r.dur || '']);
        });
      }
      return _ok({ appended: rows.length });
    }

    if (body.action === 'fullSync') {
      var rows = body.rows || [];
      sh.clear();
      sh.appendRow(HEADERS);
      rows.forEach(function(r) {
        sh.appendRow([r.ts || '', r.date || '', r.dk || '', r.dn || '', r.wk || '', r.bl || '', r.ex || '', r.sn || '', r.w || '', r.r || '', r.e1rm || '', r.rpe || '', r.dur || '']);
      });
      return _ok({ synced: rows.length });
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
