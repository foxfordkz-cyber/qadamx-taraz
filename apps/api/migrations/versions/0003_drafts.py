"""Private expiring AI drafts, consumed atomically by the existing ledger."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0003_drafts"
down_revision = "0002_ledger"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "drafts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("business_id", sa.Uuid(), nullable=False),
        sa.Column("created_by", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("response_json", postgresql.JSONB(), nullable=False),
        sa.Column("consumed_operation_id", sa.Uuid(), nullable=True),
        sa.CheckConstraint("expires_at > created_at", name="ck_drafts_expiry"),
        sa.ForeignKeyConstraint(
            ["business_id"], ["qadam.businesses.id"], name="fk_drafts_business_id_businesses"
        ),
        sa.ForeignKeyConstraint(
            ["business_id", "consumed_operation_id"],
            ["qadam.operations.business_id", "qadam.operations.id"],
            name="fk_draft_operation_tenant",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_drafts"),
        sa.UniqueConstraint("consumed_operation_id", name="uq_drafts_consumed_operation_id"),
        schema="qadam",
    )
    for column in ("business_id", "created_by", "expires_at"):
        op.create_index(f"ix_drafts_{column}", "drafts", [column], schema="qadam")
    op.execute("REVOKE ALL ON qadam.drafts FROM PUBLIC")
    op.execute("""DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
        REVOKE ALL ON qadam.drafts FROM anon;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
        REVOKE ALL ON qadam.drafts FROM authenticated;
      END IF;
    END $$""")


def downgrade():
    op.drop_table("drafts", schema="qadam")
