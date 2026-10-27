"""Validate an explicit staging inventory OFFLINE. Never load .env or connect.

Passing validates internal consistency, not ownership, credentials, DB grants,
DNS, email delivery, provider quality or permission to deploy. No input values
or exception messages are emitted, even for malformed secrets/URLs.
"""

import argparse
import base64
import json
import re
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

KNOWN_SHARED = {"qadamx-taraz.pages.dev", "qadamx-taraz.onrender.com", "pdjjdqgoitnkpgkbqjtp"}
PUBLIC_KEYS = {
    "VITE_API_BASE_URL",
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "VITE_ASSISTANT_ENABLED",
    "VITE_CUSTOMER_IDS_ENABLED",
}
SERVER_KEYS = {
    "DATABASE_URL",
    "SUPABASE_URL",
    "JWT_ISSUER",
    "JWT_AUDIENCE",
    "ALLOWED_ORIGINS",
    "AI_PROVIDER",
    "AI_API_KEY",
    "AI_MODEL",
    "OPENAI_API_KEY",
    "OPENAI_MODEL",
    "OPENAI_TRANSCRIPTION_MODEL",
    "AI_FALLBACK_OPENAI",
    "ASSISTANT_ENABLED",
    "STORAGE_SERVICE_KEY",
    "STORAGE_BUCKET",
    "LIVESTOCK_DEMO_MODE",
}


def strict_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate key")
        result[key] = value
    return result


def shared(value):
    value = value.lower()
    return any(x in value for x in KNOWN_SHARED) or bool(
        re.search(r"(^|[./_-])(prod(?:uction)?|shared)([./_-]|$)", value)
    )


def origin(value):
    if not isinstance(value, str) or any(c in value for c in "*\\\r\n\t "):
        raise ValueError("origin")
    u = urlsplit(value)
    if (
        u.scheme != "https"
        or not u.hostname
        or u.username
        or u.password
        or u.path
        or u.query
        or u.fragment
        or u.port not in {None, 443}
        or u.hostname.endswith(".")
        or not re.fullmatch(r"[a-z0-9.-]+", u.hostname)
        or value != "https://" + u.netloc
        or shared(u.hostname)
    ):
        raise ValueError("origin")
    return value


def public_key(value):
    if not isinstance(value, str):
        return False
    if re.fullmatch(r"sb_publishable_[A-Za-z0-9_-]{20,200}", value):
        return True
    # Legacy anon JWT: syntax/role ONLY, not signature or validity acceptance.
    if len(value) < 8192 and value.count(".") == 2:
        try:
            part = value.split(".")[1]
            claims = json.loads(base64.urlsafe_b64decode(part + "=" * (-len(part) % 4)))
            return isinstance(claims, dict) and claims.get("role") == "anon"
        except (ValueError, UnicodeError):
            return False
    return False


def validate(data):
    errors = set()

    def require(condition, code):
        if not condition:
            errors.add(code)

    try:
        require(isinstance(data, dict), "INPUT_SCHEMA")
        require(data["environment"] == "isolated-staging", "ENVIRONMENT")
        server, frontend, inventory = data["server"], data["frontend"], data["inventory"]
        require(set(server) <= SERVER_KEYS, "SERVER_KEYS")
        require(set(frontend) <= PUBLIC_KEYS, "FRONTEND_KEYS")
        require(inventory["classification"] == "dedicated-synthetic-only", "ISOLATION")
        require(
            bool(re.fullmatch(r"[A-Za-z0-9_-]{4,80}", inventory["approval_reference"])),
            "APPROVAL_REFERENCE",
        )
        ui = origin(inventory["frontend_origin"])
        api = origin(inventory["api_origin"])
        auth = origin(inventory["supabase_origin"])
        require(len({ui, api, auth}) == 3, "SEPARATE_SERVICES")
        require(frontend["VITE_API_BASE_URL"] == api + "/api/v1", "API_TARGET")
        require(frontend["VITE_SUPABASE_URL"] == auth == server["SUPABASE_URL"], "AUTH_TARGET")
        require(server["JWT_ISSUER"] == auth + "/auth/v1", "ISSUER")
        require(server["JWT_AUDIENCE"] == "authenticated", "AUDIENCE")
        require(server["ALLOWED_ORIGINS"] == [ui], "CORS")
        require(public_key(frontend["VITE_SUPABASE_PUBLISHABLE_KEY"]), "PUBLIC_KEY_FORMAT")
        require(inventory["auth_redirect_url"] == ui + "/auth/callback", "CALLBACK_ORIGIN")
        require(inventory["redirect_allowlist"] == [ui + "/auth/callback"], "CALLBACK_ALLOWLIST")
        require(inventory["auth_flow"] == "pkce", "AUTH_FLOW")
        # Current production bundle pins Pages. Do not pretend env overrides enable staging email.
        require(
            inventory["auth_scope"] == "existing-test-users-login-only", "EMAIL_CALLBACK_NOT_READY"
        )
        require(inventory["api_entrypoint"] == "app.main:app", "TEST_FIXTURE_ENTRYPOINT")
        require(inventory["web_output"] == "apps/web/dist", "BUILD_OUTPUT")
        require(inventory["log_namespace"] == "qadam-isolated-staging", "LOG_SEPARATION")
        require(
            inventory["storage_classification"] == "dedicated-synthetic-only", "STORAGE_ISOLATION"
        )
        require(server["STORAGE_BUCKET"] == inventory["storage_bucket"], "STORAGE_TARGET")
        require(
            bool(re.fullmatch(r"qadam-staging-[a-z0-9-]+", server["STORAGE_BUCKET"])),
            "STORAGE_NAME",
        )
        require(server["LIVESTOCK_DEMO_MODE"] is True, "STORAGE_WRITES_DISABLED")
        require(server["STORAGE_SERVICE_KEY"] == "", "STORAGE_SECRET_NOT_NEEDED")
        # Default budget is zero; NO supplied keys, fallback or assistant activation.
        require(
            type(data["live_provider_call_budget"]) is int
            and data["live_provider_call_budget"] == 0,
            "LIVE_BUDGET",
        )
        require(server["AI_API_KEY"] == server["OPENAI_API_KEY"] == "", "LIVE_KEYS_FORBIDDEN")
        require(server["AI_FALLBACK_OPENAI"] is False, "PAID_FALLBACK")
        require(server["ASSISTANT_ENABLED"] is False, "ASSISTANT_DISABLED")
        require(frontend["VITE_ASSISTANT_ENABLED"] == "false", "FRONTEND_ASSISTANT_DISABLED")
        require(server["AI_PROVIDER"] in {"gemini", "openai"}, "PROVIDER")
        db = urlsplit(server["DATABASE_URL"])
        approved = inventory["database"]
        require(db.scheme in {"postgresql", "postgresql+psycopg"}, "DATABASE_SCHEME")
        require(
            db.hostname == approved["host"]
            and (5432 if db.port is None else db.port) == approved["port"]
            and db.path == "/" + approved["name"]
            and db.username == approved["role"],
            "DATABASE_TARGET",
        )
        require(
            not shared(db.hostname or "") and not shared(db.path) and not shared(db.username or ""),
            "SHARED_DATABASE",
        )
        require(
            bool(re.fullmatch(r"[a-z0-9.-]+", db.hostname or ""))
            and not (db.hostname or "").endswith("."),
            "DATABASE_HOST",
        )
        require(bool(re.fullmatch(r"qadam_staging_[a-z0-9_]+", approved["name"])), "DATABASE_NAME")
        require(
            bool(re.fullmatch(r"qadam_staging_app_[a-z0-9_]+", approved["role"])), "DATABASE_ROLE"
        )
        require(type(approved["port"]) is int and 1 <= approved["port"] <= 65535, "DATABASE_PORT")
        require(bool(db.password) and len(db.password) >= 16, "DATABASE_CREDENTIAL_FORMAT")
        # Reject libpq host/options/service overrides; no remote connection ever occurs.
        require(
            parse_qs(db.query, keep_blank_values=True) == {"sslmode": ["verify-full"]}
            and not db.fragment
            and "%" not in (db.hostname or ""),
            "DATABASE_TLS_QUERY",
        )
        require(
            inventory["database_role_review"] == "non-owner-no-superuser-no-bypassrls",
            "ROLE_REVIEW",
        )
    except (KeyError, TypeError, ValueError, AttributeError):
        errors.add("INPUT_SCHEMA_OR_URL")
    return {
        "offline_configuration": "FAIL" if errors else "PASS",
        "errors": sorted(errors),
        "network_requests": 0,
        "database_connections": 0,
        "live_provider_calls": 0,
        "credentials_verified": False,
        "hosted_staging_authorization": "NO-GO",
        "production_authorization": "NO-GO",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, required=True)
    args = parser.parse_args()
    try:
        if args.config.stat().st_size > 65536:
            raise ValueError("size")
        data = json.loads(args.config.read_text(encoding="utf-8"), object_pairs_hook=strict_object)
        result = validate(data)
    except (OSError, ValueError, UnicodeError, RecursionError):
        result = validate({})
    print(json.dumps(result, sort_keys=True))
    raise SystemExit(0 if result["offline_configuration"] == "PASS" else 2)


if __name__ == "__main__":
    main()
