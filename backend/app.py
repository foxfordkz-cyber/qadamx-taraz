import asyncio
import hashlib
import json
import os
import secrets
import sqlite3
import time
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from fastapi import FastAPI, Request, Response, Depends, Header, Form, UploadFile, File, Query
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pwdlib import PasswordHash
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool

from . import ai
from .db import initialize, transaction, balance
from .schemas import Credentials, Registration, Customer, Operation, Extraction

ROOT = Path(__file__).resolve().parent
COOKIE = 'qadam_session'
SESSION_SECONDS = 12 * 3600
passwords = PasswordHash.recommended()
DUMMY_HASH = passwords.hash('not-a-login-account-' + secrets.token_hex(16))


class APIError(Exception):
    def __init__(self, status, code, message):
        self.status, self.code, self.message = status, code, message


def fail(status, code, message):
    raise APIError(status, code, message)


def utcnow():
    return datetime.now(timezone.utc).isoformat()


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def create_app(database_path=None, ai_key=None):
    load_dotenv(ROOT / '.env')
    db_path = Path(database_path or os.getenv('DATABASE_PATH', 'data/qadam.sqlite3'))
    if not db_path.is_absolute():
        db_path = ROOT / db_path
    allowed = [x.strip() for x in os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000').split(',') if x.strip()]
    secure = os.getenv('COOKIE_SECURE', 'false').lower() == 'true'

    @asynccontextmanager
    async def lifespan(app):
        initialize(db_path)
        yield

    app = FastAPI(title='Qadam Business API', version='1.0.0', lifespan=lifespan)
    app.state.db_path = db_path
    app.state.ai_key = ai_key if ai_key is not None else os.getenv('AI_API_KEY','')
    app.state.ai_model = os.getenv('AI_MODEL','gemini-3.8-flash')
    app.add_middleware(CORSMiddleware, allow_origins=allowed, allow_credentials=True,
                       allow_methods=['GET','POST'], allow_headers=['Content-Type','Idempotency-Key'])

    @app.exception_handler(APIError)
    async def api_error(request, exc):
        return JSONResponse(status_code=exc.status, content={'error':{'code':exc.code,'message':exc.message},'request_id':str(uuid4())})

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        # Do not echo rejected passwords, tokens, audio or user input.
        return JSONResponse(status_code=422, content={'error':{'code':'INVALID_INPUT','message':'Өрістерді тексеріңіз. Сома бүтін тиынмен берілуі керек.','fields':[{'field':'.'.join(map(str,e['loc'])),'type':e['type']} for e in exc.errors()]}})

    @app.middleware('http')
    async def protect(request, call_next):
        if request.method not in ('GET','HEAD','OPTIONS'):
            origin = request.headers.get('origin')
            if (origin and origin not in allowed) or request.headers.get('sec-fetch-site') == 'cross-site':
                return JSONResponse(status_code=403,content={'error':{'code':'ORIGIN_DENIED','message':'Бұл сайттан сұрау қабылданбайды'}})
            # Enforce streaming limit, including chunked uploads, before multipart parsing.
            chunks, size = [], 0
            async for chunk in request.stream():
                size += len(chunk)
                if size > 9 * 1024 * 1024:
                    return JSONResponse(status_code=413,content={'error':{'code':'AUDIO_TOO_LARGE','message':'Аудио 8 МБ-тан аспауы керек'}})
                chunks.append(chunk)
            request._body = b''.join(chunks)
        response = await call_next(request)
        response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        return response

    def rate_limit(bucket, limit, window=60):
        now = int(time.time())
        with transaction(db_path,True) as db:
            db.execute('DELETE FROM rate_limits WHERE started < ?', (now-3600,))
            row = db.execute('SELECT * FROM rate_limits WHERE bucket=?',(bucket,)).fetchone()
            if row and now-row['started']<window:
                if row['count']>=limit:
                    fail(429,'RATE_LIMITED','Сұрау тым көп. Бір минуттан кейін қайталаңыз.')
                db.execute('UPDATE rate_limits SET count=count+1 WHERE bucket=?',(bucket,))
            else:
                db.execute('INSERT OR REPLACE INTO rate_limits VALUES (?,?,1)',(bucket,now))

    def current_user(request: Request):
        token = request.cookies.get(COOKIE)
        if not token:
            fail(401,'AUTH_REQUIRED','Жүйеге кіріңіз.')
        with transaction(db_path) as db:
            user = db.execute('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?',(digest(token),int(time.time()))).fetchone()
        if not user:
            fail(401,'AUTH_REQUIRED','Сеанс аяқталды. Қайта кіріңіз.')
        return dict(user)

    def member(business_id: str, user=Depends(current_user)):
        if user['business_id'] != business_id:
            fail(404,'NOT_FOUND','Дүкен табылмады.')
        return user

    def public_user(user):
        return {k:user[k] for k in ('id','email','business_id','business_name')}

    def start_session(db, user_id, response):
        token = secrets.token_urlsafe(48)
        db.execute('DELETE FROM sessions WHERE expires_at<=?',(int(time.time()),))
        db.execute('INSERT INTO sessions VALUES (?,?,?)',(digest(token),user_id,int(time.time())+SESSION_SECONDS))
        response.set_cookie(COOKIE,token,max_age=SESSION_SECONDS,httponly=True,secure=secure,samesite='strict',path='/api')

    @app.get('/api/v1/health')
    def health():
        with transaction(db_path) as db:
            db.execute('SELECT 1')
        return {'status':'ok'}

    @app.post('/api/v1/auth/register',status_code=201)
    def register(body: Registration, request: Request, response: Response):
        if os.getenv('ALLOW_REGISTRATION','true').lower()!='true':
            fail(403,'REGISTRATION_CLOSED','Жаңа аккаунт тіркеу жабық.')
        rate_limit('auth:'+request.client.host,10)
        user = {'id':str(uuid4()),'email':body.email,'business_id':str(uuid4()),'business_name':body.business_name.strip()}
        hashed = passwords.hash(body.password)
        try:
            with transaction(db_path,True) as db:
                db.execute('INSERT INTO users VALUES (?,?,?,?,?)',(user['id'],user['email'],hashed,user['business_id'],user['business_name']))
                start_session(db,user['id'],response)
        except sqlite3.IntegrityError:
            fail(409,'ACCOUNT_EXISTS','Бұл email тіркелген. Жүйеге кіріңіз.')
        return public_user(user)

    @app.post('/api/v1/auth/login')
    def login(body: Credentials, request: Request, response: Response):
        rate_limit('auth:'+request.client.host,10)
        with transaction(db_path) as db:
            row = db.execute('SELECT * FROM users WHERE email=?',(body.email,)).fetchone()
        valid = passwords.verify(body.password,row['password_hash'] if row else DUMMY_HASH)
        if not row or not valid:
            fail(401,'INVALID_CREDENTIALS','Email немесе құпиясөз қате.')
        with transaction(db_path,True) as db:
            old = request.cookies.get(COOKIE)
            if old:
                db.execute('DELETE FROM sessions WHERE token_hash=?',(digest(old),))
            start_session(db,row['id'],response)
        return public_user(dict(row))

    @app.post('/api/v1/auth/logout')
    def logout(request: Request, response: Response):
        token=request.cookies.get(COOKIE)
        if token:
            with transaction(db_path,True) as db:
                db.execute('DELETE FROM sessions WHERE token_hash=?',(digest(token),))
        response.delete_cookie(COOKIE,path='/api')
        return {'ok':True}

    @app.get('/api/v1/me')
    def me(user=Depends(current_user)):
        return {**public_user(user),'ai_configured':bool(app.state.ai_key)}

    prefix='/api/v1/businesses/{business_id}'

    @app.get(prefix+'/customers')
    def customers(business_id:str, user=Depends(member)):
        with transaction(db_path) as db:
            rows=db.execute('SELECT * FROM customers WHERE business_id=? ORDER BY display_name,id',(business_id,)).fetchall()
            return {'items':[{**dict(c),'outstanding_minor':balance(db,business_id,customer_id=c['id'])} for c in rows], 'next_cursor':None}

    @app.post(prefix+'/customers',status_code=201)
    def create_customer(business_id:str, body:Customer, user=Depends(member)):
        customer={'id':str(uuid4()),'business_id':business_id,**body.model_dump()}
        with transaction(db_path,True) as db:
            db.execute('INSERT INTO customers VALUES (?,?,?,?)',tuple(customer[k] for k in ('id','business_id','display_name','note')))
        return {**customer,'outstanding_minor':0}

    def operation_list(db, business_id, outstanding_only=False):
        rows=db.execute('SELECT * FROM operations WHERE business_id=? ORDER BY created_at DESC,id DESC',(business_id,)).fetchall()
        balances={}
        reversed_ids={r['reversal_of'] for r in rows if r['reversal_of']}
        for row in rows:
            balances[row['sale_id']]=balances.get(row['sale_id'],0)+row['sales_delta_minor']-row['receipts_delta_minor']
        return [{**dict(r),'outstanding_minor':balances[r['sale_id']], 'reversed':r['id'] in reversed_ids,
                 'total_minor':r['sales_delta_minor'] if r['kind']=='sale' else None,
                 'received_minor':r['sales_delta_minor']-balances[r['sale_id']] if r['kind']=='sale' else None}
                for r in rows if not outstanding_only or (r['kind']=='sale' and balances[r['id']]>0)]

    @app.get(prefix+'/operations')
    def operations(business_id:str,outstanding_only:bool=False, cursor:int=Query(0,ge=0), limit:int=Query(100,ge=1,le=200), user=Depends(member)):
        with transaction(db_path) as db:
            rows=operation_list(db,business_id,outstanding_only)
            return {'items':rows[cursor:cursor+limit],'next_cursor':cursor+limit if cursor+limit<len(rows) else None}

    def save_operation(business_id, user, key, body=None, reverse_id=None):
        if not key or len(key)>128:
            fail(422,'IDEMPOTENCY_REQUIRED','Idempotency-Key қажет.')
        request_hash=digest(json.dumps({'body':body.model_dump() if body else None,'reverse_id':reverse_id},sort_keys=True))
        with transaction(db_path,True) as db:
            prior=db.execute('SELECT * FROM idempotency WHERE business_id=? AND key=?',(business_id,key)).fetchone()
            if prior:
                if prior['request_hash']!=request_hash:
                    fail(409,'IDEMPOTENCY_CONFLICT','Бұл сұраудың сомасы өзгерген. Алғашқы нәтижені тексеріңіз.')
                return json.loads(prior['response'])
            row={'id':str(uuid4()),'business_id':business_id,'customer_id':None,'kind':body.kind if body else 'reversal','sales_delta_minor':0,'receipts_delta_minor':0,'reversal_of':None,'description':body.description if body else '', 'created_at':utcnow(),'created_by':user['id']}
            if reverse_id:
                old=db.execute('SELECT * FROM operations WHERE id=? AND business_id=?',(reverse_id,business_id)).fetchone()
                if not old:
                    fail(404,'NOT_FOUND','Операция табылмады.')
                if old['kind']=='reversal' or db.execute('SELECT 1 FROM operations WHERE reversal_of=?',(reverse_id,)).fetchone():
                    fail(409,'ALREADY_REVERSED','Бұл операция бұрын қайтарылған.')
                if old['kind']=='sale' and db.execute("SELECT 1 FROM operations p WHERE p.sale_id=? AND p.kind='repayment' AND NOT EXISTS (SELECT 1 FROM operations r WHERE r.reversal_of=p.id)",(old['sale_id'],)).fetchone():
                    fail(409,'DEPENDENT_PAYMENTS','Алдымен осы сатылымға байланысты кейінгі төлемдерді қайтарыңыз.')
                row.update(sale_id=old['sale_id'],customer_id=old['customer_id'],reversal_of=old['id'],description=old['description'],sales_delta_minor=-old['sales_delta_minor'],receipts_delta_minor=-old['receipts_delta_minor'])
            elif body.kind=='sale':
                if body.total_minor is None or body.received_minor is None or body.received_minor>body.total_minor:
                    fail(422,'INVALID_AMOUNT','Сатылым мен алынған ақшаны дұрыс енгізіңіз.')
                if body.total_minor>body.received_minor and not body.customer_id:
                    fail(422,'CUSTOMER_REQUIRED','Қарызға сату үшін клиент қажет.')
                if body.customer_id and not db.execute('SELECT 1 FROM customers WHERE id=? AND business_id=?',(body.customer_id,business_id)).fetchone():
                    fail(404,'NOT_FOUND','Клиент табылмады.')
                row.update(sale_id=row['id'],customer_id=body.customer_id,sales_delta_minor=body.total_minor,receipts_delta_minor=body.received_minor)
            else:
                sale=db.execute("SELECT * FROM operations WHERE id=? AND business_id=? AND kind='sale'",(body.sale_id,business_id)).fetchone()
                if not sale:
                    fail(404,'NOT_FOUND','Сатылым табылмады.')
                if body.amount_minor is None or body.amount_minor>balance(db,business_id,sale_id=sale['id']):
                    fail(409,'BALANCE_CHANGED','Қалдық өзгерді немесе төлем қарыздан артық. Тізімді жаңартып, соманы тексеріңіз.')
                row.update(sale_id=sale['id'],customer_id=sale['customer_id'],receipts_delta_minor=body.amount_minor)
            if body and body.draft_id:
                draft=db.execute('SELECT * FROM drafts WHERE id=? AND business_id=? AND creator_id=?',(body.draft_id,business_id,user['id'])).fetchone()
                if not draft:
                    fail(404,'NOT_FOUND','Черновик табылмады.')
                if draft['consumed_operation_id']:
                    fail(409,'DRAFT_USED','Бұл черновик бұрын сақталған. Тарихты тексеріңіз.')
                if draft['expires_at']<utcnow():
                    fail(409,'DRAFT_EXPIRED','Черновиктің мерзімі өтті. Қолмен енгізіңіз немесе қайта талдаңыз.')
                db.execute('UPDATE drafts SET consumed_operation_id=? WHERE id=?',(row['id'],body.draft_id))
            columns=','.join(row)
            db.execute(f'INSERT INTO operations ({columns}) VALUES ({",".join("?" for _ in row)})',list(row.values()))
            result={'operation':row,'sale_balance_minor':balance(db,business_id,sale_id=row['sale_id']),'customer_balance_minor':balance(db,business_id,customer_id=row['customer_id']) if row['customer_id'] else 0,'created_at':row['created_at']}
            db.execute('INSERT INTO idempotency VALUES (?,?,?,?)',(business_id,key,request_hash,json.dumps(result)))
            return result

    @app.post(prefix+'/operations')
    def create_operation(business_id:str,body:Operation,user=Depends(member),idempotency_key:str|None=Header(default=None)):
        return save_operation(business_id,user,idempotency_key,body=body)

    @app.post(prefix+'/operations/{operation_id}/reverse')
    def reverse(business_id:str,operation_id:str,user=Depends(member),idempotency_key:str|None=Header(default=None)):
        return save_operation(business_id,user,idempotency_key,reverse_id=operation_id)

    @app.get(prefix+'/summary')
    def summary(business_id:str,date:date,user=Depends(member)):
        tz=ZoneInfo('Asia/Almaty')
        start=datetime.combine(date,datetime.min.time(),tzinfo=tz).astimezone(timezone.utc).isoformat()
        end=datetime.combine(date+timedelta(days=1),datetime.min.time(),tzinfo=tz).astimezone(timezone.utc).isoformat()
        with transaction(db_path) as db:
            totals=db.execute('SELECT COALESCE(SUM(sales_delta_minor),0), COALESCE(SUM(receipts_delta_minor),0) FROM operations WHERE business_id=? AND created_at>=? AND created_at<?',(business_id,start,end)).fetchone()
            return {'date':date.isoformat(),'timezone':'Asia/Almaty','currency':'KZT','sales_minor':totals[0],'receipts_minor':totals[1],'outstanding_minor':balance(db,business_id),'new_inquiries_count':0}

    @app.post(prefix+'/drafts')
    async def draft(business_id:str,text:str|None=Form(None),audio:UploadFile|None=File(None),locale:str=Form('auto'),user=Depends(member)):
        rate_limit('ai:'+user['id'],10)
        if bool(text and text.strip()) == bool(audio) or locale not in ('auto','ru','kk'):
            fail(422,'INVALID_INPUT','Тек мәтін немесе тек аудио жіберіңіз.')
        if text and len(text)>10000:
            fail(422,'TEXT_TOO_LONG','Мәтін тым ұзын.')
        data=None
        if audio:
            try:
                data=await audio.read(8*1024*1024+1)
                if len(data)>8*1024*1024:
                    fail(413,'AUDIO_TOO_LARGE','Аудио 8 МБ-тан аспауы керек.')
                if (audio.content_type or '').split(';')[0] not in ('audio/webm','audio/mp4','audio/ogg','audio/wav','audio/x-wav','audio/mpeg','audio/mp3','audio/flac','audio/aac','audio/x-m4a'):
                    fail(415,'AUDIO_UNSUPPORTED','Аудио форматы қолдау таппайды.')
                try:
                    data=await run_in_threadpool(ai.normalize_audio,data)
                except Exception:
                    fail(415,'AUDIO_UNSUPPORTED','Аудио оқылмады немесе 30 секундтан ұзын. Қысқа жазба не мәтін жіберіңіз.')
            finally:
                await audio.close()
        try:
            extracted=await ai.extract(app.state.ai_key,app.state.ai_model,text=text,audio=data)
            extracted=Extraction.model_validate(extracted)
        except ai.AIUnavailable as e:
            fail(503,'AI_UNAVAILABLE',str(e))
        except (asyncio.TimeoutError,TimeoutError):
            fail(504,'AI_TIMEOUT','AI күту уақыты аяқталды. Мәтін сақталды, қолмен енгізуге болады.')
        except ValidationError:
            fail(502,'AI_INVALID_RESPONSE','AI жарамсыз жауап берді. Қолмен енгізіңіз немесе қайта көріңіз.')
        except Exception:
            fail(503,'AI_UNAVAILABLE','AI қызметі қолжетімсіз. Сервердегі API кілтін, модельді және квотаны тексеріңіз.')
        result=extracted.model_dump()
        # Candidate UUIDs come exclusively from this business, never from the model.
        with transaction(db_path,True) as db:
            people=[dict(c) for c in db.execute('SELECT * FROM customers WHERE business_id=?',(business_id,)).fetchall()]
            query=(extracted.customer_query or '').casefold().strip()
            candidates=[c for c in people if query and (query in c['display_name'].casefold() or c['display_name'].casefold() in query)]
            ids={c['id'] for c in candidates}
            open_sales=[s for s in operation_list(db,business_id,True) if s['customer_id'] in ids] if extracted.kind=='repayment' else []
            result.update(id=str(uuid4()),customer_candidates=candidates,sale_candidates=open_sales,expires_at=(datetime.now(timezone.utc)+timedelta(minutes=30)).isoformat())
            required=['total_minor','received_minor'] if extracted.kind=='sale' else ['amount_minor'] if extracted.kind=='repayment' else ['kind']
            for field in required:
                if not result.get(field) and not (field=='received_minor' and result.get(field)==0):
                    if field not in result['missing_fields']:result['missing_fields'].append(field)
            if extracted.kind=='sale' and extracted.received_minor is None:
                result['questions'].append('Қанша ақша алдыңыз? Төлемді нақтылаңыз.')
            if query and len(candidates)!=1:
                result['questions'].append('Клиентті тізімнен таңдаңыз немесе жаңа клиент қосыңыз.')
            if extracted.kind=='repayment' and len(open_sales)!=1:
                result['questions'].append('Қай сатылымның қарызы өтеледі? Ашық сатылымды таңдаңыз.')
            db.execute('INSERT INTO drafts VALUES (?,?,?,?,?,NULL)',(result['id'],business_id,user['id'],json.dumps(result),result['expires_at']))
        return result

    return app


app=create_app()
