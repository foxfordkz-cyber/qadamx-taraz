"""Run Python with an explicit ignored env file, without printing its secrets.

Example: python scripts/with_env.py .env.local-postgres -m pytest -q
"""

import os
import subprocess
import sys

from dotenv import dotenv_values

if len(sys.argv) < 3:
    raise SystemExit("Usage: python scripts/with_env.py ENV_FILE PYTHON_ARGUMENTS...")
config = dotenv_values(sys.argv[1])
if not config:
    raise SystemExit("Configuration file missing or empty")
env = {**os.environ, **{key: value for key, value in config.items() if value is not None}}
raise SystemExit(subprocess.call([sys.executable, *sys.argv[2:]], env=env))
