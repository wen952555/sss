from playwright.sync_api import sync_playwright, Page, expect
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()
    try:
        print("Navigating to http://localhost:5173")
        page.goto("http://localhost:5173", timeout=60000)

        print("Clicking login/register button on homepage")
        page.get_by_role("button", name="注册/登录").click()

        print("Switching to registration form")
        page.get_by_role("button", name="还没有账户？点击注册").click()

        # Use a unique phone number for each test run to ensure idempotency
        unique_phone = f"138{int(time.time()) % 100000000:08d}"
        print(f"Registering with new user: {unique_phone}")

        print("Filling in registration form")
        page.get_by_placeholder("请输入11位手机号").fill(unique_phone)
        page.get_by_placeholder("请输入至少8位密码").fill("Password123!")
        page.get_by_placeholder("请再次输入密码").fill("Password123!")

        print("Clicking register button")
        # Use exact=True to distinguish from the other '注册/登录' button
        page.get_by_role("button", name="注册", exact=True).click()

        print("Expecting lobby heading after registration")
        expect(page.get_by_role("heading", name="游戏大厅")).to_be_visible(timeout=15000)
        print("Lobby visible")

        print("Clicking create room button")
        page.get_by_role("button", name="创建新房间").click()

        print("Expecting room heading")
        # The room name is dynamic, so check for the static part of the heading.
        expect(page.locator("h1")).to_contain_text("十三张 - 房间: room_", timeout=15000)
        print("Room visible")

        print("Taking screenshot")
        page.screenshot(path="jules-scratch/verification/verification.png")
        print("Screenshot taken")

    finally:
        print("Closing browser")
        context.close()
        browser.close()

with sync_playwright() as playwright:
    run(playwright)