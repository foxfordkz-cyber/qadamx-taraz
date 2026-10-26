"""Fail-closed isolation checks for the new offline staging launcher."""

import pytest

from tools.stage13_staging.demo import offline_environment, reject_dotenv, validate_ports

LOCAL = "postgresql+psycopg://qadam_research@127.0.0.1:55441/qadam_research_browser_stage13_test"


@pytest.mark.parametrize(
    "ports", [(8322, 4313), (8333, 4303), (8333, 8333), (80, 4313), (8333, 65536)]
)
def test_reserved_occupied_range_or_identical_port_rejected(ports):
    with pytest.raises(ValueError):
        validate_ports(*ports)


@pytest.mark.parametrize(
    "url",
    [
        LOCAL.replace("127.0.0.1", "db.example.test"),
        LOCAL.replace("_test", ""),
        LOCAL.replace("qadam_research_browser_", "production_"),
    ],
)
def test_shared_or_non_test_database_rejected(url):
    with pytest.raises(ValueError):
        offline_environment({}, url, 8333, 4313)


def test_credentials_and_production_settings_do_not_cross_offline_boundary():
    original = {
        "PATH": "runtime",
        "OPENAI_API_KEY": "do-not-inherit",
        "VITE_EXTRA_SECRET": "no",
        "DATABASE_URL": "shared",
        "DEMO_OWNER_A_TOKEN": "no",
        "STORAGE_SERVICE_KEY": "no",
    }
    env = offline_environment(original, LOCAL, 8333, 4313)
    assert env["PATH"] == "runtime"
    assert env["OPENAI_API_KEY"] == env["AI_API_KEY"] == ""
    assert env["DATABASE_URL"] == env["RESEARCH_TEST_DATABASE_URL"] == LOCAL
    assert env["VITE_API_BASE_URL"] == "http://127.0.0.1:8333/api/v1"
    assert not {"VITE_EXTRA_SECRET", "DEMO_OWNER_A_TOKEN", "STORAGE_SERVICE_KEY"} & env.keys()
    assert original["DATABASE_URL"] == "shared"


@pytest.mark.parametrize("filename", [".env", ".env.local", ".env.development.local"])
def test_dotenv_cannot_silently_override_isolation(tmp_path, filename):
    web = tmp_path / "apps/web"
    web.mkdir(parents=True)
    (web / ".env.example").write_text("", encoding="utf-8")
    reject_dotenv(tmp_path)
    (web / filename).write_text("", encoding="utf-8")
    with pytest.raises(ValueError):
        reject_dotenv(tmp_path)
