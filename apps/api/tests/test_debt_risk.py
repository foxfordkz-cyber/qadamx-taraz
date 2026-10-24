import pytest

from app.services.debt_risk import assess


@pytest.mark.parametrize(
    "age,balance,paid,score,category",
    [
        (0, 100, 0, 30, "medium"),
        (7, 40, 60, 0, "low"),
        (8, 40, 60, 25, "low"),
        (30, 50, 50, 45, "medium"),
        (31, 40, 60, 50, "medium"),
        (31, 50, 50, 70, "high"),
        (365, 100, 0, 80, "high"),
        (365, 0, 100, 0, "low"),
    ],
)
def test_explainable_boundaries(age, balance, paid, score, category):
    result = assess(
        age_days=age, balance_minor=balance, initial_debt_minor=100, later_paid_minor=paid
    )
    assert result["score"] == score and result["category"] == category
    assert result["factors"]


@pytest.mark.parametrize("amount", [True, -1, 1.5, 101])
def test_invalid_or_inconsistent_ledger_facts_rejected(amount):
    with pytest.raises(ValueError):
        assess(age_days=10, balance_minor=amount, initial_debt_minor=100, later_paid_minor=0)
