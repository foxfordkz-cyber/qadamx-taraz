"""Launch an isolated Stage 13 demo without stopping any existing demo or resetting SQL."""

import argparse
import json
import os
import shutil
import socket
import subprocess
import sys
import time
from pathlib import Path

from tools.stage10_eval.demo import ROOT, validate_database, wait_ready


def validate_ports(api, web):
    if api == web or any(p < 1024 or p > 65535 or p in (8322, 4303) for p in (api, web)):
        raise ValueError("Use distinct high ports; Stage 12 ports 8322/4303 are reserved")


def reject_dotenv(root):
    for directory in (root / "apps/api", root / "apps/web"):
        for path in directory.glob(".env*"):
            if path.name != ".env.example":
                raise ValueError("Use a clean checkout without local .env files for offline QA")


def offline_environment(environ, database, api, web):
    validate_database(database)
    validate_ports(api, web)
    # Never inherit provider credentials, production URLs or frontend VITE settings.
    prefixes = ("VITE_", "AI_", "OPENAI_", "SUPABASE_", "JWT_", "DEMO_OWNER_", "STORAGE_")
    env = {k: v for k, v in environ.items() if not k.upper().startswith(prefixes)}
    env.update(
        PYTHONPATH=".",
        PYTHONUTF8="1",
        RESEARCH_TEST_DATABASE_URL=database,
        DATABASE_URL=database,
        TEST_DATABASE_URL="",
        QA_STAGING_API_PORT=str(api),
        QA_STAGING_WEB_PORT=str(web),
        AI_PROVIDER="gemini",
        AI_API_KEY="",
        OPENAI_API_KEY="",
        AI_FALLBACK_OPENAI="false",
        SUPABASE_URL="",
        JWT_ISSUER="",
        JWT_AUDIENCE="",
        ALLOWED_ORIGINS="[]",
        ASSISTANT_ENABLED="false",
        LIVESTOCK_DEMO_MODE="true",
        VITE_API_BASE_URL=f"http://127.0.0.1:{api}/api/v1",
        VITE_SUPABASE_URL=f"http://127.0.0.1:{api}",
        VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_local_qa_only",
        VITE_ASSISTANT_ENABLED="true",
        VITE_CUSTOMER_IDS_ENABLED="true",
    )
    return env


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database-url", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--api-port", type=int, default=8333)
    parser.add_argument("--web-port", type=int, default=4313)
    args = parser.parse_args()
    url = validate_database(args.database_url)
    validate_ports(args.api_port, args.web_port)
    reject_dotenv(ROOT)
    output = args.output.resolve()
    if (ROOT / "tmp").resolve() not in output.parents or output.exists():
        parser.error("Use a NEW directory under this checkout's ignored tmp/")
    for port in (args.api_port, args.web_port):
        with socket.socket() as probe:
            if probe.connect_ex(("127.0.0.1", port)) == 0:
                parser.error(f"Port {port} is occupied; no existing process is stopped")
    node = shutil.which("node")
    vite = ROOT / "apps/web/node_modules/vite/bin/vite.js"
    if not node or not vite.exists():
        parser.error("Run npm ci in apps/web first")
    env = offline_environment(os.environ, args.database_url, args.api_port, args.web_port)
    output.mkdir(parents=True)
    flags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
    processes, logs = [], []
    try:
        for name, command, cwd, ready_url in (
            (
                "api",
                [sys.executable, "tests/stage13_browser_server.py"],
                ROOT / "apps/api",
                f"http://127.0.0.1:{args.api_port}/__qa/info",
            ),
            (
                "web",
                [
                    node,
                    str(vite),
                    "--host",
                    "127.0.0.1",
                    "--port",
                    str(args.web_port),
                    "--strictPort",
                ],
                ROOT / "apps/web",
                f"http://127.0.0.1:{args.web_port}/login",
            ),
        ):
            log = (output / f"{name}.log").open("w", encoding="utf-8")
            logs.append(log)
            process = subprocess.Popen(
                command,
                cwd=cwd,
                env=env,
                stdout=log,
                stderr=subprocess.STDOUT,
                creationflags=flags,
            )
            processes.append(process)
            wait_ready(ready_url, process)
        ready = {
            "url": f"http://127.0.0.1:{args.web_port}/login",
            "api": f"http://127.0.0.1:{args.api_port}",
            "database": url.database,
            "source": subprocess.check_output(
                ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
            ).strip(),
            "mode": "OFFLINE AI / synthetic SQL / local signed JWT; NOT live Supabase or AI",
            "api_pid": processes[0].pid,
            "web_pid": processes[1].pid,
        }
        (output / "ready.json").write_text(json.dumps(ready, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(ready, indent=2), flush=True)
        print("Local fixture: a@research.example.test / synthetic-local-only", flush=True)
        print("Ctrl+C stops only owned children; SQL is retained.", flush=True)
        while all(p.poll() is None for p in processes):
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        for process in reversed(processes):
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=5)
        for log in logs:
            log.close()


if __name__ == "__main__":
    main()
