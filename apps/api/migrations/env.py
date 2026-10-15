from alembic import context
from sqlalchemy import create_engine, pool

from app.config import Settings
from app.models import Base


def include_name(name, type_, parent_names):
    return name == "qadam" if type_ == "schema" else True


options = dict(
    target_metadata=Base.metadata,
    include_schemas=True,
    compare_type=True,
    include_name=include_name,
)
url = Settings().postgres_url()
if context.is_offline_mode():
    context.configure(url=url, literal_binds=True, **options)
    with context.begin_transaction():
        context.run_migrations()
else:
    engine = create_engine(url, poolclass=pool.NullPool)
    with engine.connect() as connection:
        context.configure(connection=connection, **options)
        with context.begin_transaction():
            context.run_migrations()
