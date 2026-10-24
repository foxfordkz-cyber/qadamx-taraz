"""Contract examples only. Not participants or real-world model evidence."""

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
    return {
        "note": "Synthetic contract examples, not scientific results",
        "ForecastInsufficient": forecast.model_dump(mode="json"),
        "DebtRiskEmpty": debt.model_dump(mode="json"),
        "FeedbackRequest": feedback.model_dump(mode="json"),
    }
