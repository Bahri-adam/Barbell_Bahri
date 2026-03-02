"""Run validation-test.html via Selenium and capture #REPORT output."""
import time
from selenium import webdriver
from selenium.webdriver.edge.service import Service
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from webdriver_manager.microsoft import EdgeChromiumDriverManager

def main():
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")

    try:
        service = Service(EdgeChromiumDriverManager().install())
        driver = webdriver.Edge(service=service, options=opts)
    except Exception as e:
        print("Edge failed:", e, "- trying Chrome...")
        from selenium.webdriver.chrome.service import Service as CService
        from selenium.webdriver.chrome.options import Options as COpts
        from webdriver_manager.chrome import ChromeDriverManager
        co = COpts()
        co.add_argument("--headless=new")
        co.add_argument("--disable-gpu")
        co.add_argument("--no-sandbox")
        service = CService(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=co)

    out_path = r"c:\Users\abahri\OneDrive - Cherryland Electric Cooperative\Desktop\Powerbuilding program\VALIDATION-OUTPUT.md"
    lines = []
    try:
        driver.get("http://localhost:3456/validation-test.html")
        def ready(d):
            el = d.find_element(By.ID, "REPORT")
            t = el.text.strip().lower()
            return "engine ready" in t or "run full" in t or "click" in t
        WebDriverWait(driver, 15).until(ready)
        time.sleep(1)
        driver.find_element(By.XPATH, "//button[contains(text(),'Run Full Validation')]").click()
        time.sleep(2)
        validation_text = driver.find_element(By.ID, "REPORT").text.strip()
        lines.append(validation_text)
        lines.append("\n\n---\n\n## STABILITY (NOISE) TESTS\n")
        driver.find_element(By.XPATH, "//button[contains(text(),'Run Stability')]").click()
        time.sleep(2)
        stability_text = driver.find_element(By.ID, "REPORT").text.strip()
        lines.append(stability_text)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write("".join(lines))
        print("Saved to", out_path)
    except Exception as e:
        print("Error:", e)
        import traceback
        traceback.print_exc()
    finally:
        driver.quit()
    return 0

if __name__ == "__main__":
    exit(main())