"""Read-only source backup and 0006 rehearsal on a NEW loopback *_test database.

Never migrates the source, never overwrites an archive/database, never starts/stops API.
Archives contain private customer data; use an ignored, access-restricted local directory.
"""

import argparse
import hashlib
import json
import os
import re
import subprocess
from datetime import UTC, datetime
from pathlib import Path

from dotenv import dotenv_values
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url


def table_fingerprints(connection):
    connection.execute(text("SET LOCAL TIME ZONE 'UTC'"))
    names = connection.scalars(
        text("SELECT tablename FROM pg_tables WHERE schemaname='qadam' ORDER BY tablename")
    ).all()
    result = {}
    for name in names:
        assert re.fullmatch(r"[a-z0-9_]+", name)
        rows = connection.scalars(text(f'SELECT to_jsonb(t) FROM qadam."{name}" t')).all()
        canonical = "\n".join(
            sorted(json.dumps(row, sort_keys=True, separators=(",", ":")) for row in rows)
        )
        result[name] = {
            "count": len(rows),
            "sha256": hashlib.sha256(canonical.encode()).hexdigest(),
        }
    return result


def pg_env(url):
    return {
        **{k: v for k, v in os.environ.items() if not k.startswith("PG")},
        "PGHOST": url.host,
        "PGPORT": str(url.port or 5432),
        "PGUSER": url.username,
        "PGPASSWORD": url.password or "",
        "PGDATABASE": url.database,
        "PGSSLMODE": url.query.get(
            "sslmode", "disable" if url.host in {"127.0.0.1", "localhost", "::1"} else "require"
        ),
        "PGCONNECT_TIMEOUT": "10",
        "PGOPTIONS": "-c lock_timeout=5000 -c statement_timeout=60000",
    }


def run(command, env, log, cwd=None):
    result = subprocess.run(command, env=env, capture_output=True, timeout=120, cwd=cwd)
    log.write_bytes(result.stdout + result.stderr)
    if result.returncode:
        raise RuntimeError(f"Command failed; inspect private {log.name}")


def prepare(args):
    source = make_url(dotenv_values(args.source_env)["DATABASE_URL"]).set(
        drivername="postgresql+psycopg"
    )
    local = make_url(dotenv_values(args.local_env)["TEST_DATABASE_URL"]).set(
        drivername="postgresql+psycopg"
    )
    assert local.host in {"127.0.0.1", "localhost", "::1"}, "Restore must use loopback"
    assert re.fullmatch(r"[a-z][a-z0-9_]*_test", args.restore_db), "Use a NEW named *_test DB"
    target = local.set(database=args.restore_db)
    assert (source.host, source.port, source.database) != (
        target.host,
        target.port,
        target.database,
    ), "Source cannot be the restore target"
    directory = args.backup_dir.resolve()
    directory.mkdir(parents=True, exist_ok=False)
    binary = args.pg_bin.resolve(strict=True)
    manifest = {"snapshot_started_at": datetime.now(UTC).isoformat(), "restore_db": args.restore_db}
    engine = create_engine(source, connect_args={"connect_timeout": 10})
    try:
        with engine.connect().execution_options(isolation_level="REPEATABLE READ") as db:
            db.execute(text("SET TRANSACTION READ ONLY"))
            revision = db.scalar(text("SELECT version_num FROM alembic_version"))
            assert revision == "0005_livestock_market", "Source revision changed; review first"
            assert db.scalar(text("SELECT to_regclass('qadam.customer_creation_requests')")) is None
            manifest["revision"] = revision
            manifest["tables"] = table_fingerprints(db)
            manifest["security_metadata"] = [
                dict(row)
                for row in db.execute(
                    text("""
                    SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity,
                           c.relacl::text AS acl, pg_get_userbyid(c.relowner) AS owner
                    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                    WHERE n.nspname='qadam' AND c.relkind='r' ORDER BY c.relname
                """)
                ).mappings()
            ]
            snapshot = db.scalar(text("SELECT pg_export_snapshot()"))
            # Both archives and fingerprints share one MVCC snapshot while the phone API runs.
            for name, selection in [
                ("qadam.dump", "--schema=qadam"),
                ("revision.dump", "--table=public.alembic_version"),
            ]:
                run(
                    [
                        str(binary / "pg_dump.exe"),
                        "--format=custom",
                        selection,
                        "--snapshot=" + snapshot,
                        "--lock-wait-timeout=5s",
                        "--file=" + str(directory / name),
                    ],
                    pg_env(source),
                    directory / (name + ".log"),
                )
                manifest[name] = {
                    "bytes": (directory / name).stat().st_size,
                    "sha256": hashlib.sha256((directory / name).read_bytes()).hexdigest(),
                }
                run(
                    [str(binary / "pg_restore.exe"), "--list", str(directory / name)],
                    pg_env(local),
                    directory / (name + ".toc"),
                )
    finally:
        engine.dispose()
    (directory / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    admin = create_engine(local.set(database="postgres"), isolation_level="AUTOCOMMIT")
    try:
        with admin.connect() as db:
            assert not db.scalar(
                text("SELECT 1 FROM pg_database WHERE datname=:name"), {"name": args.restore_db}
            ), "Restore DB exists; never overwrite"
            db.execute(text(f'CREATE DATABASE "{args.restore_db}"'))
    finally:
        admin.dispose()
    for name in ("qadam.dump", "revision.dump"):
        run(
            [
                str(binary / "pg_restore.exe"),
                "--exit-on-error",
                "--single-transaction",
                "--no-owner",
                "--no-acl",
                "--dbname=" + args.restore_db,
                str(directory / name),
            ],
            pg_env(target),
            directory / (name + ".restore.log"),
        )
    restored = create_engine(target)
    try:
        with restored.connect() as db:
            assert table_fingerprints(db) == manifest["tables"], "Restored content differs"
            assert (
                db.scalar(text("SELECT version_num FROM alembic_version")) == manifest["revision"]
            )
        print(
            "PASS: archives restored locally; all table counts and content hashes match", flush=True
        )
        api_dir = Path(__file__).resolve().parents[1]
        env = {
            **os.environ,
            "DATABASE_URL": target.render_as_string(hide_password=False),
            "PGOPTIONS": "-c lock_timeout=5000 -c statement_timeout=30000",
        }
        import sys

        run(
            [sys.executable, "-m", "alembic", "upgrade", "0006_customer_requests"],
            env,
            directory / "local-0006-upgrade.log",
            api_dir,
        )
        run(
            [sys.executable, "-m", "alembic", "check"],
            env,
            directory / "local-0006-check.log",
            api_dir,
        )
        with restored.connect() as db:
            after = table_fingerprints(db)
            new = after.pop("customer_creation_requests")
            assert new["count"] == 0 and after == manifest["tables"]
            assert (
                db.scalar(text("SELECT version_num FROM alembic_version"))
                == "0006_customer_requests"
            )
            assert db.scalar(
                text(
                    "SELECT relrowsecurity FROM pg_class WHERE oid="
                    "'qadam.customer_creation_requests'::regclass"
                )
            )
            assert not db.scalar(
                text(
                    "SELECT EXISTS(SELECT 1 FROM pg_class, "
                    "LATERAL aclexplode(relacl) a WHERE oid="
                    "'qadam.customer_creation_requests'::regclass AND grantee=0)"
                )
            )
        manifest.update(
            restore_verified=True,
            local_upgrade_verified=True,
            existing_data_preserved=True,
            shared_migration_applied=False,
            completed_at=datetime.now(UTC).isoformat(),
            scope="qadam plus public.alembic_version; no Auth/Storage payloads",
            restore_acl_note="Archive retains owner/ACL metadata; local rehearsal "
            "uses --no-owner --no-acl. Shared roles/grants require separate review.",
        )
        (directory / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        print(
            json.dumps(
                {
                    "backup_directory": str(directory),
                    "restore_db": args.restore_db,
                    "tables_verified": len(manifest["tables"]),
                    "local_revision": "0006_customer_requests",
                    "shared_migration_applied": False,
                }
            ),
            flush=True,
        )
    finally:
        restored.dispose()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-env", type=Path, required=True)
    parser.add_argument("--local-env", type=Path, required=True)
    parser.add_argument("--backup-dir", type=Path, required=True)
    parser.add_argument("--pg-bin", type=Path, required=True)
    parser.add_argument("--restore-db", required=True)
    try:
        prepare(parser.parse_args())
    except Exception as exc:
        # SQL/DSN/customer rows from exceptions must not reach public terminal logs.
        print(f"FAIL: {type(exc).__name__}; inspect private preparation logs. Source not migrated.")
        raise SystemExit(1) from None


if __name__ == "__main__":
    main()
