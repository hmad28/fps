from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
artifacts = root / "test-artifacts"
artifacts.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--use-gl=swiftshader", "--enable-webgl"])
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    bad_responses = []
    page.on("console", lambda msg: errors.append(f"console:{msg.type}:{msg.text}") if msg.type == "error" else None)
    page.on("pageerror", lambda exc: errors.append(f"pageerror:{exc}"))
    page.on("response", lambda response: bad_responses.append(f"{response.status} {response.url}") if response.status >= 400 else None)
    page.goto("http://127.0.0.1:3000", wait_until="networkidle")
    assert page.get_by_text("FORGE CITY", exact=True).is_visible()
    assert page.get_by_role("button", name="DEPLOY").is_visible()
    page.screenshot(path=str(artifacts / "carrier.png"), full_page=True)
    page.get_by_role("button", name="HEAVY Slow / 33% mitigation").click()
    page.get_by_role("button", name="DEPLOY").click()
    page.wait_for_selector("canvas", timeout=20000)
    page.wait_for_timeout(7500)
    assert page.get_by_text("OP 07–K // FORGE CITY").is_visible()
    assert page.locator("canvas").count() == 1
    page.get_by_role("button", name="Click to assume control").click()
    page.wait_for_timeout(600)
    assert page.locator(".pointer-gate").count() == 0
    page.screenshot(path=str(artifacts / "mission.png"), full_page=True)
    page.keyboard.press("m")
    page.wait_for_timeout(300)
    assert page.get_by_text("AEGIS TERRAIN LATTICE").is_visible()
    page.screenshot(path=str(artifacts / "tactical-map.png"), full_page=True)
    print("ERRORS", errors)
    print("BAD_RESPONSES", bad_responses)
    print("CANVASES_WITH_MAP", page.locator("canvas").count())
    browser.close()
