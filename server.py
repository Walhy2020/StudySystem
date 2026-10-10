#!/usr/bin/env python3
"""Serve the local learning app without a build step or generation API."""
from __future__ import annotations
import argparse
import ipaddress
import json
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, unquote
from controller_battery import read_controller_batteries
from controller_mouse import ControllerMouse

ROOT = Path(__file__).resolve().parent

class LearningAppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def private_path(self):
        path = unquote(urlsplit(self.path).path)
        return path.startswith("/api/") or any(part.startswith(".") for part in path.split("/") if part)

    def do_GET(self):
        if urlsplit(self.path).path == "/api/controller-mouse":
            if not self.local_request():
                return self.send_error(403)
            return self.json_response(self.server.controller_mouse.status())
        if urlsplit(self.path).path == "/api/controller-battery":
            return self.controller_battery()
        if self.private_path():
            return self.send_error(404)
        return super().do_GET()

    def local_request(self, require_origin=False):
        # No CORS or LAN access, even if the server binds 0.0.0.0.
        host = self.headers.get("Host", "")
        origin = self.headers.get("Origin")
        try:
            local_host = urlsplit("//" + host).hostname
            host_ok = local_host == "localhost" or ipaddress.ip_address(local_host).is_loopback
            peer_ok = ipaddress.ip_address(self.client_address[0]).is_loopback
        except (ValueError, TypeError):
            host_ok = peer_ok = False
        return host_ok and peer_ok and (origin == "http://" + host if require_origin else not origin or origin == "http://" + host)

    def do_POST(self):
        if urlsplit(self.path).path != "/api/controller-mouse":
            return self.send_error(404)
        if not self.local_request(require_origin=True):
            return self.send_error(403)
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 256 or self.headers.get("Content-Type") != "application/json" or self.headers.get("Transfer-Encoding"):
                raise ValueError()
            self.connection.settimeout(2)
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict) or set(data) != {"client", "active"} or type(data["active"]) is not bool or not isinstance(data["client"], str) or not re.fullmatch(r"[a-zA-Z0-9-]{16,64}", data["client"]):
                raise ValueError()
            return self.json_response(self.server.controller_mouse.attach(data["client"], data["active"]))
        except (ValueError, OSError):
            return self.send_error(400)

    def controller_battery(self):
        if not self.local_request():
            return self.send_error(403)
        return self.json_response(read_controller_batteries())

    def json_response(self, data):
        payload = json.dumps(data).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_HEAD(self):
        if self.private_path():
            return self.send_error(404)
        return super().do_HEAD()

    def list_directory(self, path):
        self.send_error(403, "Directory listing disabled")
        return None

    def end_headers(self):
        path = urlsplit(self.path).path
        if path == "/" or path.endswith(".html"):
            self.send_header("Cache-Control", "no-cache, must-revalidate")
            self.send_header("Pragma", "no-cache")
        super().end_headers()

def main():
    parser = argparse.ArgumentParser(description="Mario learning app local server")
    parser.add_argument("--bind", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=5177)
    parser.add_argument("--disable-system-mouse", action="store_true", help="Disable native controller mouse (e.g. isolated acceptance server)")
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.bind, args.port), LearningAppHandler)
    server.controller_mouse = ControllerMouse(disabled=args.disable_system_mouse)
    print(f"Mario learning app: http://{args.bind}:{args.port}/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.controller_mouse.close()
        server.server_close()

if __name__ == "__main__":
    main()
