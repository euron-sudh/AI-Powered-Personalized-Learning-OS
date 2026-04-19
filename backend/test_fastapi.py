import asyncio
from fastapi.testclient import TestClient
from app.main import app
from app.dependencies import get_current_user

# Mock auth dependency
app.dependency_overrides[get_current_user] = lambda: {"sub": "866961fe-13a2-4824-b3f9-8d684f2be86d"}

client = TestClient(app)
response = client.post("/api/tutor-session/start", json={"chapter_id": "9161dc89-449b-4685-a97e-3368b99e3e7e", "topic": ""})

print("STATUS CODE:", response.status_code)
print("RESPONSE:", response.json())
