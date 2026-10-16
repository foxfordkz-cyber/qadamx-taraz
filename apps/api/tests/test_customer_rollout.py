import pytest
from alembic import command
from alembic.config import Config
from alembic.operations import Operations
from sqlalchemy import text

pytestmark = pytest.mark.postgres


def test_0006_failure_rolls_back_table_and_revision_without_losing_customers(
    ledger_api, monkeypatch
):
    engine = ledger_api["engine"]
    config = Config("alembic.ini")
    command.downgrade(config, "0005_livestock_market")
    try:
        with engine.connect() as db:
            before = db.execute(text("SELECT * FROM qadam.customers ORDER BY id")).all()
        original = Operations.execute

        def fail_after_table_created(self, sqltext, *args, **kwargs):
            if str(sqltext).startswith("REVOKE ALL ON qadam.customer_creation_requests"):
                raise RuntimeError("Simulated migration failure after CREATE TABLE and RLS")
            return original(self, sqltext, *args, **kwargs)

        with monkeypatch.context() as patch:
            patch.setattr(Operations, "execute", fail_after_table_created)
            with pytest.raises(RuntimeError, match="Simulated migration failure"):
                command.upgrade(config, "0006_customer_requests")
        with engine.connect() as db:
            assert (
                db.scalar(text("SELECT version_num FROM alembic_version"))
                == "0005_livestock_market"
            )
            assert db.scalar(text("SELECT to_regclass('qadam.customer_creation_requests')")) is None
            assert db.execute(text("SELECT * FROM qadam.customers ORDER BY id")).all() == before
        command.upgrade(config, "0006_customer_requests")
        command.check(config)
        with engine.connect() as db:
            assert db.execute(text("SELECT * FROM qadam.customers ORDER BY id")).all() == before
    finally:
        command.upgrade(config, "head")
