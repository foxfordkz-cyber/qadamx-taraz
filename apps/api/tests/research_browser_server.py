"""Loopback-only browser integration fixture. Never a deployment entry point.

Real production routes/SQL/migrations; synthetic ledger and local signed-JWT
provider, NOT Supabase or a real merchant dataset. Refuses nonempty/shared DBs.
Run from apps/api with PYTHONPATH=. and RESEARCH_TEST_DATABASE_URL; see evidence.
"""

import json
import os
import sys
import time
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
import uvicorn
from alembic import command
from alembic.config import Config
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy import create_engine, inspect, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.auth import TokenVerifier
from app.config import Settings
from app.main import create_app
from app.models import Business, Operation, ResearchFeedback
from app.seed import demo_id, seed

PORT = 8316
ORIGIN = f"http://127.0.0.1:{PORT}"
ISSUER = "https://research-auth.example.test/auth/v1"
OWNERS = {"a": demo_id("research-browser-owner-a"), "b": demo_id("research-browser-owner-b")}
SHOP = demo_id("mart-demo-clothes")
EMPTY = demo_id("mart-demo-food")
OTHER = demo_id("mart-demo-home")
CUSTOMER = demo_id("mart-demo-clothes-customer")


def database():
    url = make_url(os.environ["RESEARCH_TEST_DATABASE_URL"])
    if (
        url.host != "127.0.0.1"
        or not url.database
        or not url.database.startswith("qadam_research_browser_")
        or not url.database.endswith("_test")
        or url.port is None
    ):
        raise ValueError("Only an explicitly named isolated loopback research *_test DB is allowed")
    return url


def verify_database():
    """Independent SQL evidence, no JWTs, contacts or response bodies in output."""
    engine = create_engine(database())
    with Session(engine) as db:
        rows = db.scalars(select(ResearchFeedback)).all()
        result = {
            "feedback": [
                {
                    "id": str(r.id),
                    "request_id": str(r.client_request_id),
                    "consent": r.payload["consent"],
                }
                for r in rows
            ],
            "ledger": dict(
                db.execute(
                    text(
                        "SELECT count(*) AS count, sum(sales_delta_minor)::bigint AS sales, "
                        "sum(receipts_delta_minor)::bigint AS receipts FROM qadam.operations"
                    )
                )
                .mappings()
                .one()
            ),
            "migration": db.execute(text("SELECT version_num FROM alembic_version")).scalar_one(),
        }
    engine.dispose()
    print(json.dumps(result))


def make_fixture():
    url = database()
    engine = create_engine(url)
    if "qadam" in inspect(engine).get_schema_names() or inspect(engine).get_table_names():
        raise ValueError("Fixture requires a NEW EMPTY database; existing data is never reset")
    # Alembic's existing env reads DATABASE_URL. Override only in this process
    # after validating the dedicated test target; never load a repository .env.
    os.environ["DATABASE_URL"] = url.render_as_string(hide_password=False)
    command.upgrade(Config("alembic.ini"), "head")
    command.check(Config("alembic.ini"))
    now = datetime.now(UTC).replace(hour=10, minute=0, second=0, microsecond=0)
    with Session(engine) as db, db.begin():
        seed(db, (OWNERS["a"], OWNERS["b"]))
        db.get(Business, SHOP).name = "QA PostgreSQL · синтетическая история"
        db.get(Business, EMPTY).name = "QA PostgreSQL · пустая история"
        db.get(Business, OTHER).name = "QA PostgreSQL · другой владелец"
        debt_sale = None
        for i in range(180):
            ident = uuid4()
            amount = 100000 + i * 100 + i % 7 * 500
            db.add(
                Operation(
                    id=ident,
                    business_id=SHOP,
                    customer_id=CUSTOMER,
                    sale_id=ident,
                    kind="sale",
                    sales_delta_minor=amount,
                    receipts_delta_minor=amount - (50000 if i == 148 else 0),
                    description="Synthetic browser integration fixture; not research evidence",
                    created_at=now - timedelta(days=180 - i),
                    created_by=OWNERS["a"],
                )
            )
            if i == 148:
                debt_sale = ident
        db.flush()
        db.add(
            Operation(
                id=uuid4(),
                business_id=SHOP,
                customer_id=CUSTOMER,
                sale_id=debt_sale,
                kind="repayment",
                sales_delta_minor=0,
                receipts_delta_minor=10000,
                description="Synthetic browser integration repayment",
                created_at=now - timedelta(days=1),
                created_by=OWNERS["a"],
            )
        )

    settings = Settings(
        _env_file=None,
        database_url=None,
        supabase_url="",
        jwt_issuer="",
        jwt_audience="",
        allowed_origins=["http://127.0.0.1:4297"],
    )
    app = create_app(settings)
    app.state.engine = engine
    auth_settings = Settings(
        _env_file=None,
        supabase_url="https://research-auth.example.test",
        jwt_issuer=ISSUER,
        jwt_audience="authenticated",
    )
    verifier = TokenVerifier(auth_settings)
    # Local test JWKS transport, same pattern as tests/conftest.py. Production
    # TokenVerifier/signature/issuer/audience/membership validation is unchanged.
    verifier.jwks = jwt.PyJWKClient(f"{ORIGIN}/__qa/jwks", timeout=5)
    app.state.verifier = verifier
    key = ec.generate_private_key(ec.SECP256R1())
    jwk = json.loads(jwt.algorithms.ECAlgorithm.to_jwk(key.public_key()))
    jwk.update(kid="research-local-only", alg="ES256", use="sig")

    def user(account):
        return dict(
            id=str(OWNERS[account]),
            aud="authenticated",
            role="authenticated",
            email=f"{account}@research.example.test",
            app_metadata={},
            user_metadata={},
            created_at="2026-01-01T00:00:00Z",
        )

    @app.get("/__qa/jwks")
    def jwks():
        return {"keys": [jwk]}

    @app.get("/__qa/info")
    def info():
        return dict(
            source="synthetic_local_postgres_fixture",
            business=str(SHOP),
            empty=str(EMPTY),
            other=str(OTHER),
            customer=str(CUSTOMER),
        )

    @app.post("/auth/v1/token")
    async def login(request: Request):
        body = await request.json()
        account = next((a for a in OWNERS if body.get("email") == user(a)["email"]), None)
        if account is None or body.get("password") != "synthetic-local-only":
            return JSONResponse(
                {"error": "invalid_grant", "error_description": "Local QA accounts only"}, 400
            )
        claims = dict(
            sub=str(OWNERS[account]),
            iss=ISSUER,
            aud="authenticated",
            role="authenticated",
            iat=int(time.time()),
            exp=int(time.time()) + 3600,
        )
        token = jwt.encode(claims, key, algorithm="ES256", headers={"kid": jwk["kid"]})
        return dict(
            access_token=token,
            token_type="bearer",
            expires_in=3600,
            refresh_token="local-qa-no-refresh",
            user=user(account),
        )

    @app.get("/auth/v1/user")
    def current(request: Request):
        subject = verifier.verify(request.headers.get("authorization", "").removeprefix("Bearer "))
        return user(next(a for a, ident in OWNERS.items() if ident == subject))

    @app.post("/auth/v1/logout", status_code=204)
    def logout():
        return None

    return app


if __name__ == "__main__":
    if "--verify" in sys.argv:
        verify_database()
    else:
        uvicorn.run(make_fixture(), host="127.0.0.1", port=PORT, access_log=False)
