"""Insert-only demo data; real memberships require verified Supabase user tokens."""

import argparse
from uuid import UUID, uuid5

from sqlalchemy import delete
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.auth import TokenVerifier
from app.config import Settings
from app.db import make_engine
from app.models import Business, CatalogItem, Customer, Membership, Venue

NAMESPACE = UUID("82e5e51d-b06a-4b98-ab83-e1f051b97dd7")


def demo_id(label):
    return uuid5(NAMESPACE, label)


SYNTHETIC_OWNERS = {demo_id("owner-a"), demo_id("owner-b")}


def demo_rows():
    data = {Venue: [], Business: [], CatalogItem: [], Customer: []}
    for slug, name in (
        ("mart", "MART"),
        ("kaikarmet", "Кайкармет"),
        ("auyl-bereke", "Ауыл Береке"),
    ):
        data[Venue].append(
            dict(
                id=demo_id(slug),
                slug=slug,
                name=name,
                address_label="Тараз — учебная площадка, адрес не подтверждён",
                geometry_status="conceptual",
                is_demo=True,
            )
        )
        for category in ("clothes", "food", "home"):
            business_slug = f"{slug}-demo-{category}"
            business_id = demo_id(business_slug)
            data[Business].append(
                dict(
                    id=business_id,
                    venue_id=demo_id(slug),
                    slug=business_slug,
                    name=f"Демо {name} {category}",
                    category=category,
                    description="Учебная точка, не подтверждённый партнёр площадки.",
                    is_demo=True,
                )
            )
            data[CatalogItem].append(
                dict(
                    id=demo_id(business_slug + "-item"),
                    business_id=business_id,
                    name="Учебный товар",
                    price_minor=300000,
                    available=True,
                    is_demo=True,
                )
            )
            data[Customer].append(
                dict(
                    id=demo_id(business_slug + "-customer"),
                    business_id=business_id,
                    display_name="Демо Асқар",
                    note="Вымышленный покупатель",
                    contact=None,
                )
            )
    return data


def verified_owners(settings):
    verifier = TokenVerifier(settings)
    owners = []
    for subject, token in (
        (settings.demo_owner_a_sub, settings.demo_owner_a_token),
        (settings.demo_owner_b_sub, settings.demo_owner_b_token),
    ):
        if not subject or not token:
            raise ValueError("Set both DEMO_OWNER_*_SUB and DEMO_OWNER_*_TOKEN in .env")
        user = verifier.verify(token.get_secret_value())
        if user != UUID(subject) or user in SYNTHETIC_OWNERS:
            raise ValueError("Owner subject must match the verified Supabase user token")
        owners.append(user)
    if owners[0] == owners[1]:
        raise ValueError("Two distinct Supabase users are required")
    return owners


def seed(session: Session, owners=None):
    for model, rows in demo_rows().items():
        session.execute(
            insert(model)
            .values(rows)
            .on_conflict_do_nothing(
                index_elements=[column.name for column in model.__table__.primary_key]
            )
        )
    # Remove only the two known historical synthetic owners, never real memberships.
    business_ids = [row["id"] for row in demo_rows()[Business]]
    session.execute(
        delete(Membership).where(
            Membership.business_id.in_(business_ids), Membership.user_id.in_(SYNTHETIC_OWNERS)
        )
    )
    if owners is not None:
        for row in demo_rows()[Business]:
            owner = owners[1] if row["category"] == "home" else owners[0]
            session.execute(
                insert(Membership)
                .values(user_id=owner, business_id=row["id"], role="owner")
                .on_conflict_do_nothing()
            )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--demo", action="store_true")
    parser.add_argument("--bind-owners", action="store_true")
    args = parser.parse_args()
    if not args.demo:
        parser.error("Use --demo only with a dedicated demo database")
    settings = Settings()
    owners = verified_owners(settings) if args.bind_owners else None
    engine = make_engine(settings)
    with Session(engine) as session, session.begin():
        seed(session, owners)
    engine.dispose()
    print("Demo seed applied: 3 venues, 9 businesses, 9 items, 9 customers.")
    print(
        "Verified owners bound." if owners else "No login memberships created; use --bind-owners."
    )


if __name__ == "__main__":
    main()
