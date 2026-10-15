import time
from uuid import uuid4

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient

from app.config import Settings
from app.errors import APIError
from app.main import create_app
from app.seed import SYNTHETIC_OWNERS, verified_owners


def test_verified_subject_from_real_signature_and_http_jwks(signing):
    verifier, token, _ = signing
    user = uuid4()
    assert verifier.verify(token(user)) == user


@pytest.mark.parametrize(
    "changes",
    [
        {"iss": "https://evil.example"},
        {"aud": "other"},
        {"exp": 1},
        {"sub": "not-a-uuid"},
        {"sub": "00000000-0000-0000-0000-000000000000"},
        {"role": "service_role"},
        {"role": "anon"},
        {"is_anonymous": True},
        {"iat": int(time.time()) + 10000},
        {"nbf": int(time.time()) + 10000},
    ],
)
def test_invalid_claims_rejected(signing, changes):
    verifier, token, _ = signing
    with pytest.raises(APIError) as error:
        verifier.verify(token(uuid4(), **changes))
    assert error.value.status == 401


def test_wrong_signature_and_algorithm_rejected(signing):
    verifier, token, _ = signing
    claims = jwt.decode(token(uuid4()), options={"verify_signature": False})
    wrong = ec.generate_private_key(ec.SECP256R1())
    bad_tokens = [
        jwt.encode(claims, wrong, algorithm="ES256", headers={"kid": "test-key"}),
        jwt.encode(
            claims,
            "test-only-secret-not-used-by-server",
            algorithm="HS256",
            headers={"kid": "test-key"},
        ),
        jwt.encode(claims, "", algorithm="none"),
        "not.a.token",
    ]
    for value in bad_tokens:
        with pytest.raises(APIError) as error:
            verifier.verify(value)
        assert error.value.status == 401


@pytest.mark.parametrize("missing", ["exp", "iat", "iss", "aud", "sub", "role"])
def test_required_claims(signing, missing):
    verifier, token, key = signing
    claims = jwt.decode(token(uuid4()), options={"verify_signature": False})
    del claims[missing]
    value = jwt.encode(claims, key, algorithm="ES256", headers={"kid": "test-key"})
    with pytest.raises(APIError):
        verifier.verify(value)


def test_missing_unknown_key_and_unavailable_jwks(signing):
    verifier, token, key = signing
    claims = jwt.decode(token(uuid4()), options={"verify_signature": False})
    for headers in ({}, {"kid": "unknown-key"}):
        with pytest.raises(APIError) as error:
            verifier.verify(jwt.encode(claims, key, algorithm="ES256", headers=headers))
        assert error.value.status == 401


def test_no_auth_configuration_fails_closed():
    app = create_app(
        Settings(_env_file=None, database_url=None, supabase_url="", jwt_issuer="", jwt_audience="")
    )
    with TestClient(app) as client:
        assert client.get("/health").status_code == 200
        assert client.get("/api/v1/me").status_code == 401
        response = client.get("/api/v1/me", headers={"Authorization": "Bearer anything"})
        assert response.status_code == 503
        assert response.json()["error"]["code"] == "AUTH_UNAVAILABLE"


def test_seed_requires_matching_real_subjects(monkeypatch, signing):
    monkeypatch.setattr("app.seed.TokenVerifier", lambda settings: signing[0])
    a, b = uuid4(), uuid4()
    settings = Settings(
        _env_file=None,
        demo_owner_a_sub=str(a),
        demo_owner_b_sub=str(b),
        demo_owner_a_token=signing[1](a),
        demo_owner_b_token=signing[1](b),
    )
    assert verified_owners(settings) == [a, b]
    settings.demo_owner_a_sub = str(b)
    with pytest.raises(ValueError):
        verified_owners(settings)
    synthetic = next(iter(SYNTHETIC_OWNERS))
    settings.demo_owner_a_sub = str(synthetic)
    from pydantic import SecretStr

    settings.demo_owner_a_token = SecretStr(signing[1](synthetic))
    with pytest.raises(ValueError):
        verified_owners(settings)
