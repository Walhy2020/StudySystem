import http.client
import json
from pathlib import Path
import sys
import threading
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from controller_mouse import MouseEngine, ControllerMouse, VIEW, A, B
from server import LearningAppHandler, ThreadingHTTPServer, LearningHTTPServer
from controller_pointer_guard import MotionPolicy


class FakeGuard:
    installed = True

    def __init__(self):
        self.closed = False
        self.updates = []
        self.updated = threading.Event()

    def authorize(self, client, active):
        self.authorization = (client, active)

    def update(self, mode, connected):
        self.updates.append((mode, connected))
        self.updated.set()

    def close(self):
        self.closed = True


class MouseTests(unittest.TestCase):
    def test_desktop_without_page_and_view_only_inside_learning(self):
        calls = []
        e = MouseEngine(lambda *args: calls.append(args), desktop=True)
        def step(buttons=0, x=0, focused=False, active=False, slot=0):
            e.step({slot: (buttons, x, 0)}, active, focused, 10, .02, focused=focused)
        step(VIEW, x=1)
        self.assertEqual(e.mode, "system")
        self.assertEqual(calls, [], "Held connection cannot emit until neutral")
        step(); step(x=1); step(A)
        self.assertEqual([call[0] for call in calls], ["move", "left"])
        step(); step(VIEW); step()
        self.assertEqual(e.mode, "system", "View outside learning never disables desktop mouse")
        step(focused=True, active=True)
        self.assertEqual(e.mode, "web", "Entering learning initially uses web cursor")
        step(A, x=1, focused=True, active=True)
        self.assertEqual(len(calls), 2)
        step(focused=True, active=True); step(VIEW, focused=True, active=True)
        self.assertEqual(e.mode, "system")
        step(focused=True, active=True); step(x=1, focused=True, active=True)
        self.assertEqual(len(calls), 3)
        step(focused=True, active=True); step(VIEW, focused=True, active=True)
        self.assertEqual(e.mode, "web")
        step(A, x=1)
        self.assertEqual(e.mode, "system", "Leaving learning restores desktop automatically")
        self.assertEqual(len(calls), 3, "Held transition cannot click desktop")
        step(); step(x=1)
        self.assertEqual(len(calls), 4)
        step(focused=True, active=True)
        self.assertEqual(e.mode, "web", "Returning retains page's web selection")

    def test_desktop_capture_disconnect_and_new_slot(self):
        calls = []
        e = MouseEngine(lambda *args: calls.append(args), desktop=True)
        def step(buttons=0, x=0, focused=True, active=True, slot=0):
            e.step({slot: (buttons, x, 0)}, active, True, 10, .02, focused=focused)
        step(); step(VIEW); step()
        self.assertEqual(e.mode, "system")
        step(A, x=1, active=False)
        self.assertEqual(calls, [], "Capture has focus but must suppress desktop input")
        step(A, x=1)
        self.assertEqual(calls, [], "Capture release requires neutral before output")
        step(); step(A)
        self.assertEqual(len(calls), 1)
        e.step({}, False, False, 11, .02, focused=False)
        step(VIEW, x=1, focused=False, active=False, slot=2)
        self.assertEqual(e.mode, "system")
        self.assertEqual(len(calls), 1)
        step(focused=False, active=False, slot=2)
        step(x=1, focused=False, active=False, slot=2)
        self.assertEqual(len(calls), 2, "Wireless replacement slot recovers without page")

    def test_desktop_service_starts_before_any_http_client(self):
        calls, guard = [], FakeGuard()
        service = ControllerMouse(desktop=True, io_factory=lambda: (lambda: {}, lambda *args: calls.append(args)), guard_factory=lambda: guard)
        try:
            self.assertTrue(guard.updated.wait(1))
            self.assertEqual(service.clients, {})
            self.assertTrue(service.worker.is_alive())
            self.assertEqual(service.status()["mode"], "system")
            self.assertEqual(calls, [])
        finally:
            service.close()
        disabled = ControllerMouse(disabled=True, desktop=True)
        self.assertIsNone(disabled.worker, "Acceptance flag always prevents desktop output")

    def polled_service(self, emit):
        service = ControllerMouse(disabled=True)
        service.engine = MouseEngine(emit)
        service.guard = FakeGuard()
        import time
        service.clients = {"test-client": (time.monotonic(), True)}
        return service

    def test_read_error_recovers_without_replaying_held_view(self):
        import time
        calls = []
        service = self.polled_service(lambda *args: calls.append(args))
        def read_error():
            raise OSError("wireless transition")
        last, fresh = service.poll_once(read_error, time.monotonic())
        self.assertFalse(fresh)
        self.assertEqual(service.reason, "controller-read-failed")
        self.assertEqual(service.guard.updates[-1], ("web", False))
        def poll(buttons):
            nonlocal last
            last, fresh = service.poll_once(lambda: {1: (buttons, 0, 0)}, last)
            self.assertTrue(fresh)
        poll(VIEW)
        self.assertTrue(service.supported)
        self.assertEqual(service.reason, "")
        self.assertEqual(service.guard.updates[-1], ("web", True))
        self.assertEqual(service.engine.mode, "web", "Reconnect-held View ignored on new slot")
        poll(0); poll(VIEW)
        self.assertEqual(service.engine.mode, "system", "Fresh press works after reconnection")
        self.assertEqual(calls, [])

    def test_slow_read_is_discarded_then_guard_recovers(self):
        service = self.polled_service(lambda *args: self.fail("No desktop output"))
        with patch("controller_mouse.time.monotonic", side_effect=[10, 10.3]):
            last, fresh = service.poll_once(lambda: {0: (VIEW, 1, 1)}, 9)
        self.assertFalse(fresh)
        self.assertEqual(service.reason, "controller-read-timeout")
        self.assertEqual(service.engine.previous, {})
        with patch("controller_mouse.time.monotonic", side_effect=[11, 11.01]):
            _, fresh = service.poll_once(lambda: {0: (VIEW, 1, 1)}, last)
        self.assertTrue(fresh)
        self.assertEqual(service.engine.mode, "web")
        self.assertEqual(service.guard.updates[-1], ("web", True))

    def test_rejected_output_never_retries_but_web_guard_survives(self):
        import time
        calls = []
        def rejected(*args):
            calls.append(args)
            raise OSError("output rejected")
        service = self.polled_service(rejected)
        service.engine.mode, service.engine.slot, service.engine.armed = "system", 0, True
        service.engine.started = service.engine.last_input = time.monotonic()
        last, _ = service.poll_once(lambda: {0: (0, 1, 0)}, time.monotonic() - .03)
        self.assertEqual(len(calls), 1)
        self.assertEqual(service.reason, "native-output-failed")
        self.assertEqual(service.guard.updates[-1], ("web", True))
        service.poll_once(lambda: {0: (A, 1, 0)}, last)
        self.assertEqual(len(calls), 1, "Never automatically retry rejected mouse injection")
        self.assertFalse(service.supported)

    def test_injected_motion_only_in_active_web_window(self):
        policy = MotionPolicy()
        policy.web, policy.connected = True, True
        policy.authorize("page", True, 123, 10)
        self.assertTrue(policy.blocks(0x0200, 1, 123, 10.5))
        for message, flags, window, now in ((0x0200, 0, 123, 10.5),
                                           (0x020A, 1, 123, 10.5),
                                           (0x0200, 1, 456, 10.5),
                                           (0x0200, 1, 123, 11)):
            self.assertFalse(policy.blocks(message, flags, window, now))
        policy.web = False
        self.assertFalse(policy.blocks(0x0200, 1, 123, 10.5), "System mode passes immediately")
        policy.web, policy.connected = True, False
        self.assertFalse(policy.blocks(0x0200, 1, 123, 10.5), "Disconnect releases guard")
        policy.connected = True
        policy.authorize("inactive-frame", False, 123, 10.5)
        self.assertTrue(policy.blocks(0x0200, 1, 123, 10.5), "Dormant frame cannot clear active lease")
        policy.authorize("page", False, 123, 10.5)
        self.assertFalse(policy.blocks(0x0200, 1, 123, 10.5), "Blur/capture releases guard")

    def test_web_mode_blocks_injected_click_pairs_but_preserves_physical_and_system_clicks(self):
        policy = MotionPolicy()
        policy.web = policy.connected = True
        policy.authorize("snake", True, 123, 10)
        for down, up in ((0x0201, 0x0202), (0x0204, 0x0205), (0x0207, 0x0208), (0x020B, 0x020C)):
            self.assertFalse(policy.blocks(down, 0, 123, 10.1), "Hardware down always passes")
            self.assertTrue(policy.blocks(down, 1, 123, 10.1), "JoyXoff down cannot click while playing")
            self.assertFalse(policy.blocks(up, 0, 123, 10.1), "Hardware up always passes")
            self.assertTrue(policy.blocks(up, 1, 123, 10.1))
        policy.web = False
        self.assertFalse(policy.blocks(0x0204, 1, 123, 10.1), "System mode allows right click")
        policy.web = True
        self.assertFalse(policy.blocks(0x0205, 1, 123, 10.1), "Do not strand an allowed down across View")
        self.assertTrue(policy.blocks(0x0204, 1, 123, 10.2))
        policy.web = False
        self.assertTrue(policy.blocks(0x0205, 1, 456, 12), "Rejected down's up remains rejected after blur/expiry/View")
        self.assertFalse(policy.blocks(0x0204, 1, 456, 12), "Outside application remains usable")

    def test_duplicate_learning_server_cannot_own_same_port(self):
        server = LearningHTTPServer(("127.0.0.1", 0), LearningAppHandler)
        try:
            with self.assertRaises(OSError):
                duplicate = LearningHTTPServer(server.server_address, LearningAppHandler)
                duplicate.server_close()
        finally:
            server.server_close()

    def test_only_injected_escape_is_filtered_in_web_mode(self):
        policy = MotionPolicy()
        policy.web = policy.connected = True
        policy.authorize("snake", True, 123, 10)
        self.assertFalse(policy.blocks_key(0x0100, 0x1B, 0, 123, 10.1), "Physical Escape stays usable")
        self.assertFalse(policy.blocks_key(0x0100, 0x42, 0x10, 123, 10.1), "Keyboard B and other keys pass")
        self.assertTrue(policy.blocks_key(0x0100, 0x1B, 0x10, 123, 10.1), "Injected controller Escape cannot leave fullscreen")
        self.assertTrue(policy.blocks_key(0x0100, 0x1B, 0x10, 123, 10.2), "Held Escape remains suppressed")
        self.assertFalse(policy.blocks_key(0x0101, 0x1B, 0, 123, 10.2), "Physical key up passes")
        policy.web = False
        self.assertTrue(policy.blocks_key(0x0101, 0x1B, 0x10, 456, 12), "Rejected pair survives View/blur/lease expiry")
        self.assertFalse(policy.blocks_key(0x0100, 0x1B, 0x10, 123, 10.1), "System mode passes")
        policy.web = True
        self.assertFalse(policy.blocks_key(0x0101, 0x1B, 0x10, 123, 10.1), "Allowed down's up passes")
        self.assertFalse(policy.blocks_key(0x0100, 0x1B, 0x10, 456, 10.1), "Other windows pass")
        self.assertFalse(policy.blocks_key(0x0100, 0x1B, 0x10, 123, 11), "Expired lease passes")

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
                ({**good, "focused": True}, {"Origin": "http://" + host}, 200),
                ({**good, "active": False, "focused": True}, {"Origin": "http://" + host}, 200),
                ({**good, "focused": False}, {"Origin": "http://" + host}, 400),
                ({**good, "focused": "yes"}, {"Origin": "http://" + host}, 400),
                ({**good, "client": "short"}, {"Origin": "http://" + host}, 400),
                (good, {"Host": "other.test", "Origin": "http://other.test"}, 403),
                (good, {"Origin": "http://" + host, "Content-Type": "text/plain"}, 400),
            ):
                conn = http.client.HTTPConnection("127.0.0.1", server.server_port)
                conn.request("POST", "/api/controller-mouse", json.dumps(data), {"Content-Type": "application/json", **headers})
                response = conn.getresponse(); self.assertEqual(response.status, expected)
                if expected == 200:
                    self.assertEqual(json.loads(response.read()), {"supported": False, "mode": "web", "motionGuard": False, "reason": "disabled"})
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
        guard = FakeGuard()
        service = ControllerMouse(io_factory=lambda: (fail_read, lambda *args: calls.append(args)), guard_factory=lambda: guard)
        try:
            service.attach("abcdefgh-12345678", True)
            self.assertTrue(guard.updated.wait(timeout=1))
            self.assertTrue(service.worker.is_alive(), "Transient read failure cannot kill hotplug worker")
            self.assertEqual(service.status(), {"supported": False, "mode": "web", "motionGuard": True, "reason": "controller-read-failed"})
            self.assertEqual(guard.updates[-1], ("web", False), "Read failure releases guard until fresh connection")
            self.assertEqual(guard.authorization, ("abcdefgh-12345678", True))
            self.assertEqual(calls, [])
        finally:
            service.close()
        self.assertTrue(guard.closed)
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
