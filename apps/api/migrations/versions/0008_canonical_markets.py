"""Explicit canonical market links, no name matching, registry starts empty."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0008_canonical_markets"
down_revision = "0007_public_i18n"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "livestock_markets",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("key", sa.String(100), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("name_i18n", postgresql.JSONB(), nullable=True),
        sa.Column("locality", sa.String(100), nullable=False),
        sa.Column("verification_status", sa.String(20), nullable=False),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("verification_note", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key"),
        sa.CheckConstraint("key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'", name="key_format"),
        sa.CheckConstraint(
            "verification_status IN ('unverified','verified','retired')",
            name="verification_status",
        ),
        sa.CheckConstraint(
            "verification_status <> 'verified' OR "
            "(verified_at IS NOT NULL AND length(btrim(verification_note)) > 0)",
            name="verification_evidence",
        ),
        sa.CheckConstraint(
            "name_i18n IS NULL OR (jsonb_typeof(name_i18n) = 'object' AND "
            "(name_i18n - 'ru' - 'kk') = '{}'::jsonb AND "
            "(name_i18n->'ru' IS NULL OR name_i18n->'ru' = 'null'::jsonb OR "
            "(jsonb_typeof(name_i18n->'ru') = 'string' AND "
            "length(btrim(name_i18n->>'ru')) BETWEEN 1 AND 2000)) AND "
            "(name_i18n->'kk' IS NULL OR name_i18n->'kk' = 'null'::jsonb OR "
            "(jsonb_typeof(name_i18n->'kk') = 'string' AND "
            "length(btrim(name_i18n->>'kk')) BETWEEN 1 AND 2000)))",
            name="name_i18n",
        ),
        schema="qadam",
    )
    op.execute("ALTER TABLE qadam.livestock_markets ENABLE ROW LEVEL SECURITY")
    op.execute("REVOKE ALL ON qadam.livestock_markets FROM PUBLIC")
    op.execute("""
        DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                REVOKE ALL ON qadam.livestock_markets FROM anon;
            END IF;
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
                REVOKE ALL ON qadam.livestock_markets FROM authenticated;
            END IF;
        END $$;
    """)
    op.add_column("livestock_listings", sa.Column("market_id", sa.Uuid()), schema="qadam")
    op.create_foreign_key(
        "fk_livestock_listings_market_id_livestock_markets",
        "livestock_listings",
        "livestock_markets",
        ["market_id"],
        ["id"],
        source_schema="qadam",
        referent_schema="qadam",
    )
    op.create_index(
        "ix_livestock_listings_market_id", "livestock_listings", ["market_id"], schema="qadam"
    )


def downgrade():
    # Administrative only: app rollback must retain links and reject unsupported filters.
    op.drop_index(
        "ix_livestock_listings_market_id", table_name="livestock_listings", schema="qadam"
    )
    op.drop_constraint(
        "fk_livestock_listings_market_id_livestock_markets",
        "livestock_listings",
        schema="qadam",
        type_="foreignkey",
    )
    op.drop_column("livestock_listings", "market_id", schema="qadam")
    op.drop_table("livestock_markets", schema="qadam")
