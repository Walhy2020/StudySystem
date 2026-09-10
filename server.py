#!/usr/bin/env python3
"""Serve the Hanzi-only Mario learning app without a build step."""

from __future__ import annotations

import argparse
import json
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, unquote
from scenario_api import ScenarioService, ScenarioError


ROOT = Path(__file__).resolve().parent
SCENARIOS = ScenarioService(ROOT / ".local-scenarios")


class LearningAppHandler(SimpleHTTPRequestHandler):
    def json_response(self, code, data):
        payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def trusted_api(self, write=False):
        host = self.headers.get("Host", "")
        allowed = {f"127.0.0.1:{self.server.server_port}", f"localhost:{self.server.server_port}"}
        origin = self.headers.get("Origin")
        if self.client_address[0] not in ("127.0.0.1", "::1") or host not in allowed or (origin and origin != "http://" + host):
            self.json_response(403, {"error": "仅允许本机同源页面使用生成服务。"})
            return False
        if write and self.headers.get("X-Scenario-Token") != SCENARIOS.token:
            self.json_response(403, {"error": "页面连接已过期，请刷新后重试。"})
            return False
        return True

    def do_GET(self):
        path = unquote(urlsplit(self.path).path)
        if path.startswith("/api/scenarios"):
            if not self.trusted_api():
                return
            if path == "/api/scenarios/config":
                return self.json_response(200, SCENARIOS.status())
            if path == "/api/scenarios":
                return self.json_response(200, {"lessons": SCENARIOS.saved()})
            match = re.fullmatch(r"/api/scenarios/jobs/([a-zA-Z0-9-]{8,64})", path)
            if match:
                job = SCENARIOS.job(match[1])
                return self.json_response(200 if job else 404, job or {"error": "找不到生成任务。"})
            match = re.fullmatch(r"/api/scenarios/images/([a-zA-Z0-9-]{8,64})\.png", path)
            if match:
                image = SCENARIOS.root / (match[1] + ".png")
                if image.is_file():
                    payload = image.read_bytes()
                    self.send_response(200)
                    self.send_header("Content-Type", "image/png")
                    self.send_header("Content-Length", str(len(payload)))
                    self.end_headers()
                    self.wfile.write(payload)
                    return
            return self.json_response(404, {"error": "情景资源不存在。"})
        if any(part.startswith(".") for part in path.split("/") if part):
            return self.send_error(404)
        return super().do_GET()

    def do_HEAD(self):
        path = unquote(urlsplit(self.path).path)
        if path.startswith("/api/") or any(part.startswith(".") for part in path.split("/") if part):
            return self.send_error(404)
        return super().do_HEAD()

    def list_directory(self, path):
        self.send_error(403, "Directory listing disabled")
        return None

    def do_POST(self):
        if not self.trusted_api(write=True):
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 16000 or self.headers.get_content_type() != "application/json":
                return self.json_response(400, {"error": "请求内容无效或过长。"})
            body = json.loads(self.rfile.read(size))
            if not isinstance(body, dict):
                raise ScenarioError("请求格式无效。")
            path = urlsplit(self.path).path
            if path == "/api/scenarios/generate":
                if not SCENARIOS.status()["configured"]:
                    return self.json_response(503, {"error": "请配置 OPENAI_API_KEY 后重启本地服务。"})
                job_id = SCENARIOS.start(body.get("dialogue"), body.get("requestId"))
                return self.json_response(202, {"id": job_id})
            if path == "/api/scenarios/save":
                return self.json_response(200, {"lesson": SCENARIOS.save(body.get("id"))})
            return self.json_response(404, {"error": "接口不存在。"})
        except (ValueError, ScenarioError) as error:
            return self.json_response(400, {"error": str(error) if isinstance(error, ScenarioError) else "请求格式无效。"})
        except OSError:
            return self.json_response(500, {"error": "本地保存失败，请检查磁盘空间和文件夹权限。"})

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
