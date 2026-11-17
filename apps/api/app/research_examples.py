"""Contract examples only. Not participants or real-world model evidence."""

from datetime import date, timedelta

from app.research_schemas import DebtRiskResponse, FeedbackCreate, ForecastResponse
from app.services.forecasting import evaluate


def examples():
    forecast = ForecastResponse(
        business_id="ad6203bc-7320-5b36-982b-135504c5af68",
        as_of="2026-10-24T10:00:00Z",
        **evaluate([], provenance="demo_business_ledger"),
    )
    debt = DebtRiskResponse(
        business_id=forecast.business_id, as_of=forecast.as_of, items=[], next_cursor=None
    )
    feedback = FeedbackCreate(
        client_request_id="b9f20c8d-6ba9-4ffd-a3c9-6b595a46f792",
        language="ru",
        consent=True,
        features_used=[],
        sales_debt_clarity=None,
        forecast_usefulness=None,
        risk_clarity=None,
        improve_first="Синтетический пример формы",
    )
    result = {
        "note": "Synthetic contract examples, not scientific results",
        "ForecastInsufficient": forecast.model_dump(mode="json"),
        "DebtRiskEmpty": debt.model_dump(mode="json"),
        "FeedbackRequest": feedback.model_dump(mode="json"),
    }
    history = [
        dict(
            date=(date(2025, 1, 1) + timedelta(days=i)).isoformat(),
            sales_minor=10000 + i * 100 + i % 7 * 500,
        )
        for i in range(180)
    ]
    for horizon in (7, 30):
        result[f"ForecastSynthetic{horizon}"] = ForecastResponse(
            business_id=forecast.business_id,
            as_of="2025-06-30T10:00:00Z",
            **evaluate(history, horizon, provenance="synthetic_example"),
        ).model_dump(mode="json")
    return result
