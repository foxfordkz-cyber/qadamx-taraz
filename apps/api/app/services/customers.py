"""Durable customer creation receipts, independent of the financial journal."""

import hashlib
import json
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app import schemas
from app.errors import APIError
from app.models import Customer, CustomerCreationRequest


def receipt(db: Session, business: UUID, user: UUID, key: str):
    return db.scalar(
        select(CustomerCreationRequest).where(
            CustomerCreationRequest.business_id == business,
            CustomerCreationRequest.created_by == user,
            CustomerCreationRequest.key == key,
        )
    )


def create(
    db: Session, business: UUID, user: UUID, payload: schemas.CustomerCreate, key: str | None
):
    # Callers hold the current membership's FOR SHARE lock until commit/rollback.
    body = payload.model_dump()
    request_hash = hashlib.sha256(
        json.dumps(body, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
    ).hexdigest()
    if key is not None:
        scope = json.dumps(["customer.create.v1", str(business), str(user), key]).encode()
        lock_id = int.from_bytes(hashlib.sha256(scope).digest()[:8], "big", signed=True)
        # Transaction-scoped, across workers. Hash collisions only serialize unrelated requests;
        # lookup and uniqueness always use the complete business/user/key tuple.
        db.execute(text("SELECT pg_advisory_xact_lock(:lock_id)"), {"lock_id": lock_id})
        previous = receipt(db, business, user, key)
        if previous is not None:
            if previous.request_hash != request_hash:
                raise APIError(
                    409, "IDEMPOTENCY_CONFLICT", "Key was used for another customer request"
                )
            return schemas.CustomerResponse.model_validate(previous.response_json)

    row = Customer(business_id=business, **body)
    db.add(row)
    db.flush()
    result = schemas.CustomerResponse(id=row.id, business_id=business, balance_minor=0, **body)
    if key is not None:
        db.add(
            CustomerCreationRequest(
                business_id=business,
                created_by=user,
                key=key,
                request_hash=request_hash,
                result_customer_id=row.id,
                response_json=result.model_dump(mode="json"),
            )
        )
        db.flush()
    return result


def result(db: Session, business: UUID, user: UUID, key: str):
    previous = receipt(db, business, user, key)
    if previous is None:
        return schemas.CustomerCreationNotObserved(status="not_observed", customer=None)
    return schemas.CustomerCreationCompleted(
        status="completed", customer=schemas.CustomerResponse.model_validate(previous.response_json)
    )
