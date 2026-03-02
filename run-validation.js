/**
 * Runs the validation suite in headless Chrome and saves output to VALIDATION-OUTPUT.md
 * Requires: npx puppeteer (run from Powerbuilding program folder)
 * Or start server first: npx serve -p 3456 -s
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const PORT = 3456;

function serve(port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const file = req.url === '/' ? '/validation-test.html' : req.url;
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

async function runWithPuppeteer() {
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
    await page.goto(`http://localhost:${PORT}/validation-test.html`, { waitUntil: 'networkidle0', timeout: 15000 });
    await page.waitForFunction(() => {
      const eng = document.getElementById('ENG')?.contentWindow;
      return eng && eng.ENGINE_READY;
    }, { timeout: 10000 });

    await page.click('button[onclick="runValidation()"]');
    await page.waitForTimeout(1500);

    const validationReport = await page.evaluate(() => document.getElementById('REPORT')?.textContent || '');

    await page.click('button[onclick="runStabilityTests()"]');
    await page.waitForTimeout(2000);

    const stabilityReport = await page.evaluate(() => document.getElementById('REPORT')?.textContent || '');

    const fullOutput = `# Engine Validation Report — Full Output

Generated: ${new Date().toISOString()}

---

## VALIDATION SUITE
${validationReport}

---

## STABILITY (NOISE) TESTS
${stabilityReport}

---

END
`;

    const outPath = path.join(DIR, 'VALIDATION-OUTPUT.md');
    fs.writeFileSync(outPath, fullOutput, 'utf8');
    console.log('Output saved to VALIDATION-OUTPUT.md');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
    server.close();
  }
}

runWithPuppeteer();
