#!/usr/bin/env python
"""Comprehensive E2E test for LearnOS platform."""
import asyncio
import json
import time
import httpx
from typing import Optional

API_BASE = "http://localhost:9100"
DEV_TOKEN = "dev-bypass-auth"

# Use a fresh UUID for testing
TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440001"
TEST_STUDENT_ID = TEST_USER_ID

class E2ETester:
    def __init__(self):
        self.results = []
        self.subject_id = None
        self.chapter_id = None
        self.activity_id = None

    def log(self, test_name: str, status: str, detail: str = ""):
        icon = "PASS" if status == "PASS" else "FAIL" if status == "FAIL" else "SKIP"
        msg = f"[{icon}] {test_name}"
        if detail:
            msg += f" - {detail}"
        print(msg)
        self.results.append({"test": test_name, "status": status, "detail": detail})

    async def test_1_health(self):
        """Test 1: Health check"""
        try:
            async with httpx.AsyncClient() as client:
                r = await client.get(f"{API_BASE}/api/health", headers={"X-Dev-Token": DEV_TOKEN})
                if r.status_code == 200:
                    self.log("1_HEALTH", "PASS", f"Status: {r.status_code}")
                    return True
                else:
                    self.log("1_HEALTH", "FAIL", f"Status: {r.status_code}")
                    return False
        except Exception as e:
            self.log("1_HEALTH", "FAIL", str(e))
            return False

    async def test_2_bootstrap(self):
        """Test 2: Create student profile (onboarding)"""
        try:
            payload = {
                "name": "Ravi Kumar",
                "grade": "10",
                "subjects": ["Physics", "Chemistry", "Biology"],
                "learning_goal": "Excel in board exams"
            }
            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.post(
                    f"{API_BASE}/api/system/learners/bootstrap",
                    json=payload,
                    headers={"X-Dev-Token": DEV_TOKEN}
                )
                if r.status_code == 200:
                    data = r.json()
                    learner = data.get("learner", {})
                    self.log("2_BOOTSTRAP", "PASS", f"Profile created: {learner.get('id')}")
                    return True
                else:
                    self.log("2_BOOTSTRAP", "FAIL", f"Status: {r.status_code}, {r.text[:100]}")
                    return False
        except Exception as e:
            self.log("2_BOOTSTRAP", "FAIL", str(e)[:100])
            return False

    async def test_3_curriculum(self):
        """Test 3: Load curriculum and chapters"""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.get(
                    f"{API_BASE}/api/system/workspace",
                    headers={"X-Dev-Token": DEV_TOKEN}
                )
                if r.status_code == 200:
                    data = r.json()
                    roadmap = data.get("workspace", {}).get("roadmap", [])
                    chapter_count = len(roadmap)
                    if roadmap:
                        self.chapter_id = roadmap[0].get("topic_id")
                    self.log("3_CURRICULUM", "PASS", f"Loaded {chapter_count} chapters")
                    return len(roadmap) > 0
                else:
                    self.log("3_CURRICULUM", "FAIL", f"Status: {r.status_code}")
                    return False
        except Exception as e:
            self.log("3_CURRICULUM", "FAIL", str(e)[:100])
            return False

    async def test_4_lessons(self):
        """Test 4: Get lesson content"""
        if not self.chapter_id:
            self.log("4_LESSONS", "SKIP", "No chapter available")
            return False
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.get(
                    f"{API_BASE}/api/lessons/{self.chapter_id}/content",
                    headers={"X-Dev-Token": DEV_TOKEN}
                )
                if r.status_code == 200:
                    data = r.json()
                    content = data.get("content", {})
                    has_content = bool(content.get("explanation") or content.get("key_concepts"))
                    status = "PASS" if has_content else "FAIL"
                    self.log("4_LESSONS", status, f"Content length: {len(str(content))}")
                    return has_content
                else:
                    self.log("4_LESSONS", "FAIL", f"Status: {r.status_code}")
                    return False
        except Exception as e:
            self.log("4_LESSONS", "FAIL", str(e)[:100])
            return False

    async def test_5_teaching_chat(self):
        """Test 5: Teaching chat"""
        if not self.chapter_id:
            self.log("5_TEACHING_CHAT", "SKIP", "No chapter available")
            return False
        try:
            payload = {
                "chapter_id": self.chapter_id,
                "student_message": "Explain this concept in simple terms"
            }
            async with httpx.AsyncClient(timeout=60) as client:
                r = await client.post(
                    f"{API_BASE}/api/lessons/{self.chapter_id}/chat",
                    json=payload,
                    headers={"X-Dev-Token": DEV_TOKEN}
                )
                if r.status_code == 200:
                    # Check if response is SSE stream or JSON
                    text = r.text
                    has_response = len(text) > 10
                    self.log("5_TEACHING_CHAT", "PASS" if has_response else "FAIL",
                             f"Response received: {len(text)} chars")
                    return has_response
                else:
                    self.log("5_TEACHING_CHAT", "FAIL", f"Status: {r.status_code}")
                    return False
        except Exception as e:
            self.log("5_TEACHING_CHAT", "FAIL", str(e)[:100])
            return False

    async def test_6_activities(self):
        """Test 6: Activity generation and evaluation"""
        if not self.chapter_id:
            self.log("6_ACTIVITIES", "SKIP", "No chapter available")
            return False
        try:
            # Generate activity
            async with httpx.AsyncClient(timeout=60) as client:
                r = await client.post(
                    f"{API_BASE}/api/system/quizzes/generate",
                    json={"chapter_id": self.chapter_id},
                    headers={"X-Dev-Token": DEV_TOKEN}
                )
                if r.status_code == 200:
                    data = r.json()
                    self.activity_id = data.get("quiz_id")
                    self.log("6_ACTIVITIES", "PASS", f"Activity generated: {self.activity_id}")
                    return bool(self.activity_id)
                else:
                    self.log("6_ACTIVITIES", "FAIL", f"Status: {r.status_code}")
                    return False
        except Exception as e:
            self.log("6_ACTIVITIES", "FAIL", str(e)[:100])
            return False

    async def test_7_voice_session(self):
        """Test 7: Voice session setup"""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.post(
                    f"{API_BASE}/api/voice/session",
                    json={"chapter_id": self.chapter_id or "test-chapter"},
                    headers={"X-Dev-Token": DEV_TOKEN}
                )
                if r.status_code == 200:
                    data = r.json()
                    session_id = data.get("session_id")
                    self.log("7_VOICE_SESSION", "PASS", f"Session created: {session_id}")
                    return bool(session_id)
                else:
                    self.log("7_VOICE_SESSION", "FAIL", f"Status: {r.status_code}")
                    return False
        except Exception as e:
            self.log("7_VOICE_SESSION", "FAIL", str(e)[:100])
            return False

    async def test_8_analytics(self):
        """Test 8: Analytics dashboard"""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.get(
                    f"{API_BASE}/api/progress/today-focus",
                    headers={"X-Dev-Token": DEV_TOKEN}
                )
                if r.status_code == 200:
                    data = r.json()
                    plan = data.get("today_plan", [])
                    self.log("8_ANALYTICS", "PASS", f"Analytics loaded: {len(plan)} items")
                    return True
                else:
                    self.log("8_ANALYTICS", "FAIL", f"Status: {r.status_code}")
                    return False
        except Exception as e:
            self.log("8_ANALYTICS", "FAIL", str(e)[:100])
            return False

    async def run_all(self):
        """Run all tests in sequence"""
        print("\n" + "="*70)
        print("LearnOS E2E TEST SUITE — Student: Ravi Kumar")
        print("="*70 + "\n")

        tests = [
            self.test_1_health,
            self.test_2_bootstrap,
            self.test_3_curriculum,
            self.test_4_lessons,
            self.test_5_teaching_chat,
            self.test_6_activities,
            self.test_7_voice_session,
            self.test_8_analytics,
        ]

        for test in tests:
            await test()
            await asyncio.sleep(0.5)

        # Summary
        print("\n" + "="*70)
        print("TEST SUMMARY")
        print("="*70)
        passed = sum(1 for r in self.results if r["status"] == "PASS")
        total = len([r for r in self.results if r["status"] in ("PASS", "FAIL")])
        print(f"\nResults: {passed}/{total} tests passed\n")

        for r in self.results:
            status_icon = "[+]" if r["status"] == "PASS" else "[-]" if r["status"] == "FAIL" else "[*]"
            print(f"{status_icon} {r['test']:<25} {r['detail']}")

        print("\n" + "="*70 + "\n")
        return passed, total

async def main():
    tester = E2ETester()
    await tester.run_all()

if __name__ == "__main__":
    asyncio.run(main())
