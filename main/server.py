"""SeaScribe -- HTTP server entry point
Usage: python server.py 9060
"""
import http.server
import json
import os
import sys
from socketserver import ThreadingMixIn
from urllib.parse import urlparse, parse_qs

BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE)

from server.config import PORT, ROOT, MAX_BODY, MAX_BODY_API, TEXT_EXTS
from server.routes import GET_HANDLERS, POST_HANDLERS

os.chdir(ROOT)


class ThreadedHTTPServer(ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        **{k: v + "; charset=utf-8" for k, v in TEXT_EXTS.items()}
    }

    def translate_path(self, path):
        if path.startswith("/main/"):
            path = "/main/client/" + path[len("/main/"):]
        elif path.startswith("/admin/"):
            path = "/main/admin/" + path[len("/admin/"):]
        return super().translate_path(path)

    def send_json(self, status, data):
        try:
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(data, ensure_ascii=False).encode())
        except (ConnectionAbortedError, BrokenPipeError, ConnectionResetError):
            pass

    def read_body(self, max_size=MAX_BODY_API):
        cl = int(self.headers.get("Content-Length", 0))
        if cl > max_size:
            self.send_json(413, {"error": "请求体过大"})
            return None
        return self.rfile.read(cl) if cl > 0 else b""

    def set_session_cookie(self, token):
        self.send_header("Set-Cookie",
            "seascribe_token=" + token + "; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=14400")

    def do_GET(self):
        try:
            self._do_GET()
        except Exception:
            import traceback
            traceback.print_exc()
            try:
                self.send_json(500, {"error": "服务器内部错误"})
            except Exception:
                pass

    def _do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)

        if path.startswith("/admin/_store/") and not path.startswith("/admin/_store/avatars/"):
            self.send_error(403, "Forbidden")
            return

        if path == "/favicon.ico":
            self.send_response(301)
            self.send_header("Location", "/main/logo.png")
            self.end_headers()
            return

        for handler in GET_HANDLERS:
            if handler(path, self, params):
                return

        super().do_GET()

    def do_POST(self):
        try:
            self._do_POST()
        except Exception:
            import traceback
            traceback.print_exc()
            try:
                self.send_json(500, {"error": "服务器内部错误"})
            except Exception:
                pass

    def _do_POST(self):
        path = urlparse(self.path).path

        if path.startswith("/admin/_store/"):
            self.send_error(403, "Forbidden")
            return

        body = self.read_body()
        if body is None:
            return

        for handler in POST_HANDLERS:
            if handler(path, body, self):
                return

        self.send_error(404, "Not Found")

    def list_directory(self, path):
        self.send_error(404, "Not Found")


if __name__ == "__main__":
    print("SeaScribe -> http://localhost:" + str(PORT))
    print("  Admin: http://localhost:" + str(PORT) + "/admin/")
    ThreadedHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
