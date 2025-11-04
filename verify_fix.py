from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    # Define devices
    devices = {
        "mobile": playwright.devices['iPhone 13 Pro'],
        "desktop": {"viewport": {"width": 1920, "height": 1080}}
    }

    for name, device_config in devices.items():
        print(f"--- Starting {name} verification ---")
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(**device_config)
        page = context.new_page()

        try:
            # 1. Navigate to the app and start the trial game
            page.goto("http://localhost:5173/", wait_until="domcontentloaded")
            expect(page.locator('.lobby-container')).to_be_visible(timeout=15000)

            # 2. Click the trial button
            trial_button = page.locator('.trial-btn')
            expect(trial_button).to_be_visible(timeout=10000)
            trial_button.click()

            # 3. Wait for game table to be visible
            expect(page.locator('.game-container')).to_be_visible(timeout=10000)

            # 4. Take screenshot
            screenshot_path = f"/home/swebot/jules-scratch/verification/verification_buttons_{name}.png"
            page.screenshot(path=screenshot_path)
            print(f"{name.capitalize()} screenshot saved as {screenshot_path}")

        finally:
            browser.close()

with sync_playwright() as p:
    run_verification(p)
