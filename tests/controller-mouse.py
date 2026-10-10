import http.client
import json
from pathlib import Path
import sys
import threading
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from controller_mouse import MouseEngine, ControllerMouse, VIEW, A, B
from server import LearningAppHandler, ThreadingHTTPServer


class MouseTests(unittest.TestCase):
    def test_toggle_output_and_safety(self):
        calls = []
        e = MouseEngine(lambda *args: calls.append(args))
        def step(buttons=0, x=0, y=0, now=1, active=True, alive=True, slot=0):
            e.step({slot: (buttons, x, y)}, active, alive, now, .02)
        step(VIEW)  # Held on first connection.
        self.assertEqual(e.mode, "web")
        step(); step(VIEW, active=False)
        self.assertEqual(e.mode, "web")
        step(); step(VIEW)
        self.assertEqual(e.mode, "system")
        step(VIEW); step(A, x=1)  # Held entry cannot click or move.
        self.assertEqual(calls, [])
        step(); step(x=1, y=1)
        self.assertEqual(calls[-1][0], "move")
        self.assertGreater(calls[-1][1], 0); self.assertLess(calls[-1][2], 0)
        step(A); step(A)
        self.assertEqual(sum(call[0] == "left" for call in calls), 1)
        step(); step(B)
        self.assertEqual(calls[-1][0], "right")
        step(); step(VIEW, active=False)
        self.assertEqual(e.mode, "web", "View exits even away from browser")
        step(VIEW); self.assertEqual(e.mode, "web")
        step(); step(VIEW); step(); step(alive=False)
        self.assertEqual(e.mode, "web")
        step(); step(VIEW); step(); step(now=122)
        self.assertEqual(e.mode, "web", "Idle mouse returns safely")
        step(); step(VIEW); e.step({}, True, True, 1, .02)
        self.assertEqual(e.mode, "web")
        step(VIEW); self.assertEqual(e.mode, "web", "Reconnect-held View ignored")

    def test_other_slot_and_shoulders(self):
        calls = []
        e = MouseEngine(lambda *args: calls.append(args))
        e.step({0: (0, 0, 0), 2: (0, 0, 0)}, True, True, 1, .02)
        e.step({0: (0x0200, 0, 0), 2: (0, 0, 0)}, True, True, 1, .02)  # RB != View
        self.assertEqual(e.mode, "web"); self.assertEqual(calls, [])
        e.step({0: (0, 0, 0), 2: (VIEW, 0, 0)}, True, True, 1, .02)
        self.assertEqual(e.slot, 2)
        e.step({0: (A, 1, 1), 2: (0, 0, 0)}, False, True, 1, .02)
        self.assertEqual(calls, [])

    def test_api_presence_only(self):
        server = ThreadingHTTPServer(("127.0.0.1", 0), LearningAppHandler)
        server.controller_mouse = ControllerMouse(disabled=True)
        thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
        host = f"127.0.0.1:{server.server_port}"
        try:
            good = {"client": "abcdefgh-12345678", "active": True}
            for data, headers, expected in (
                (good, {"Origin": "http://" + host}, 200), (good, {}, 403),
                (good, {"Origin": "https://other.test"}, 403),
                ({**good, "click": True}, {"Origin": "http://" + host}, 400),
                ({**good, "active": "yes"}, {"Origin": "http://" + host}, 400),
                ({**good, "client": "short"}, {"Origin": "http://" + host}, 400),
                (good, {"Host": "other.test", "Origin": "http://other.test"}, 403),
                (good, {"Origin": "http://" + host, "Content-Type": "text/plain"}, 400),
            ):
                conn = http.client.HTTPConnection("127.0.0.1", server.server_port)
                conn.request("POST", "/api/controller-mouse", json.dumps(data), {"Content-Type": "application/json", **headers})
                response = conn.getresponse(); self.assertEqual(response.status, expected)
                if expected == 200:
                    self.assertEqual(json.loads(response.read()), {"supported": False, "mode": "web"})
                    self.assertEqual(response.getheader("Cache-Control"), "no-store")
                else:
                    response.read()
                conn.close()
            self.assertIsNone(server.controller_mouse.worker, "Test server never activates desktop output")
        finally:
            server.controller_mouse.close(); server.shutdown(); server.server_close(); thread.join()

    def test_failure_and_client_limit(self):
        def fail_read():
            raise OSError("device failed")
        calls = []
        service = ControllerMouse(io_factory=lambda: (fail_read, lambda *args: calls.append(args)))
        try:
            service.attach("abcdefgh-12345678", True)
            service.worker.join(timeout=1)
            self.assertEqual(service.status(), {"supported": False, "mode": "web"})
            self.assertEqual(calls, [])
        finally:
            service.close()
        limited = ControllerMouse(disabled=True)
        with patch("controller_mouse.time.monotonic", return_value=10):
            for i in range(16):
                limited.attach(str(i), True)
            with self.assertRaises(ValueError):
                limited.attach("other", True)
        with patch("controller_mouse.time.monotonic", return_value=16):
            self.assertEqual(limited.attach("other", True)["mode"], "web")


if __name__ == "__main__":
    unittest.main()
