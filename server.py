"""
SeaScribe 静态服务器 + 插件文件列表 API
用法: python server.py 9360

API:
  /api/<name>-files → 列出 data/<name>/ 下所有文件，返回 JSON
  文件通过 /data/<name>/xxx 直接访问
"""
import http.server
import json
import os
import re
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 9360
ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, 'data')

# 为文本文件类型添加 UTF-8 charset
_TEXT_EXTS = {
    '.html': 'text/html',
    '.css':  'text/css',
    '.js':   'application/javascript',
    '.csv':  'text/csv',
    '.md':   'text/markdown',
    '.svg':  'image/svg+xml',
    '.json': 'application/json',
}

class Handler(http.server.SimpleHTTPRequestHandler):
    # 覆盖 extensions_map，为文本文件添加 charset
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        **{k: v + '; charset=utf-8' for k, v in _TEXT_EXTS.items()}
    }
    def do_GET(self):
        # /api/<plugin>-files → 列出 data/<plugin>/ 下文件
        m = re.match(r'^/api/(\w+)-files$', self.path)
        if m:
            name = m.group(1)
            dirpath = os.path.join(DATA, name)
            files = []
            if os.path.isdir(dirpath):
                for f in sorted(os.listdir(dirpath)):
                    filepath = os.path.join(dirpath, f)
                    if os.path.isfile(filepath):
                        files.append({'name': f, 'url': f'/data/{name}/{f}'})
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(files, ensure_ascii=False).encode())
            return

        # 其余走默认静态文件（包括 /data/ 下所有文件）
        super().do_GET()

    def list_directory(self, path):
        self.send_error(404, 'Not Found')

print(f'SeaScribe → http://localhost:{PORT}')
http.server.HTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
