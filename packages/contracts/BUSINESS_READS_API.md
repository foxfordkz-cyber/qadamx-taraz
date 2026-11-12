# Business read views — API 0.8.0 candidate

Stage 3 adds read-only functionality to the Stage 2 API. No migrations, financial
write schemas, Auth settings or AI draft schemas change. Ship matching frontend
and backend together after review; an old server returns an explicit report
error, not invented numbers.
Do not release the filter UI alone: older FastAPI versions may ignore unknown
query parameters and therefore return unfiltered pages. Staging must verify
the 0.8.0 OpenAPI and these filters against its own matching backend.

## Authorization and data source

Every endpoint uses existing JWT verification and `require_membership`.
Foreign businesses/customers/cursors return 404. Responses derive from
`qadam.operations`, including signed reversal entries; no parallel balance table.
Amounts are integer KZT minor units. Reports use one PostgreSQL statement snapshot.

## GET /api/v1/businesses/{business_id}/report

Optional `customer_id` restricts every aggregate, age bucket and last operation.
`date_from` and `date_to` must be provided together, or both omitted for lifetime.
Dates are inclusive Asia/Almaty calendar dates, 2000–2100, maximum 366 days.

- `sales_minor` / `receipts_minor`: signed net ledger movement in the period.
  A reversal in the period can make either value negative.
- `opening_balance_minor` / `closing_balance_minor`: signed balance immediately
  before the first day / at the exclusive end of the last day. Null for lifetime.
  Opening + sales − receipts = closing.
- `outstanding_minor`: **current all-time debt**, not period closing balance.
- `operation_count`: all journal entries in the period, including reversals;
  it is not the number of purchases.
- `last_operation`: most recent lifetime entry in this business/customer scope.
- `debt_aging`: current unpaid sale balances, calendar age 0–7, 8–30, 31+ days.
  No due date exists; these are **not overdue labels**.
- `as_of`, `timezone`, `currency`: snapshot metadata. Cache-Control: no-store.

Complete schemas and synthetic examples: openapi.json / examples.json,
`BusinessReport` and `AgedOpenSale`.

## Extended GET /api/v1/businesses/{business_id}/operations

Existing `date`, `customer_id`, `limit`, `cursor`, `outstanding_only` remain.
Additional filters apply in SQL **before** stable timestamp/UUID keyset pagination:

| Parameter | Meaning |
| --- | --- |
| date_from / date_to | Inclusive business dates; cannot combine with legacy date |
| kind | sale / repayment / reversal |
| min_amount_minor / max_amount_minor | Inclusive absolute journal amount: sales delta if nonzero, otherwise receipts delta |
| payment_status | Current associated sale state: unpaid / partial / paid / cancelled |
| age_bucket | 0_7 / 8_30 / 31_plus, only with outstanding_only=true |

Payment status includes all subsequent payments/reversals even if those are
outside the filtered date interval. Cancelled means net sale total zero.
Outstanding lists only contain positive debt sales; their `AgedOpenSale` adds
server-calculated `age_days`. AI's existing `OpenSale` remains unchanged.
Invalid ranges/combinations return 422. No automatic retries or writes.

## Frontend

Customers → customer card: lifetime server totals, last operation, paginated
purchase/repayment/reversal history. Debts: filters, age groups for loaded rows,
explicit RU/KZ reminder copy, existing WhatsApp preparation. No claim of sending,
no reminder history and no external message dispatch.

History: date/customer/amount/status/type filters in the URL. Summary → period
report: server totals, CSV (UTF-8 BOM, formula-safe text, exact decimal amounts)
and print stylesheet. Export contains complete report aggregates, not a truncated
history export. Changing filters, scope, or an error disables export of old data.
Demo displays an explicit backend requirement for the new extended report.

## Reproduction

From apps/api: `python -m app.export_contracts`, then
`python -m app.export_contracts --check`.
From apps/web: `npm run generate:api`, then `npm run check:api`.
Use only a fresh, dedicated *_test PostgreSQL for pytest. No hosted migration.
