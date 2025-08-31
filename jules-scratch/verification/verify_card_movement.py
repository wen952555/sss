from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Navigate to the app
        page.goto("http://localhost:5173/")

        # 2. Start the game
        ready_button = page.get_by_role("button", name="点击准备")
        expect(ready_button).to_be_visible()
        ready_button.click()

        # Wait for lanes to be populated
        expect(page.locator('.lane-wrapper').nth(0).locator('.card-wrapper')).not_to_be_empty()

        # 3. Select a card from the top lane
        top_lane_cards = page.locator('.lane-wrapper').nth(0).locator('.card-wrapper')
        first_card = top_lane_cards.first
        first_card.click()

        # Take a screenshot after selecting a card
        page.screenshot(path="jules-scratch/verification/01_card_selected.png")

        # 4. Attempt to move it to the middle lane (which should be full)
        middle_lane = page.locator('.lane-wrapper').nth(1)
        middle_lane.click()

        # 5. Take a screenshot to show the result
        page.screenshot(path="jules-scratch/verification/verification.png")

    finally:
        browser.close()

with sync_playwright() as p:
    run_verification(p)
