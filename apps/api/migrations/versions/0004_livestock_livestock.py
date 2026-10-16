"""livestock"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0004_livestock"
down_revision = "0003_drafts"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "livestock_listings",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("species", sa.String(length=20), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("price_per_head_minor", sa.BigInteger(), nullable=False),
        sa.Column("locality", sa.String(length=100), nullable=False),
        sa.Column("locality_key", sa.String(length=200), nullable=False),
        sa.Column("age_months", sa.Integer(), nullable=True),
        sa.Column("sex", sa.String(length=10), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("contact", sa.String(length=200), nullable=False),
        sa.Column("contact_consent", sa.Boolean(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("confirmed_on", sa.Date(), nullable=False),
        sa.Column("is_demo", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "sex IN ('male','female','unknown')", name=op.f("ck_livestock_listings_sex")
        ),
        sa.CheckConstraint(
            "species IN ('cattle','sheep','goat','horse','camel')",
            name=op.f("ck_livestock_listings_species"),
        ),
        sa.CheckConstraint(
            "status IN ('active','sold','withdrawn')", name=op.f("ck_livestock_listings_status")
        ),
        sa.CheckConstraint("age_months BETWEEN 0 AND 600", name=op.f("ck_livestock_listings_age")),
        sa.CheckConstraint("contact_consent = true", name=op.f("ck_livestock_listings_consent")),
        sa.CheckConstraint(
            "price_per_head_minor BETWEEN 1 AND 10000000000",
            name=op.f("ck_livestock_listings_price"),
        ),
        sa.CheckConstraint(
            "quantity BETWEEN 1 AND 10000", name=op.f("ck_livestock_listings_quantity")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_livestock_listings")),
        sa.UniqueConstraint("owner_id", "id", name=op.f("uq_livestock_listings_owner_id")),
        schema="qadam",
    )
    op.create_index(
        op.f("ix_livestock_listings_confirmed_on"),
        "livestock_listings",
        ["confirmed_on"],
        unique=False,
        schema="qadam",
    )
    op.create_index(
        op.f("ix_livestock_listings_locality_key"),
        "livestock_listings",
        ["locality_key"],
        unique=False,
        schema="qadam",
    )
    op.create_index(
        op.f("ix_livestock_listings_owner_id"),
        "livestock_listings",
        ["owner_id"],
        unique=False,
        schema="qadam",
    )
    op.create_index(
        op.f("ix_livestock_listings_species"),
        "livestock_listings",
        ["species"],
        unique=False,
        schema="qadam",
    )
    op.create_table(
        "livestock_requests",
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("key", sa.Uuid(), nullable=False),
        sa.Column("fingerprint", sa.String(length=64), nullable=False),
        sa.Column("response_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.PrimaryKeyConstraint("owner_id", "key", name=op.f("pk_livestock_requests")),
        schema="qadam",
    )
    op.create_table(
        "livestock_photos",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("listing_id", sa.Uuid(), nullable=True),
        sa.Column("position", sa.Integer(), nullable=True),
        sa.Column("object_key", sa.String(length=200), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("position BETWEEN 0 AND 2", name=op.f("ck_livestock_photos_position")),
        sa.CheckConstraint(
            "(listing_id IS NULL AND position IS NULL) OR "
            "(listing_id IS NOT NULL AND position IS NOT NULL)",
            name=op.f("ck_livestock_photos_attachment"),
        ),
        sa.ForeignKeyConstraint(
            ["owner_id", "listing_id"],
            ["qadam.livestock_listings.owner_id", "qadam.livestock_listings.id"],
            name="fk_livestock_photo_owner",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_livestock_photos")),
        sa.UniqueConstraint("listing_id", "position", name=op.f("uq_livestock_photos_listing_id")),
        sa.UniqueConstraint("object_key", name=op.f("uq_livestock_photos_object_key")),
        schema="qadam",
    )
    op.create_index(
        op.f("ix_livestock_photos_listing_id"),
        "livestock_photos",
        ["listing_id"],
        unique=False,
        schema="qadam",
    )
    op.create_index(
        op.f("ix_livestock_photos_owner_id"),
        "livestock_photos",
        ["owner_id"],
        unique=False,
        schema="qadam",
    )

    for table in ("livestock_listings", "livestock_photos", "livestock_requests"):
        op.execute(f"ALTER TABLE qadam.{table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"REVOKE ALL ON qadam.{table} FROM PUBLIC")
        for role in ("anon", "authenticated"):
            op.execute(f"""DO $$ BEGIN
              IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='{role}') THEN
                REVOKE ALL ON qadam.{table} FROM {role};
              END IF;
            END $$""")


def downgrade():
    op.drop_index(
        op.f("ix_livestock_photos_owner_id"), table_name="livestock_photos", schema="qadam"
    )
    op.drop_index(
        op.f("ix_livestock_photos_listing_id"), table_name="livestock_photos", schema="qadam"
    )
    op.drop_table("livestock_photos", schema="qadam")
    op.drop_table("livestock_requests", schema="qadam")
    op.drop_index(
        op.f("ix_livestock_listings_species"), table_name="livestock_listings", schema="qadam"
    )
    op.drop_index(
        op.f("ix_livestock_listings_owner_id"), table_name="livestock_listings", schema="qadam"
    )
    op.drop_index(
        op.f("ix_livestock_listings_locality_key"), table_name="livestock_listings", schema="qadam"
    )
    op.drop_index(
        op.f("ix_livestock_listings_confirmed_on"), table_name="livestock_listings", schema="qadam"
    )
    op.drop_table("livestock_listings", schema="qadam")
