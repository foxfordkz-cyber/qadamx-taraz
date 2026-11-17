from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, Response

from app.errors import APIError
from app.research_schemas import (
    DebtRiskResponse,
    FeedbackCreate,
    FeedbackPage,
    FeedbackReceipt,
    ForecastResponse,
)
from app.routers import DB, User
from app.services import ledger, research, research_feedback

router = APIRouter(prefix="/api/v1/businesses/{id}/research", tags=["research"])


@router.get("/forecast", response_model=ForecastResponse)
def get_forecast(
    id: UUID,
    db: DB,
    user: User,
    response: Response,
    horizon: Annotated[int, Query(enum=[7, 30])] = 7,
):
    ledger.require_membership(db, id, user)
    if horizon not in (7, 30):
        raise APIError(422, "VALIDATION_ERROR", "horizon must be 7 or 30")
    response.headers["Cache-Control"] = "no-store"
    return research.forecast(db, id, horizon)


@router.get("/debt-risk", response_model=DebtRiskResponse)
def get_debt_risk(
    id: UUID,
    db: DB,
    user: User,
    response: Response,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    cursor: UUID | None = None,
):
    ledger.require_membership(db, id, user)
    response.headers["Cache-Control"] = "no-store"
    return research.debt_risk(db, id, limit, cursor)


@router.post("/feedback", response_model=FeedbackReceipt, status_code=201)
def post_feedback(id: UUID, payload: FeedbackCreate, db: DB, user: User, response: Response):
    ledger.require_membership(db, id, user)
    result = research_feedback.create(db, id, user, payload)
    db.commit()
    response.headers["Cache-Control"] = "no-store"
    return result


@router.get("/feedback", response_model=FeedbackPage)
def get_feedback(
    id: UUID,
    db: DB,
    user: User,
    response: Response,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    cursor: UUID | None = None,
):
    ledger.require_membership(db, id, user)
    response.headers["Cache-Control"] = "no-store"
    return research_feedback.read(db, id, user, limit, cursor)
