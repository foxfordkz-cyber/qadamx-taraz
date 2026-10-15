import hashlib
import json
from datetime import UTC, date, datetime, time, timedelta
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

from sqlalchemy import case, exists, func, select, tuple_
from sqlalchemy.orm import Session, aliased

from app import schemas
from app.errors import APIError
from app.models import Business, Customer, IdempotencyRecord, Inquiry, Membership, Operation

LOCAL_TZ = ZoneInfo("Asia/Almaty")


def day_bounds(day: date):
    start = datetime.combine(day, time.min, LOCAL_TZ)
    return start.astimezone(UTC), (start + timedelta(days=1)).astimezone(UTC)


def require_membership(session: Session, business_id: UUID, user_id: UUID):
    member = session.scalar(
        select(Membership)
        .where(
            Membership.business_id == business_id,
            Membership.user_id == user_id,
            Membership.role == "owner",
        )
        .with_for_update(read=True)
    )
    if member is None:
        raise APIError(404, "NOT_FOUND", "Business not found")


def get_customer(session: Session, business_id: UUID, customer_id: UUID):
    customer = session.scalar(
        select(Customer).where(Customer.business_id == business_id, Customer.id == customer_id)
    )
    if customer is None:
        raise APIError(404, "NOT_FOUND", "Customer not found")
    return customer


def operation_in_business(session, business_id, operation_id, lock=False):
    query = select(Operation).where(
        Operation.business_id == business_id, Operation.id == operation_id
    )
    if lock:
        query = query.with_for_update()
    operation = session.scalar(query)
    if operation is None:
        raise APIError(404, "NOT_FOUND", "Operation not found")
    return operation


def balance(session, business_id, *, sale_id=None, customer_id=None):
    query = select(
        func.coalesce(func.sum(Operation.sales_delta_minor - Operation.receipts_delta_minor), 0)
    ).where(Operation.business_id == business_id)
    if sale_id is not None:
        query = query.where(Operation.sale_id == sale_id)
    if customer_id is not None:
        query = query.where(Operation.customer_id == customer_id)
    return int(session.scalar(query))


def is_reversed(session, business_id, operation_id):
    return session.scalar(
        select(
            exists().where(
                Operation.business_id == business_id, Operation.reversal_of == operation_id
            )
        )
    )


def write_operation(
    session: Session,
    business_id: UUID,
    user_id: UUID,
    key: str,
    payload,
    reverse_id: UUID | None = None,
) -> schemas.OperationResponse:
    # Caller holds membership FOR SHARE. Serialize financial writes per business for MVP.
    # This also makes the idempotency reservation and customer snapshot race-free.
    session.execute(select(Business.id).where(Business.id == business_id).with_for_update()).one()
    normalized = {
        "action": "reverse" if reverse_id else "create",
        "operation_id": str(reverse_id) if reverse_id else None,
        "body": payload.model_dump(mode="json"),
    }
    digest = hashlib.sha256(
        json.dumps(normalized, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    previous = session.get(IdempotencyRecord, (business_id, key))
    if previous:
        if previous.request_hash != digest:
            raise APIError(409, "IDEMPOTENCY_CONFLICT", "Key was used for another request")
        return schemas.OperationResponse.model_validate(previous.response_json)

    operation_id = uuid4()
    if reverse_id is not None:
        original = operation_in_business(session, business_id, reverse_id)
        sale = operation_in_business(session, business_id, original.sale_id, lock=True)
        if original.kind == "reversal" or is_reversed(session, business_id, original.id):
            raise APIError(409, "ALREADY_REVERSED", "Operation cannot be reversed again")
        if original.kind == "sale":
            reversal = aliased(Operation)
            active_payment = session.scalar(
                select(Operation.id)
                .where(
                    Operation.business_id == business_id,
                    Operation.sale_id == sale.id,
                    Operation.kind == "repayment",
                    ~exists().where(
                        reversal.business_id == business_id, reversal.reversal_of == Operation.id
                    ),
                )
                .limit(1)
            )
            if active_payment is not None:
                raise APIError(409, "DEPENDENT_PAYMENTS", "Reverse active repayments first")
        row = Operation(
            id=operation_id,
            business_id=business_id,
            customer_id=original.customer_id,
            sale_id=sale.id,
            kind="reversal",
            reversal_of=original.id,
            sales_delta_minor=-original.sales_delta_minor,
            receipts_delta_minor=-original.receipts_delta_minor,
            description=payload.description,
            created_by=user_id,
        )
    else:
        if payload.draft_id is not None:
            raise APIError(422, "DRAFT_NOT_SUPPORTED", "Use manual input with draft_id=null")
        if isinstance(payload, schemas.SaleCreate):
            if payload.customer_id:
                get_customer(session, business_id, payload.customer_id)
            row = Operation(
                id=operation_id,
                business_id=business_id,
                customer_id=payload.customer_id,
                sale_id=operation_id,
                kind="sale",
                sales_delta_minor=payload.total_minor,
                receipts_delta_minor=payload.received_minor,
                description=payload.description,
                created_by=user_id,
            )
        else:
            sale = operation_in_business(session, business_id, payload.sale_id, lock=True)
            if sale.kind != "sale":
                raise APIError(422, "INVALID_SALE", "Select an original sale")
            remaining = balance(session, business_id, sale_id=sale.id)
            if is_reversed(session, business_id, sale.id) or payload.amount_minor > remaining:
                raise APIError(409, "BALANCE_CHANGED", "Payment exceeds current balance")
            row = Operation(
                id=operation_id,
                business_id=business_id,
                customer_id=sale.customer_id,
                sale_id=sale.id,
                kind="repayment",
                sales_delta_minor=0,
                receipts_delta_minor=payload.amount_minor,
                description=payload.description,
                created_by=user_id,
            )
    session.add(row)
    session.flush()
    result = schemas.OperationResponse(
        operation=schemas.Operation.model_validate(row),
        created_at=row.created_at,
        sale_balance_minor=balance(session, business_id, sale_id=row.sale_id),
        customer_balance_minor=(
            balance(session, business_id, customer_id=row.customer_id) if row.customer_id else None
        ),
    )
    session.add(
        IdempotencyRecord(
            business_id=business_id,
            key=key,
            request_hash=digest,
            result_operation_id=row.id,
            response_json=result.model_dump(mode="json"),
        )
    )
    session.flush()
    return result


def customers(session, business_id, q, limit, cursor):
    balances = (
        select(
            Operation.customer_id,
            func.sum(Operation.sales_delta_minor - Operation.receipts_delta_minor).label("balance"),
        )
        .where(Operation.business_id == business_id)
        .group_by(Operation.customer_id)
        .subquery()
    )
    query = (
        select(Customer, func.coalesce(balances.c.balance, 0))
        .outerjoin(balances, balances.c.customer_id == Customer.id)
        .where(Customer.business_id == business_id)
    )
    if q:
        query = query.where(Customer.display_name.icontains(q, autoescape=True))
    if cursor:
        get_customer(session, business_id, cursor)
        query = query.where(Customer.id > cursor)
    rows = session.execute(query.order_by(Customer.id).limit(limit + 1)).all()
    items = [
        schemas.CustomerResponse(
            id=row.id,
            business_id=row.business_id,
            display_name=row.display_name,
            note=row.note,
            contact=row.contact,
            balance_minor=int(amount),
        )
        for row, amount in rows[:limit]
    ]
    return schemas.Page[schemas.CustomerResponse](
        items=items, next_cursor=str(items[-1].id) if len(rows) > limit else None
    )


def history(session, business_id, day, customer_id, outstanding_only, limit, cursor):
    query = select(Operation).where(Operation.business_id == business_id)
    if customer_id:
        get_customer(session, business_id, customer_id)
        query = query.where(Operation.customer_id == customer_id)
    if day:
        start, end = day_bounds(day)
        query = query.where(Operation.created_at >= start, Operation.created_at < end)
    if cursor:
        last = operation_in_business(session, business_id, cursor)
        query = query.where(
            tuple_(Operation.created_at, Operation.id) < tuple_(last.created_at, last.id)
        )
    if outstanding_only:
        totals = (
            select(
                Operation.sale_id,
                func.sum(Operation.sales_delta_minor).label("sales"),
                func.sum(Operation.receipts_delta_minor).label("receipts"),
            )
            .where(Operation.business_id == business_id)
            .group_by(Operation.sale_id)
            .subquery()
        )
        query = (
            query.add_columns(totals.c.receipts, (totals.c.sales - totals.c.receipts))
            .join(totals, totals.c.sale_id == Operation.id)
            .where(Operation.kind == "sale", totals.c.sales > totals.c.receipts)
        )
    query = query.order_by(Operation.created_at.desc(), Operation.id.desc()).limit(limit + 1)
    if outstanding_only:
        rows = session.execute(query).all()
        items = [
            schemas.OpenSale(
                id=row.id,
                customer_id=row.customer_id,
                description=row.description,
                created_at=row.created_at,
                total_minor=row.sales_delta_minor,
                received_minor=int(received),
                balance_minor=int(debt),
            )
            for row, received, debt in rows[:limit]
        ]
        return schemas.Page[schemas.OpenSale](
            items=items, next_cursor=str(items[-1].id) if len(rows) > limit else None
        )
    rows = session.scalars(query).all()
    return schemas.Page[schemas.Operation](
        items=[schemas.Operation.model_validate(row) for row in rows[:limit]],
        next_cursor=str(rows[limit - 1].id) if len(rows) > limit else None,
    )


def summary(session, business_id, day):
    start, end = day_bounds(day)
    in_day = (Operation.created_at >= start) & (Operation.created_at < end)
    inquiries = (
        select(func.count())
        .select_from(Inquiry)
        .where(
            Inquiry.business_id == business_id,
            Inquiry.created_at >= start,
            Inquiry.created_at < end,
        )
        .scalar_subquery()
    )
    # One SQL statement: daily totals and current debt use the same database snapshot.
    sales, receipts, debt, count = session.execute(
        select(
            func.coalesce(func.sum(case((in_day, Operation.sales_delta_minor), else_=0)), 0),
            func.coalesce(func.sum(case((in_day, Operation.receipts_delta_minor), else_=0)), 0),
            func.coalesce(
                func.sum(Operation.sales_delta_minor - Operation.receipts_delta_minor), 0
            ),
            inquiries,
        ).where(Operation.business_id == business_id)
    ).one()
    return schemas.SummaryResponse(
        date=day,
        sales_minor=int(sales),
        receipts_minor=int(receipts),
        outstanding_minor=int(debt),
        new_inquiries_count=count,
    )
