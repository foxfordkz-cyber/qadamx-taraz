import sqlite3
from contextlib import contextmanager
from pathlib import Path

SCHEMA = '''
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
 business_id TEXT NOT NULL UNIQUE, business_name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS customers (
 id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES users(business_id),
 display_name TEXT NOT NULL, note TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS drafts (
 id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES users(business_id), creator_id TEXT NOT NULL,
 payload TEXT NOT NULL, expires_at TEXT NOT NULL, consumed_operation_id TEXT
);
CREATE TABLE IF NOT EXISTS operations (
 id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES users(business_id),
 customer_id TEXT REFERENCES customers(id), sale_id TEXT NOT NULL REFERENCES operations(id),
 kind TEXT NOT NULL CHECK(kind IN ('sale','repayment','reversal')),
 sales_delta_minor INTEGER NOT NULL, receipts_delta_minor INTEGER NOT NULL,
 reversal_of TEXT UNIQUE REFERENCES operations(id), description TEXT NOT NULL,
 created_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS ix_operations_business ON operations(business_id, created_at);
CREATE INDEX IF NOT EXISTS ix_operations_sale ON operations(sale_id);
CREATE TABLE IF NOT EXISTS idempotency (
 business_id TEXT NOT NULL, key TEXT NOT NULL, request_hash TEXT NOT NULL, response TEXT NOT NULL,
 PRIMARY KEY(business_id,key)
);
CREATE TABLE IF NOT EXISTS rate_limits (
 bucket TEXT PRIMARY KEY, started INTEGER NOT NULL, count INTEGER NOT NULL
);
PRAGMA user_version=1;
'''


def connect(path):
    db = sqlite3.connect(path, timeout=15, isolation_level=None)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    return db


def initialize(path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with connect(path) as db:
        db.execute('PRAGMA journal_mode=WAL')
        db.executescript(SCHEMA)
    db.close()


@contextmanager
def transaction(path, write=False):
    db = connect(path)
    try:
        # Serialize writes BEFORE reading balances: concurrent repayments cannot overpay.
        db.execute('BEGIN IMMEDIATE' if write else 'BEGIN')
        yield db
        db.commit()
    except BaseException:
        db.rollback()
        raise
    finally:
        db.close()


def balance(db, business_id, sale_id=None, customer_id=None):
    sql = 'SELECT COALESCE(SUM(sales_delta_minor-receipts_delta_minor),0) FROM operations WHERE business_id=?'
    args = [business_id]
    if sale_id:
        sql += ' AND sale_id=?'
        args.append(sale_id)
    if customer_id:
        sql += ' AND customer_id=?'
        args.append(customer_id)
    return db.execute(sql,args).fetchone()[0]
