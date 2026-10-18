"""One PostgreSQL snapshot; bounded result size, no ledger writes or AI."""

from datetime import UTC

from sqlalchemy import text

from app.analytics_schemas import AnalyticsResponse

# Optional as_of is internal test control only: the HTTP route never accepts it.
QUERY = text("""
WITH clock AS (
 SELECT coalesce(CAST(:as_of AS timestamptz), statement_timestamp()) AS as_of
), period AS (
 SELECT as_of, (as_of AT TIME ZONE 'Asia/Almaty')::date AS last_day,
 (as_of AT TIME ZONE 'Asia/Almaty')::date - (:days - 1) AS first_day
 FROM clock
), journal AS MATERIALIZED (
 SELECT o.* FROM qadam.operations o CROSS JOIN period p
 WHERE o.business_id = :business_id AND o.created_at <= p.as_of
), active AS (
 SELECT s.*, (s.created_at AT TIME ZONE 'Asia/Almaty')::date AS day,
 extract(hour FROM s.created_at AT TIME ZONE 'Asia/Almaty')::int AS hour
 FROM journal s CROSS JOIN period p
 WHERE s.kind = 'sale'
 AND s.created_at >= (p.first_day::timestamp AT TIME ZONE 'Asia/Almaty')
 AND NOT EXISTS (SELECT 1 FROM journal r WHERE r.reversal_of = s.id)
), sales AS (
 SELECT coalesce(sum(sales_delta_minor), 0) AS amount, count(*) AS count FROM active
), daily_sales AS (
 SELECT day, sum(sales_delta_minor) AS amount, count(*) AS count FROM active GROUP BY day
), receipts AS (
 SELECT (o.created_at AT TIME ZONE 'Asia/Almaty')::date AS day,
 sum(o.receipts_delta_minor) AS amount
 FROM journal o CROSS JOIN period p
 WHERE o.created_at >= (p.first_day::timestamp AT TIME ZONE 'Asia/Almaty')
 GROUP BY day
), balances AS (
 SELECT customer_id, sum(sales_delta_minor - receipts_delta_minor) AS amount
 FROM journal GROUP BY customer_id
), hours AS (
 SELECT hour, count(*) AS count FROM active GROUP BY hour
), sale_balances AS (
 SELECT sale_id, sum(sales_delta_minor - receipts_delta_minor) AS owed
 FROM journal WHERE sale_id IS NOT NULL GROUP BY sale_id
), open_sales AS (
 SELECT p.last_day - (s.created_at AT TIME ZONE 'Asia/Almaty')::date AS age, b.owed
 FROM journal s CROSS JOIN period p JOIN sale_balances b ON b.sale_id = s.id
 WHERE s.kind = 'sale' AND b.owed > 0
 AND NOT EXISTS (SELECT 1 FROM journal r WHERE r.reversal_of = s.id)
), collected AS (
 SELECT coalesce(sum(a.sales_delta_minor), 0) AS sales,
 coalesce(sum(a.receipts_delta_minor), 0) AS at_sale,
 coalesce(sum(coalesce(b.owed, 0)), 0) AS owed
 FROM active a LEFT JOIN sale_balances b ON b.sale_id = a.id
)
SELECT p.as_of, p.first_day AS period_from, p.last_day AS period_to,
 jsonb_build_object(
 'sales_minor', s.amount, 'sales_count', s.count,
 'average_ticket_minor', CASE WHEN s.count = 0 THEN NULL
 ELSE floor(s.amount / s.count + 0.5) END,
 'receipts_minor', (SELECT coalesce(sum(amount), 0) FROM receipts),
 'outstanding_minor', (SELECT coalesce(sum(amount), 0) FROM balances),
 'debtors_count', (SELECT count(*) FROM balances WHERE customer_id IS NOT NULL AND amount > 0)
 ) AS cards,
 (SELECT jsonb_agg(jsonb_build_object(
 'date', p.first_day + n, 'sales_minor', coalesce(ds.amount, 0),
 'receipts_minor', coalesce(r.amount, 0), 'sales_count', coalesce(ds.count, 0),
 'is_partial', p.first_day + n = p.last_day) ORDER BY n)
 FROM generate_series(0, :days - 1) n
 LEFT JOIN daily_sales ds ON ds.day = p.first_day + n
 LEFT JOIN receipts r ON r.day = p.first_day + n) AS daily,
 (SELECT jsonb_agg(jsonb_build_object(
 'hour', h, 'sales_count', coalesce(hours.count, 0)) ORDER BY h)
 FROM generate_series(0, 23) h LEFT JOIN hours ON hours.hour = h) AS hourly,
 (SELECT jsonb_build_object(
 'sales_minor', c.sales, 'paid_at_sale_minor', c.at_sale,
 'paid_later_minor', c.sales - c.at_sale - c.owed, 'outstanding_minor', c.owed)
 FROM collected c) AS collection,
 (SELECT jsonb_agg(jsonb_build_object(
 'key', bucket.key,
 'amount_minor', coalesce((SELECT sum(o.owed) FROM open_sales o
 WHERE o.age BETWEEN bucket.low AND bucket.high), 0),
 'sales_count', (SELECT count(*) FROM open_sales o
 WHERE o.age BETWEEN bucket.low AND bucket.high)) ORDER BY bucket.low)
 FROM (VALUES ('0_7', -100000, 7), ('8_30', 8, 30), ('31_plus', 31, 100000))
 AS bucket(key, low, high)) AS debt_aging
FROM period p CROSS JOIN sales s
""")


def read(session, business_id, days, *, as_of=None):
    if days not in (7, 30):
        raise ValueError("Unsupported analytics period")
    row = (
        session.execute(QUERY, dict(business_id=business_id, days=days, as_of=as_of))
        .mappings()
        .one()
    )
    values = dict(row)
    values["as_of"] = row["as_of"].astimezone(UTC)
    return AnalyticsResponse(business_id=business_id, days=days, **values)
