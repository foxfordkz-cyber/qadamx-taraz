import hashlib
import json
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.errors import APIError
from app.models import ResearchFeedback
from app.research_schemas import FeedbackPage, FeedbackReceipt, FeedbackRecord


def create(db, business_id, user, payload):
    body = payload.model_dump(mode="json")
    fingerprint = hashlib.sha256(json.dumps(body, sort_keys=True).encode()).hexdigest()
    db.execute(
        insert(ResearchFeedback)
        .values(
            id=uuid4(),
            business_id=business_id,
            created_by=user,
            client_request_id=payload.client_request_id,
            request_hash=fingerprint,
            payload=body,
        )
        .on_conflict_do_nothing(constraint="uq_research_feedback_request")
    )
    row = db.scalar(
        select(ResearchFeedback).where(
            ResearchFeedback.business_id == business_id,
            ResearchFeedback.created_by == user,
            ResearchFeedback.client_request_id == payload.client_request_id,
        )
    )
    if row.request_hash != fingerprint:
        raise APIError(409, "IDEMPOTENCY_CONFLICT", "This feedback request has different content")
    return FeedbackReceipt(
        id=row.id, client_request_id=row.client_request_id, created_at=row.created_at
    )


def read(db, business_id, user, limit=25, cursor=None):
    query = select(ResearchFeedback).where(
        ResearchFeedback.business_id == business_id, ResearchFeedback.created_by == user
    )
    if cursor:
        query = query.where(ResearchFeedback.id > cursor)
    rows = db.scalars(query.order_by(ResearchFeedback.id).limit(limit + 1)).all()
    return FeedbackPage(
        business_id=business_id,
        items=[
            FeedbackRecord(**row.payload, id=row.id, created_at=row.created_at)
            for row in rows[:limit]
        ],
        next_cursor=rows[limit - 1].id if len(rows) > limit else None,
    )
