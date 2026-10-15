# Тексеру нәтижесі — 2026-10-15

## Орындалды

| Тексеру | Нәтиже |
|---|---|
| `npm.cmd test` | 14 тест өтті |
| `.venv/Scripts/python.exe -m pytest backend -q` | 25 тест өтті |
| `.venv/Scripts/python.exe -m pip check` | Тәуелділік қайшылығы жоқ |
| `npm.cmd run build` | Production жинағы сәтті |
| `npm.cmd run dev` | FastAPI және Vite бірге іске қосылды |
| `GET http://127.0.0.1:5173/seller/sale` | HTTP 200 |
| `GET /api/v1/health` Vite proxy арқылы | HTTP 200, status=ok |
| Сеанссыз `GET /api/v1/me` | HTTP 401, AUTH_REQUIRED |
| Жарамсыз аккаунтпен `POST /api/v1/auth/login` proxy арқылы | HTTP 401, INVALID_CREDENTIALS |

Backend тесттері нақты FastAPI маршруттарын және жеке уақытша SQLite базаларын пайдаланды. Тіркелу/кіру/шығу, Argon2 хэші, cookie қасиеттері, сеанс мерзімі, аккаунттар мен клиенттерді бөлу, CSRF Origin, rate limit, тиын валидациясы, идемпотенттілік, бір қарызға қатар келген төлем, түзету тарихы, черновик мерзімі және бір рет қолданылуы, пагинация, Алматы күні мен барлық уақыттағы қарыз тексерілді.

Ақша сценарийі: сатылым **3 000 ₸**, бастапқы төлем **1 000 ₸**, қосымша төлем **500 ₸** → сатылым **3 000 ₸**, түскені **1 500 ₸**, қарыз **1 500 ₸**. Сервердің қайта құрылуынан кейін база нәтижесі сақталғаны тексерілді.

Gemini SDK сұрауының сериализациясы HTTPX MockTransport арқылы тексерілді. Тест бастапқы `exclusiveMinimum` схемасының SDK-мен сәйкессіздігін тапты; бүтін тиын үшін `minimum=1` қолданылып, қайта тексеру өтті.

Аудио декодтау нақты PyAV арқылы тексерілді: жасанды WAV оқу/моно WAV-қа қалыптау, бұзылған аудионы, 31 секундтық аудионы және 8 МБ-тан үлкен файлды қабылдамау. Мәтін мен аудионы бір уақытта жіберу қабылданбайды.

Frontend API клиенті cookie жіберуді, Idempotency-Key/дененің берілуін, белгісіз сақтау нәтижесін, 401 кезінде қайта кіруді, аккаунтқа бөлек pending кілттерін және барлық тізім беттерін алуды тексерді.

Тест кезінде Starlette-тің HTTPX test client туралы deprecation ескертуі, Vite-де тәуелділіктердің `use client` ескертулері болды; олар тесттер мен жинақты тоқтатпады.

## Орындалмаған тексерулер

- **Live Gemini check (2026-10-15):** The supplied key was configured in ignored backend/.env. Fixed SDK schema serialization to use responseJsonSchema. Live requests returned HTTP 503 (high demand) and HTTP 504 (deadline expired). Successful extraction and real speech recognition remain unverified. Backend regression suite: 25 passed.
- **Браузердегі визуалды және батырмалар арқылы end-to-end тексеру:** Browser құралы `No browser is available`, браузерлер тізімі `[]` қайтарды. HTTP 200 визуалды тексерудің орнына есептелген жоқ.
- **Нақты микрофон, мобильді құрылғы, шулы орта:** адам сөйлеуі жазылмады. WAV тесттері нақты сөйлеуді танудың дәлелі емес.
- **Live Gemini check (2026-10-15):** The supplied key was configured in ignored backend/.env. Fixed SDK schema serialization to use responseJsonSchema. Live requests returned HTTP 503 (high demand) and HTTP 504 (deadline expired). Successful extraction and real speech recognition remain unverified. Backend regression suite: 25 passed.
- **Өндірістік жария орналастыру:** жасалған жоқ. Жоба жергілікті серверде тексерілді.

## Қалған сыртқы қадамдар

1. The server API key is configured locally; restart the server and retry a short AI draft after the provider recovers. Source archives intentionally do not contain the key.
2. Браузер байланысын қосып немесе өз браузеріңізде README-дегі сату → төлем → қорытынды сценарийін орындау.
3. Қазақша және орысша қысқа дауысты байқап, AI дайындаған сомалар мен клиенттерді растауға дейін тексеру.

## Follow-up fixes

- Browser storage failures no longer leave save/reversal controls locked; writes fail before sending a new operation.
- Uncertain money operations retain their idempotency keys across expired sessions.
- Pending retries do not require another browser-storage write.
- Recorder lifecycle is reset on effect setup.
- Validation: 14 frontend tests, 25 backend tests, production build passed.
- Live Gemini success and browser visual checks remain unverified as described above.
