"""Opt-in test against an EMPTY dedicated PostgreSQL database; never a shared DB."""

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import func, inspect, select
from sqlalchemy.orm import Session

from app.models import Base, Business, CatalogItem, Customer, Membership, Venue
from app.seed import seed


@pytest.mark.postgres
def test_migration_seed_repeat_and_rollback(ledger_api):
    # Shared guarded fixture owns migration upgrade/downgrade and the dedicated *_test DB.
    engine = ledger_api["engine"]
    config = Config("alembic.ini")
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
