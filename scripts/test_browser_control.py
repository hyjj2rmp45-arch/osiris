from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("https://example.com")
        print("Title:", page.title())
        page.screenshot(path="C:/Users/kathi/workspace/osiris/scripts/browser_proof.png")
        browser.close()

if __name__ == "__main__":
    main()
