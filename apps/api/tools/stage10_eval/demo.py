"""Start the real local application with guarded SQL, local auth and OFFLINE AI."""

import argparse
import json
import os
import shutil
import socket
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[4]


def validate_database(raw):
    url = make_url(raw)
    if (
        url.host != "127.0.0.1"
        or url.port is None
        or not url.database
        or not url.database.startswith("qadam_research_browser_")
        or not url.database.endswith("_test")
    ):
        raise ValueError("Only a NEW EMPTY named loopback qadam_research_browser_*_test DB")
    return url


def wait_ready(url, process):
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError("Demo process exited; inspect local logs (existing DB is preserved)")
        try:
            with urlopen(url, timeout=1) as response:
                if response.status == 200:
                    return
        except (URLError, TimeoutError):
            pass
        time.sleep(0.2)
    raise RuntimeError("Demo readiness timeout; inspect local logs")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database-url", required=True, help="Dedicated NEW EMPTY local test DB")
    parser.add_argument("--output", type=Path, required=True, help="New local directory under tmp/")
    args = parser.parse_args()
    url = validate_database(args.database_url)
    output = args.output.resolve()
    if (ROOT / "tmp").resolve() not in output.parents or output.exists():
        parser.error("Use a NEW output directory under this checkout's ignored tmp/")
    for port in (8322, 4303):
        with socket.socket() as probe:
            if probe.connect_ex(("127.0.0.1", port)) == 0:
                parser.error(f"Port {port} is already occupied; no existing process is stopped")
    node = shutil.which("node")
    vite = ROOT / "apps/web/node_modules/vite/bin/vite.js"
    if not node or not vite.exists():
        parser.error("Install locked frontend dependencies first")
    output.mkdir(parents=True)
    env = {
        **os.environ,
        "PYTHONPATH": ".",
        "RESEARCH_TEST_DATABASE_URL": args.database_url,
        "VITE_API_BASE_URL": "http://127.0.0.1:8322/api/v1",
        "VITE_SUPABASE_URL": "http://127.0.0.1:8322",
        "VITE_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_local_qa_only",
        "VITE_ASSISTANT_ENABLED": "true",
        "VITE_CUSTOMER_IDS_ENABLED": "true",
    }
    flags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
    processes = []
    logs = []
    try:
        api_log = (output / "api.log").open("w", encoding="utf-8")
        logs.append(api_log)
        api = subprocess.Popen(
            [sys.executable, "tests/final_browser_server.py"],
            cwd=ROOT / "apps/api",
            env=env,
            stdout=api_log,
            stderr=subprocess.STDOUT,
            creationflags=flags,
        )
        processes.append(api)
        wait_ready("http://127.0.0.1:8322/__qa/info", api)
        web_log = (output / "web.log").open("w", encoding="utf-8")
        logs.append(web_log)
        web = subprocess.Popen(
            [node, str(vite), "--host", "127.0.0.1", "--port", "4303", "--strictPort"],
            cwd=ROOT / "apps/web",
            env=env,
            stdout=web_log,
            stderr=subprocess.STDOUT,
            creationflags=flags,
        )
        processes.append(web)
        wait_ready("http://127.0.0.1:4303/login", web)
        ready = {
            "url": "http://127.0.0.1:4303/login",
            "database": url.database,
            "source": subprocess.check_output(
                ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
            ).strip(),
            "mode": "OFFLINE AI / synthetic SQL / local JWT issuer; not Supabase or live AI",
            "api_pid": api.pid,
            "web_pid": web.pid,
        }
        (output / "ready.json").write_text(json.dumps(ready, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(ready, indent=2), flush=True)
        print("Local-only login: a@research.example.test / synthetic-local-only", flush=True)
        print("Ctrl+C stops only these child processes; database is preserved.", flush=True)
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
