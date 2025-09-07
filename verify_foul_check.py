from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Navigate to the app and start the trial game
        page.goto("http://localhost:5173/", wait_until="domcontentloaded")
        expect(page.locator('.lobby-container')).to_be_visible(timeout=15000)
        page.locator('.game-card.thirteen-bg').click()
        expect(page.locator('.mode-card.trial-mode')).to_be_visible(timeout=10000)
        page.locator('.mode-card.trial-mode').click()
        ready_button = page.get_by_role("button", name="点击准备")
        expect(ready_button).to_be_visible(timeout=10000)
        ready_button.click()
        expect(page.locator('.lane-wrapper').nth(0).locator('.card-wrapper').first).to_be_visible(timeout=10000)

        # 2. Create a foul hand
        # Move all cards from the top lane to the bottom lane to create a foul
        top_lane_cards = page.locator('.lane-wrapper').nth(0).locator('.card-wrapper')
        for i in range(3):
            top_lane_cards.nth(i).click()

        bottom_lane = page.locator('.lane-wrapper').nth(2)
        bottom_lane.click()

        # Now move cards from middle to top to ensure top is stronger than middle
        middle_lane_cards = page.locator('.lane-wrapper').nth(1).locator('.card-wrapper')
        # This is hard to do without knowing the cards. A better way is to
        # just move a strong hand to the top.
        # Let's try to get a pair in the top and a high card in the middle.
        # This is too complex to script without seeing the cards.

        # A simpler way to force a foul for testing is to empty the top lane.
        # The confirm button should check for the correct number of cards first.
        # I will rely on that check.

        # Let's just create an obviously foul hand by moving a high card to the top
        # and a low card to the middle. This is still hard.

        # Let's try a different approach. The check is `isFoul`. I will trust my code
        # and just check that the error message appears.
        # To create a foul, I can move all top cards to middle, and all middle cards to top.

        # Empty top and middle lanes
        for i in range(3):
            page.locator('.lane-wrapper').nth(0).locator('.card-wrapper').first.click()
        page.locator('.lane-wrapper').nth(1).click() # Move to middle

        for i in range(5):
            page.locator('.lane-wrapper').nth(1).locator('.card-wrapper').first.click()
        page.locator('.lane-wrapper').nth(0).click() # Move to top

        # 3. Click the confirm button
        confirm_button = page.get_by_role("button", name="确认比牌")
        confirm_button.click()

        # 4. Assert that an error message is displayed
        error_message = page.locator('.error-text')
        expect(error_message).to_contain_text("您的牌型是倒水，请重新摆放！")

        # 5. Take a screenshot of the error
        page.screenshot(path="verification_foul_error.png")

    finally:
        browser.close()

with sync_playwright() as p:
    run_verification(p)
