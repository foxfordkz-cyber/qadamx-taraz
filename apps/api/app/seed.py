"""Insert-only demo seed. Never deletes data or creates Supabase login accounts."""

import argparse
from uuid import UUID, uuid5

from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.config import Settings
from app.models import Business, CatalogItem, Customer, Membership, Venue

NAMESPACE = UUID("82e5e51d-b06a-4b98-ab83-e1f051b97dd7")


def demo_id(label: str) -> UUID:
    return uuid5(NAMESPACE, label)


OWNER_A = demo_id("owner-a")
OWNER_B = demo_id("owner-b")


def demo_rows():
    venues, businesses, memberships, catalog, customers = [], [], [], [], []
    for slug, name in (
        ("mart", "MART"),
        ("kaikarmet", "Кайкармет"),
        ("auyl-bereke", "Ауыл Береке"),
    ):
        venue_id = demo_id(slug)
        venues.append(
            dict(
                id=venue_id,
                slug=slug,
                name=name,
                address_label="Тараз — учебная площадка, адрес не подтверждён",
                geometry_status="conceptual",
                is_demo=True,
            )
        )
        for number, category in enumerate(("clothes", "food", "home"), start=1):
            business_slug = f"{slug}-demo-{category}"
            business_id = demo_id(business_slug)
            businesses.append(
                dict(
                    id=business_id,
                    venue_id=venue_id,
                    slug=business_slug,
                    name=f"Демо {name} {number}",
                    category=category,
                    description="Учебная точка. Не является партнёром площадки.",
                    is_demo=True,
                )
            )
            memberships.append(
                dict(
                    user_id=OWNER_A if number != 3 else OWNER_B,
                    business_id=business_id,
                    role="owner",
                )
            )
            catalog.append(
                dict(
                    id=demo_id(business_slug + "-item"),
                    business_id=business_id,
                    name="Учебный товар",
                    price_minor=300000,
                    available=True,
                    is_demo=True,
                )
            )
            customers.append(
                dict(
                    id=demo_id(business_slug + "-customer"),
                    business_id=business_id,
                    display_name="Демо Асқар",
                    note="Вымышленный покупатель",
                    contact=None,
                )
            )
    return {
        Venue: venues,
        Business: businesses,
        Membership: memberships,
        CatalogItem: catalog,
        Customer: customers,
    }


def seed(session: Session) -> None:
    # One transaction, deterministic IDs, no overwrite of previously edited rows.
    for model, rows in demo_rows().items():
        primary_key = [column.name for column in model.__table__.primary_key]
        session.execute(
            insert(model).values(rows).on_conflict_do_nothing(index_elements=primary_key)
        )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--demo", action="store_true", help="Confirm this is a dedicated demo DB")
    args = parser.parse_args()
    if not args.demo:
        parser.error("Use --demo only with a dedicated demo database")
    engine = create_engine(Settings().postgres_url())
    with Session(engine) as session, session.begin():
        seed(session)
    print("Demo seed applied: 3 venues, 9 businesses, 2 synthetic owners, 9 items, 9 customers.")
    print("Synthetic owner UUIDs are fixtures, not Supabase login accounts.")


if __name__ == "__main__":
    main()
