from playwright.sync_api import sync_playwright, expect
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Generate a unique username for each run to avoid conflicts
    unique_username = f"testuser_{int(time.time())}"
    password = "password123"

    try:
        # Navigate to the Register page
        page.goto("http://localhost:5173/register")

        # Take a screenshot of the registration page
        page.screenshot(path="jules-scratch/verification/01_register_page.png")

        # Fill out the registration form
        page.get_by_label("Username").fill(unique_username)
        page.get_by_label("Password").fill(password)

        # Submit the registration form
        page.get_by_role("button", name="Register").click()

        # Wait for the success message to appear
        success_message = page.locator("p.success-message")
        expect(success_message).to_have_text("Registration successful! You can now log in.")
        page.screenshot(path="jules-scratch/verification/02_register_success.png")

        # Navigate to the Login page
        page.get_by_role("link", name="Login").click()
        expect(page).to_have_url("http://localhost:5173/login")

        # Fill out the login form
        page.get_by_label("Username").fill(unique_username)
        page.get_by_label("Password").fill(password)

        # Take a screenshot of the filled login form
        page.screenshot(path="jules-scratch/verification/03_login_page_filled.png")

        # Submit the login form
        page.get_by_role("button", name="Login").click()

        # Assert that we are redirected to the home page and see the game
        # The game component should be visible, which we can check by looking for its header
        expect(page).to_have_url("http://localhost:5173/")
        game_header = page.get_by_role("heading", name="十三水")
        expect(game_header).to_be_visible()

        # Take a final screenshot of the game page after login
        page.screenshot(path="jules-scratch/verification/04_login_success_game_page.png")

        print("Verification script ran successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")
        # Take a screenshot on error for debugging
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)