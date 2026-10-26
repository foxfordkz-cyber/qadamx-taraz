"""Migration/backup rehearsal: new loopback DBs only; never drops a database."""

import argparse
import hashlib
import json
import os
import re
import subprocess
import time
from datetime import UTC, datetime
from pathlib import Path

import psycopg
from alembic import command
from alembic.config import Config
from psycopg import sql
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import schemas
from app.errors import APIError
from app.research_schemas import FeedbackCreate
from app.seed import demo_id, seed
from app.services import ledger, research_feedback
from tools.stage11_release.provenance import ROOT, git


def validate_run(run_id, port):
    if not re.fullmatch(r"[a-z0-9_]{1,24}", run_id) or not 1024 <= port <= 65535:
        raise ValueError("Use a short lowercase run ID and an explicit local high port")
    return [f"qadam_stage11_{run_id}_{suffix}_test" for suffix in ("source", "restore", "recover")]


def snapshot(conn):
    tables = conn.execute(
        "SELECT tablename FROM pg_tables WHERE schemaname='qadam' ORDER BY 1"
    ).fetchall()
    result = {}
    for (table,) in tables:
        rows = conn.execute(
            sql.SQL("SELECT to_jsonb(t)::text FROM qadam.{} t ORDER BY 1").format(
                sql.Identifier(table)
            )
        ).fetchall()
        result[table] = {
            "rows": len(rows),
            "sha256": hashlib.sha256("\n".join(r[0] for r in rows).encode()).hexdigest(),
        }
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--pg-bin", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    names = validate_run(args.run_id, args.port)
    out = args.output.resolve()
    if (ROOT / "tmp").resolve() not in out.parents or out.exists():
        parser.error("Output must be a NEW directory under this checkout's tmp/")
    if (ROOT / "apps/api/.env").exists():
        parser.error("Rehearsal checkout must have no .env; never load shared credentials")
    params = dict(host="127.0.0.1", port=args.port, user="qadam_research", connect_timeout=5)
    role = f"stage11_{args.run_id}_reader"
    admin = psycopg.connect(**params, dbname="postgres", autocommit=True)
    if admin.execute("SELECT datname FROM pg_database WHERE datname=ANY(%s)", (names,)).fetchall():
        parser.error("All three database names must be absent; use a new run ID")
    if admin.execute("SELECT 1 FROM pg_roles WHERE rolname=%s", (role,)).fetchone():
        parser.error("Reader role already exists; use a new run ID")
    out.mkdir(parents=True)
    result = {
        "started_utc": datetime.now(UTC).isoformat(),
        "source_commit": git("rev-parse", "HEAD"),
        "databases": names,
        "host": "127.0.0.1",
        "port": args.port,
        "checks": [],
        "status": "running",
    }
    started = time.monotonic()
    log = []

    def check(name, value):
        result["checks"].append({"check": name, "pass": bool(value)})
        if not value:
            raise AssertionError(name)

    def dburl(name):
        return f"postgresql+psycopg://qadam_research@127.0.0.1:{args.port}/{name}"

    def migrate(name, direction, revision):
        os.environ["DATABASE_URL"] = dburl(name)
        getattr(command, direction)(Config("alembic.ini"), revision)
        log.append(f"alembic {direction} {revision}: {name}: PASS")

    def pg(program, *arguments):
        executable = args.pg_bin / (program + (".exe" if os.name == "nt" else ""))
        cmd = [
            str(executable),
            "-h",
            "127.0.0.1",
            "-p",
            str(args.port),
            "-U",
            "qadam_research",
            *arguments,
        ]
        completed = subprocess.run(cmd, text=True, encoding="utf-8", capture_output=True)
        log.append(" ".join(cmd) + "\n" + completed.stdout + completed.stderr)
        check(program + " exit", completed.returncode == 0)

    try:
        result["postgres"] = admin.execute("SELECT version()").fetchone()[0]
        result["local_role"] = admin.execute(
            "SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user"
        ).fetchone()
        for name in names:
            admin.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(name)))
        migrate(names[0], "upgrade", "0008_canonical_markets")
        engine = create_engine(dburl(names[0]))
        owner = demo_id("stage11-owner-a")
        business = demo_id("mart-demo-clothes")
        with Session(engine) as db, db.begin():
            seed(db, (owner, demo_id("stage11-owner-b")))
            ledger.require_membership(db, business, owner)
            sale = ledger.write_operation(
                db,
                business,
                owner,
                "stage11-sale",
                schemas.SaleCreate(
                    kind="sale",
                    draft_id=None,
                    customer_id=demo_id("mart-demo-clothes-customer"),
                    description="Synthetic Stage11 backup rehearsal",
                    total_minor=300000,
                    received_minor=100000,
                ),
            )
            ledger.write_operation(
                db,
                business,
                owner,
                "stage11-repayment",
                schemas.RepaymentCreate(
                    kind="repayment",
                    draft_id=None,
                    sale_id=sale.operation.id,
                    description="Synthetic repayment",
                    amount_minor=50000,
                ),
            )
        with psycopg.connect(**params, dbname=names[0]) as conn:
            before = snapshot(conn)
        pg("pg_dump", "-Fc", "-f", str(out / "before-0009.dump"), names[0])
        migrate(names[0], "upgrade", "head")
        command.check(Config("alembic.ini"))
        with psycopg.connect(**params, dbname=names[0]) as conn:
            after = snapshot(conn)
        check("0009 preserves every existing table's rows", {k: after[k] for k in before} == before)
        check("only feedback table added", set(after) - set(before) == {"research_feedback"})
        payload = FeedbackCreate(
            client_request_id=demo_id("stage11-feedback"),
            language="kk",
            consent=True,
            features_used=["sales"],
            sales_debt_clarity=4,
            forecast_usefulness=None,
            risk_clarity=None,
            improve_first="Synthetic rehearsal only",
            follow_up=False,
        )
        with Session(engine) as db, db.begin():
            ledger.require_membership(db, business, owner)
            receipt = research_feedback.create(db, business, owner, payload)
            check(
                "feedback same-key replay",
                research_feedback.create(db, business, owner, payload) == receipt,
            )
            try:
                research_feedback.create(
                    db, business, owner, payload.model_copy(update={"suggestion": "changed"})
                )
            except APIError as exc:
                check("feedback changed-body conflict", exc.status == 409)
            else:
                check("feedback changed-body conflict", False)
            check(
                "feedback other author invisible",
                not research_feedback.read(db, business, demo_id("stage11-owner-b")).items,
            )
        with Session(engine) as db, db.begin():
            for name, statement in [
                (
                    "DB rejects false consent",
                    "UPDATE qadam.research_feedback "
                    "SET payload=jsonb_set(payload,'{consent}','false')",
                ),
                (
                    "DB rejects duplicate request",
                    "INSERT INTO qadam.research_feedback "
                    "SELECT gen_random_uuid(),business_id,created_by,client_request_id,"
                    "request_hash,payload,created_at FROM qadam.research_feedback",
                ),
            ]:
                try:
                    with db.begin_nested():
                        db.execute(text(statement))
                except IntegrityError:
                    check(name, True)
                else:
                    check(name, False)
        # A unique temporary NOLOGIN role tests default-deny RLS in this new database.
        # Never alter anon/authenticated or any pre-existing role.
        admin.execute(
            sql.SQL("CREATE ROLE {} NOLOGIN NOSUPERUSER NOBYPASSRLS").format(sql.Identifier(role))
        )
        with psycopg.connect(**params, dbname=names[0], autocommit=True) as conn:
            conn.execute(sql.SQL("GRANT USAGE ON SCHEMA qadam TO {}").format(sql.Identifier(role)))
            conn.execute(
                sql.SQL("GRANT SELECT ON qadam.research_feedback TO {}").format(
                    sql.Identifier(role)
                )
            )
            conn.execute(sql.SQL("SET ROLE {}").format(sql.Identifier(role)))
            check(
                "unprivileged role sees no feedback via RLS",
                conn.execute("SELECT count(*) FROM qadam.research_feedback").fetchone()[0] == 0,
            )
            conn.execute("RESET ROLE")
            conn.execute(
                sql.SQL("REVOKE SELECT ON qadam.research_feedback FROM {}").format(
                    sql.Identifier(role)
                )
            )
            conn.execute(
                sql.SQL("REVOKE USAGE ON SCHEMA qadam FROM {}").format(sql.Identifier(role))
            )
        admin.execute(sql.SQL("DROP ROLE {}").format(sql.Identifier(role)))
        with psycopg.connect(**params, dbname=names[0]) as conn:
            final = snapshot(conn)
            result["feedback_rls"] = conn.execute(
                "SELECT relrowsecurity,relforcerowsecurity FROM pg_class "
                "WHERE oid='qadam.research_feedback'::regclass"
            ).fetchone()
            result["revision"] = conn.execute("SELECT version_num FROM alembic_version").fetchone()[
                0
            ]
        check("feedback persistence across connections", final["research_feedback"]["rows"] == 1)
        check("journal has sale and repayment", final["operations"]["rows"] == 2)
        pg("pg_dump", "-Fc", "-f", str(out / "after-0009.dump"), names[0])
        pg(
            "pg_restore",
            "--exit-on-error",
            "--single-transaction",
            "-d",
            names[1],
            str(out / "after-0009.dump"),
        )
        with psycopg.connect(**params, dbname=names[1]) as conn:
            restored = snapshot(conn)
            check(
                "restored feedback RLS enabled",
                conn.execute(
                    "SELECT relrowsecurity FROM pg_class "
                    "WHERE oid='qadam.research_feedback'::regclass"
                ).fetchone()[0],
            )
        check("all restored row counts and hashes equal", restored == final)
        # Destructive downgrade is demonstrated ONLY on our newly restored copy.
        migrate(names[1], "downgrade", "0008_canonical_markets")
        with psycopg.connect(**params, dbname=names[1]) as conn:
            rolled_back = snapshot(conn)
        check(
            "downgrade deletes feedback (data-loss warning)", "research_feedback" not in rolled_back
        )
        check(
            "downgrade preserves all other rows",
            rolled_back == {k: v for k, v in final.items() if k != "research_feedback"},
        )
        pg(
            "pg_restore",
            "--exit-on-error",
            "--single-transaction",
            "-d",
            names[2],
            str(out / "after-0009.dump"),
        )
        with psycopg.connect(**params, dbname=names[2]) as conn:
            check("recovery into second new target restores all rows", snapshot(conn) == final)
        with Session(create_engine(dburl(names[2]))) as db:
            report = ledger.summary(db, business, datetime.now(UTC).date())
            check("recovered financial balance", report.outstanding_minor == 150000)
            check(
                "recovered receipt replay",
                research_feedback.create(db, business, owner, payload) == receipt,
            )
        result["snapshots"] = {
            "before_0009": before,
            "after_0009": final,
            "restore": restored,
            "downgrade": rolled_back,
        }
        result["backups"] = {
            p.name: {
                "bytes": p.stat().st_size,
                "sha256": hashlib.sha256(p.read_bytes()).hexdigest(),
            }
            for p in out.glob("*.dump")
        }
        result["status"] = "passed"
        engine.dispose()
    except Exception as exc:
        result["status"] = "failed"
        result["failure_type"] = type(exc).__name__
        raise
    finally:
        result["duration_seconds"] = round(time.monotonic() - started, 3)
        (out / "result.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
        (out / "commands.txt").write_text("\n".join(log) + "\n", encoding="utf-8")
        admin.close()


if __name__ == "__main__":
    main()
