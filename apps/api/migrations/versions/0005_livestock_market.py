"""Optional explicit livestock market; old listings remain unassigned."""

import sqlalchemy as sa
from alembic import op

revision = "0005_livestock_market"
down_revision = "0004_livestock"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "livestock_listings", sa.Column("market", sa.String(100), nullable=True), schema="qadam"
    )
    op.add_column(
        "livestock_listings", sa.Column("market_key", sa.String(300), nullable=True), schema="qadam"
    )
    op.create_index(
        "ix_livestock_listings_market_key", "livestock_listings", ["market_key"], schema="qadam"
    )


def downgrade():
    op.drop_index(
        "ix_livestock_listings_market_key", table_name="livestock_listings", schema="qadam"
    )
    op.drop_column("livestock_listings", "market_key", schema="qadam")
    op.drop_column("livestock_listings", "market", schema="qadam")
