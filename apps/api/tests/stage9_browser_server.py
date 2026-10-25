"""Stage9 local browser fixture. Real API/SQL, simulated OpenAI response body only."""

import json
import sys

import research_browser_server as fixture
import stage8_browser_server as previous
import uvicorn
from diploma_browser_server import sql_snapshot
from sqlalchemy.orm import Session
from starlette.middleware.cors import CORSMiddleware

from app.config import Settings
from app.models import Business, Customer
from app.seed import demo_id
from app.services.openai_provider import OpenAIProvider

PORT = 8321
fixture.ORIGIN = f"http://127.0.0.1:{PORT}"
CLEAR = "Саматтың дәптері 2715. Получено 915."
DUPLICATE = "Саматтың дәптері 2715. Получено 915. Тест повторного поля."
PAYLOAD = dict(
    transcript=CLEAR,
    kind="sale",
    customer_query="Самат",
    description="тетрадь",
    total_minor=271500,
    received_minor=91500,
    amount_minor=None,
    payment_status="partial",
    total_evidence="2715",
    payment_evidence="Получено 915",
    amount_evidence=None,
    uncertain_fields=[],
)


class ResponseBodyDouble(OpenAIProvider):
    """Keeps production OpenAI inner decoder; deliberately replaces HTTP transport."""

    async def post(self, client, path, model, **kwargs):
        assert path == "responses"
        text = json.loads(kwargs["json"]["input"])["text"]
        raw = json.dumps(PAYLOAD, ensure_ascii=False)
        if text == DUPLICATE:
            raw = raw[:-1] + ',"received_minor":271500}'
        return {
            "status": "completed",
            "output": [{"type": "message", "content": [{"type": "output_text", "text": raw}]}],
        }


def combined():
    app = previous.combined()
    original = app.state.ai
    adapter = ResponseBodyDouble(
        Settings(
            _env_file=None,
            openai_api_key="synthetic-not-a-provider-key",
            openai_model="gpt-fixture-only",
        )
    )

    class Combined:
        max_attempts = 1
        calls = 0

        async def generate(self, **kwargs):
            self.calls += 1
            provider = adapter if kwargs.get("text") in {CLEAR, DUPLICATE} else original
            return await provider.generate(**kwargs)

    app.state.ai = Combined()
    for middleware in app.user_middleware:
        if middleware.cls is CORSMiddleware:
            middleware.kwargs["allow_origins"] = ["http://127.0.0.1:4302"]
    with Session(app.state.engine) as db, db.begin():
        db.get(Business, fixture.EMPTY).name = "OFFLINE Stage9 · synthetic provider"
        for i in range(2):
            db.add(
                Customer(
                    id=demo_id(f"stage9-samat-{i}"), business_id=fixture.EMPTY, display_name="Самат"
                )
            )
        db.add(
            Customer(
                id=demo_id("stage9-foreign-samat"), business_id=fixture.OTHER, display_name="Самат"
            )
        )
    return app


if __name__ == "__main__":
    if "--verify" in sys.argv:
        sql_snapshot()
    else:
        uvicorn.run(combined(), host="127.0.0.1", port=PORT, access_log=False)
