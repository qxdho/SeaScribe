"""
SeaScribe — HTTP server entry point
Usage: python server.py 9360
"""
import http.server
import json
import os
import sys
from socketserver import ThreadingMixIn
from urllib.parse import urlparse, parse_qs

from server.config import PORT, ROOT, MAX_BODY, MAX_BODY_API, TEXT_EXTS
from server.routes import GET_HANDLERS, POST_HANDLERS


class ThreadedHTTPServer(ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        **{k: v + '; charset=utf-8' for k, v in TEXT_EXTS.items()}
    }

    # ── helpers ──

    def send_json(self, status, data):
        try:
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(data, ensure_ascii=False).encode())
        except (ConnectionAbortedError, BrokenPipeError, ConnectionResetError):
            pass

    def read_body(self, max_size=MAX_BODY_API):
        cl = int(self.headers.get('Content-Length', 0))
        if cl > max_size:
            self.send_json(413, {'error': '请求体过大'})
            return None
        return self.rfile.read(cl) if cl > 0 else b''

    def set_session_cookie(self, token):
        self.send_header('Set-Cookie',
            f'seascribe_token={token}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=14400')

    # ── GET ──

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)

        # block direct access to _store except avatars
        if path.startswith('/admin/_store/') and not path.startswith('/admin/_store/avatars/'):
            self.send_error(403, 'Forbidden')
            return

        # favicon redirect
        if path == '/favicon.ico':
            self.send_response(301)
            self.send_header('Location', '/main/logo.png')
            self.end_headers()
            return

        # API routes
        for handler in GET_HANDLERS:
            if handler(path, self, params):
                return

        # static file fallback
        super().do_GET()

    # ── POST ──

    def do_POST(self):
        path = urlparse(self.path).path

        # block direct access to _store
        if path.startswith('/admin/_store/'):
            self.send_error(403, 'Forbidden')
            return

        body = self.read_body()
        if body is None:
            return

        for handler in POST_HANDLERS:
            if handler(path, body, self):
                return

        self.send_error(404, 'Not Found')

    # ── misc ──

    def list_directory(self, path):
        self.send_error(404, 'Not Found')


# ── entry ──

if __name__ == '__main__':
    print(f'SeaScribe → http://localhost:{PORT}')
    print(f'  管理后台: http://localhost:{PORT}/admin/')
    ThreadedHTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
