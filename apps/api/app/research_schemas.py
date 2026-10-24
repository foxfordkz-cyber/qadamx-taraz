from datetime import date
from typing import Annotated, Literal
from uuid import UUID

from pydantic import AwareDatetime, Field

from app.schemas import Contract

ResearchAmount = Annotated[int, Field(strict=True, ge=0, le=9_007_199_254_740_991)]


class ResearchDay(Contract):
    date: date
    sales_minor: ResearchAmount


class ForecastDay(Contract):
    date: date
    baseline_minor: ResearchAmount
    ml_minor: ResearchAmount
    selected_minor: ResearchAmount


class ForecastMetrics(Contract):
    mae_minor: Annotated[float, Field(ge=0, allow_inf_nan=False)]
    rmse_minor: Annotated[float, Field(ge=0, allow_inf_nan=False)]


class ForecastEvaluation(Contract):
    train_from: date
    train_to: date
    validation_from: date
    validation_to: date
    test_from: date
    test_to: date
    baseline_method: Literal["rolling_mean_7", "seasonal_naive_7"]
    ridge_alpha: float
    validation_baseline: ForecastMetrics
    validation_ml: ForecastMetrics
    baseline: ForecastMetrics
    ml: ForecastMetrics
    test_winner: Literal["ml", "baseline", "tie"]
    test_observations: int


class ForecastResponse(Contract):
    business_id: UUID
    as_of: AwareDatetime
    status: Literal["insufficient_data", "experimental"]
    model_version: Literal["ridge-lags-v1"]
    horizon: Literal[7, 30]
    currency: Literal["KZT"]
    timezone: Literal["Asia/Almaty"]
    provenance: Literal["business_ledger", "demo_business_ledger"]
    dataset_sha256: str
    observed_days: int
    required_days: int
    history: list[ResearchDay]
    forecast: list[ForecastDay]
    evaluation: ForecastEvaluation | None
    selected_method: Literal["ridge-lags-v1", "rolling_mean_7", "seasonal_naive_7"] | None
    warnings: list[str]
