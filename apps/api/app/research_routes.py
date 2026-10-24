from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, Response

from app.errors import APIError
from app.research_schemas import ForecastResponse
from app.routers import DB, User
from app.services import ledger, research

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
