"""Tenant-scoped research reads. Existing money operations are never mutated."""

from sqlalchemy import text

from app.research_schemas import DebtRiskResponse, ForecastResponse
from app.services.debt_risk import assess
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


RISK_QUERY = text("""
WITH clock AS (
 SELECT coalesce(CAST(:as_of AS timestamptz), statement_timestamp()) AS as_of
), journal AS MATERIALIZED (
 SELECT o.* FROM qadam.operations o CROSS JOIN clock t
 WHERE o.business_id = :business_id AND o.created_at <= t.as_of
), balances AS (
 SELECT sale_id, sum(sales_delta_minor - receipts_delta_minor)::bigint AS balance
 FROM journal GROUP BY sale_id
), facts AS (
 SELECT s.customer_id, sum(b.balance)::bigint AS balance_minor,
 sum(s.sales_delta_minor - s.receipts_delta_minor)::bigint AS initial_debt_minor,
 sum(s.sales_delta_minor - s.receipts_delta_minor - b.balance)::bigint AS later_paid_minor,
 max((t.as_of AT TIME ZONE 'Asia/Almaty')::date -
 (s.created_at AT TIME ZONE 'Asia/Almaty')::date)::int AS oldest_open_sale_days,
 count(*)::int AS open_sales
 FROM journal s JOIN balances b ON b.sale_id = s.id CROSS JOIN clock t
 WHERE s.kind = 'sale' AND s.customer_id IS NOT NULL AND b.balance > 0
 AND NOT EXISTS (SELECT 1 FROM journal r WHERE r.reversal_of = s.id)
 GROUP BY s.customer_id
), page AS (
 SELECT f.*, c.display_name FROM facts f JOIN qadam.customers c
 ON c.id = f.customer_id AND c.business_id = :business_id
 WHERE (CAST(:cursor AS uuid) IS NULL OR f.customer_id > CAST(:cursor AS uuid))
 ORDER BY f.customer_id LIMIT :fetch_limit
)
SELECT t.as_of, coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.customer_id)
 FROM page p), '[]'::jsonb) AS items FROM clock t
""")


def debt_risk(db, business_id, limit=25, cursor=None, *, as_of=None):
    row = (
        db.execute(
            RISK_QUERY,
            dict(business_id=business_id, as_of=as_of, cursor=cursor, fetch_limit=limit + 1),
        )
        .mappings()
        .one()
    )
    items = []
    for item in row["items"][:limit]:
        rating = assess(
            age_days=item["oldest_open_sale_days"],
            balance_minor=item["balance_minor"],
            initial_debt_minor=item["initial_debt_minor"],
            later_paid_minor=item["later_paid_minor"],
        )
        items.append({**item, **rating})
    return DebtRiskResponse(
        business_id=business_id,
        as_of=row["as_of"],
        items=items,
        next_cursor=items[-1]["customer_id"] if len(row["items"]) > limit else None,
    )
