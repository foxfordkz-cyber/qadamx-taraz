from uuid import UUID

from fastapi import APIRouter, Request, Response
from starlette.concurrency import run_in_threadpool

from app import schemas
from app.assistant_schemas import AssistantRequest, AssistantResponse
from app.errors import APIError
from app.routers import DB, User
from app.services import assistant
from app.services.ai_diagnostics import diagnostic_request

router = APIRouter(prefix="/api/v1")


@router.post(
    "/businesses/{id}/assistant",
    response_model=AssistantResponse,
    tags=["assistant"],
    responses={status: {"model": schemas.ErrorResponse} for status in (404, 429)},
    description="Seller question → short answer from server-calculated facts of this business. "
    "The model only words the answer; every amount, count and customer is checked against "
    "facts, otherwise source=fallback with a server template. No ledger writes, nothing is "
    "sent: reminder_draft is text to copy. ai=false returns source=facts: the server summary "
    "of the same facts without a model call or daily limit, for automatic page loads. "
    "Disabled deployments return 404 ASSISTANT_DISABLED; "
    "a per-user daily limit returns 429 ASSISTANT_LIMIT.",
)
async def ask_assistant(
    id: UUID, payload: AssistantRequest, request: Request, response: Response, db: DB, user: User
):
    service: assistant.Assistant = request.app.state.assistant
    if not service.enabled:
        raise APIError(404, "ASSISTANT_DISABLED", "Assistant is not enabled")
    with diagnostic_request(request.state.request_id):
        facts, as_of, shop = await run_in_threadpool(
            assistant.collect_facts, db, id, user, payload.days, payload.locale
        )
        if payload.ai:
            service.limit.take(user)
            answer, actions, source = await service.answer(
                question=payload.question,
                facts=facts,
                days=payload.days,
                locale=payload.locale,
                shop=shop,
            )
        else:
            answer, actions = assistant.fallback(
                payload.question, facts, payload.days, payload.locale, shop
            )
            source = "facts"
    response.headers["Cache-Control"] = "no-store"
    return assistant.response(
        id, payload.days, payload.locale, as_of, answer, facts, actions, source
    )
