import time
from playwright.sync_api import sync_playwright, Page, expect

def verify_layouts(page: Page):
    # Go to the dev server URL
    page.goto("http://localhost:5173")

    # --- Test 2-player layout ---
    page.get_by_role("button", name="2 Players").click()
    # Wait for the modal to be visible
    expect(page.locator(".result-modal-backdrop")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/2_player_layout.png")
    print("Captured 2-player layout.")

    # --- Test 3-player layout ---
    page.get_by_role("button", name="3 Players").click()
    expect(page.locator(".result-modal-backdrop")).to_be_visible() # Ensure it's still there
    page.screenshot(path="jules-scratch/verification/3_player_layout.png")
    print("Captured 3-player layout.")

    # --- Test 4-player layout ---
    page.get_by_role("button", name="4 Players").click()
    expect(page.locator(".result-modal-backdrop")).to_be_visible() # Ensure it's still there
    page.screenshot(path="jules-scratch/verification/4_player_layout.png")
    print("Captured 4-player layout.")

    # Close the modal
    page.get_by_role("button", name="Close").click()
    expect(page.locator(".result-modal-backdrop")).not_to_be_visible()
    print("Verification complete.")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        verify_layouts(page)
        browser.close()

if __name__ == "__main__":
    main()
