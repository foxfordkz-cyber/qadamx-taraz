from datetime import date, timedelta

import pytest

from app.services.forecasting import baseline, evaluate, metrics, normalize_daily, ridge_forecast


def history(count=180, value=lambda i: 10000 + i * 100 + (i % 7) * 500):
    return [
        dict(date=(date(2025, 1, 1) + timedelta(days=i)).isoformat(), sales_minor=value(i))
        for i in range(count)
    ]


def test_metrics_known_values():
    assert metrics([0, 4], [0, 0]) == {"mae_minor": 2, "rmse_minor": 8**0.5}
    with pytest.raises(ValueError):
        metrics([], [])


@pytest.mark.parametrize("horizon,required", [(7, 98), (30, 144)])
def test_insufficient_history_never_fabricates(horizon, required):
    result = evaluate(history(required - 1), horizon)
    assert result["status"] == "insufficient_data"
    assert result["required_days"] == required
    assert result["forecast"] == [] and result["evaluation"] is None
    assert evaluate(history(required), horizon)["status"] == "experimental"


def test_chronology_and_no_test_leakage():
    original = history()
    changed = original[:-7] + [{**r, "sales_minor": 99999999} for r in original[-7:]]
    first, second = evaluate(original), evaluate(changed)
    assert first["selected_method"] == second["selected_method"]
    for key in ("ridge_alpha", "baseline_method", "validation_baseline", "validation_ml"):
        assert first["evaluation"][key] == second["evaluation"][key]
    e = first["evaluation"]
    assert e["train_to"] < e["validation_from"] <= e["validation_to"] < e["test_from"]
    assert e["test_to"] < first["forecast"][0]["date"]
    assert first["dataset_sha256"] != second["dataset_sha256"]


def test_baseline_can_win_and_zero_history():
    report = evaluate(history(value=lambda i: 0))
    assert report["evaluation"]["test_winner"] == "tie"
    assert report["selected_method"] == "rolling_mean_7"
    assert all(d["selected_minor"] == 0 for d in report["forecast"])
    assert "all_zero_history" in report["warnings"]
    seasonal = evaluate(history(value=lambda i: (i % 7) * 10000))
    assert seasonal["evaluation"]["baseline"]["mae_minor"] == 0
    assert seasonal["evaluation"]["test_winner"] in ("baseline", "tie")


def test_baseline_and_learned_linear_system():
    assert baseline([1, 2, 3, 4, 5, 6, 7], 8, "seasonal_naive_7") == [1, 2, 3, 4, 5, 6, 7, 1]
    assert baseline([1, 2, 3, 4, 5, 6, 7], 7, "rolling_mean_7") == [4] * 7
    constant = normalize_daily(history(100, lambda i: 12345))
    assert ridge_forecast(constant, 30, 1) == [12345] * 30


@pytest.mark.parametrize("amount", [-1, True, 1.1, "100", 10**20])
def test_invalid_money_rejected(amount):
    with pytest.raises(ValueError):
        evaluate(history(1, lambda i: amount))


def test_missing_duplicate_or_unordered_dates_rejected():
    rows = history(100)
    for invalid in (rows[:20] + rows[21:], rows + rows[-1:], rows[::-1]):
        with pytest.raises(ValueError):
            evaluate(invalid)


def test_outlier_is_retained_and_flagged():
    rows = history()
    rows[100]["sales_minor"] = 10**12
    result = evaluate(rows, 30, provenance="synthetic_test")
    assert result["history"][100]["sales_minor"] == 10**12
    assert "large_values_retained" in result["warnings"]
    assert all(d["selected_minor"] >= 0 for d in result["forecast"])
    assert result == evaluate(rows, 30, provenance="synthetic_test")
