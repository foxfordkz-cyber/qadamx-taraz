"""Explainable review priority, NOT trained ML or an overdue/default probability."""


def assess(*, age_days, balance_minor, initial_debt_minor, later_paid_minor):
    values = (age_days, balance_minor, initial_debt_minor, later_paid_minor)
    if any(type(v) is not int or v < 0 for v in values):
        raise ValueError("Nonnegative integer ledger facts required")
    if initial_debt_minor != balance_minor + later_paid_minor:
        raise ValueError("Inconsistent open-sale debt facts")
    if not balance_minor:
        return dict(score=0, category="low", factors=["no_current_debt"])
    score, factors = 0, []
    if age_days >= 31:
        score += 50
        factors.append("open_sale_age_31_plus")
    elif age_days >= 8:
        score += 25
        factors.append("open_sale_age_8_30")
    else:
        factors.append("open_sale_age_0_7")
    if balance_minor * 2 >= initial_debt_minor:
        score += 20
        factors.append("at_least_half_initial_debt_unpaid")
    if later_paid_minor == 0:
        score += 10
        factors.append("no_net_later_payment_on_open_sales")
    else:
        factors.append("net_later_payment_observed")
    return dict(
        score=score,
        category="high" if score >= 60 else "medium" if score >= 30 else "low",
        factors=factors,
    )
