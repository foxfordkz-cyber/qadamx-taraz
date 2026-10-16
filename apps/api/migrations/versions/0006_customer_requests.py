"""Durable customer creation receipts. Existing customers are unchanged."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0006_customer_requests"
down_revision = "0005_livestock_market"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "customer_creation_requests",
        sa.Column("business_id", sa.Uuid(), nullable=False),
        sa.Column("created_by", sa.Uuid(), nullable=False),
        sa.Column("key", sa.String(200), nullable=False),
        sa.Column("request_hash", sa.String(64), nullable=False),
        sa.Column("result_customer_id", sa.Uuid(), nullable=False),
        sa.Column("response_json", postgresql.JSONB(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("business_id", "created_by", "key"),
        sa.ForeignKeyConstraint(["business_id"], ["qadam.businesses.id"]),
        sa.ForeignKeyConstraint(
            ["business_id", "result_customer_id"],
            ["qadam.customers.business_id", "qadam.customers.id"],
            name="fk_customer_creation_customer_tenant",
        ),
        schema="qadam",
    )
    op.execute("ALTER TABLE qadam.customer_creation_requests ENABLE ROW LEVEL SECURITY")
    op.execute("REVOKE ALL ON qadam.customer_creation_requests FROM PUBLIC")
    op.execute("""
        DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                REVOKE ALL ON qadam.customer_creation_requests FROM anon;
            END IF;
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
                REVOKE ALL ON qadam.customer_creation_requests FROM authenticated;
            END IF;
        END $$;
    """)


def downgrade():
    # Administrative downgrade discards recovery guarantees; never part of normal rollout.
    op.drop_table("customer_creation_requests", schema="qadam")
