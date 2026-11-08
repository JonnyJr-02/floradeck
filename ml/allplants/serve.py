"""Static server for bench.html: python ml/allplants/serve.py <folder> <port> [--isolated]

Without --isolated it behaves like GitHub Pages (no COOP/COEP headers, so WASM runs single-threaded);
with --isolated it sends the cross-origin isolation headers that enable WASM threads.
"""

from __future__ import annotations

import functools
import http.server
import sys


class Handler(http.server.SimpleHTTPRequestHandler):
    isolated = False

    def end_headers(self) -> None:
        if self.isolated:
            self.send_header("Cross-Origin-Opener-Policy", "same-origin")
            self.send_header("Cross-Origin-Embedder-Policy", "credentialless")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main() -> None:
    folder, port = sys.argv[1], int(sys.argv[2])
    Handler.isolated = "--isolated" in sys.argv
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(Handler, directory=folder))
    print(f"serving {folder} on http://127.0.0.1:{port} (isolated={Handler.isolated})", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
