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

        print("Waiting for game mode button...")
        game_mode_button = page.get_by_text("10局场")
        expect(game_mode_button).to_be_visible(timeout=10000)

        print("Clicking on Create button for 10局场 mode...")
        page.locator(".mode-card:has-text('10局场') .create-button").click()

        # Handle login/registration if modal appears
        if page.locator(".auth-modal-backdrop").is_visible():
            print("Auth modal appeared. Handling registration and login...")

            # Use a test user
            test_phone = "12345678901"
            test_password = "password"

            # Check if we need to switch to register view
            if page.get_by_text("还没有账户？").is_visible():
                page.get_by_text("立即注册").click()
                print("Switched to registration view.")

                # Fill registration form
                page.locator("input#phone").fill(test_phone)
                page.locator("input#password").fill(test_password)
                page.get_by_role("button", name="注 册").click()
                print("Registration submitted.")

                # Wait for registration to complete and automatically log in
                expect(page.locator(".lobby-container")).to_be_visible(timeout=15000)
                print("Registration and login successful.")

                # After login, re-click the game mode
                print("Re-clicking on Create button for 10局场 mode...")
                page.locator(".mode-card:has-text('10局场') .create-button").click()

        # We should be in the game room now. Let's go back and check the room count
        page.get_by_role("button", name="返回大厅").click()
        print("Returned to lobby.")

        page.get_by_text("2分场经典模式对局").click()
        print("Re-entered mode selection.")

        # Verify room count
        join_button = page.locator(".mode-card:has-text('10局场') .join-button")
        expect(join_button).to_have_text("加入 (1/8)", timeout=10000)
        print("Room count is correct (1/8).")

        # Join the game again
        join_button.click()

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
