#!/usr/bin/env python3
"""Serve the Hanzi-only Mario learning app without a build step."""

from __future__ import annotations

import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent


class LearningAppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        path = urlsplit(self.path).path
        if path == "/" or path.endswith(".html"):
            self.send_header("Cache-Control", "no-cache, must-revalidate")
            self.send_header("Pragma", "no-cache")
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description="Mario Hanzi learning app local server")
    parser.add_argument("--bind", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=5177)
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.bind, args.port), LearningAppHandler)
    print(f"Mario Hanzi learning app: http://{args.bind}:{args.port}/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
