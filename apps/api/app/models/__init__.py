from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
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


class CustomerCreationRequest(Base):
    __tablename__ = "customer_creation_requests"
    __table_args__ = (
        ForeignKeyConstraint(
            ["business_id", "result_customer_id"],
            ["qadam.customers.business_id", "qadam.customers.id"],
            name="fk_customer_creation_customer_tenant",
        ),
    )
    business_id: Mapped[UUID] = mapped_column(ForeignKey("qadam.businesses.id"), primary_key=True)
    created_by: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    key: Mapped[str] = mapped_column(String(200), primary_key=True)
    request_hash: Mapped[str] = mapped_column(String(64))
    result_customer_id: Mapped[UUID] = mapped_column(Uuid)
    response_json: Mapped[dict] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.clock_timestamp()
    )


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


class LivestockListing(Base):
    __tablename__ = "livestock_listings"
    __table_args__ = (
        UniqueConstraint("owner_id", "id"),
        CheckConstraint("quantity BETWEEN 1 AND 10000", name="quantity"),
        CheckConstraint("price_per_head_minor BETWEEN 1 AND 10000000000", name="price"),
        CheckConstraint("age_months BETWEEN 0 AND 600", name="age"),
        CheckConstraint("species IN ('cattle','sheep','goat','horse','camel')", name="species"),
        CheckConstraint("status IN ('active','sold','withdrawn')", name="status"),
        CheckConstraint("sex IN ('male','female','unknown')", name="sex"),
        CheckConstraint("contact_consent = true", name="consent"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    owner_id: Mapped[UUID] = mapped_column(Uuid, index=True)
    species: Mapped[str] = mapped_column(String(20), index=True)
    quantity: Mapped[int] = mapped_column(Integer)
    price_per_head_minor: Mapped[int] = mapped_column(BigInteger)
    locality: Mapped[str] = mapped_column(String(100))
    locality_key: Mapped[str] = mapped_column(String(200), index=True)
    market: Mapped[str | None] = mapped_column(String(100))
    market_key: Mapped[str | None] = mapped_column(String(300), index=True)
    age_months: Mapped[int | None] = mapped_column(Integer)
    sex: Mapped[str | None] = mapped_column(String(10))
    description: Mapped[str | None] = mapped_column(Text)
    contact: Mapped[str] = mapped_column(String(200))
    contact_consent: Mapped[bool] = mapped_column(Boolean)
    status: Mapped[str] = mapped_column(String(20), default="active")
    confirmed_on: Mapped[date] = mapped_column(Date, index=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class LivestockPhoto(Base):
    __tablename__ = "livestock_photos"
    __table_args__ = (
        ForeignKeyConstraint(
            ["owner_id", "listing_id"],
            ["qadam.livestock_listings.owner_id", "qadam.livestock_listings.id"],
            name="fk_livestock_photo_owner",
        ),
        CheckConstraint("position BETWEEN 0 AND 2", name="position"),
        CheckConstraint(
            "(listing_id IS NULL AND position IS NULL) OR "
            "(listing_id IS NOT NULL AND position IS NOT NULL)",
            name="attachment",
        ),
        UniqueConstraint("listing_id", "position"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    owner_id: Mapped[UUID] = mapped_column(Uuid, index=True)
    listing_id: Mapped[UUID | None] = mapped_column(Uuid, index=True)
    position: Mapped[int | None] = mapped_column(Integer)
    object_key: Mapped[str] = mapped_column(String(200), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class LivestockRequest(Base):
    __tablename__ = "livestock_requests"
    owner_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    key: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    fingerprint: Mapped[str] = mapped_column(String(64))
    response_json: Mapped[dict] = mapped_column(JSONB)
