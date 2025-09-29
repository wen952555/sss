from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the Bet Parser page, assuming default Vite port
        page.goto("http://localhost:5173/bet-parser")

        # Use the updated sample text to test the new parser features
        sample_text = "香港：10, 22, 34, 46, 鼠, 马, 红波 各 5元\\n澳门: 01-10, 单, 大 各 10块\\n15.27.39各2元"

        # Fill the textarea with the sample text
        page.get_by_placeholder("Paste your bet slip here...").fill(sample_text)

        # Click the parse button
        page.get_by_role("button", name="Parse").click()

        # Wait for the results table to appear and contain rows
        results_table = page.locator(".results-table tbody")
        expect(results_table).to_be_visible()
        expect(results_table.locator("tr")).to_have_count(8) # Expecting 8 rows from the sample text

        # Take a screenshot for visual verification
        page.screenshot(path="jules-scratch/verification/bet_parser_verification.png", full_page=True)

    except Exception as e:
        print(f"An error occurred: {e}")
        # Take a screenshot even on failure for debugging
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run_verification(playwright)