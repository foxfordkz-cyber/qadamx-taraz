"""Readiness metadata checks: no cloud, credentials, provider or database calls."""

import copy
import json
import socket
import subprocess
import sys
from pathlib import Path

import pytest

from tools.stage14_readiness.validator import validate

ROOT = Path(__file__).resolve().parents[3]


@pytest.fixture
def config():
    # Reserved example domains and deliberately synthetic values, NOT real credentials.
    return {
        "environment": "isolated-staging",
        "live_provider_call_budget": 0,
        "inventory": {
            "classification": "dedicated-synthetic-only",
            "approval_reference": "TEST-ONLY-NOT-APPROVAL",
            "frontend_origin": "https://web.staging.example.test",
            "api_origin": "https://api.staging.example.test",
            "supabase_origin": "https://auth.staging.example.test",
            "auth_redirect_url": "https://web.staging.example.test/auth/callback",
            "redirect_allowlist": ["https://web.staging.example.test/auth/callback"],
            "auth_flow": "pkce",
            "auth_scope": "existing-test-users-login-only",
            "api_entrypoint": "app.main:app",
            "web_output": "apps/web/dist",
            "storage_classification": "dedicated-synthetic-only",
            "storage_bucket": "qadam-staging-synthetic",
            "log_namespace": "qadam-isolated-staging",
            "database_role_review": "non-owner-no-superuser-no-bypassrls",
            "database": {
                "host": "db.staging.example.test",
                "port": 5432,
                "name": "qadam_staging_synthetic",
                "role": "qadam_staging_app_test",
            },
        },
        "server": {
            "DATABASE_URL": "postgresql://qadam_staging_app_test:synthetic-password-only@db.staging.example.test:5432/qadam_staging_synthetic?sslmode=verify-full",
            "SUPABASE_URL": "https://auth.staging.example.test",
            "JWT_ISSUER": "https://auth.staging.example.test/auth/v1",
            "JWT_AUDIENCE": "authenticated",
            "ALLOWED_ORIGINS": ["https://web.staging.example.test"],
            "AI_PROVIDER": "openai",
            "AI_API_KEY": "",
            "OPENAI_API_KEY": "",
            "AI_FALLBACK_OPENAI": False,
            "ASSISTANT_ENABLED": False,
            "STORAGE_SERVICE_KEY": "",
            "STORAGE_BUCKET": "qadam-staging-synthetic",
            "LIVESTOCK_DEMO_MODE": True,
        },
        "frontend": {
            "VITE_API_BASE_URL": "https://api.staging.example.test/api/v1",
            "VITE_SUPABASE_URL": "https://auth.staging.example.test",
            "VITE_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_synthetic_not_a_real_key",
            "VITE_ASSISTANT_ENABLED": "false",
        },
    }


def test_valid_inventory_is_offline_not_authorization(config, monkeypatch):
    def forbidden(*args, **kwargs):
        pytest.fail("Readiness validation attempted network access")

    monkeypatch.setattr(socket, "socket", forbidden)
    monkeypatch.setenv("DATABASE_URL", "SECRET_MUST_NOT_BE_READ")
    result = validate(config)
    assert result["offline_configuration"] == "PASS"
    assert result["network_requests"] == result["database_connections"] == 0
    assert result["hosted_staging_authorization"] == result["production_authorization"] == "NO-GO"
    assert result["credentials_verified"] is False


@pytest.mark.parametrize(
    "section,key,value,code",
    [
        (None, "environment", "production", "ENVIRONMENT"),
        (None, "live_provider_call_budget", 1, "LIVE_BUDGET"),
        (None, "live_provider_call_budget", False, "LIVE_BUDGET"),
        ("server", "AI_API_KEY", "PRIVATE_SENTINEL", "LIVE_KEYS_FORBIDDEN"),
        ("server", "OPENAI_API_KEY", "PRIVATE_SENTINEL", "LIVE_KEYS_FORBIDDEN"),
        ("server", "AI_FALLBACK_OPENAI", True, "PAID_FALLBACK"),
        ("server", "ASSISTANT_ENABLED", True, "ASSISTANT_DISABLED"),
        ("server", "JWT_AUDIENCE", "anon", "AUDIENCE"),
        ("server", "JWT_ISSUER", "https://other.example/auth/v1", "ISSUER"),
        ("server", "ALLOWED_ORIGINS", ["*"], "CORS"),
        ("server", "DEMO_OWNER_A_TOKEN", "PRIVATE_SENTINEL", "SERVER_KEYS"),
        ("server", "STORAGE_SERVICE_KEY", "PRIVATE_SENTINEL", "STORAGE_SECRET_NOT_NEEDED"),
        ("frontend", "VITE_OPENAI_API_KEY", "PRIVATE_SENTINEL", "FRONTEND_KEYS"),
        ("frontend", "VITE_AUTH_EMAIL_CALLBACK_URL", "https://other.test", "FRONTEND_KEYS"),
        (
            "frontend",
            "VITE_SUPABASE_PUBLISHABLE_KEY",
            "sb_secret_PRIVATE_SENTINEL",
            "PUBLIC_KEY_FORMAT",
        ),
        ("frontend", "VITE_API_BASE_URL", "https://qadamx-taraz.onrender.com/api/v1", "API_TARGET"),
        (
            "inventory",
            "api_entrypoint",
            "tests.stage13_browser_server:app",
            "TEST_FIXTURE_ENTRYPOINT",
        ),
        ("inventory", "web_output", "apps/web", "BUILD_OUTPUT"),
        ("inventory", "auth_scope", "email-registration", "EMAIL_CALLBACK_NOT_READY"),
        ("inventory", "auth_flow", "implicit", "AUTH_FLOW"),
        ("inventory", "redirect_allowlist", ["https://*.example.test/**"], "CALLBACK_ALLOWLIST"),
        (
            "inventory",
            "auth_redirect_url",
            "https://qadamx-taraz.pages.dev/auth/callback",
            "CALLBACK_ORIGIN",
        ),
        ("inventory", "classification", "shared", "ISOLATION"),
        ("inventory", "database_role_review", "superuser", "ROLE_REVIEW"),
    ],
)
def test_rejects_unsafe_inventory(config, section, key, value, code):
    target = config[section] if section else config
    target[key] = value
    result = validate(config)
    assert code in result["errors"]
    assert result["offline_configuration"] == "FAIL"
    assert "PRIVATE_SENTINEL" not in json.dumps(result)


@pytest.mark.parametrize(
    "host",
    [
        "qadamx-taraz.pages.dev",
        "pdjjdqgoitnkpgkbqjtp.supabase.co",
        "db.pdjjdqgoitnkpgkbqjtp.supabase.co",
        "production.example.test",
        "shared.example.test",
    ],
)
def test_approved_label_cannot_allow_known_shared_target(config, host):
    original_auth = config["inventory"]["supabase_origin"]
    config["inventory"]["supabase_origin"] = "https://" + host
    assert validate(config)["offline_configuration"] == "FAIL"
    config["inventory"]["supabase_origin"] = original_auth
    config["inventory"]["database"]["host"] = host
    config["server"]["DATABASE_URL"] = config["server"]["DATABASE_URL"].replace(
        "db.staging.example.test", host
    )
    assert "SHARED_DATABASE" in validate(config)["errors"]


@pytest.mark.parametrize(
    "url",
    [
        "https://bad.test",
        "postgresql://postgres:PRIVATE_SENTINEL@localhost/shared",
        "postgresql://qadam_staging_app_test:PRIVATE_SENTINEL@unknown.example.test/qadam_staging_synthetic?sslmode=verify-full",
        "postgresql://qadam_staging_app_test:PRIVATE_SENTINEL@db.staging.example.test/qadam_staging_synthetic?sslmode=require",
        "postgresql://qadam_staging_app_test:PRIVATE_SENTINEL@db.staging.example.test/qadam_staging_synthetic?sslmode=verify-full&host=production.example.test",
        "postgresql://qadam_staging_app_test:PRIVATE_SENTINEL@db.staging.example.test/qadam_staging_synthetic?sslmode=verify-full&options=anything",
        "postgresql://[broken:PRIVATE_SENTINEL",
    ],
)
def test_database_rejection_never_echoes_input(config, url):
    config["server"]["DATABASE_URL"] = url
    result = validate(config)
    assert result["offline_configuration"] == "FAIL"
    assert "PRIVATE_SENTINEL" not in json.dumps(result)


def test_port_zero_is_not_treated_as_default(config):
    config["server"]["DATABASE_URL"] = config["server"]["DATABASE_URL"].replace(":5432/", ":0/")
    assert "DATABASE_TARGET" in validate(config)["errors"]


@pytest.mark.parametrize(
    "body",
    [
        '{"environment":"PRIVATE_SENTINEL",',
        '{"environment":"x","environment":"PRIVATE_SENTINEL"}',
        "null",
        "[]",
        '"PRIVATE_SENTINEL"',
    ],
)
def test_cli_bad_input_is_sanitized(tmp_path, body):
    path = tmp_path / "private-config.json"
    path.write_text(body, encoding="utf-8")
    run = subprocess.run(
        [sys.executable, "-m", "tools.stage14_readiness.validator", "--config", str(path)],
        capture_output=True,
        text=True,
    )
    assert run.returncode == 2
    assert "PRIVATE_SENTINEL" not in run.stdout + run.stderr
    assert json.loads(run.stdout)["offline_configuration"] == "FAIL"


def test_committed_template_cannot_pass_without_owner_inventory():
    path = (
        ROOT
        / "docs/diploma-evidence/stage14-auth-staging/staging-configuration-template.example.json"
    )
    assert validate(json.loads(path.read_text(encoding="utf-8")))["offline_configuration"] == "FAIL"


def test_config_check_does_not_mutate_inputs(config):
    before = copy.deepcopy(config)
    validate(config)
    assert config == before


def test_frozen_acceptance_rehearsal_has_no_network(monkeypatch):
    import httpx

    from tools.stage14_readiness.evaluate_offline import evaluate

    connect = socket.socket.connect

    def isolated_connect(sock, address):
        # Windows asyncio creates an internal loopback socketpair for its event loop.
        if isinstance(address, tuple) and address[0] in {"127.0.0.1", "::1"}:
            return connect(sock, address)
        pytest.fail("Offline acceptance attempted an external network connection")

    async def forbidden_http(*args, **kwargs):
        pytest.fail("Offline acceptance attempted an HTTP/provider call")

    monkeypatch.setattr(socket.socket, "connect", isolated_connect)
    monkeypatch.setattr(httpx.AsyncClient, "send", forbidden_http)
    result = evaluate()
    assert result["passed"] == result["total"] == 14
    assert result["live_provider_calls"] == result["asr_calls"] == 0


def test_unavailable_jwks_is_503_not_authentication_bypass(signing, monkeypatch):
    import jwt

    from app.errors import APIError

    def unavailable(*args, **kwargs):
        raise jwt.PyJWKClientConnectionError("PRIVATE_SENTINEL")

    verifier, token, _ = signing
    from uuid import uuid4

    monkeypatch.setattr(verifier.jwks, "get_signing_key_from_jwt", unavailable)
    with pytest.raises(APIError) as caught:
        verifier.verify(token(uuid4()))
    assert (caught.value.status, caught.value.code) == (503, "AUTH_UNAVAILABLE")
    assert "PRIVATE_SENTINEL" not in caught.value.message


def test_vercel_guard_only_disables_this_branch():
    expected = {"feature/diploma-stage14-auth-staging-readiness": False}
    for relative in ["vercel.json", "apps/web/vercel.json"]:
        data = json.loads((ROOT / relative).read_text(encoding="utf-8"))
        assert data == {
            "$schema": "https://openapi.vercel.sh/vercel.json",
            "git": {"deploymentEnabled": expected},
        }
