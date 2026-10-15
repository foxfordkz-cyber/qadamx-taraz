"""Stage-one catalog and membership tables in a non-public schema."""

from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    ForeignKey,
    MetaData,
    String,
    Text,
    Uuid,
)
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

    # Supabase subject; the seed never creates users/passwords in Supabase Auth.
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

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    business_id: Mapped[UUID] = mapped_column(ForeignKey("qadam.businesses.id"), index=True)
    display_name: Mapped[str] = mapped_column(String(200))
    note: Mapped[str] = mapped_column(Text, default="")
    contact: Mapped[str | None] = mapped_column(String(200))
