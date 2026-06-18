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


def build_mask_map(admin_token, admin_user, emp_user):
    """Fetch all employees and build a real→test name/email mapping.

    Roles get separate counters so screenshots read naturally:
      ADMIN  → Test Admin N / adminN@aurborbloom.com
      EMPLOYEE → Test Employee N / employeeN@aurborbloom.com
    Login emails for the two capture accounts are preserved (no email rewrite)
    so re-runs continue to work — only their *display names* are masked.
    Returns (name_map, email_map, initials_map).
    """
    PRESERVE_EMAILS = {ADMIN_EMAIL.lower(), EMPLOYEE_EMAIL.lower()}

    try:
        r = requests.get(
            f"{API_URL}/api/admin/employees",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=20,
        )
        r.raise_for_status()
        employees = r.json() or []
    except Exception as e:
        print(f"     [mask] could not fetch employees: {e}")
        employees = []

    # Ensure the two login users are also in the list (login response shape)
    extras = []
    for u in (admin_user, emp_user):
        if u and not any(e.get("id") == u.get("id") for e in employees):
            extras.append(u)
    employees = list(employees) + extras

    # Stable order: ADMIN first, then EMPLOYEE, then alphabetically by name
    employees.sort(key=lambda e: (0 if (e.get("role") or "").upper() == "ADMIN" else 1,
                                  (e.get("name") or e.get("email") or "").lower()))

    name_map = {}
    email_map = {}
    initials_map = {}
    counts = {"ADMIN": 0, "EMPLOYEE": 0}

    def compute_initials(name):
        parts = [p for p in name.replace(".", " ").split() if p]
        if not parts:
            return ""
        if len(parts) == 1:
            return parts[0][:2].upper()
        return (parts[0][0] + parts[-1][0]).upper()

    for e in employees:
        role = (e.get("role") or "EMPLOYEE").upper()
        if role not in counts:
            role = "EMPLOYEE"
        counts[role] += 1
        n = counts[role]
        label = "Admin" if role == "ADMIN" else "Employee"
        slug = "admin" if role == "ADMIN" else "employee"

        real_name = (e.get("name") or "").strip()
        if real_name and real_name not in name_map:
            test_name = f"Test {label} {n}"
            name_map[real_name] = test_name
            # initials: "Pratik Zendge" → "PZ" → "T8" (E for emp / A for admin)
            ini = compute_initials(real_name)
            if ini and ini not in initials_map:
                prefix = "A" if role == "ADMIN" else "E"
                initials_map[ini] = f"{prefix}{n}"

        real_email = (e.get("email") or "").strip()
        if real_email and real_email.lower() not in PRESERVE_EMAILS:
            email_map.setdefault(real_email, f"{slug}{n}@aurborbloom.com")

    print(f"     [mask] {len(name_map)} names, {len(email_map)} emails, "
          f"{len(initials_map)} initials")
    return name_map, email_map, initials_map


def mask_script(name_map, email_map, initials_map):
    """JS that walks text nodes + attributes and replaces real PII.

    Rules:
      - Emails: full-string contains-match anywhere (emails are unique).
      - Names: replaced ONLY when they appear as a whole word (regex word
        boundaries) → prevents 'vishal' inside 'vishalsdev06@gmail.com'.
      - Initials (1-3 uppercase letters): replaced only when the text-node
        trimmed value equals a known initial → handles avatar bubbles.
      - Runs via MutationObserver so async React renders are also masked.
    """
    pairs_email = sorted(email_map.items(), key=lambda kv: -len(kv[0]))
    pairs_name  = sorted(name_map.items(),  key=lambda kv: -len(kv[0]))
    blob = {
        "emails": pairs_email,
        "names":  pairs_name,
        "initials": initials_map,
    }
    blob_json = json.dumps(blob)

    return f"""
    (() => {{
        if (window.__abMaskerInstalled) return;
        window.__abMaskerInstalled = true;
        const DATA = {blob_json};
        const EMAILS = DATA.emails || [];
        const NAMES  = DATA.names  || [];
        const INITS  = DATA.initials || {{}};
        if (!EMAILS.length && !NAMES.length && !Object.keys(INITS).length) return;

        function escapeRe(s) {{ return s.replace(/[.*+?^${{}}()|[\\]\\\\]/g, '\\\\$&'); }}

        // Pre-compile word-bounded name regex (case-sensitive matters less here)
        const NAME_REGEXES = NAMES.map(([k,v]) => [new RegExp('(?<![A-Za-z0-9_])' + escapeRe(k) + '(?![A-Za-z0-9_])', 'g'), v]);

        function maskString(s) {{
            if (!s) return s;
            let out = s;
            // Pass 1: emails (substring is fine — emails are unique)
            for (const [k, v] of EMAILS) {{
                if (out.indexOf(k) !== -1) out = out.split(k).join(v);
            }}
            // Pass 2: names (word-bounded ONLY → won't touch substrings)
            for (const [re, v] of NAME_REGEXES) {{
                if (re.test(out)) {{ re.lastIndex = 0; out = out.replace(re, v); }}
            }}
            return out;
        }}

        function maskTextNodeFull(node) {{
            const t = node.nodeValue || '';
            const trimmed = t.trim();
            // Initials override: short text-node that EQUALS a known initial
            if (trimmed && trimmed.length <= 3 && /^[A-Z]+$/.test(trimmed)
                && INITS[trimmed]) {{
                node.nodeValue = t.replace(trimmed, INITS[trimmed]);
                return;
            }}
            const m = maskString(t);
            if (m !== t) node.nodeValue = m;
        }}

        function maskNode(node) {{
            if (!node) return;
            if (node.nodeType === 3) {{ maskTextNodeFull(node); return; }}
            if (node.nodeType !== 1) return;
            // mask common attributes
            const attrs = ['alt','title','aria-label','placeholder','data-name','data-email','value'];
            for (const a of attrs) {{
                const v = node.getAttribute && node.getAttribute(a);
                if (v) {{
                    const m = maskString(v);
                    if (m !== v) node.setAttribute(a, m);
                }}
            }}
            if ((node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') && node.value) {{
                const m = maskString(node.value);
                if (m !== node.value) node.value = m;
            }}
            for (let c = node.firstChild; c; c = c.nextSibling) maskNode(c);
        }}

        function maskAll() {{ try {{ maskNode(document.body); maskAvatars(); }} catch(e){{}} }}
        maskAll();

        function maskAvatars() {{
            // Radix Avatar Fallback / typical avatar circles use rounded-full + small box.
            // Replace any short uppercase text inside them with 'T'.
            const sels = [
                '[class*="rounded-full"]',
                '[data-radix-avatar-fallback]',
                '[class*="Avatar"]',
                '[class*="avatar"]',
            ];
            const seen = new Set();
            for (const sel of sels) {{
                let nodes;
                try {{ nodes = document.querySelectorAll(sel); }} catch(e) {{ continue; }}
                for (const el of nodes) {{
                    if (seen.has(el)) continue;
                    seen.add(el);
                    // walk text descendants of this avatar
                    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
                    let tn;
                    while ((tn = w.nextNode())) {{
                        const t = (tn.nodeValue || '').trim();
                        if (t && t.length <= 3 && /^[A-Za-z]+$/.test(t)) {{
                            tn.nodeValue = 'T';
                        }}
                    }}
                }}
            }}
        }}

        const obs = new MutationObserver((muts) => {{
            for (const m of muts) {{
                for (const n of m.addedNodes) maskNode(n);
                if (m.type === 'characterData') maskNode(m.target);
            }}
            maskAvatars();
        }});
        obs.observe(document.body, {{
            childList: true, subtree: true, characterData: true,
        }});
        window.__abMaskerObs = obs;
    }})();
    """


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


async def capture(page, filename, route, wait, mask_js=None):
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
    # Re-apply the name/email masking AFTER all content has settled.
    if mask_js:
        try:
            # reset flag so we can re-run on each page; observer also stays active
            await page.evaluate("window.__abMaskerInstalled = false;")
            await page.evaluate(mask_js)
            await page.wait_for_timeout(250)
        except Exception as e:
            print(f"     [mask] runtime error: {e}")
    try:
        await page.evaluate("window.scrollTo(0,0)")
    except Exception:
        pass
    await page.screenshot(path=str(path), full_page=False, type="png")
    size = path.stat().st_size if path.exists() else 0
    print(f"     saved {size:,} bytes")
    return True


async def capture_role(p, token, pages, label, user_data=None, mask_js=None):
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
    # Install the masking script so it runs early on each navigation too.
    if mask_js:
        await context.add_init_script(mask_js)
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
        await capture(page, f, r, w, mask_js=mask_js)
    await ctx.close()


async def main():
    async with async_playwright() as p:
        await capture_role(p, None, PUBLIC_PAGES, "Public pages")
        admin_token, admin_user = login_get_user(ADMIN_EMAIL, ADMIN_PASSWORD)
        emp_token, emp_user = login_get_user(EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD)

        # Build masking map once, share across roles
        name_map, email_map, initials_map = build_mask_map(admin_token, admin_user, emp_user)
        mjs = mask_script(name_map, email_map, initials_map)

        await capture_role(p, admin_token, ADMIN_PAGES, "Admin pages",
                           admin_user, mask_js=mjs)
        await capture_role(p, emp_token, EMPLOYEE_PAGES, "Employee pages",
                           emp_user, mask_js=mjs)
        print("\nDone. Screenshots in", OUT_DIR)


if __name__ == "__main__":
    asyncio.run(main())
