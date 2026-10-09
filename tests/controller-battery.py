import ctypes
import http.client
from pathlib import Path
import sys
import threading
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from controller_battery import BatteryInformation, read_controller_batteries
from server import LearningAppHandler, ThreadingHTTPServer


class BatteryTests(unittest.TestCase):
    def test_slots(self):
        for battery_type, expected in ((2, ["empty", "low", "medium", "full"]), (3, ["empty", "low", "medium", "full"]), (1, ["wired"] * 4), (255, ["unknown"] * 4)):
            calls = []
            def query(index, device_type, pointer):
                calls.append((index, device_type))
                info = ctypes.cast(pointer, ctypes.POINTER(BatteryInformation)).contents
                info.type, info.level = battery_type, index
                return 0
            result = read_controller_batteries(query)
            self.assertEqual(calls, [(i, 0) for i in range(4)])
            self.assertEqual([item["level"] for item in result["controllers"]], expected)
        self.assertEqual(read_controller_batteries(lambda *_: 1167)["controllers"], [])
        with patch("controller_battery.sys.platform", "linux"):
            self.assertFalse(read_controller_batteries()["supported"])

    def test_http(self):
        server = ThreadingHTTPServer(("127.0.0.1", 0), LearningAppHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            for path, headers, expected in (("/api/controller-battery", {}, 200), ("/api/controller-battery", {"Origin": "https://other.test"}, 403), ("/api/controller-battery", {"Host": "other.test"}, 403), ("/api/other", {}, 404), ("/.env", {}, 404)):
                conn = http.client.HTTPConnection("127.0.0.1", server.server_port)
                with patch("server.read_controller_batteries", return_value={"supported": True, "controllers": [{"slot": 1, "level": "low"}]}):
                    conn.request("GET", path, headers=headers)
                    response = conn.getresponse()
                    self.assertEqual(response.status, expected)
                    if expected == 200:
                        self.assertEqual(response.getheader("Cache-Control"), "no-store")
                        self.assertIn(b'"low"', response.read())
                    else:
                        response.read()
                conn.close()
        finally:
            server.shutdown(); server.server_close(); thread.join()


if __name__ == "__main__":
    unittest.main()
