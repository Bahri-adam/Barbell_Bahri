/**
 * MUSCLE_MODEL Audit — Runs getMuscleWeights against every EL exercise
 * Output: MUSCLE-MODEL-AUDIT.md with table (name | matched keys | weights | fallback)
 * Requires: npx puppeteer, local server on port 3456
 * Run: node run-audit.js (from Powerbuilding program folder)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const PORT = 3456;

function serve(port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const file = req.url === '/' ? '/audit-muscle-model.html' : req.url;
      const filePath = path.join(DIR, file.replace(/^\//, ''));
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        const ext = path.extname(filePath);
        const ctypes = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' };
        res.setHeader('Content-Type', ctypes[ext] || 'application/octet-stream');
        res.end(data);
      });
    });
    server.listen(port, () => resolve(server));
  });
}

async function runAudit() {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch {
    console.log('Puppeteer not installed. Run: npm install puppeteer');
    process.exit(1);
  }

  let server;
  try {
    server = await serve(PORT);
  } catch (e) {
    console.log('Could not start server:', e.message);
    process.exit(1);
  }

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(`http://localhost:${PORT}/audit-muscle-model.html`, { waitUntil: 'networkidle0', timeout: 15000 });
    await page.waitForFunction(() => {
      const report = document.getElementById('AUDIT_REPORT');
      return report && report.dataset.ready === '1';
    }, { timeout: 10000 });

    const markdown = await page.evaluate(() => document.getElementById('AUDIT_REPORT')?.dataset.markdown || '');

    const outPath = path.join(DIR, 'MUSCLE-MODEL-AUDIT.md');
    fs.writeFileSync(outPath, markdown, 'utf8');
    console.log('Audit output saved to MUSCLE-MODEL-AUDIT.md');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
    server.close();
  }
}

runAudit();
