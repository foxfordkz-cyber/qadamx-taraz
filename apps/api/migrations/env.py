from alembic import context
from sqlalchemy import create_engine, pool

from app.config import Settings
from app.models import Base

url = Settings().postgres_url()


def include_name(name, type_, parent_names):
    # Autogeneration must never propose changes to Supabase's auth/public schemas.
    return name == "qadam" if type_ == "schema" else True


options = dict(
    target_metadata=Base.metadata,
    include_schemas=True,
    include_name=include_name,
    compare_type=True,
)

if context.is_offline_mode():
    context.configure(url=url, literal_binds=True, dialect_opts={"paramstyle": "named"}, **options)
    with context.begin_transaction():
        context.run_migrations()
else:
    engine = create_engine(url, poolclass=pool.NullPool)
    with engine.connect() as connection:
        context.configure(connection=connection, **options)
        with context.begin_transaction():
            context.run_migrations()
