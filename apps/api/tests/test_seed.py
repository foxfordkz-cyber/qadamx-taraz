from sqlalchemy.dialects import postgresql
from sqlalchemy.dialects.postgresql import insert

from app.models import Business, CatalogItem, Customer, Membership, Venue
from app.seed import OWNER_A, OWNER_B, demo_rows


def test_seed_is_synthetic_deterministic_and_has_two_separate_owners():
    data = demo_rows()
    assert data == demo_rows()
    assert len(data[Venue]) == 3
    assert len(data[Business]) == len(data[CatalogItem]) == len(data[Customer]) == 9
    assert {row["user_id"] for row in data[Membership]} == {OWNER_A, OWNER_B}
    assert len({row["business_id"] for row in data[Membership]}) == 9
    business_ids = {row["id"] for row in data[Business]}
    for model in (CatalogItem, Customer, Membership):
        assert {row["business_id"] for row in data[model]} == business_ids
    for model in (Venue, Business, CatalogItem):
        assert all(row["is_demo"] for row in data[model])
    for model, rows in data.items():
        statement = (
            insert(model)
            .values(rows)
            .on_conflict_do_nothing(
                index_elements=[column.name for column in model.__table__.primary_key]
            )
        )
        assert "ON CONFLICT" in str(statement.compile(dialect=postgresql.dialect()))
