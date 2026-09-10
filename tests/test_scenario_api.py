import base64
import copy
import json
import os
from pathlib import Path
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
from http.client import HTTPConnection

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server
from scenario_api import ScenarioService, ScenarioError, validate_lesson

LESSON = {"title": "见面", "names": ["Mia", "Leo"], "lines": [
    {"speaker": "Mia", "text": "Hello, Leo!", "phonetic": "/həˈləʊ ˈliːəʊ/", "chinese": "你好，利奥！"},
    {"speaker": "Leo", "text": "Hi, Mia!", "phonetic": "/haɪ ˈmiːə/", "chinese": "嗨，米娅！"}],
    "vocabulary": [{"word": "hello", "phonetic": "/həˈləʊ/", "chinese": "你好"}, {"word": "hi", "phonetic": "/haɪ/", "chinese": "嗨"}], "imagePrompt": "Two children meeting, two panels."}


class ScenarioAPITest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.calls = []
        self.png = (Path(__file__).resolve().parents[1] / "assets/themes/colors/colors-scene-v2.png").read_bytes()
        self.service = ScenarioService(self.temp.name, self.fake_request)

    def fake_request(self, endpoint, body):
        self.calls.append((endpoint, body))
        if endpoint == "responses":
            return {"output": [{"content": [{"type": "output_text", "text": json.dumps(LESSON)}]}]}
        return {"data": [{"b64_json": base64.b64encode(self.png).decode()}]}

    def test_validation_coverage_and_names(self):
        result = validate_lesson(copy.deepcopy(LESSON))
        self.assertEqual(len(result["vocabulary"]), 2)
        broken = copy.deepcopy(LESSON)
        broken["vocabulary"].pop()
        with self.assertRaises(ScenarioError): validate_lesson(broken)
        broken = copy.deepcopy(LESSON)
        broken["lines"][0]["phonetic"] = ""
        with self.assertRaises(ScenarioError): validate_lesson(broken)

    def test_generation_preview_save_and_restart_no_extra_charge(self):
        self.service._generate("Mia: Hello, Leo!\nLeo: Hi, Mia!", "test-generate-1")
        self.assertEqual(self.service.jobs["test-generate-1"]["state"], "ready")
        self.assertEqual(self.service.saved(), [])
        saved = self.service.save("test-generate-1")
        self.assertEqual(saved["title"], "见面")
        self.assertEqual(len(self.service.saved()), 1)
        self.assertEqual(self.service.save("test-generate-1"), saved)
        self.assertEqual([c[0] for c in self.calls], ["responses", "images/generations"])
        self.assertEqual(self.calls[1][1]["model"], "gpt-image-1.5")
        recovered = ScenarioService(self.temp.name, lambda *_: self.fail("must not charge again"))
        recovered.start("Mia: Hello!\nLeo: Hi!", "test-generate-1")
        self.assertEqual(recovered.job("test-generate-1")["state"], "ready")

    def test_invalid_png_and_provider_errors_are_not_saved(self):
        def invalid(endpoint, body):
            if endpoint == "responses": return self.fake_request(endpoint, body)
            return {"data": [{"b64_json": base64.b64encode(b"invalid image").decode()}]}
        self.service.request = invalid
        self.service._generate("hello", "broken-image-1")
        self.assertEqual(self.service.jobs["broken-image-1"]["state"], "failed")
        self.assertEqual(self.service.saved(), [])
        def rejected(*_): raise ScenarioError("API Key 无效或已失效。")
        self.service.request = rejected
        self.service._generate("hello", "rejected-api-1")
        self.assertIn("API Key", self.service.jobs["rejected-api-1"]["message"])
        with self.assertRaises(ScenarioError): self.service.save("../escape")
        with self.assertRaises(ScenarioError): self.service.start("x", "test-id-1")

    def test_duplicate_and_concurrent_requests(self):
        started = threading.Event()
        released = threading.Event()
        def slow(endpoint, body):
            if endpoint == "responses":
                started.set()
                released.wait(3)
            return self.fake_request(endpoint, body)
        self.service.request = slow
        self.service.start("Mia: Hello!\nLeo: Hi!", "concurrent-test-1")
        self.assertTrue(started.wait(2))
        self.assertEqual(self.service.start("Mia: Hello!\nLeo: Hi!", "concurrent-test-1"), "concurrent-test-1")
        with self.assertRaises(ScenarioError): self.service.start("Mia: Hello!\nLeo: Hi!", "concurrent-test-2")
        released.set()
        for _ in range(100):
            if self.service.job("concurrent-test-1")["state"] != "working": break
            time.sleep(.02)
        self.assertEqual(self.service.job("concurrent-test-1")["state"], "ready")
        self.assertEqual(len(self.calls), 2)

    def test_http_origin_token_limits_private_files_and_key_absence(self):
        http = server.ThreadingHTTPServer(("127.0.0.1", 0), server.LearningAppHandler)
        worker = threading.Thread(target=http.serve_forever, daemon=True)
        worker.start()
        self.addCleanup(http.server_close)
        self.addCleanup(http.shutdown)
        host = f"127.0.0.1:{http.server_port}"
        def request(method, path, body=None, headers=None):
            connection = HTTPConnection("127.0.0.1", http.server_port, timeout=5)
            connection.request(method, path, body, headers or {})
            response = connection.getresponse()
            result = response.status, response.read()
            connection.close()
            return result
        with patch.object(server, "SCENARIOS", self.service), patch.dict(os.environ, {"OPENAI_API_KEY": ""}):
            status, data = request("GET", "/api/scenarios/config")
            self.assertEqual(status, 200)
            self.assertFalse(json.loads(data)["configured"])
            self.assertEqual(request("GET", "/api/scenarios/config", headers={"Host": "evil.example"})[0], 403)
            self.assertEqual(request("POST", "/api/scenarios/generate", "{}", {"Content-Type": "application/json"})[0], 403)
            headers = {"Content-Type": "application/json", "X-Scenario-Token": self.service.token}
            self.assertEqual(request("POST", "/api/scenarios/generate", "{}", {**headers, "Origin": "https://evil.example"})[0], 403)
            self.assertEqual(request("POST", "/api/scenarios/generate", "{}", headers)[0], 503)
            self.assertEqual(request("POST", "/api/scenarios/generate", '"' + "a" * 17000 + '"', headers)[0], 400)
            self.assertEqual(request("GET", "/.env")[0], 404)
            self.assertEqual(request("GET", "/%2elocal-scenarios/test.json")[0], 404)
            self.assertEqual(request("GET", "/.git/config")[0], 404)
            self.assertEqual(request("GET", "/assets/")[0], 403)
            self.service._generate("hello", "http-image-1")
            status, data = request("GET", "/api/scenarios/images/http-image-1.png")
            self.assertEqual(status, 200)
            self.assertEqual(data, self.png)

if __name__ == "__main__": unittest.main()
