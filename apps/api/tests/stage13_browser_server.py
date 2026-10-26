"""Stage 13 isolated ports; inherits production API/SQL with explicit offline fixtures."""

import os
import sys

import final_browser_server as previous
import research_browser_server as fixture
import uvicorn
from diploma_browser_server import sql_snapshot
from starlette.middleware.cors import CORSMiddleware

from tools.stage13_staging.demo import ROOT, offline_environment, reject_dotenv


def candidate(api, web):
    reject_dotenv(ROOT)
    env = offline_environment(os.environ, os.environ["RESEARCH_TEST_DATABASE_URL"], api, web)
    os.environ.clear()
    os.environ.update(env)
    fixture.ORIGIN = f"http://127.0.0.1:{api}"
    app = previous.candidate()
    for middleware in app.user_middleware:
        if middleware.cls is CORSMiddleware:
            middleware.kwargs["allow_origins"] = [f"http://127.0.0.1:{web}"]
    return app


if __name__ == "__main__":
    if "--verify" in sys.argv:
        sql_snapshot()
    else:
        api_port = int(os.environ.get("QA_STAGING_API_PORT", "8333"))
        web_port = int(os.environ.get("QA_STAGING_WEB_PORT", "4313"))
        uvicorn.run(
            candidate(api_port, web_port), host="127.0.0.1", port=api_port, access_log=False
        )
