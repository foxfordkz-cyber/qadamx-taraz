#!/usr/bin/env python3
"""Serve the local 3D handoff QA tool and its explicitly allowed static assets.

Example (from repository root):
    python tools/assets/serve_assets.py --vendor ../qa-tools/node_modules

This is a development tool, not the public application or an API server.
"""

from __future__ import annotations

import argparse
import mimetypes
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit


REPO_ROOT = Path(__file__).resolve().parents[2]
PUBLIC_ROOT = REPO_ROOT / "apps" / "web" / "public"
VIEWER = Path(__file__).with_name("viewer.html")


def confined_file(root: Path, relative: str) -> Path | None:
    """Reject Windows/URL traversal and symlinks escaping the allowed root."""
    if "\\" in relative or ":" in relative or "\x00" in relative:
        return None
    if any(part in (".", "..") for part in relative.split("/")):
        return None
    base = root.resolve()
    candidate = (base / relative).resolve()
    if not candidate.is_relative_to(base) or not candidate.is_file():
        return None
    return candidate


def make_handler(vendor: Path) -> type[SimpleHTTPRequestHandler]:
    class AssetHandler(SimpleHTTPRequestHandler):
        def resolve_asset(self) -> Path | None:
            try:
                path = unquote(urlsplit(self.path).path, errors="strict")
            except (UnicodeDecodeError, ValueError):
                return None
            if path == "/":
                return VIEWER
            if path == "/venue-assets.json":
                return confined_file(PUBLIC_ROOT, "venue-assets.json")
            for prefix, root in (
                ("/models/", PUBLIC_ROOT / "models"),
                ("/previews/", PUBLIC_ROOT / "previews"),
                ("/__vendor/three/", vendor / "three"),
            ):
                if path.startswith(prefix):
                    return confined_file(root, path[len(prefix) :])
            return None

        def send_head(self):
            asset = self.resolve_asset()
            if asset is None:
                self.send_error(404, "Asset not found")
                return None
            try:
                stream = asset.open("rb")
            except OSError:
                self.send_error(404, "Asset not found")
                return None
            try:
                size = asset.stat().st_size
                content_type = {
                    ".js": "text/javascript; charset=utf-8",
                    ".json": "application/json; charset=utf-8",
                    ".glb": "model/gltf-binary",
                    ".webp": "image/webp",
                    ".html": "text/html; charset=utf-8",
                }.get(asset.suffix.lower()) or mimetypes.guess_type(asset.name)[0]
                self.send_response(200)
                self.send_header("Content-Type", content_type or "application/octet-stream")
                self.send_header("Content-Length", str(size))
                self.send_header("Cache-Control", "no-store")
                self.send_header("X-Content-Type-Options", "nosniff")
                self.send_header("Referrer-Policy", "no-referrer")
                self.end_headers()
                return stream
            except BaseException:
                stream.close()
                raise

    return AssetHandler


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--vendor", type=Path, required=True, help="node_modules directory containing three")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--bind", default="127.0.0.1")
    args = parser.parse_args()
    if not (args.vendor / "three" / "build" / "three.module.js").is_file():
        parser.error("--vendor must contain three/build/three.module.js")
    server = ThreadingHTTPServer((args.bind, args.port), make_handler(args.vendor.resolve()))
    print(f"Asset QA viewer: http://{args.bind}:{args.port}/", flush=True)
    print(f"Public assets: {PUBLIC_ROOT}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
