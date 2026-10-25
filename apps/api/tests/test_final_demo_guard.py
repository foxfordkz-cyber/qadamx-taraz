import pytest

from tools.stage10_eval.demo import validate_database


@pytest.mark.parametrize(
    "url",
    [
        "postgresql://localhost:55439/qadam_research_browser_demo_test",
        "postgresql://example.com:5432/qadam_research_browser_demo_test",
        "postgresql://127.0.0.1:55439/shared",
        "postgresql://127.0.0.1/qadam_research_browser_demo_test",
        "postgresql://127.0.0.1:55439/qadam_research_browser_live",
    ],
)
def test_demo_rejects_nonisolated_targets(url):
    with pytest.raises(ValueError):
        validate_database(url)


def test_demo_allows_explicit_local_target_only():
    value = validate_database("postgresql://127.0.0.1:55439/qadam_research_browser_final_test")
    assert value.database == "qadam_research_browser_final_test"
