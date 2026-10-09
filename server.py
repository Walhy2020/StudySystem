#!/usr/bin/env python3
"""Serve the local learning app without a build step or generation API."""
from __future__ import annotations
import argparse
import ipaddress
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, unquote
from controller_battery import read_controller_batteries

ROOT = Path(__file__).resolve().parent

class LearningAppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def private_path(self):
        path = unquote(urlsplit(self.path).path)
        return path.startswith("/api/") or any(part.startswith(".") for part in path.split("/") if part)

    def do_GET(self):
        if urlsplit(self.path).path == "/api/controller-battery":
            return self.controller_battery()
        if self.private_path():
            return self.send_error(404)
        return super().do_GET()

    def controller_battery(self):
        # No CORS, no device writes, and no LAN access even if the server binds 0.0.0.0.
        host = self.headers.get("Host", "")
        origin = self.headers.get("Origin")
        try:
            local_host = urlsplit("//" + host).hostname
            host_ok = local_host == "localhost" or ipaddress.ip_address(local_host).is_loopback
            peer_ok = ipaddress.ip_address(self.client_address[0]).is_loopback
        except ValueError:
            host_ok = peer_ok = False
        if not host_ok or not peer_ok or (origin and origin != "http://" + host):
            return self.send_error(403)
        payload = json.dumps(read_controller_batteries()).encode("utf-8")
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
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.bind, args.port), LearningAppHandler)
    print(f"Mario learning app: http://{args.bind}:{args.port}/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__ == "__main__":
    main()
