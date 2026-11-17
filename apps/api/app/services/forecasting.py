"""Bounded, deterministic forecasting. No provider calls, randomness or journal writes."""

import hashlib
import json
import math
from datetime import date, timedelta
from statistics import fmean, median

VERSION = "ridge-lags-v1"
MIN_TRAIN = 84
MAX_DAYS = 730
MAX_MINOR = 9_007_199_254_740_991


def normalize_daily(rows):
    """A complete authoritative daily export is required; unknown gaps are not zeroes."""
    if len(rows) > MAX_DAYS:
        raise ValueError("At most 730 completed days are supported")
    result = []
    for row in rows:
        day = date.fromisoformat(str(row["date"]))
        amount = row["sales_minor"]
        if type(amount) is not int or not 0 <= amount <= MAX_MINOR:
            raise ValueError("Invalid integer daily sales total")
        if result and day != result[-1][0] + timedelta(days=1):
            raise ValueError("Dates must be unique, ordered and consecutive")
        result.append((day, amount))
    return result


def metrics(actual, predicted):
    if not actual or len(actual) != len(predicted):
        raise ValueError("Metrics require matching non-empty observations")
    errors = [float(a) - float(p) for a, p in zip(actual, predicted, strict=True)]
    if not all(math.isfinite(e) for e in errors):
        raise ValueError("Metrics require finite observations")
    return {
        "mae_minor": fmean(abs(e) for e in errors),
        "rmse_minor": math.sqrt(fmean(e * e for e in errors)),
    }


def rounded(value):
    if not math.isfinite(value):
        raise ValueError("Non-finite prediction")
    return min(MAX_MINOR, max(0, math.floor(value + 0.5)))


def baseline(values, horizon, method):
    if len(values) < 7:
        raise ValueError("Seven observations required")
    if method == "rolling_mean_7":
        return [rounded(fmean(values[-7:]))] * horizon
    if method == "seasonal_naive_7":
        return [values[-7 + i % 7] for i in range(horizon)]
    raise ValueError("Unknown baseline")


def features(values, day, scale):
    return [
        1.0,
        values[-1] / scale,
        values[-7] / scale,
        fmean(values[-7:]) / scale,
        fmean(values[-28:]) / scale,
        *[float(day.weekday() == weekday) for weekday in range(6)],
    ]


def solve(matrix, target):
    """Partial-pivot Gaussian elimination on an 11x11 ridge normal system."""
    size = len(target)
    augmented = [list(row) + [y] for row, y in zip(matrix, target, strict=True)]
    for column in range(size):
        pivot = max(range(column, size), key=lambda r: abs(augmented[r][column]))
        augmented[column], augmented[pivot] = augmented[pivot], augmented[column]
        divisor = augmented[column][column]
        if abs(divisor) < 1e-12:
            raise ValueError("Singular regression system")
        augmented[column] = [v / divisor for v in augmented[column]]
        for row in range(size):
            if row != column:
                factor = augmented[row][column]
                augmented[row] = [
                    a - factor * b for a, b in zip(augmented[row], augmented[column], strict=True)
                ]
    return [row[-1] for row in augmented]


def ridge_forecast(series, horizon, alpha):
    if len(series) < MIN_TRAIN or alpha <= 0:
        raise ValueError("Insufficient regression training history")
    values = [value for _, value in series]
    scale = max(1.0, fmean(values))  # Fit on training data only.
    design = [features(values[:i], series[i][0], scale) for i in range(28, len(series))]
    target = [value / scale for value in values[28:]]
    size = len(design[0])
    gram = [
        [sum(x[i] * x[j] for x in design) + (alpha if i == j and i else 0) for j in range(size)]
        for i in range(size)
    ]
    rhs = [sum(x[i] * y for x, y in zip(design, target, strict=True)) for i in range(size)]
    coefficients = solve(gram, rhs)
    predictions = []
    for step in range(1, horizon + 1):
        x = features(values, series[-1][0] + timedelta(days=step), scale)
        prediction = rounded(sum(a * b for a, b in zip(x, coefficients, strict=True)) * scale)
        predictions.append(prediction)
        values.append(prediction)  # Recursive: never append held-out actual values.
    return predictions


def evaluate(rows, horizon=7, *, provenance="unverified_export"):
    if horizon not in (7, 30):
        raise ValueError("horizon must be 7 or 30")
    series = normalize_daily(rows)
    fingerprint = hashlib.sha256(json.dumps(rows, sort_keys=True).encode()).hexdigest()
    result = dict(
        status="insufficient_data",
        model_version=VERSION,
        horizon=horizon,
        currency="KZT",
        timezone="Asia/Almaty",
        provenance=provenance,
        dataset_sha256=fingerprint,
        observed_days=len(series),
        required_days=MIN_TRAIN + 2 * horizon,
        history=rows,
        forecast=[],
        evaluation=None,
        selected_method=None,
        warnings=["recorded_sales_only", "experimental_not_guaranteed"],
    )
    if len(series) < result["required_days"]:
        return result
    train, validation, test = (
        series[: -2 * horizon],
        series[-2 * horizon : -horizon],
        series[-horizon:],
    )
    train_values = [v for _, v in train]
    val_actual = [v for _, v in validation]
    baseline_name = min(
        ("rolling_mean_7", "seasonal_naive_7"),
        key=lambda name: metrics(val_actual, baseline(train_values, horizon, name))["mae_minor"],
    )
    alpha = min(
        (0.1, 1.0, 10.0),
        key=lambda value: metrics(val_actual, ridge_forecast(train, horizon, value))["mae_minor"],
    )
    validation_baseline = metrics(val_actual, baseline(train_values, horizon, baseline_name))
    validation_ml = metrics(val_actual, ridge_forecast(train, horizon, alpha))
    # Select for deployment by validation, BEFORE looking at final test performance.
    selected = (
        VERSION if validation_ml["mae_minor"] < validation_baseline["mae_minor"] else baseline_name
    )
    development = train + validation
    actual = [v for _, v in test]
    baseline_test = metrics(actual, baseline([v for _, v in development], horizon, baseline_name))
    ml_test = metrics(actual, ridge_forecast(development, horizon, alpha))
    winner = (
        "tie"
        if abs(baseline_test["mae_minor"] - ml_test["mae_minor"]) < 1e-9
        else "ml"
        if ml_test["mae_minor"] < baseline_test["mae_minor"]
        else "baseline"
    )
    all_values = [v for _, v in series]
    base_future = baseline(all_values, horizon, baseline_name)
    ml_future = ridge_forecast(series, horizon, alpha)
    result.update(
        status="experimental",
        selected_method=selected,
        forecast=[
            dict(
                date=(series[-1][0] + timedelta(days=i + 1)).isoformat(),
                baseline_minor=base_future[i],
                ml_minor=ml_future[i],
                selected_minor=ml_future[i] if selected == VERSION else base_future[i],
            )
            for i in range(horizon)
        ],
        evaluation=dict(
            train_from=train[0][0].isoformat(),
            train_to=train[-1][0].isoformat(),
            validation_from=validation[0][0].isoformat(),
            validation_to=validation[-1][0].isoformat(),
            test_from=test[0][0].isoformat(),
            test_to=test[-1][0].isoformat(),
            baseline_method=baseline_name,
            ridge_alpha=alpha,
            validation_baseline=validation_baseline,
            validation_ml=validation_ml,
            baseline=baseline_test,
            ml=ml_test,
            test_winner=winner,
            test_observations=horizon,
        ),
    )
    positive = [v for v in all_values if v > 0]
    if positive and max(positive) > 10 * median(positive):
        result["warnings"].append("large_values_retained")
    if not positive:
        result["warnings"].append("all_zero_history")
    return result
