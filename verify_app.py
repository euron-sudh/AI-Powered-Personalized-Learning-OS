#!/usr/bin/env python3
"""
Verification script for LearnOS application
Checks frontend styling, API structure, and key functionality
"""

import asyncio
import re
from datetime import datetime
import httpx

FRONTEND_URL = "http://localhost:3000"
API_URL = "http://localhost:8000"

class AppVerifier:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30)
        self.checks = []
        self.status_map = {"PASS": "✓", "FAIL": "✗", "INFO": "•"}

    async def log(self, message: str, status: str = "INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        symbol = self.status_map.get(status, "-")
        print(f"[{timestamp}] [{symbol}] {message}")
        self.checks.append({"time": timestamp, "status": status, "message": message})

    async def check_page_styling(self, page: str):
        """Check if a page has proper dark theme styling"""
        try:
            await self.log(f"Checking styling on {page}...", "INFO")
            response = await self.client.get(f"{FRONTEND_URL}{page}", follow_redirects=True)

            if response.status_code != 200:
                await self.log(f"{page} returned {response.status_code}", "FAIL")
                return False

            html = response.text

            # Check for dark theme colors
            has_dark_bg = "#0d1117" in html or "dark" in html or "--bg-base" in html
            has_styles = "<style" in html or 'className="' in html
            has_tailwind = "min-h-screen" in html or "rounded-" in html or "text-white" in html

            checks_passed = has_dark_bg and has_styles and has_tailwind

            if checks_passed:
                await self.log(f"{page} has proper styling (dark theme: {has_dark_bg}, styles: {has_styles}, tailwind: {has_tailwind})", "PASS")
                return True
            else:
                await self.log(f"{page} styling incomplete (dark: {has_dark_bg}, styles: {has_styles}, tailwind: {has_tailwind})", "FAIL")
                return False

        except Exception as e:
            await self.log(f"Error checking {page}: {e}", "FAIL")
            return False

    async def check_api_endpoints(self):
        """Check if key API endpoints are available"""
        try:
            await self.log("Checking API endpoints...", "INFO")

            # List of endpoints that should exist (even if they require auth)
            endpoints_to_check = [
                ("/api/auth/verify", "POST"),
                ("/api/onboarding", "POST"),
                ("/api/curriculum/generate", "POST"),
                ("/api/lessons/test/content", "GET"),
                ("/api/voice/session", "POST"),
                ("/api/progress", "GET"),
            ]

            available = 0
            for endpoint, method in endpoints_to_check:
                try:
                    if method == "GET":
                        response = await self.client.get(f"{API_URL}{endpoint}")
                    else:
                        response = await self.client.post(f"{API_URL}{endpoint}", json={})

                    # 401 Unauthorized is OK (means endpoint exists but requires auth)
                    # 404 means endpoint doesn't exist
                    if response.status_code != 404:
                        available += 1
                        status = "found (requires auth)" if response.status_code == 401 else "accessible"
                        await self.log(f"  {endpoint} ({method}): {status}", "PASS")
                    else:
                        await self.log(f"  {endpoint} ({method}): NOT FOUND", "FAIL")
                except Exception as e:
                    await self.log(f"  {endpoint}: connection error", "FAIL")

            if available >= len(endpoints_to_check) - 2:  # Allow 2 failures
                await self.log(f"API health check passed ({available}/{len(endpoints_to_check)})", "PASS")
                return True
            return False

        except Exception as e:
            await self.log(f"API check failed: {e}", "FAIL")
            return False

    async def check_frontend_structure(self):
        """Check if frontend has expected structure"""
        try:
            await self.log("Checking frontend structure...", "INFO")

            pages_to_check = {
                "/": "Landing/Home page",
                "/login": "Login page",
                "/register": "Registration page",
                "/onboarding": "Onboarding page",
                "/dashboard": "Dashboard (may redirect to login)",
                "/learn": "Learn page (may redirect to login)",
                "/practice": "Practice page (may redirect to login)",
                "/profile": "Profile page (may redirect to login)",
            }

            pages_loaded = 0
            for path, description in pages_to_check.items():
                try:
                    response = await self.client.get(f"{FRONTEND_URL}{path}", follow_redirects=False)
                    # Accept 200 (loaded), 307/308 (redirects), 403 (auth required)
                    if response.status_code in [200, 307, 308, 403]:
                        pages_loaded += 1
                        await self.log(f"  {path}: {description} [{response.status_code}]", "PASS")
                    else:
                        await self.log(f"  {path}: Error [{response.status_code}]", "FAIL")
                except Exception as e:
                    await self.log(f"  {path}: Connection error - {e}", "FAIL")

            if pages_loaded >= len(pages_to_check) - 2:  # Allow 2 failures
                await self.log(f"Frontend structure check passed ({pages_loaded}/{len(pages_to_check)})", "PASS")
                return True
            return False

        except Exception as e:
            await self.log(f"Frontend structure check failed: {e}", "FAIL")
            return False

    async def check_design_system(self):
        """Check if eduAI design system is properly integrated"""
        try:
            await self.log("Checking design system integration...", "INFO")
            response = await self.client.get(f"{FRONTEND_URL}/onboarding", follow_redirects=True)

            if response.status_code != 200:
                await self.log("Could not fetch onboarding page for design check", "FAIL")
                return False

            html = response.text

            # Check for key design system colors
            colors_to_check = {
                "#0d1117": "Dark background base",
                "#161b27": "Surface color",
                "#5b5eff": "Purple accent",
                "#1d9e75": "Green (success)",
                "#ef9f27": "Amber/Orange",
                "#e24b4a": "Red (error)",
            }

            found_colors = 0
            for color, name in colors_to_check.items():
                if color in html:
                    found_colors += 1
                    await self.log(f"  {name} ({color}): Found", "PASS")
                else:
                    # Check if CSS variable is present instead
                    var_name = "--" + {"#0d1117": "bg-base", "#5b5eff": "accent", "#1d9e75": "green", "#ef9f27": "amber", "#e24b4a": "red", "#161b27": "bg-surface"}.get(color, "")
                    if var_name != "--" and var_name in html:
                        found_colors += 1
                        await self.log(f"  {name} (CSS var): Found", "PASS")
                    else:
                        await self.log(f"  {name} ({color}): Not found", "FAIL")

            if found_colors >= len(colors_to_check) - 1:  # Allow 1 missing color
                await self.log(f"Design system check passed ({found_colors}/{len(colors_to_check)})", "PASS")
                return True
            return False

        except Exception as e:
            await self.log(f"Design system check failed: {e}", "FAIL")
            return False

    async def run_all_checks(self):
        """Run all verification checks"""
        await self.log("=" * 70)
        await self.log("LearnOS Application Verification")
        await self.log("=" * 70)

        results = {
            "Frontend pages": await self.check_page_styling("/onboarding"),
            "API endpoints": await self.check_api_endpoints(),
            "Frontend structure": await self.check_frontend_structure(),
            "Design system": await self.check_design_system(),
        }

        await self.log("=" * 70)
        passed = sum(1 for v in results.values() if v)
        total = len(results)
        await self.log(f"Summary: {passed}/{total} checks passed")

        for check_name, result in results.items():
            status = "PASS" if result else "FAIL"
            await self.log(f"  {check_name}: {status}", status)

        await self.log("=" * 70)

        await self.client.aclose()
        return passed == total

async def main():
    verifier = AppVerifier()
    success = await verifier.run_all_checks()
    return 0 if success else 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
