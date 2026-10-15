"""Opt-in test against an EMPTY dedicated PostgreSQL database; never a shared DB."""

import os

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, func, inspect, select
from sqlalchemy.orm import Session

from app.config import Settings
from app.models import Base, Business, CatalogItem, Customer, Membership, Venue
from app.seed import seed


@pytest.mark.postgres
def test_migration_seed_repeat_and_rollback(monkeypatch):
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.skip("TEST_DATABASE_URL not configured; PostgreSQL behavior not verified")
    monkeypatch.setenv("DATABASE_URL", url)
    engine = create_engine(Settings().postgres_url())
    inspector = inspect(engine)
    assert "qadam" not in inspector.get_schema_names(), "Use an empty dedicated test database"
    assert "alembic_version" not in inspector.get_table_names(), "Use an empty test database"
    config = Config("alembic.ini")
    command.upgrade(config, "head")
    try:
        command.check(config)
        with Session(engine) as session:
            with session.begin():
                seed(session)
            with session.begin():
                seed(session)
            for model, expected in (
                (Venue, 3),
                (Business, 9),
                (Membership, 9),
                (CatalogItem, 9),
                (Customer, 9),
            ):
                assert session.scalar(select(func.count()).select_from(model)) == expected
        assert set(inspect(engine).get_table_names(schema="qadam")) == {
            table.name for table in Base.metadata.tables.values()
        }
    finally:
        command.downgrade(config, "base")
        engine.dispose()
