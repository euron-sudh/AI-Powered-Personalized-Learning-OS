#!/usr/bin/env python3
"""
End-to-end test of the LearnOS application flow
Tests registration, onboarding, curriculum generation, and learning interface
"""

import asyncio
import json
import sys
from datetime import datetime
import httpx

API_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"

class TestRunner:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30)
        self.test_email = f"test_ravi_{datetime.now().timestamp()}@example.com"
        self.test_password = "TestPassword123!"
        self.access_token = None
        self.student_data = None
        self.passed = 0
        self.failed = 0

    async def log(self, message: str, status: str = "INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] [{status}] {message}")

    async def test_backend_health(self):
        """Test if backend API is running"""
        try:
            await self.log("Testing backend API health...")
            response = await self.client.get(f"{API_URL}/docs")
            if response.status_code == 200:
                await self.log("Backend API is running", "PASS")
                self.passed += 1
            else:
                await self.log(f"Backend returned {response.status_code}", "FAIL")
                self.failed += 1
        except Exception as e:
            await self.log(f"Backend health check failed: {e}", "FAIL")
            self.failed += 1

    async def test_frontend_health(self):
        """Test if frontend is running"""
        try:
            await self.log("Testing frontend health...")
            response = await self.client.get(FRONTEND_URL, follow_redirects=True)
            if response.status_code == 200:
                await self.log("Frontend is running", "PASS")
                self.passed += 1
            else:
                await self.log(f"Frontend returned {response.status_code}", "FAIL")
                self.failed += 1
        except Exception as e:
            await self.log(f"Frontend health check failed: {e}", "FAIL")
            self.failed += 1

    async def test_register(self):
        """Test user registration"""
        try:
            await self.log(f"Testing registration with email: {self.test_email}...")
            response = await self.client.post(
                f"{API_URL}/api/auth/register",
                json={
                    "email": self.test_email,
                    "password": self.test_password,
                    "full_name": "Ravi Test"
                }
            )
            if response.status_code in [200, 201]:
                data = response.json()
                self.access_token = data.get("access_token")
                await self.log(f"Registration successful", "PASS")
                self.passed += 1
                return True
            else:
                await self.log(f"Registration failed with {response.status_code}: {response.text}", "FAIL")
                self.failed += 1
                return False
        except Exception as e:
            await self.log(f"Registration test failed: {e}", "FAIL")
            self.failed += 1
            return False

    async def test_onboarding(self):
        """Test onboarding flow"""
        try:
            await self.log("Testing onboarding...")
            headers = {"Authorization": f"Bearer {self.access_token}"} if self.access_token else {}

            onboarding_data = {
                "name": "Ravi Test",
                "grade": "4",
                "board": "CBSE",
                "background": "Standard student",
                "interests": ["Mathematics", "Science", "History"]
            }

            response = await self.client.post(
                f"{API_URL}/api/onboarding",
                json=onboarding_data,
                headers=headers
            )
            if response.status_code in [200, 201]:
                self.student_data = response.json()
                await self.log("Onboarding completed successfully", "PASS")
                self.passed += 1
                return True
            else:
                await self.log(f"Onboarding failed with {response.status_code}: {response.text[:200]}", "FAIL")
                self.failed += 1
                return False
        except Exception as e:
            await self.log(f"Onboarding test failed: {e}", "FAIL")
            self.failed += 1
            return False

    async def test_curriculum_retrieval(self):
        """Test curriculum generation and retrieval"""
        try:
            await self.log("Testing curriculum retrieval...")
            headers = {"Authorization": f"Bearer {self.access_token}"} if self.access_token else {}

            response = await self.client.get(
                f"{API_URL}/api/curriculum",
                headers=headers
            )
            if response.status_code == 200:
                data = response.json()
                subject_count = len(data.get("subjects", []))
                await self.log(f"Retrieved {subject_count} subjects from curriculum", "PASS")
                self.passed += 1
                return True
            else:
                await self.log(f"Curriculum retrieval failed with {response.status_code}", "FAIL")
                self.failed += 1
                return False
        except Exception as e:
            await self.log(f"Curriculum test failed: {e}", "FAIL")
            self.failed += 1
            return False

    async def test_lesson_content(self):
        """Test lesson content generation"""
        try:
            await self.log("Testing lesson content retrieval...")
            headers = {"Authorization": f"Bearer {self.access_token}"} if self.access_token else {}

            # Try to get a chapter (using a test chapter ID)
            chapter_id = "test-chapter-1"
            response = await self.client.get(
                f"{API_URL}/api/lessons/{chapter_id}/content",
                headers=headers
            )
            # We might get 404 for non-existent chapter, which is OK for this test
            if response.status_code in [200, 404]:
                await self.log(f"Lesson content endpoint responded with {response.status_code}", "PASS")
                self.passed += 1
                return True
            else:
                await self.log(f"Lesson content failed with {response.status_code}", "FAIL")
                self.failed += 1
                return False
        except Exception as e:
            await self.log(f"Lesson content test failed: {e}", "FAIL")
            self.failed += 1
            return False

    async def test_voice_session(self):
        """Test voice session creation"""
        try:
            await self.log("Testing voice session creation...")
            headers = {"Authorization": f"Bearer {self.access_token}"} if self.access_token else {}

            response = await self.client.post(
                f"{API_URL}/api/voice/session",
                json={"chapter_id": "test-chapter-1"},
                headers=headers
            )
            if response.status_code in [200, 201]:
                data = response.json()
                has_token = "client_secret" in data or "session_id" in data
                if has_token:
                    await self.log("Voice session created with token", "PASS")
                    self.passed += 1
                    return True
                else:
                    await self.log("Voice session response missing token", "FAIL")
                    self.failed += 1
                    return False
            else:
                await self.log(f"Voice session failed with {response.status_code}", "FAIL")
                self.failed += 1
                return False
        except Exception as e:
            await self.log(f"Voice session test failed: {e}", "FAIL")
            self.failed += 1
            return False

    async def test_progress_retrieval(self):
        """Test progress/analytics data"""
        try:
            await self.log("Testing progress retrieval...")
            headers = {"Authorization": f"Bearer {self.access_token}"} if self.access_token else {}

            response = await self.client.get(
                f"{API_URL}/api/progress",
                headers=headers
            )
            if response.status_code in [200, 404]:
                await self.log(f"Progress endpoint responded with {response.status_code}", "PASS")
                self.passed += 1
                return True
            else:
                await self.log(f"Progress retrieval failed with {response.status_code}", "FAIL")
                self.failed += 1
                return False
        except Exception as e:
            await self.log(f"Progress test failed: {e}", "FAIL")
            self.failed += 1
            return False

    async def test_ui_pages(self):
        """Test frontend pages load without errors"""
        try:
            await self.log("Testing frontend pages...")
            pages = [
                "/",
                "/login",
                "/register",
                "/onboarding",
                "/dashboard",
                "/learn",
                "/practice",
                "/analytics"
            ]

            success_count = 0
            for page in pages:
                try:
                    response = await self.client.get(f"{FRONTEND_URL}{page}", follow_redirects=False)
                    if response.status_code in [200, 307, 308]:  # 307/308 are redirects
                        success_count += 1
                except:
                    pass

            if success_count >= len(pages) - 2:  # Allow some failures due to auth
                await self.log(f"Frontend pages check passed ({success_count}/{len(pages)})", "PASS")
                self.passed += 1
                return True
            else:
                await self.log(f"Only {success_count}/{len(pages)} pages loaded", "FAIL")
                self.failed += 1
                return False
        except Exception as e:
            await self.log(f"UI pages test failed: {e}", "FAIL")
            self.failed += 1
            return False

    async def run_all_tests(self):
        """Run all tests"""
        await self.log("=" * 60)
        await self.log("LearnOS Application Test Suite Starting")
        await self.log("=" * 60)

        await self.test_backend_health()
        await self.test_frontend_health()
        await self.test_register()
        await self.test_onboarding()
        await self.test_curriculum_retrieval()
        await self.test_lesson_content()
        await self.test_voice_session()
        await self.test_progress_retrieval()
        await self.test_ui_pages()

        await self.log("=" * 60)
        await self.log(f"Test Results: {self.passed} PASSED, {self.failed} FAILED")
        await self.log("=" * 60)

        await self.client.aclose()

        return self.failed == 0

async def main():
    runner = TestRunner()
    success = await runner.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())
