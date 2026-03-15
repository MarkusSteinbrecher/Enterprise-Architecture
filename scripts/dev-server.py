#!/usr/bin/env python3
"""Dev server for EA Process page — serves docs/ and accepts POST to save sponsor input."""

import http.server
import json
import os
import sys
from pathlib import Path

DOCS_DIR = Path(__file__).resolve().parent.parent / "docs"
INPUT_FILE = DOCS_DIR / "data" / "ea-process-input.json"
V2_INPUT_FILE = DOCS_DIR / "data" / "ea-process-v2-inputs.json"

class DevHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DOCS_DIR), **kwargs)

    def _save_json(self, filepath, data, merge=True):
        existing = {}
        if merge and filepath.exists():
            try:
                existing = json.loads(filepath.read_text())
            except (json.JSONDecodeError, OSError):
                pass
        if merge:
            # Deep merge: top-level keys, then nested dicts
            for k, v in data.items():
                if isinstance(v, dict) and isinstance(existing.get(k), dict):
                    existing[k].update(v)
                else:
                    existing[k] = v
        else:
            existing = data
        filepath.write_text(json.dumps(existing, indent=2, ensure_ascii=False) + "\n")

    def do_POST(self):
        if self.path in ("/api/save-input", "/api/save-v2-inputs"):
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body)
            except json.JSONDecodeError:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b'{"error":"invalid json"}')
                return

            target = V2_INPUT_FILE if self.path == "/api/save-v2-inputs" else INPUT_FILE
            merge = self.path != "/api/save-v2-inputs"  # V2 sends full store, no merge needed
            self._save_json(target, data, merge=merge)

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": True}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    server = http.server.HTTPServer(("", port), DevHandler)
    server.socket.setsockopt(__import__('socket').SOL_SOCKET, __import__('socket').SO_REUSEADDR, 1)
    print(f"Dev server running at http://localhost:{port}")
    print(f"Serving: {DOCS_DIR}")
    print(f"Input saves to: {INPUT_FILE}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
