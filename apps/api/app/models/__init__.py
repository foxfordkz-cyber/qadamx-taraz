from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    MetaData,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    metadata = MetaData(
        schema="qadam",
        naming_convention={
            "ix": "ix_%(table_name)s_%(column_0_name)s",
            "uq": "uq_%(table_name)s_%(column_0_name)s",
            "ck": "ck_%(table_name)s_%(constraint_name)s",
            "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
            "pk": "pk_%(table_name)s",
        },
    )


class Venue(Base):
    __tablename__ = "venues"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    slug: Mapped[str] = mapped_column(String(100), unique=True)
    name: Mapped[str] = mapped_column(String(200))
    address_label: Mapped[str] = mapped_column(String(300))
    geometry_status: Mapped[str] = mapped_column(String(30))
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)


class Business(Base):
    __tablename__ = "businesses"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    venue_id: Mapped[UUID] = mapped_column(ForeignKey("qadam.venues.id"), index=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True)
    name: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)


class Membership(Base):
    __tablename__ = "memberships"
    __table_args__ = (CheckConstraint("role = 'owner'", name="owner_role"),)
    user_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    business_id: Mapped[UUID] = mapped_column(ForeignKey("qadam.businesses.id"), primary_key=True)
    role: Mapped[str] = mapped_column(String(20), default="owner")


class CatalogItem(Base):
    __tablename__ = "catalog_items"
    __table_args__ = (
        CheckConstraint("price_minor >= 0 AND price_minor <= 10000000000", name="price_range"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    business_id: Mapped[UUID] = mapped_column(ForeignKey("qadam.businesses.id"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    price_minor: Mapped[int | None] = mapped_column(BigInteger)
    available: Mapped[bool] = mapped_column(Boolean, default=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)


class Customer(Base):
    __tablename__ = "customers"
    __table_args__ = (UniqueConstraint("business_id", "id", name="uq_customers_business_id_id"),)
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    business_id: Mapped[UUID] = mapped_column(ForeignKey("qadam.businesses.id"), index=True)
    display_name: Mapped[str] = mapped_column(String(200))
    note: Mapped[str] = mapped_column(Text, default="")
    contact: Mapped[str | None] = mapped_column(String(200))


class Operation(Base):
    __tablename__ = "operations"
    __table_args__ = (
        UniqueConstraint("business_id", "id", name="uq_operations_business_id_id"),
        ForeignKeyConstraint(
            ["business_id", "customer_id"],
            ["qadam.customers.business_id", "qadam.customers.id"],
            name="fk_operation_customer_tenant",
        ),
        ForeignKeyConstraint(
            ["business_id", "sale_id"],
            ["qadam.operations.business_id", "qadam.operations.id"],
            name="fk_operation_sale_tenant",
        ),
        ForeignKeyConstraint(
            ["business_id", "reversal_of"],
            ["qadam.operations.business_id", "qadam.operations.id"],
            name="fk_operation_reversal_tenant",
        ),
        CheckConstraint("kind IN ('sale','repayment','reversal')", name="kind"),
        CheckConstraint(
            """
            (kind = 'sale' AND sale_id = id AND reversal_of IS NULL
             AND sales_delta_minor BETWEEN 1 AND 10000000000
             AND receipts_delta_minor BETWEEN 0 AND sales_delta_minor
             AND (sales_delta_minor = receipts_delta_minor OR customer_id IS NOT NULL))
            OR (kind = 'repayment' AND sale_id <> id AND reversal_of IS NULL
                AND sales_delta_minor = 0 AND receipts_delta_minor BETWEEN 1 AND 10000000000
                AND customer_id IS NOT NULL)
            OR (kind = 'reversal' AND reversal_of IS NOT NULL AND sale_id <> id
                AND sales_delta_minor BETWEEN -10000000000 AND 0
                AND receipts_delta_minor BETWEEN -10000000000 AND 0)
        """,
            name="money_shape",
        ),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    business_id: Mapped[UUID] = mapped_column(ForeignKey("qadam.businesses.id"), index=True)
    customer_id: Mapped[UUID | None] = mapped_column(Uuid, index=True)
    sale_id: Mapped[UUID] = mapped_column(Uuid, index=True)
    kind: Mapped[str] = mapped_column(String(20))
    sales_delta_minor: Mapped[int] = mapped_column(BigInteger)
    receipts_delta_minor: Mapped[int] = mapped_column(BigInteger)
    reversal_of: Mapped[UUID | None] = mapped_column(Uuid, unique=True)
    description: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.clock_timestamp(), index=True
    )
    created_by: Mapped[UUID] = mapped_column(Uuid)


class IdempotencyRecord(Base):
    __tablename__ = "idempotency_records"
    __table_args__ = (
        ForeignKeyConstraint(
            ["business_id", "result_operation_id"],
            ["qadam.operations.business_id", "qadam.operations.id"],
            name="fk_idempotency_operation_tenant",
        ),
    )
    business_id: Mapped[UUID] = mapped_column(ForeignKey("qadam.businesses.id"), primary_key=True)
    key: Mapped[str] = mapped_column(String(200), primary_key=True)
    request_hash: Mapped[str] = mapped_column(String(64))
    result_operation_id: Mapped[UUID] = mapped_column(Uuid)
    response_json: Mapped[dict] = mapped_column(JSONB)


class Inquiry(Base):
    __tablename__ = "inquiries"
    __table_args__ = (
        UniqueConstraint("business_id", "client_request_id", name="uq_inquiries_client_request"),
        CheckConstraint("status IN ('new','in_progress','closed')", name="status"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    business_id: Mapped[UUID] = mapped_column(ForeignKey("qadam.businesses.id"), index=True)
    visitor_name: Mapped[str] = mapped_column(String(100))
    contact: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(String(2000))
    status: Mapped[str] = mapped_column(String(20), default="new")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.clock_timestamp()
    )
    client_request_id: Mapped[UUID] = mapped_column(Uuid)


class Draft(Base):
    __tablename__ = "drafts"
    __table_args__ = (
        ForeignKeyConstraint(
            ["business_id", "consumed_operation_id"],
            ["qadam.operations.business_id", "qadam.operations.id"],
            name="fk_draft_operation_tenant",
        ),
        CheckConstraint("expires_at > created_at", name="expiry"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    business_id: Mapped[UUID] = mapped_column(ForeignKey("qadam.businesses.id"), index=True)
    created_by: Mapped[UUID] = mapped_column(Uuid, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.clock_timestamp()
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    response_json: Mapped[dict] = mapped_column(JSONB)
    consumed_operation_id: Mapped[UUID | None] = mapped_column(Uuid, unique=True)
