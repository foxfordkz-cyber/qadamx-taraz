"""Verbatim original validator definitions; offline evaluation ONLY.

Source: 2518b2e80b8c8ef881063a968645382d61aeb37e apps/api/app/services/assistant.py
Not imported by production app.
"""

import json
import re

from app.assistant_schemas import AssistantAction
from app.schemas import Contract

MAX_ACTIONS = 3

NUMBER = re.compile(r"\d{1,3}(?:[   ]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?")


class ModelAction(Contract):
    kind: str
    customer_id: str | None
    text: str | None


class ModelAnswer(Contract):
    answer: str
    actions: list[ModelAction]


def numbers_in(text):
    found = set()
    for raw in NUMBER.findall(text):
        value = re.sub(r"[   ]", "", raw).replace(",", ".")
        found.add(value.rstrip("0").rstrip(".") if "." in value else value)
    return found


def allowed_numbers(facts, days):
    allowed = {str(days)}
    for item in facts:
        if item.count is not None:
            allowed.add(str(item.count))
        if item.value_minor is not None:
            whole, rest = divmod(abs(item.value_minor), 100)
            allowed.add(str(whole) if not rest else f"{whole}.{rest:02d}".rstrip("0"))
    return allowed


def validate_answer(raw, facts, days, locale):
    data = ModelAnswer.model_validate(json.loads(raw))
    answer = data.answer.strip()
    if not 1 <= len(answer) <= 1500:
        raise ValueError("answer length")
    debtors = {str(f.customer_id): f for f in facts if f.key == "debtor"}
    allowed = allowed_numbers(facts, days)
    actions = []
    for item in data.actions[:MAX_ACTIONS]:
        action = AssistantAction.model_validate(
            {"kind": item.kind, "customer_id": item.customer_id, "text": item.text}
        )
        if action.kind == "reminder_draft":
            if str(action.customer_id) not in debtors or not action.text:
                raise ValueError("reminder without listed debtor")
            if not numbers_in(action.text) <= allowed:
                raise ValueError("reminder number")
        else:
            action = AssistantAction(kind=action.kind)
        if action not in actions:
            actions.append(action)
    if not numbers_in(answer) <= allowed:
        raise ValueError("answer number")
    return answer, actions
