"""
Capture portal screenshots for AurborBloom tenant.
Uses a fresh browser context per role with add_init_script so JWT is set
before any page JS runs, eliminating auth redirect races.
"""
import asyncio
import os
import json
import requests
from pathlib import Path
from playwright.async_api import async_playwright

API_URL = "https://modular-refactor-25.preview.emergentagent.com"
OUT_DIR = Path("/app/documents/aurborbloom/assets/screenshots")
OUT_DIR.mkdir(parents=True, exist_ok=True)

TENANT = "aurborbloom"
ADMIN_EMAIL = "admin@company.com"
ADMIN_PASSWORD = "password123"
EMPLOYEE_EMAIL = "employee@test.com"
EMPLOYEE_PASSWORD = "password123"

VIEWPORT = {"width": 1920, "height": 900}
HEADLESS_SHELL = "/pw-browsers/chromium_headless_shell-1208/chrome-linux/headless_shell"


def login_get_user(email, password):
    r = requests.post(
        f"{API_URL}/api/auth/login",
        json={"email": email, "password": password, "tenant_id": TENANT},
        headers={"User-Agent": "Mozilla/5.0", "Content-Type": "application/json"},
        timeout=20,
    )
    r.raise_for_status()
    j = r.json()
    return j["access_token"], j["user"]


PUBLIC_PAGES = [
    ("01_tenant_landing.png", f"/{TENANT}", 2500),
    ("02_login.png", f"/{TENANT}/login", 2000),
    ("03_signup.png", f"/{TENANT}/signup", 2000),
]

ADMIN_PAGES = [
    ("04_admin_dashboard.png", "/admin/dashboard", 3500),
    ("05_admin_employees.png", "/admin/employees", 3500),
    ("06_admin_timesheets.png", "/admin/timesheets", 3500),
    ("07_admin_leave.png", "/admin/leave-requests", 3500),
    ("08_admin_tickets.png", "/admin/tickets", 3500),
    ("09_admin_calendar.png", "/admin/calendar", 4000),
    ("10_admin_projects.png", "/admin/projects", 3500),
]

EMPLOYEE_PAGES = [
    ("11_employee_dashboard.png", "/employee/dashboard", 3500),
    ("12_employee_leave.png", "/employee/leave", 3500),
    ("13_employee_documents.png", "/employee/documents", 3500),
    ("14_employee_timesheet.png", "/employee/timesheet", 3500),
    ("15_employee_tickets.png", "/employee/tickets", 3500),
]


def init_script(token):
    """JS to set localStorage on every navigation, BEFORE any page JS runs."""
    payload = {
        "cortracker_token": token or "",
        "cortracker_tenant": TENANT,
        f"{TENANT}_tutorial_completed": "true",
        "aurborbloom_tutorial_completed": "true",
    }
    items = "\n".join(
        f"localStorage.setItem({json.dumps(k)},{json.dumps(v)});"
        for k, v in payload.items() if v
    )
    return f"""
        try {{
            {items}
        }} catch (e) {{}}
    """


async def capture(page, filename, route, wait):
    path = OUT_DIR / filename
    full = f"{API_URL}{route}"
    print(f"  → {filename}  ({route})")

    for attempt in range(2):
        try:
            await page.goto(full, wait_until="networkidle", timeout=30000)
        except Exception:
            try:
                await page.goto(full, wait_until="load", timeout=20000)
            except Exception as e2:
                print(f"     goto failed: {e2}")
                return False
        await page.wait_for_timeout(wait)
        # Check if we got redirected to login - retry once
        url = page.url
        if "/login" in url and "/login" not in route:
            print(f"     redirected to login, retry ({attempt+1})")
            await page.wait_for_timeout(800)
            continue
        break

    # Dismiss any tutorial / modal overlays (defensive)
    try:
        await page.evaluate("""
            // Click any close-tutorial / dismiss buttons
            const sel = '[data-testid*="close"],[aria-label*="lose"],[class*="tutorial"] button,button:has(svg[class*="X"])';
            document.querySelectorAll(sel).forEach(b => {
                try { b.click(); } catch(e){}
            });
            // Remove overlays
            document.querySelectorAll('[class*="overlay"],[class*="backdrop"]').forEach(el => {
                if (el.style) el.style.display = 'none';
            });
        """)
        await page.wait_for_timeout(400)
    except Exception:
        pass
    try:
        await page.evaluate("window.scrollTo(0,0)")
    except Exception:
        pass
    await page.screenshot(path=str(path), full_page=False, type="png")
    size = path.stat().st_size if path.exists() else 0
    print(f"     saved {size:,} bytes")
    return True


async def capture_role(p, token, pages, label, user_data=None):
    print(f"\n== {label} ==")
    ctx = await p.chromium.launch(
        headless=True, executable_path=HEADLESS_SHELL,
        args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
    )
    context = await ctx.new_context(viewport=VIEWPORT,
                                    device_scale_factor=1.5,
                                    ignore_https_errors=True)
    # Inject localStorage on EVERY page navigation
    await context.add_init_script(init_script(token))
    # Intercept /auth/me so a flaky response can never force a logout
    if user_data:
        async def fulfill_me(route):
            try:
                resp = await route.fetch()
                if resp.status >= 400:
                    await route.fulfill(status=200, content_type="application/json",
                                        body=json.dumps(user_data))
                else:
                    await route.fulfill(response=resp)
            except Exception:
                await route.fulfill(status=200, content_type="application/json",
                                    body=json.dumps(user_data))
        await context.route("**/api/auth/me", fulfill_me)
    page = await context.new_page()
    # Prime the origin so localStorage gets set
    await page.goto(API_URL, wait_until="domcontentloaded")
    for f, r, w in pages:
        await capture(page, f, r, w)
    await ctx.close()


async def main():
    async with async_playwright() as p:
        await capture_role(p, None, PUBLIC_PAGES, "Public pages")
        admin_token, admin_user = login_get_user(ADMIN_EMAIL, ADMIN_PASSWORD)
        await capture_role(p, admin_token, ADMIN_PAGES, "Admin pages", admin_user)
        emp_token, emp_user = login_get_user(EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD)
        await capture_role(p, emp_token, EMPLOYEE_PAGES, "Employee pages", emp_user)
        print("\nDone. Screenshots in", OUT_DIR)


if __name__ == "__main__":
    asyncio.run(main())
