import time
from playwright.sync_api import sync_playwright, Page, expect

def verify_game_table_layouts(page: Page):
    # Go to the dev server URL
    page.goto("http://localhost:5173")

    # Enter test mode
    page.get_by_role("button", name="Toggle Test View").click()

    # --- Test 'waiting' state ---
    page.get_by_role("button", name="Set Waiting").click()
    # Give React a moment to re-render
    time.sleep(0.5)
    page.screenshot(path="jules-scratch/verification/gametable_waiting.png")
    print("Captured waiting state.")

    # --- Test 'arranging' state ---
    page.get_by_role("button", name="Set Arranging").click()
    time.sleep(0.5)
    page.screenshot(path="jules-scratch/verification/gametable_arranging.png")
    print("Captured arranging state.")

    # --- Test 'submitted' state ---
    page.get_by_role("button", name="Set Submitted").click()
    time.sleep(0.5)
    page.screenshot(path="jules-scratch/verification/gametable_submitted.png")
    print("Captured submitted state.")

    # Exit test mode
    page.get_by_role("button", name="Toggle Test View").click()
    print("Verification complete.")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        verify_game_table_layouts(page)
        browser.close()

if __name__ == "__main__":
    main()
