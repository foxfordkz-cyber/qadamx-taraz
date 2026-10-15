import json
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from uuid import uuid4

import jwt
import pytest
from alembic import command
from alembic.config import Config
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.auth import TokenVerifier
from app.config import Settings
from app.main import create_app
from app.seed import demo_id, seed

ISSUER = "https://auth-test.example/auth/v1"


@pytest.fixture(scope="session")
def signing():
    private_key = ec.generate_private_key(ec.SECP256R1())
    jwk = json.loads(jwt.algorithms.ECAlgorithm.to_jwk(private_key.public_key()))
    jwk.update(kid="test-key", alg="ES256", use="sig")

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"keys": [jwk]}).encode())

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    settings = Settings(
        _env_file=None,
        database_url=None,
        supabase_url="https://auth-test.example",
        jwt_issuer=ISSUER,
        jwt_audience="authenticated",
    )
    verifier = TokenVerifier(settings)
    # Test-only JWKS transport. Production derives HTTPS JWKS solely from configured Supabase URL.
    verifier.jwks = jwt.PyJWKClient(f"http://127.0.0.1:{server.server_port}/jwks", timeout=2)

    def token(user, **changes):
        claims = dict(
            sub=str(user),
            iss=ISSUER,
            aud="authenticated",
            role="authenticated",
            iat=int(time.time()) - 1,
            exp=int(time.time()) + 600,
        )
        claims.update(changes)
        return jwt.encode(claims, private_key, algorithm="ES256", headers={"kid": "test-key"})

    yield verifier, token, private_key
    server.shutdown()
    server.server_close()
    thread.join()


@pytest.fixture(scope="session")
def pg_engine():
    value = os.environ.get("TEST_DATABASE_URL")
    if not value:
        pytest.skip("TEST_DATABASE_URL required for real PostgreSQL tests")
    url = make_url(value)
    assert url.database and url.database.endswith("_test"), "Use a dedicated *_test database"
    main_url = Settings().postgres_url()
    assert (url.host, url.port, url.database) != (main_url.host, main_url.port, main_url.database)
    engine = create_engine(url, pool_pre_ping=True)
    assert "qadam" not in inspect(engine).get_schema_names(), "Test database must start empty"
    assert not inspect(engine).get_table_names(), "Test database must start empty"
    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = value
    config = Config("alembic.ini")
    try:
        command.upgrade(config, "head")
        command.check(config)
        yield engine
    finally:
        command.downgrade(config, "base")
        with engine.begin() as connection:
            connection.execute(text("DROP TABLE alembic_version"))
        engine.dispose()
        if previous is None:
            os.environ.pop("DATABASE_URL", None)
        else:
            os.environ["DATABASE_URL"] = previous


@pytest.fixture
def ledger_api(pg_engine, signing):
    from app.models import Base

    # Only this fixture's verified-empty, explicitly named *_test database is reset.
    with pg_engine.begin() as connection:
        tables = ", ".join(f"qadam.{table.name}" for table in Base.metadata.sorted_tables)
        connection.execute(text(f"TRUNCATE {tables} CASCADE"))
    owner_a, owner_b = uuid4(), uuid4()
    with Session(pg_engine) as session, session.begin():
        seed(session, (owner_a, owner_b))
    settings = Settings(
        _env_file=None,
        database_url=None,
        supabase_url="",
        jwt_issuer="",
        jwt_audience="",
        allowed_origins=[],
    )
    app = create_app(settings)
    app.state.engine = pg_engine
    app.state.verifier = signing[0]
    with TestClient(app, raise_server_exceptions=False) as client:
        yield {
            "client": client,
            "app": app,
            "engine": pg_engine,
            "a": {"Authorization": "Bearer " + signing[1](owner_a)},
            "b": {"Authorization": "Bearer " + signing[1](owner_b)},
            "owner_a": owner_a,
            "owner_b": owner_b,
            "business": demo_id("mart-demo-clothes"),
            "other": demo_id("mart-demo-home"),
            "customer": demo_id("mart-demo-clothes-customer"),
            "other_customer": demo_id("mart-demo-home-customer"),
        }
