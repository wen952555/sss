import time
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Generate a unique username for each run
    unique_username = f"testuser_{int(time.time())}"
    password = "password123"

    try:
        # 1. Go to the main game page
        page.goto("http://localhost:5173/")
        expect(page.get_by_role("heading", name="十三水")).to_be_visible()
        page.screenshot(path="jules-scratch/verification/01_initial_page.png")

        # 2. Click the 'Register/Login' button to open the modal
        auth_button = page.get_by_role("button", name="注册/登录")
        expect(auth_button).to_be_visible()
        auth_button.click()

        # 3. Verify the modal is open and switch to the 'Register' tab
        modal = page.locator(".modal-content")
        expect(modal).to_be_visible()
        # Use a more specific selector for the tab button
        register_tab = modal.locator(".modal-tabs").get_by_role("button", name="注册")
        register_tab.click()
        expect(modal.get_by_role("heading", name="注册")).to_be_visible()
        page.screenshot(path="jules-scratch/verification/02_register_modal.png")

        # 4. Fill out and submit the registration form
        modal.get_by_label("用户名").fill(unique_username)
        modal.get_by_label("密码").fill(password)
        # Use a more specific selector for the submit button within the form
        modal.locator("form").get_by_role("button", name="注册").click()

        # 5. Verify registration success and automatic switch to login tab
        expect(modal.get_by_text("注册成功！请切换到登录页面。")).to_be_visible()
        expect(modal.get_by_role("heading", name="登录")).to_be_visible()
        page.screenshot(path="jules-scratch/verification/03_register_success.png")

        # 6. Log in with the new credentials
        modal.get_by_label("用户名").fill(unique_username)
        modal.get_by_label("密码").fill(password)
        modal.locator("form").get_by_role("button", name="登录").click()

        # 7. Verify the modal closes and the main page button updates
        expect(modal).not_to_be_visible()
        logout_button = page.get_by_role("button", name="退出登录")
        expect(logout_button).to_be_visible()
        page.screenshot(path="jules-scratch/verification/04_login_complete.png")

        print("Verification script for modal auth flow ran successfully.")

    except Exception as e:
        print(f"An error occurred during verification: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)