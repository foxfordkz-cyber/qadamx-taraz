"""Private catalog, customers and memberships for the bootstrap seed."""

import sqlalchemy as sa
from alembic import op

revision = "0001_catalog"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.execute("CREATE SCHEMA qadam")
    op.execute("REVOKE ALL ON SCHEMA qadam FROM PUBLIC")
    op.create_table(
        "venues",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("slug", sa.String(100), nullable=False, unique=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("address_label", sa.String(300), nullable=False),
        sa.Column("geometry_status", sa.String(30), nullable=False),
        sa.Column("is_demo", sa.Boolean(), nullable=False),
        schema="qadam",
    )
    op.create_table(
        "businesses",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("venue_id", sa.Uuid(), sa.ForeignKey("qadam.venues.id"), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False, unique=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("is_demo", sa.Boolean(), nullable=False),
        schema="qadam",
    )
    op.create_index("ix_businesses_venue_id", "businesses", ["venue_id"], schema="qadam")
    op.create_table(
        "memberships",
        sa.Column("user_id", sa.Uuid(), primary_key=True),
        sa.Column("business_id", sa.Uuid(), sa.ForeignKey("qadam.businesses.id"), primary_key=True),
        sa.Column("role", sa.String(20), nullable=False),
        sa.CheckConstraint("role = 'owner'", name="owner_role"),
        schema="qadam",
    )
    op.create_table(
        "catalog_items",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("business_id", sa.Uuid(), sa.ForeignKey("qadam.businesses.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("price_minor", sa.BigInteger(), nullable=True),
        sa.Column("available", sa.Boolean(), nullable=False),
        sa.Column("is_demo", sa.Boolean(), nullable=False),
        sa.CheckConstraint("price_minor >= 0 AND price_minor <= 10000000000", name="price_range"),
        schema="qadam",
    )
    op.create_index(
        "ix_catalog_items_business_id", "catalog_items", ["business_id"], schema="qadam"
    )
    op.create_table(
        "customers",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("business_id", sa.Uuid(), sa.ForeignKey("qadam.businesses.id"), nullable=False),
        sa.Column("display_name", sa.String(200), nullable=False),
        sa.Column("note", sa.Text(), nullable=False),
        sa.Column("contact", sa.String(200), nullable=True),
        schema="qadam",
    )
    op.create_index("ix_customers_business_id", "customers", ["business_id"], schema="qadam")
    op.execute("REVOKE ALL ON ALL TABLES IN SCHEMA qadam FROM PUBLIC")
    # Supabase can grant default table privileges; revoke those when its roles exist.
    op.execute("""
        DO $$ BEGIN
          IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
            REVOKE ALL ON SCHEMA qadam FROM anon;
            REVOKE ALL ON ALL TABLES IN SCHEMA qadam FROM anon;
          END IF;
          IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
            REVOKE ALL ON SCHEMA qadam FROM authenticated;
            REVOKE ALL ON ALL TABLES IN SCHEMA qadam FROM authenticated;
          END IF;
        END $$;
    """)


def downgrade():
    for name in ("customers", "catalog_items", "memberships", "businesses", "venues"):
        op.drop_table(name, schema="qadam")
    op.execute("DROP SCHEMA qadam")
