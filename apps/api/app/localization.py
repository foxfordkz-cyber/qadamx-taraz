"""Explicit public translations; no inference or translation of seller/customer data."""

from typing import Literal

Language = Literal["ru", "kk"]


def translation_check(column):
    checks = [f"jsonb_typeof({column}) = 'object'", f"({column} - 'ru' - 'kk') = '{{}}'::jsonb"]
    for lang in ("ru", "kk"):
        checks.append(
            f"({column}->'{lang}' IS NULL OR {column}->'{lang}' = 'null'::jsonb OR "
            f"(jsonb_typeof({column}->'{lang}') = 'string' AND "
            f"length(btrim({column}->>'{lang}')) BETWEEN 1 AND 2000))"
        )
    return f"{column} IS NULL OR (" + " AND ".join(checks) + ")"


def localized(row, schema, lang=None):
    result = schema.model_validate(row)
    if lang:
        for field in ("name", "description", "address_label"):
            variants = getattr(result, field + "_i18n", None)
            value = getattr(variants, lang, None) if variants else None
            if value:
                setattr(result, field, value)
    return result
