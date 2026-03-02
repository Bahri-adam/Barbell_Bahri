import http.server
import socketserver
import threading
import time
import os

PORT = 3456
DIR = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

def serve():
    with socketserver.TCPServer(('', PORT), Handler) as httpd:
        httpd.serve_forever()

def run_validation():
    server_thread = threading.Thread(target=serve, daemon=True)
    server_thread.start()
    time.sleep(1)

    try:
        from selenium import webdriver
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        from selenium.webdriver.chrome.options import Options
    except ImportError as e:
        with open(os.path.join(DIR, 'VALIDATION-OUTPUT.md'), 'w') as f:
            f.write('# Engine Validation Report\n\nBrowser automation failed: Selenium or Chrome driver not available.\n')
        return

    opts = Options()
    # opts.add_argument('--headless')  # Disabled - headless can delay iframe ready
    opts.add_argument('--disable-gpu')
    opts.add_argument('--no-sandbox')

    try:
        driver = webdriver.Chrome(options=opts)
    except Exception as e:
        with open(os.path.join(DIR, 'VALIDATION-OUTPUT.md'), 'w') as f:
            f.write('# Engine Validation Report\n\nBrowser automation failed: Could not start Chrome. ' + str(e) + '\n')
        return

    try:
        driver.set_page_load_timeout(30)
        driver.get('http://localhost:' + str(PORT) + '/validation-test.html')
        wait = WebDriverWait(driver, 45)
        wait.until(lambda d: d.execute_script('''
            const eng = document.getElementById("ENG")?.contentWindow;
            return !!(eng && eng.ENGINE_READY);
        '''))
        time.sleep(0.5)

        run_btn = driver.find_element(By.XPATH, "//button[contains(@onclick,'runValidation')]")
        run_btn.click()
        time.sleep(3)

        report_el = driver.find_element(By.ID, 'REPORT')
        validation_text = report_el.text

        stability_btn = driver.find_element(By.XPATH, "//button[contains(@onclick,'runStabilityTests')]")
        stability_btn.click()
        time.sleep(3)

        stability_text = driver.find_element(By.ID, 'REPORT').text

        out = '# Engine Validation Report - Full Output\n\n'
        out += 'Generated: ' + time.strftime('%Y-%m-%dT%H:%M:%S') + '\n\n---\n\n'
        out += '## VALIDATION SUITE\n' + validation_text + '\n\n---\n\n'
        out += '## STABILITY (NOISE) TESTS\n' + stability_text + '\n\n---\n\nEND\n'

        with open(os.path.join(DIR, 'VALIDATION-OUTPUT.md'), 'w') as f:
            f.write(out)
        print('Output saved to VALIDATION-OUTPUT.md')
    except Exception as e:
        import traceback
        err = traceback.format_exc()
        with open(os.path.join(DIR, 'VALIDATION-OUTPUT.md'), 'w') as f:
            f.write('# Engine Validation Report\n\nBrowser automation failed:\n\n' + err)
        print('Error:', e)
    finally:
        driver.quit()

if __name__ == '__main__':
    run_validation()



