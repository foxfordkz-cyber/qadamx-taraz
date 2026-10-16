import asyncio
import io
import json
import wave
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient
from backend.app import create_app, COOKIE
from backend.db import transaction
from backend.schemas import Extraction
from backend import ai


@pytest.fixture
def app(tmp_path):
    return create_app(tmp_path/'test.sqlite3',ai_key='')


@pytest.fixture
def client(app):
    with TestClient(app) as c:
        yield c


def register(client, name='owner'):
    response=client.post('/api/v1/auth/register',json={'email':f'{name}@example.test','password':'Test-password-2026','business_name':'Сынақ дүкені'})
    assert response.status_code==201,response.text
    return response.json()


def setup(client):
    user=register(client)
    base=f"/api/v1/businesses/{user['business_id']}"
    c=client.post(base+'/customers',json={'display_name':'Асқар','note':'бірінші'}).json()
    return base,c


def post(client,base,body,key=None):
    return client.post(base+'/operations',json=body,headers={'Idempotency-Key':key or str(uuid4())})


def sale(customer=None):
    return {'kind':'sale','total_minor':300000,'received_minor':100000,'customer_id':customer}


def test_auth_session_logout_and_wrong_password(client, app):
    assert client.get('/api/v1/me').status_code==401
    user=register(client)
    assert client.get('/api/v1/me').json()['id']==user['id']
    session=client.cookies.get(COOKIE)
    with transaction(app.state.db_path) as db:
        row=db.execute('SELECT * FROM users').fetchone()
        assert row['password_hash'].startswith('$argon2')
        assert session not in db.execute('SELECT token_hash FROM sessions').fetchone()[0]
    client.post('/api/v1/auth/logout')
    assert client.get('/api/v1/me').status_code==401
    assert client.post('/api/v1/auth/login',json={'email':'owner@example.test','password':'wrong-password'}).status_code==401
    assert client.post('/api/v1/auth/login',json={'email':'owner@example.test','password':'Test-password-2026'}).status_code==200


def test_main_scenario_idempotency_persistence(client,app):
    base,c=setup(client)
    s=post(client,base,sale(c['id']),'one')
    assert s.status_code==200,s.text
    assert post(client,base,sale(c['id']),'one').json()==s.json()
    assert post(client,base,{**sale(c['id']),'total_minor':400000},'one').status_code==409
    p={'kind':'repayment','sale_id':s.json()['operation']['id'],'amount_minor':50000}
    assert post(client,base,p,'two').status_code==200
    assert post(client,base,p,'two').status_code==200
    today=datetime.now(ZoneInfo('Asia/Almaty')).date()
    totals=client.get(base+'/summary',params={'date':today.isoformat()}).json()
    assert (totals['sales_minor'],totals['receipts_minor'],totals['outstanding_minor'])==(300000,150000,150000)
    assert len(client.get(base+'/operations').json()['items'])==2
    with TestClient(create_app(app.state.db_path,ai_key='')) as reopened:
        reopened.cookies.update(client.cookies)
        assert reopened.get(base+'/summary',params={'date':today.isoformat()}).json()==totals


def test_cross_account_entity_isolation(client, app):
    base,c=setup(client)
    original=post(client,base,sale(c['id'])).json()['operation']
    with TestClient(app) as other:
        user=register(other,'other')
        theirs=f"/api/v1/businesses/{user['business_id']}"
        assert other.get(base+'/customers').status_code==404
        assert post(other,theirs,sale(c['id'])).status_code==404
        assert post(other,theirs,{'kind':'repayment','sale_id':original['id'],'amount_minor':100}).status_code==404
        assert other.post(theirs+'/operations/'+original['id']+'/reverse',headers={'Idempotency-Key':'foreign'}).status_code==404


@pytest.mark.parametrize('body',[
    {'kind':'sale','total_minor':0,'received_minor':0},
    {'kind':'sale','total_minor':100,'received_minor':101},
    {'kind':'sale','total_minor':100,'received_minor':0},
    {'kind':'sale','total_minor':100.5,'received_minor':100},
    {'kind':'sale','total_minor':True,'received_minor':0},
    {'kind':'sale','total_minor':100,'received_minor':-1},
    {'kind':'sale','total_minor':100},
])
def test_amount_validation(client,body):
    base,c=setup(client)
    assert post(client,base,body).status_code==422
    assert client.get(base+'/operations').json()['items']==[]


def test_concurrent_repayments_do_not_overpay(client,app):
    base,c=setup(client)
    s=post(client,base,sale(c['id'])).json()['operation']
    body={'kind':'repayment','sale_id':s['id'],'amount_minor':150000}
    def pay(_):
        with TestClient(app) as concurrent:
            concurrent.cookies.update(client.cookies)
            return post(concurrent,base,body).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        statuses=list(pool.map(pay,range(2)))
    assert sorted(statuses)==[200,409]
    assert client.get(base+'/operations?outstanding_only=true').json()['items'][0]['outstanding_minor']==50000


def test_reversals_keep_audit_and_reject_dependencies(client):
    base,c=setup(client)
    s=post(client,base,sale(c['id'])).json()['operation']
    p=post(client,base,{'kind':'repayment','sale_id':s['id'],'amount_minor':50000}).json()['operation']
    def reverse(row,key):
        return client.post(base+'/operations/'+row['id']+'/reverse',headers={'Idempotency-Key':key})
    assert reverse(s,'s').status_code==409
    first=reverse(p,'p')
    assert first.status_code==200
    assert reverse(p,'p').json()==first.json()
    assert reverse(p,'p-new').status_code==409
    assert reverse(s,'s').status_code==200
    assert len(client.get(base+'/operations').json()['items'])==4
    assert client.get(base+'/operations?outstanding_only=true').json()['items']==[]


def test_ai_missing_key_writes_nothing_and_text_fallback(client):
    base,c=setup(client)
    response=client.post(base+'/drafts',data={'text':'Асқарға 3000 теңгеге саттым','locale':'auto'})
    assert response.status_code==503
    assert response.json()['error']['code']=='AI_UNAVAILABLE'
    assert client.get(base+'/operations').json()['items']==[]
    assert post(client,base,sale(c['id'])).status_code==200


def test_russian_locale_is_passed_to_ai_and_used_for_missing_payment(client,monkeypatch):
    base,c=setup(client)
    captured={}
    async def fake(*args,**kwargs):
        captured.update(kwargs)
        return Extraction(transcript='Продал на 3000',kind='sale',total_minor=300000,received_minor=None)
    monkeypatch.setattr(ai,'extract',fake)
    response=client.post(base+'/drafts',data={'text':'Продал на 3000','locale':'ru'})
    assert response.status_code==200
    assert captured['locale']=='ru'
    assert any('Сколько денег' in question for question in response.json()['questions'])
    assert client.get(base+'/operations').json()['items']==[]


def test_ai_draft_ambiguity_and_single_consumption(client,monkeypatch):
    base,c=setup(client)
    client.post(base+'/customers',json={'display_name':'Асқар','note':'екінші'})
    async def fake(*args,**kwargs):
        return Extraction(transcript='Асқарға 3000 теңгеге саттым',kind='sale',customer_query='Асқар',total_minor=300000,received_minor=None)
    monkeypatch.setattr(ai,'extract',fake)
    draft=client.post(base+'/drafts',data={'text':'Асқарға 3000 теңгеге саттым'}).json()
    assert len(draft['customer_candidates'])==2
    assert draft['received_minor'] is None
    assert 'received_minor' in draft['missing_fields']
    assert client.get(base+'/operations').json()['items']==[]
    body={**sale(c['id']),'draft_id':draft['id']}
    assert post(client,base,body,'first').status_code==200
    assert post(client,base,body,'retry-new-key').status_code==409


@pytest.mark.parametrize('mode,expected',[('invalid',502),('timeout',504)])
def test_ai_bad_responses_never_write(client,monkeypatch,mode,expected):
    base,c=setup(client)
    async def fake(*args,**kwargs):
        if mode=='timeout':raise asyncio.TimeoutError()
        return {'kind':'sale','total_minor':'not-money'}
    monkeypatch.setattr(ai,'extract',fake)
    response=client.post(base+'/drafts',data={'text':'test'})
    assert response.status_code==expected
    assert client.get(base+'/operations').json()['items']==[]


def wav_bytes(seconds=1):
    output=io.BytesIO()
    with wave.open(output,'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(16000)
        w.writeframes(b'\x00\x00' * 16000 * seconds)
    return output.getvalue()


def test_audio_validation_and_normalization(client,monkeypatch):
    base,c=setup(client)
    captured={}
    async def fake(*args,**kwargs):
        captured.update(kwargs)
        return Extraction(transcript='',kind='unknown',questions=['Қайта айтыңыз'])
    monkeypatch.setattr(ai,'extract',fake)
    assert client.post(base+'/drafts',files={'audio':('x.wav',wav_bytes(),'audio/wav')}).status_code==200
    assert captured['audio'][:4]==b'RIFF'
    assert client.post(base+'/drafts',files={'audio':('x.wav',wav_bytes(31),'audio/wav')}).status_code==415
    assert client.post(base+'/drafts',files={'audio':('x.wav',b'invalid','audio/wav')}).status_code==415
    assert client.post(base+'/drafts',files={'audio':('x.wav',b'0'*(8*1024*1024+1),'audio/wav')}).status_code==413
    assert client.post(base+'/drafts',data={'text':'test'},files={'audio':('x.wav',wav_bytes(),'audio/wav')}).status_code==422


def test_csrf_origin_and_session_expiry(client,app):
    register(client)
    assert client.post('/api/v1/auth/logout',headers={'Origin':'https://attacker.example'}).status_code==403
    with transaction(app.state.db_path,True) as db:
        db.execute('UPDATE sessions SET expires_at=0')
    assert client.get('/api/v1/me').status_code==401


def test_pagination(client):
    base,c=setup(client)
    post(client,base,sale(c['id']))
    post(client,base,sale(c['id']))
    first=client.get(base+'/operations?limit=1').json()
    second=client.get(base+'/operations?limit=1&cursor='+str(first['next_cursor'])).json()
    assert first['items'][0]['id']!=second['items'][0]['id']
    assert second['next_cursor'] is None


def test_draft_expiry_and_cross_account_draft(client,app,monkeypatch):
    base,c=setup(client)
    async def fake(*args,**kwargs):
        return Extraction(transcript='Толық төленді',kind='sale',total_minor=10000,received_minor=10000)
    monkeypatch.setattr(ai,'extract',fake)
    draft=client.post(base+'/drafts',data={'text':'Толық төленді'}).json()
    body={'kind':'sale','draft_id':draft['id'],'total_minor':10000,'received_minor':10000}
    with TestClient(app) as other:
        user=register(other,'second-owner')
        assert post(other,f"/api/v1/businesses/{user['business_id']}",body).status_code==404
    with transaction(app.state.db_path,True) as db:
        db.execute('UPDATE drafts SET expires_at=? WHERE id=?',((datetime.now(timezone.utc)-timedelta(seconds=1)).isoformat(),draft['id']))
    assert post(client,base,body).json()['error']['code']=='DRAFT_EXPIRED'
    assert client.get(base+'/operations').json()['items']==[]


def test_summary_uses_almaty_day_and_all_time_debt(client,app):
    base,c=setup(client)
    s=post(client,base,sale(c['id'])).json()['operation']
    with transaction(app.state.db_path,True) as db:
        db.execute('UPDATE operations SET created_at=? WHERE id=?',('2026-10-14T20:00:00+00:00',s['id']))
    yesterday=client.get(base+'/summary?date=2026-10-14').json()
    today=client.get(base+'/summary?date=2026-10-15').json()
    assert yesterday['sales_minor']==0
    assert yesterday['outstanding_minor']==200000
    assert today['sales_minor']==300000


def test_auth_cookie_flags_and_login_rate_limit(client):
    register(client)
    response=client.post('/api/v1/auth/login',json={'email':'owner@example.test','password':'Test-password-2026'})
    cookie=response.headers['set-cookie'].lower()
    assert 'httponly' in cookie and 'samesite=strict' in cookie
    for _ in range(9):
        response=client.post('/api/v1/auth/login',json={'email':'owner@example.test','password':'bad-password'})
    assert response.status_code==429


def test_registration_keeps_password_whitespace(client):
    password='  password with spaces  '
    data={'email':'spaces@example.test','password':password,'business_name':'Ақ дүкен'}
    assert client.post('/api/v1/auth/register',json=data).status_code==201
    client.post('/api/v1/auth/logout')
    assert client.post('/api/v1/auth/login',json={'email':data['email'],'password':password.strip()}).status_code==401
    assert client.post('/api/v1/auth/login',json={'email':data['email'],'password':password}).status_code==200
