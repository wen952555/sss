from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Navigate to the app and start the trial game
        page.goto("http://localhost:5173/", wait_until="domcontentloaded")
        expect(page.locator('.lobby-container')).to_be_visible(timeout=15000)
        page.locator('.game-card.thirteen-bg').first.click()
        expect(page.locator('.mode-card.trial-mode')).to_be_visible(timeout=10000)
        page.locator('.mode-card.trial-mode').click()
        ready_button = page.get_by_role("button", name="点击准备")
        expect(ready_button).to_be_visible(timeout=10000)
        ready_button.click()
        expect(page.locator('.lane-wrapper').nth(0).locator('.card-wrapper').first).to_be_visible(timeout=10000)

        # 2. Select all cards from the middle lane and move them to the top lane
        middle_lane_cards = page.locator('.lane-wrapper').nth(1).locator('.card-wrapper')
        for i in range(5):
            middle_lane_cards.nth(i).click()

        top_lane = page.locator('.lane-wrapper').nth(0)
        top_lane.click()

        # 3. Take a screenshot to show the overfilled lane
        page.screenshot(path="verification_overfilled.png")

        # 4. Click the confirm button
        confirm_button = page.get_by_role("button", name="确认比牌")
        confirm_button.click()

        # 5. Assert that an error message is displayed
        error_message = page.locator('.error-text')
        expect(error_message).to_contain_text("牌道数量错误！")

        # 6. Take a screenshot of the error
        page.screenshot(path="verification_error.png")

    finally:
        browser.close()

with sync_playwright() as p:
    run_verification(p)
