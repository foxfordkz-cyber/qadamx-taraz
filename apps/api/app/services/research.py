"""Tenant-scoped research reads. Existing money operations are never mutated."""

from sqlalchemy import text

from app.research_schemas import ForecastResponse
from app.services.forecasting import evaluate

# Each historical feature is what was known at that day's close. A later reversal
# must not leak into an earlier train/validation snapshot. Today and the first
# recorded day (possibly partial onboarding) are excluded.
FORECAST_QUERY = text("""
WITH clock AS (
 SELECT coalesce(CAST(:as_of AS timestamptz), statement_timestamp()) AS as_of
), bounds AS (
 SELECT as_of, (as_of AT TIME ZONE 'Asia/Almaty')::date AS today,
 greatest((SELECT min((created_at AT TIME ZONE 'Asia/Almaty')::date) + 1
 FROM qadam.operations WHERE business_id = :business_id AND kind = 'sale'
 AND created_at <= as_of),
 (as_of AT TIME ZONE 'Asia/Almaty')::date - 730) AS first_day,
 EXISTS(SELECT 1 FROM qadam.operations WHERE business_id = :business_id
 AND kind = 'sale' AND created_at <= as_of) AS has_history
 FROM clock
), daily AS (
 SELECT d::date AS day, coalesce(sum(s.sales_delta_minor), 0)::bigint AS amount
 FROM bounds b CROSS JOIN LATERAL generate_series(
 b.first_day::timestamp, (b.today - 1)::timestamp, interval '1 day') d
 LEFT JOIN qadam.operations s ON s.business_id = :business_id AND s.kind = 'sale'
 AND s.created_at >= (d AT TIME ZONE 'Asia/Almaty')
 AND s.created_at < ((d + interval '1 day') AT TIME ZONE 'Asia/Almaty')
 AND NOT EXISTS (SELECT 1 FROM qadam.operations r WHERE r.business_id = :business_id
 AND r.reversal_of = s.id
 AND r.created_at < ((d + interval '1 day') AT TIME ZONE 'Asia/Almaty'))
 WHERE b.has_history GROUP BY d
)
SELECT b.as_of, business.is_demo,
 coalesce((SELECT jsonb_agg(jsonb_build_object('date', day, 'sales_minor', amount)
 ORDER BY day) FROM daily), '[]'::jsonb) AS history
FROM bounds b JOIN qadam.businesses business ON business.id = :business_id
""")


def forecast(db, business_id, horizon, *, as_of=None):
    row = db.execute(FORECAST_QUERY, dict(business_id=business_id, as_of=as_of)).mappings().one()
    result = evaluate(
        row["history"],
        horizon,
        provenance=("demo_business_ledger" if row["is_demo"] else "business_ledger"),
    )
    return ForecastResponse(business_id=business_id, as_of=row["as_of"], **result)
