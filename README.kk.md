<p align="center">
  <img src="docs/assets/readme/banner-kk.svg" alt="Qadam Business — дауыспен сату, қарыздар бақылауда" width="100%">
</p>

<p align="center"><a href="README.md">Русский</a> · <b>Қазақша</b></p>

<p align="center">
  <a href="https://qadamx-taraz.pages.dev"><img src="https://img.shields.io/badge/%D0%A1%D0%B0%D0%B9%D1%82-qadamx--taraz.pages.dev-164C3E?style=for-the-badge" alt="Сайт"></a>
  <a href="https://qadamx-taraz.onrender.com/api/v1/health"><img src="https://img.shields.io/badge/API-0.6.3-D7F36A?style=for-the-badge" alt="API"></a>
  <a href="https://qadamx-taraz.onrender.com/docs"><img src="https://img.shields.io/badge/Swagger-docs-2F6F5A?style=for-the-badge&logo=swagger&logoColor=white" alt="Swagger"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase">
  <img src="https://img.shields.io/badge/OpenAI-412991?style=flat-square&logo=openai&logoColor=white" alt="OpenAI">
  <img src="https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Three.js-000000?style=flat-square&logo=threedotjs&logoColor=white" alt="Three.js">
  <img src="https://img.shields.io/badge/Flutter-02569B?style=flat-square&logo=flutter&logoColor=white" alt="Flutter">
  <img src="https://img.shields.io/badge/Cloudflare%20Pages-F38020?style=flat-square&logo=cloudflarepages&logoColor=white" alt="Cloudflare Pages">
  <img src="https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=white" alt="Render">
</p>

**Qadam Business** — Тараз базарлары мен шағын дүкендердегі сатушыларға арналған сату, төлем және қарыз есебі, дауыспен жүргізіледі. Сатушы сатылым туралы орысша не қазақша айтады, Qadam жазбаның жобасын дайындайды, ал сатушы оны тексеріп, сақтайды.

## Сілтемелер

- **Сайт:** [qadamx-taraz.pages.dev](https://qadamx-taraz.pages.dev) — витрина және сатушы кабинеті (`/login`)
- **API:** [https://qadamx-taraz.onrender.com/api/v1](https://qadamx-taraz.onrender.com/api/v1/health), құжаттама [Swagger](https://qadamx-taraz.onrender.com/docs). Тегін сервер бір минутқа дейін оянуы мүмкін
- **Android:** Сынақ [APK 0.5.2](https://github.com/foxfordkz-cyber/qadamx-taraz/releases/download/mobile-v0.5.2-review68.1/qadam-0.5.2-79a29b9-internal.apk) (pre-release, жүктелген файлдың SHA-256 тексерілді), барлық нұсқалар — [GitHub Releases](https://github.com/foxfordkz-cyber/qadamx-taraz/releases). Телефонға орнату және қабылдау расталмаған
- **Видео:** Прогон жазылғаннан кейін қосылады

## Кімге және немен көмектеседі

Ақшаны өзі алатын және тауарды қарызға беретін сатушыға. Дәптер не жазбалардың орнына ол бір сөйлем айтады, сомаларды тексереді және кім қанша қарыз екенін бірден көреді. Сатып алушы оның нүктесін алаңдар витринасынан тауып, өтінім жібереді.

<sub>Бұл команданың болжамы: сұхбат пен зерттеу әлі жүргізілген жоқ, оны пилотта тексереміз.</sub>

## Негізгі сценарий

<table>
  <tr>
    <td width="33%" valign="top"><b>1 · Айтыңыз</b><br><br>«Асқарға үш мың теңгеге тауар бердім, мыңын төледі»</td>
    <td width="33%" valign="top"><b>2 · Тексеріңіз</b><br><br>Жоба: клиент Асқар, сатылым 3 000 ₸, төленгені 1 000 ₸, қарыз 2 000 ₸. Анық емесін Qadam сұрақпен нақтылайды</td>
    <td width="33%" valign="top"><b>3 · Жазыңыз</b><br><br>Жазба тек растаудан кейін пайда болады. Қосымша төлем 500 ₸ → қарыз 1 500 ₸, сатылым 3 000 ₸ болып қалады</td>
  </tr>
</table>

> [!IMPORTANT]
> AI тек жоба ұсынады, ақшаны өзі жазбайды. Қалдықты сервер есептейді, сомалар бүтін тиынмен сақталады. AI қолжетімсіз болса, сол экран қолмен енгізу ретінде жұмыс істейді.

## Не жұмыс істейді және не әлі қабылданбады

| Бағыт | Күйі | Не бар |
|---|---|---|
| Кіру және өз нүктелері | ✅ Жұмыс істейді | Supabase Auth, сатушы тек өз нүктелерін көреді, бөтен нүкте 404 қайтарады |
| Дауыстық және мәтіндік жоба | ✅ Жұмыс істейді | 30 секундқа дейін жазба, файл не мәтін, KZ/RU, нақтылау сұрақтары |
| Қолмен енгізу | ✅ Жұмыс істейді | AI-сыз сол форма |
| Сатылым, төлем, қарыз | ✅ Жұмыс істейді | Толық, ішінара және нөлдік төлем, қосымша төлем, тарихы сақталатын болдырмау |
| Клиенттер, тарих, күн қорытындысы, аналитика | ✅ Жұмыс істейді | Клиентті іздеу, сүзгілер, 7 және 30 күн |
| Қайталаудан қорғау | ✅ Жұмыс істейді | Идемпотентті атомарлы жазба, аяқталмаған сұраулардың бір бөлігін қалпына келтіру |
| Витрина және өтінімдер | ✅ Жұмыс істейді | Алаңдар 3D-де және тізіммен, каталог, сатушыға өтінім |
| KZ/RU интерфейсі | ✅ Жұмыс істейді | Негізгі жол және қателер. Оқу деректерінің бәрі аударылмаған |
| Flutter қосымшасы | 🟡 Сынақ APK | Алаңдар, дүкендер, CRM. Құрылғыда тексеру ашық |
| Мал базар | 🟡 Концепт | Базарлар келісімшарты дайын, анықтамалық бос, нақты баға жоқ |
| Сатушыларды тіркеу | ✅ Сайтта тексерілді | Нақты хат, жаңа аккаунт, бетті жаңарту және бұрынғы аккаунтқа қайта кіру; сауда нүктесіне рұқсат бөлек беріледі. [Тексеру нәтижесі](docs/REGISTRATION_PAGES_LIVE_20261017.md) |
| iPhone/Safari және Android | ⏳ Қабылданбады | Автотесттер бар, құрылғыда тексеру аяқталмаған |
| Пайдалылықты өлшеу | ⏳ Өткізілмеді | Қолмен енгізу мен дауысты салыстыру — келесі қадам |

## Скриншоттар

<table>
  <tr>
    <td width="50%"><img src="docs/assets/readme/sale-draft.webp" alt="Дауыс не мәтін → AI жобасы → тексеру"><br><sub>Дауыс не мәтін → AI жобасы → тексеру</sub></td>
    <td width="50%"><img src="docs/assets/readme/hero.webp" alt="Тараз алаңдарының витринасы"><br><sub>Тараз алаңдарының витринасы</sub></td>
  </tr>
  <tr>
    <td colspan="2"><img src="docs/assets/readme/venues-3d.webp" alt="Үш алаң 3D-де: Кайкармет, MART, Ауыл Береке"><br><sub>Үш алаң 3D-де: Кайкармет, MART, Ауыл Береке</sub></td>
  </tr>
  <tr>
    <td colspan="2" align="center"><img src="docs/assets/readme/debts.webp" alt="«Маған қарыз»: қалдықты сервер есептейді" width="70%"><br><sub>«Маған қарыз»: қалдықты сервер есептейді</sub></td>
  </tr>
</table>

<sub>Суреттер синтетикалық оқу деректерімен түсірілген.</sub>

## Архитектура және стек

```mermaid
flowchart LR
  Web["Сайт · React, TypeScript, Vite, Three.js"] --> API
  App["Flutter қосымшасы"] --> API
  API["FastAPI · пайдаланушы мен нүктені тексеру"] --> Auth["Supabase Auth"]
  API --> DB[("PostgreSQL · тиынмен журнал")]
  API --> AI["OpenAI · сөйлеу → жоба"]
  AI -. "жоба" .-> API
  API -. "тек растаудан кейін жазу" .-> DB
```

AI мен дерекқор кілттері тек серверде. Аудио жадта өңделеді және біздің серверде сақталмайды. Сайт Cloudflare Pages-те, API Render-де орналасқан.

```text
apps/api            FastAPI, Alembic миграциялары, AI-адаптерлер, тесттер
apps/web            витрина, сатушы кабинеті, дауыстық есеп
apps/mobile         Flutter қосымшасы
packages/contracts  OpenAPI, JSON мысалдары, келісімшарттар
docs                ТТ, шешімдер, жұмысты тапсыру, есептер, қорғау материалдары
```

## Жергілікті іске қосу

API (Python және uv, серверлік `.env` — [apps/api/README.md](apps/api/README.md) бойынша):

```bash
cd apps/api && uv sync --locked && uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Web (Node.js, жария `.env.local` — `apps/web/.env.example` бойынша):

```bash
cd apps/web && npm ci && npm run dev -- --port 5173 --strictPort
```

### Орта айнымалылары

Мәндер коммитке қосылмайды, репозиторийде тек `.env.example` үлгілері бар. API: DATABASE_URL, TEST_DATABASE_URL, SUPABASE_URL, JWT_ISSUER, JWT_AUDIENCE, ALLOWED_ORIGINS, AI_PROVIDER, AI_API_KEY, AI_MODEL, OPENAI_API_KEY, OPENAI_MODEL, OPENAI_TRANSCRIPTION_MODEL, AI_FALLBACK_OPENAI, AI_PRIMARY_TIMEOUT_SECONDS, STORAGE_SERVICE_KEY, STORAGE_BUCKET, LIVESTOCK_DEMO_MODE, DEMO_OWNER_A_SUB, DEMO_OWNER_B_SUB, DEMO_OWNER_A_TOKEN, DEMO_OWNER_B_TOKEN. Web: VITE_API_BASE_URL, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_CUSTOMER_IDS_ENABLED. `VITE_` префиксі тек жария мәндерде.

## Тексерулер және дәлелдің шекарасы

API: `uv run ruff check .`, `uv run python -m app.export_contracts --check`, `uv run pytest` (дерекқормен тесттер — тек бөлек PostgreSQL-де). Web: `npm run check:api`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`.

- Pages пен Render-дегі `8fa0029` шығарылымы: backup пен қалпына келтіруді тексергеннен кейін 0007/0008 миграциялары, A/B кіру, нүктелерді оқшаулау, тарих, аналитика. [Rollout есебі](docs/PUBLIC_DATA_MARKETS_PRODUCTION_20261017.md)
- Шығарылым есебі бойынша біріккен кодтың автотесттері: 357 backend, 395 web unit/component, өтінім, дауыс және recovery E2E
- Production-дағы бір бақылау мәтіндік AI сұрауы: HTTP 200, 4,719 с, 300000/100000 тиын, ақша жазбасы жасалмаған. Бұл бір прогон, орташа кідіріс емес
- Автотесттер телефондағы тексеруді алмастырмайды. `main` жарияланған нұсқадан алда болуы мүмкін
- `health.stage=manual-ledger` — бұрынғы қызметтік белгі: AI жоқ дегенді білдірмейді және жаңа deployment талап етпейді

## Оқу деректері және қауіпсіздік

> [!NOTE]
> Алаңдар, нүктелер, тауарлар мен клиенттер оқу мақсатында жасалған және «Демо» деп белгіленген. MART, Кайкармет және Ауыл Береке-мен серіктестік жоқ, 3D-модельдер шартты сызба. `/login` бетіндегі демо батырмасы кабинетті тек оқу режимінде ашады. Құпиялар, `.env`, клиенттердің нақты қарыздары және аудиожазбалар коммитке қосылмайды. Ортақ Supabase-те seed, миграция және тазалайтын тесттерді іске қоспаңыз.

## Команда

| Қатысушы | Рөлі |
|---|---|
| Дамир ([foxfordkz-cyber](https://github.com/foxfordkz-cyber)) | Капитан және интегратор, backend, шығарылым |
| Абзал (Abzal Sabit) | Визуал және 3D, визуалды қабылдау |
| Bekzat | Сатушы кабинеті: қаңқа, клиенттер, сұрауларды қалпына келтіру |
| Aidana | Дауыстық енгізу және аналитика |
| Tanirberdi Bolat | Flutter қосымшасы |
| gulnur0505 | Кабинеттің сенімділігі және тесттер |

<sub>Рөлдер коммиттер тарихы мен жұмысты тапсыру құжаттары бойынша көрсетілген.</sub>

Құжаттар: [Өнімнің ТТ](docs/team5/00_PRODUCT_TZ.md) · [API келісімшарты](docs/team5/02_ARCHITECTURE_API.md) · [Шешімдер](docs/DECISIONS.md) · [Ағымдағы күй](docs/PROJECT_STATUS.md) · [Қорғау материалдары](docs/pitch/PITCH.md) · [Тапсыру чек-парағы](docs/submission/DEFENSE_CHECKLIST.md) · [Шығарылымдар тарихы](docs/RELEASE_HISTORY.md) · [AI нұсқаулары](AGENTS.md) · [Git ережелері](CONTRIBUTING.md)

<p align="center"><sub>Zhambyl Hub · AI трегі · AI for SME & Local Business · 2026</sub></p>
