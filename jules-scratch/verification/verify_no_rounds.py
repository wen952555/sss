from playwright.sync_api import sync_playwright, expect
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:5173/")

        # Register and login
        register_login_button = page.get_by_role("button", name="注册/登录")
        expect(register_login_button).to_be_visible()
        register_login_button.click()

        register_now_button = page.get_by_role("button", name="立即注册")
        expect(register_now_button).to_be_visible()
        register_now_button.click()

        phone_number = "1" + str(int(time.time()))
        if len(phone_number) > 11:
            phone_number = phone_number[:11]

        page.get_by_placeholder("请输入11位手机号").fill(phone_number)
        page.get_by_placeholder("请设置至少6位密码").fill("password123")
        page.get_by_role("button", name="注 册").click()

        # Wait for login to complete and lobby to be visible
        expect(page.get_by_role("button", name="我的资料")).to_be_visible(timeout=5000)

        # Click the "2分场" game card
        game_card = page.get_by_role("heading", name="2分场").locator('..').locator('..')
        game_card.click()

        # Verify that we are in the game table and the title is correct
        expect(page.locator("h1:has-text('玩家: 1 / 8')")).to_be_visible(timeout=10000)

        # Take a screenshot of the game table
        page.screenshot(path="jules-scratch/verification/no_rounds.png")

    except Exception as e:
        page.screenshot(path="jules-scratch/verification/no_rounds_error.png")
        raise e
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
