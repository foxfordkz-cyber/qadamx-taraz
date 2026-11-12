"""Read-only projections. No new financial tables or alternate balance engine."""

from datetime import date

from sqlalchemy import Date, case, cast, func, select

from app.business_schemas import BusinessReport, DebtAge
from app.errors import APIError
from app.models import Operation
from app.services import ledger

BUCKETS = ("0_7", "8_30", "31_plus")


def validate_dates(date_from, date_to, *, paired=False):
    if paired and (date_from is None) != (date_to is None):
        raise APIError(422, "VALIDATION_ERROR", "Provide both report dates or neither")
    for value in (date_from, date_to):
        if value and not date(2000, 1, 1) <= value <= date(2100, 12, 31):
            raise APIError(422, "VALIDATION_ERROR", "Dates must be between 2000 and 2100")
    if date_from and date_to and (date_from > date_to or (date_to - date_from).days > 365):
        raise APIError(422, "VALIDATION_ERROR", "Invalid range; maximum 366 calendar days")


def sale_totals(business_id, customer_id=None):
    query = select(
        Operation.sale_id,
        func.sum(Operation.sales_delta_minor).label("sales"),
        func.sum(Operation.receipts_delta_minor).label("receipts"),
    ).where(Operation.business_id == business_id)
    if customer_id:
        query = query.where(Operation.customer_id == customer_id)
    return query.group_by(Operation.sale_id).subquery()


def age_days():
    # Calendar days in the business timezone, not elapsed 24h or an invented due date.
    return func.greatest(
        0,
        cast(func.timezone("Asia/Almaty", func.statement_timestamp()), Date)
        - cast(func.timezone("Asia/Almaty", Operation.created_at), Date),
    )


def age_condition(bucket):
    age = age_days()
    return {"0_7": age <= 7, "8_30": (age >= 8) & (age <= 30), "31_plus": age >= 31}[bucket]


def report(session, business_id, date_from=None, date_to=None, customer_id=None):
    validate_dates(date_from, date_to, paired=True)
    if customer_id:
        ledger.get_customer(session, business_id, customer_id)
    scope = [Operation.business_id == business_id]
    if customer_id:
        scope.append(Operation.customer_id == customer_id)
    start = ledger.day_bounds(date_from)[0] if date_from else None
    end = ledger.day_bounds(date_to)[1] if date_to else None
    in_period = (Operation.created_at >= start) & (Operation.created_at < end) if start else True
    delta = Operation.sales_delta_minor - Operation.receipts_delta_minor
    totals = sale_totals(business_id, customer_id)
    debt = totals.c.sales - totals.c.receipts
    ages = []
    for bucket in BUCKETS:
        current_sales = (
            select(func.coalesce(func.sum(debt), 0), func.count())
            .select_from(Operation)
            .join(totals, totals.c.sale_id == Operation.id)
            .where(*scope, Operation.kind == "sale", debt > 0, age_condition(bucket))
        )
        ages.extend(
            [
                current_sales.with_only_columns(func.coalesce(func.sum(debt), 0)).scalar_subquery(),
                current_sales.with_only_columns(func.count()).scalar_subquery(),
            ]
        )
    # Correlation disabled: latest row and aggregates must refer to the same complete tenant.
    last = (
        select(
            func.jsonb_build_object(
                *[
                    value
                    for name in (
                        "id",
                        "business_id",
                        "customer_id",
                        "sale_id",
                        "kind",
                        "sales_delta_minor",
                        "receipts_delta_minor",
                        "reversal_of",
                        "description",
                        "created_at",
                        "created_by",
                    )
                    for value in (name, getattr(Operation, name))
                ]
            )
        )
        .where(*scope)
        .order_by(Operation.created_at.desc(), Operation.id.desc())
        .limit(1)
        .correlate(None)
        .scalar_subquery()
    )
    values = session.execute(
        select(
            func.statement_timestamp(),
            func.coalesce(func.sum(case((in_period, Operation.sales_delta_minor), else_=0)), 0),
            func.coalesce(func.sum(case((in_period, Operation.receipts_delta_minor), else_=0)), 0),
            func.coalesce(func.sum(delta), 0),
            func.coalesce(func.sum(case((Operation.created_at < start, delta), else_=0)), 0)
            if start
            else None,
            func.coalesce(func.sum(case((Operation.created_at < end, delta), else_=0)), 0)
            if end
            else None,
            func.count().filter(in_period),
            last,
            *[expr.correlate(None) for expr in ages],
        ).where(*scope)
    ).one()
    return BusinessReport(
        business_id=business_id,
        customer_id=customer_id,
        date_from=date_from,
        date_to=date_to,
        as_of=values[0],
        sales_minor=int(values[1]),
        receipts_minor=int(values[2]),
        outstanding_minor=int(values[3]),
        opening_balance_minor=int(values[4]) if start else None,
        closing_balance_minor=int(values[5]) if end else None,
        operation_count=values[6],
        last_operation=values[7],
        debt_aging=[
            DebtAge(
                bucket=bucket, balance_minor=int(values[8 + i * 2]), sales_count=values[9 + i * 2]
            )
            for i, bucket in enumerate(BUCKETS)
        ],
    )
