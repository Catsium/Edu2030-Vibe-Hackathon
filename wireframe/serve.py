"""Loopback-only server for the standalone design artifact and existing mascot."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
ALLOWED = [ROOT / 'wireframe', ROOT / 'extension' / 'mascot']


class PreviewHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        path = unquote(urlsplit(self.path).path)
        if path == '/':
            self.send_response(302)
            self.send_header('Location', '/wireframe/index.html')
            self.end_headers()
            return
        resolved = (ROOT / path.lstrip('/')).resolve()
        if not any(resolved.is_relative_to(folder) for folder in ALLOWED):
            self.send_error(404)
            return
        super().do_GET()

    def list_directory(self, path):
        self.send_error(404)
        return None


if __name__ == '__main__':
    print('Verity preview: http://127.0.0.1:5173/wireframe/index.html', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 5173), PreviewHandler).serve_forever()
