"""Private, consented owner feedback; no ledger changes."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0009_research_feedback"
down_revision = "0008_canonical_markets"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "research_feedback",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("business_id", sa.Uuid(), nullable=False),
        sa.Column("created_by", sa.Uuid(), nullable=False),
        sa.Column("client_request_id", sa.Uuid(), nullable=False),
        sa.Column("request_hash", sa.String(64), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("clock_timestamp()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["business_id"], ["qadam.businesses.id"]),
        sa.UniqueConstraint(
            "business_id", "created_by", "client_request_id", name="uq_research_feedback_request"
        ),
        sa.CheckConstraint(
            "payload @> jsonb_build_object('consent', true)",
            name=op.f("ck_research_feedback_consent"),
        ),
        schema="qadam",
    )
    op.create_index(
        "ix_research_feedback_owner_page",
        "research_feedback",
        ["business_id", "created_by", "id"],
        schema="qadam",
    )
    op.execute("ALTER TABLE qadam.research_feedback ENABLE ROW LEVEL SECURITY")
    op.execute("REVOKE ALL ON qadam.research_feedback FROM PUBLIC")
    op.execute("""
        DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                REVOKE ALL ON qadam.research_feedback FROM anon;
            END IF;
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
                REVOKE ALL ON qadam.research_feedback FROM authenticated;
            END IF;
        END $$;
    """)


def downgrade():
    op.drop_index("ix_research_feedback_owner_page", table_name="research_feedback", schema="qadam")
    op.drop_table("research_feedback", schema="qadam")
