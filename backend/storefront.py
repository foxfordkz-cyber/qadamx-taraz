"""Public projection and private inbox; no ledger/customer fields are exposed."""
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
from uuid import UUID, uuid4

from fastapi import Depends, Query, Request
from pydantic import BaseModel, ConfigDict, Field, field_validator
from .db import transaction


class Input(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)


class Inquiry(Input):
    client_request_id: UUID
    visitor_name: str = Field(min_length=1, max_length=100)
    contact: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1, max_length=2000)

    @field_validator('contact')
    @classmethod
    def contact_format(cls, value):
        email = re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', value)
        phone = re.fullmatch(r'\+?[0-9 ()-]+', value) and 10 <= len(re.sub(r'\D', '', value)) <= 15
        if not (email or phone):
            raise ValueError('Email or phone required')
        return value


class Publication(Input):
    venue_id: UUID
    name: str = Field(min_length=2, max_length=120)
    category: Literal['clothes', 'food', 'home']
    description: str = Field(min_length=10, max_length=2000)
    published: bool = True


class Status(Input):
    status: Literal['new', 'in_progress', 'closed']


def initialize_storefront(path):
    with transaction(path, True) as db:
        db.execute('CREATE TABLE IF NOT EXISTS venues (id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, payload TEXT NOT NULL)')
        db.execute('''CREATE TABLE IF NOT EXISTS public_businesses (
            id TEXT PRIMARY KEY, venue_id TEXT NOT NULL REFERENCES venues(id), slug TEXT UNIQUE NOT NULL,
            owner_business_id TEXT UNIQUE REFERENCES users(business_id), published INTEGER NOT NULL,
            payload TEXT NOT NULL)''')
        db.execute('''CREATE TABLE IF NOT EXISTS inquiries (
            number INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL,
            business_id TEXT NOT NULL REFERENCES public_businesses(id), client_request_id TEXT NOT NULL,
            visitor_name TEXT NOT NULL, contact TEXT NOT NULL, message TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'new', created_at TEXT NOT NULL, request_hash TEXT NOT NULL,
            UNIQUE(business_id, client_request_id))''')
        db.execute('CREATE INDEX IF NOT EXISTS ix_inquiries_business ON inquiries(business_id, number)')
        seed = json.loads(Path(__file__).with_name('showcase-seed.json').read_text(encoding='utf8'))
        for venue in seed['venues']:
            db.execute('INSERT OR IGNORE INTO venues VALUES (?,?,?)', (venue['id'], venue['slug'], json.dumps(venue)))
        for shop in seed['businesses']:
            shop['catalog_items'] = [i for i in seed['catalog_items'] if i['business_id'] == shop['id']]
            shop['accepts_inquiries'] = True
            shop['inquiry_mode'] = 'training'
            db.execute('INSERT OR IGNORE INTO public_businesses VALUES (?,?,?,NULL,1,?)',
                       (shop['id'], shop['venue_id'], shop['slug'], json.dumps(shop)))


def register_storefront(app, path, member, rate_limit, fail):
    @app.get('/api/v1/venues')
    def venues():
        with transaction(path) as db:
            return {'items': [json.loads(r['payload']) for r in db.execute('SELECT payload FROM venues ORDER BY rowid')], 'next_cursor': None}

    @app.get('/api/v1/businesses')
    def businesses(venue_id: str = '', category: str = '', q: str = Query('', max_length=120),
                   cursor: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=100)):
        with transaction(path) as db:
            rows = db.execute('SELECT payload FROM public_businesses WHERE published=1 AND (?="" OR venue_id=?) ORDER BY slug', (venue_id, venue_id)).fetchall()
        items = [json.loads(r['payload']) for r in rows]
        items = [s for s in items if (not category or s['category'] == category) and
                 (not q.strip() or q.strip().casefold() in (s['name']+' '+s['description']).casefold())]
        return {'items': items[cursor:cursor+limit], 'next_cursor': cursor+limit if cursor+limit < len(items) else None}

    @app.get('/api/v1/businesses/{slug}')
    def business(slug: str):
        with transaction(path) as db:
            row = db.execute('SELECT payload FROM public_businesses WHERE slug=? AND published=1', (slug,)).fetchone()
        if not row:
            fail(404, 'NOT_FOUND', 'Дүкен табылмады / Магазин не найден')
        return json.loads(row['payload'])

    @app.post('/api/v1/businesses/{business_id}/inquiries', status_code=201)
    def create_inquiry(business_id: str, body: Inquiry, request: Request):
        rate_limit('inquiry:'+hashlib.sha256(request.client.host.encode()).hexdigest(), 20, 60)
        data = body.model_dump(mode='json')
        fingerprint = hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()
        with transaction(path, True) as db:
            old = db.execute('SELECT * FROM inquiries WHERE business_id=? AND client_request_id=?', (business_id, data['client_request_id'])).fetchone()
            if old:
                if old['request_hash'] != fingerprint:
                    fail(409, 'IDEMPOTENCY_CONFLICT', 'Бұрынғы сұрауды қайталаңыз / Повторите исходную заявку')
                return {'id': old['id'], 'number': f"Q-{old['number']:06d}", 'status': 'new'}
            shop = db.execute('SELECT id FROM public_businesses WHERE id=? AND published=1', (business_id,)).fetchone()
            if not shop:
                fail(404, 'NOT_FOUND', 'Дүкен табылмады / Магазин не найден')
            ident = str(uuid4())
            result = db.execute('''INSERT INTO inquiries(id,business_id,client_request_id,visitor_name,contact,message,created_at,request_hash)
                VALUES (?,?,?,?,?,?,?,?)''', (ident, business_id, data['client_request_id'], body.visitor_name, body.contact,
                                            body.message, datetime.now(timezone.utc).isoformat(), fingerprint))
            return {'id': ident, 'number': f'Q-{result.lastrowid:06d}', 'status': 'new'}

    @app.get('/api/v1/businesses/{business_id}/storefront')
    def my_storefront(business_id: str, user=Depends(member)):
        with transaction(path) as db:
            row = db.execute('SELECT payload,published FROM public_businesses WHERE owner_business_id=?', (business_id,)).fetchone()
        return {**json.loads(row['payload']), 'published': bool(row['published'])} if row else None

    @app.post('/api/v1/businesses/{business_id}/storefront')
    def publish(business_id: str, body: Publication, user=Depends(member)):
        # Explicit opt-in; never assign another shop or expose existing ledger data.
        with transaction(path, True) as db:
            if not db.execute('SELECT id FROM venues WHERE id=?', (str(body.venue_id),)).fetchone():
                fail(422, 'INVALID_INPUT', 'Алаңды таңдаңыз / Выберите площадку')
            shop = {'id': business_id, 'slug': 'shop-'+business_id, 'venue_id': str(body.venue_id),
                    'name': body.name, 'category': body.category, 'description': body.description,
                    'is_demo': True, 'catalog_items': [], 'accepts_inquiries': True, 'inquiry_mode': 'seller'}
            db.execute('''INSERT INTO public_businesses VALUES (?,?,?,?,?,?) ON CONFLICT(id)
                DO UPDATE SET venue_id=excluded.venue_id,published=excluded.published,payload=excluded.payload''',
                       (business_id, shop['venue_id'], shop['slug'], business_id, int(body.published), json.dumps(shop)))
        return {**shop, 'published': body.published}

    @app.get('/api/v1/businesses/{business_id}/inquiries')
    def inbox(business_id: str, cursor: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100), user=Depends(member)):
        with transaction(path) as db:
            rows = db.execute('''SELECT i.id,i.number,i.visitor_name,i.contact,i.message,i.status,i.created_at
                FROM inquiries i JOIN public_businesses b ON b.id=i.business_id
                WHERE b.owner_business_id=? ORDER BY i.number DESC LIMIT ? OFFSET ?''', (business_id, limit+1, cursor)).fetchall()
        return {'items': [{**dict(r), 'number': f"Q-{r['number']:06d}"} for r in rows[:limit]],
                'next_cursor': cursor+limit if len(rows)>limit else None}

    @app.patch('/api/v1/businesses/{business_id}/inquiries/{inquiry_id}')
    def change_status(business_id: str, inquiry_id: str, body: Status, user=Depends(member)):
        with transaction(path, True) as db:
            result = db.execute('''UPDATE inquiries SET status=? WHERE id=? AND business_id IN
                (SELECT id FROM public_businesses WHERE owner_business_id=?)''', (body.status, inquiry_id, business_id))
            if not result.rowcount:
                fail(404, 'NOT_FOUND', 'Өтінім табылмады / Заявка не найдена')
        return {'id': inquiry_id, 'status': body.status}
