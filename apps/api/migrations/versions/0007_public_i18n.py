"""Nullable RU/KK public display variants. No data backfill."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0007_public_i18n"
down_revision = "0006_customer_requests"
branch_labels = None
depends_on = None
FIELDS = {
    "venues": ("name", "address_label"),
    "businesses": ("name", "description"),
    "catalog_items": ("name",),
}


def translation_check(column):
    checks = [f"jsonb_typeof({column}) = 'object'", f"({column} - 'ru' - 'kk') = '{{}}'::jsonb"]
    for lang in ("ru", "kk"):
        checks.append(
            f"({column}->'{lang}' IS NULL OR {column}->'{lang}' = 'null'::jsonb OR "
            f"(jsonb_typeof({column}->'{lang}') = 'string' AND "
            f"length(btrim({column}->>'{lang}')) BETWEEN 1 AND 2000))"
        )
    return f"{column} IS NULL OR (" + " AND ".join(checks) + ")"


CHECKS = {
    field: translation_check(field + "_i18n") for field in ("name", "description", "address_label")
}


def upgrade():
    for table, fields in FIELDS.items():
        for field in fields:
            op.add_column(
                table, sa.Column(field + "_i18n", postgresql.JSONB(), nullable=True), schema="qadam"
            )
            op.create_check_constraint(
                op.f("ck_" + table + "_" + field + "_i18n"), table, CHECKS[field], schema="qadam"
            )


def downgrade():
    for table, fields in FIELDS.items():
        for field in fields:
            op.drop_constraint(
                op.f("ck_" + table + "_" + field + "_i18n"), table, schema="qadam", type_="check"
            )
            op.drop_column(table, field + "_i18n", schema="qadam")
