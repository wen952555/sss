from playwright.sync_api import sync_playwright, expect
import time

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    screenshot_dir = "/app/"

    try:
        print("Navigating to the application...")
        page.goto("http://localhost:5173/", wait_until="domcontentloaded", timeout=30000)

        print("Waiting for lobby to be visible...")
        expect(page.locator('.lobby-container')).to_be_visible(timeout=20000)

        print("Clicking on Thirteen card game (2-point classic)...")
        # Make the selector more specific to avoid strict mode violation
        page.get_by_text("2分场经典模式对局").click()

        print("Waiting for trial mode button...")
        expect(page.locator('.mode-card.trial-mode')).to_be_visible(timeout=10000)

        print("Clicking on trial mode...")
        page.locator('.mode-card.trial-mode').click()

        ready_button = page.get_by_role("button", name="点击准备")
        print("Waiting for ready button...")
        expect(ready_button).to_be_visible(timeout=10000)

        print("Clicking ready button...")
        ready_button.click()

        # This is the crucial step. We are waiting for the server to deal cards.
        print("Waiting for cards to be dealt...")
        card_in_hand = page.locator('.lane-wrapper').nth(0).locator('.card-wrapper').first
        expect(card_in_hand).to_be_visible(timeout=30000)

        print("Cards were dealt successfully!")

        # Wait a moment for UI to settle
        time.sleep(2)

        print("Taking screenshot...")
        screenshot_path = f"{screenshot_dir}dealing_works.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

    except Exception as e:
        print(f"An error occurred during verification: {e}")
        error_screenshot_path = f"{screenshot_dir}dealing_error.png"
        page.screenshot(path=error_screenshot_path)
        print(f"Error screenshot saved to {error_screenshot_path}")
        raise
    finally:
        browser.close()

with sync_playwright() as p:
    run_verification(p)
