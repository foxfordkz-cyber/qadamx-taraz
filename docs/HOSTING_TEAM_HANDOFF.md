# Передача постоянных адресов: тексты капитану

16 октября 2026. Эти тексты подготовлены, **не отправлены участникам**. Источник результатов: [HOSTING_AI_ACCEPTANCE](HOSTING_AI_ACCEPTANCE.md). Опубликованные адреса уже отвечают, но полный набор hosting/устройств ещё не принят. Health0.6.2 и git head не заменяют actual deployment SHA.

## Капитан / backend

> Web https://qadamx-taraz.vercel.app, API https://qadamx-taraz.onrender.com/api/v1. Source deployment0f97c44 по вашей передаче; нужно сохранить Render Live deployment ID/commit и Vercel alias deployment ID. OpenAPI0.6.2, Supabase0006; ничего повторно мигрировать/seed не требуется. OpenAI-primary подтверждён логом gpt-transcribe200 и новыми успешными hosted text/audio probes; точный extraction model и fallback финально зафиксировать по Environment/ai_stage без секретов. Остаток тестового защитного резерва$0.20, дальнейшие пробы не запускать автоматически. Полного billing нет. Сохранить старые туннели до завершения приёмки и разрешения pending запросов на старом origin.

Следующие проверки backend отдельно: original recording.webm incident, SSL именно Render, финансовые дельты+replay и фото через512MB Render, подтверждённый холодный старт. Диагностический patch этой ветки не развернут. Для него заранее сохранить0f97c44/активный Environment, не менять БД/Storage/Auth, при необходимости вернуть прежний0.6.2 hosting commit. Не откатывать recovery на raw0.6.1.

## Бекзат: customer recovery

> Последний fetch обнаружил новое исправление: `fix/seller-cabinet-reliability` теперь **9a3c868**, код **50ea34d** поверх прежнего fd21874. Автор добавил scope API URL/user/business и повторное чтение сохранённого intent перед отправкой из обеих форм. Diff прочитан; в этот hosting runtime изменения не включались. Автор сообщает 213 unit и 22 E2E с заглушками — здесь они повторно не запускались, живая приёмка исправления ещё нужна. Вторую реализацию не назначаем.

Следующая отдельная проверка: CustomerPicker с потерянным ответом → уже смонтированная страница клиентов → те же key/body; reload, A/B-A, переход между API origins. Особенно проверить миграцию legacy intent без записанного API origin: нельзя автоматически отправить старую неизвестную операцию в другой backend. Сохранить актуальные generated types и Auth fences общей интеграции. [Воспроизведение](qa/customer-recovery-picker-regression.patch), [контракт 0.6.2](../packages/contracts/CUSTOMER_RECOVERY_API.md). В общей истории есть revert6072cc6; merge прежнего head сам по себе его не отменяет. Исправленный head требует отдельной интеграционной приёмки перед публикацией на Vercel.

## Бекзат: контракт email callback на постоянном web

PR31 `10d9bbad02df72ccbc8cfc33725327a72c86783a` не входит в текущий hosting build целиком: включён ранний c2a9402, поздний signup/callback ожидает приёмки. Следующее — **конкретное предложение для согласования владельцем**, а не уже применённая настройка Supabase:

1. Один существующий AuthProvider/client и общий router. Route **`/auth/callback`**. Явный `flowType: "pkce"`, `detectSessionInUrl: false`; persistSession/autoRefreshToken сохранить. Не добавлять второй client/login.
2. `signUp` и явный `resend({type:"signup"})` передают `emailRedirectTo: "https://qadamx-taraz.vercel.app/auth/callback"`. SDK-контракт проверять на установленной версии. `session:null` означает ожидание письма, не успешный вход.
3. Supabase Site URL **`https://qadamx-taraz.vercel.app`**. Обязательный Redirect URL — **только `https://qadamx-taraz.vercel.app/auth/callback`**. `/login`, `/seller` и Flutter custom scheme не добавлять как callback этой задачи. Нет wildcard `*.vercel.app`, `*.trycloudflare.com`, произвольного next URL. Локальный callback добавлять отдельным точным URL после согласования фактического dev origin; не включать его догадкой.
4. Callback получает единственный `code`, вызывает SDK `exchangeCodeForSession` **один раз** с single-flight защитой от React StrictMode/повторного mount. Удалить code/error из адреса; не писать полный URL, код или токены в логи/analytics. Отображать только известные локализованные ошибки, не raw provider text. Не хранить code в durable storage.
5. После подтверждённой session → `GET /me` → `/seller`; ноль memberships → имеющееся состояние без точек, refresh/logout. Никаких автоматических demo memberships, создания точки или приглашений.
6. Истёкший/повторный code, отсутствующий verifier при открытии в другом браузере, повреждённая ссылка, SDK/network error: безопасный экран с обычным login/явным resend. Не обещать автоматический вход в другом браузере и не сбрасывать чужую уже действующую сессию. Return/next только фиксированный внутренний маршрут. Logout очищает private cache; stale callback A не применяет данные в B.
7. Before rollout: проверить current SiteURL/allowlist, включённое email confirmation, шаблон с корректной ConfirmationURL, реальную доставку/SMTP/quota, ожидание/reload, expired/reuse и другой браузер. Resend с cooldown, neutral duplicate-email UX. Не отправлять настоящие письма без согласованного учебного адреса и разрешения.

[Supabase PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls). Настройки Supabase этим этапом не менялись, регистрация с письмом не проверена. Капитан передаёт контракт владельцу frontend; параллельный signup не реализуется.

## Айдана: PR32

> Runtime `713f00f0450ddc1f0e6d10727270ef8e9f3602bb` уже входит в b899902/cacf57a/0f97c44. Новый `7c19a22` — handoff/patches, не новая функциональность; прочитан без повторного merge старой ветки. Hosted UI теперь проверил реальный draft/unknown payment/clarification/manual edit, без подтверждения денег. Cancel/late response и ошибка проверены с явной подстановкой browser response; физический микрофон ещё отдельно. Не объединять повторно весь voice prerequisite patch.

## Дизайн / assets

> Цепочка PR24 e5ef1de →26 d91e3a5 →27 1c8756d →29 3765ddb уже включена одним merge. Camera projection fix b899902 сохранён. Новые GLB не принимались, ветки художника не менялись. Проверять модели визуально в браузере после загрузки, а не по HTTP200. Локальные результаты предыдущего этапа не выдавать за новые результаты Vercel.

## Flutter: PR25 / 421b2fb

Проверены README/config-контракт `feature/mobile-qadam-shell` **421b2fb9f9a44e83e4b7a5ec72ef30404df5211b**, ветка не менялась. Для игнорируемого `apps/mobile/config/public.local.json`:

```json
{
  "API_BASE_URL": "https://qadamx-taraz.onrender.com/api/v1",
  "SUPABASE_URL": "https://pdjjdqgoitnkpgkbqjtp.supabase.co",
  "SUPABASE_PUBLISHABLE_KEY": "sb_publishable_w17k2VDn1gf_Jr8hoXhGeQ_-T9NRnfz",
  "FRONTEND_BASE_URL": "https://qadamx-taraz.vercel.app"
}
```

API_BASE_URL содержит `/api/v1`; FRONTEND_BASE_URL — origin без пути. Это публичный publishable key, не серверный секрет. API **0.6.2**, [живой OpenAPI](https://qadamx-taraz.onrender.com/openapi.json), [LIVESTOCK_API](../packages/contracts/LIVESTOCK_API.md), [JSON-примеры](../packages/contracts/examples.json). Включены market/market_key и minimum_price_minor; минимум только подходящих активных подтверждённых сегодня не-demo предложений, отсутствие данныхnull. API0.6.2 добавляет customer recovery без несовместимой замены livestock0.6.1.

```powershell
cd apps/mobile
flutter pub get
flutter analyze
flutter test
./tool/build_android.ps1 -PublicConfig config/public.local.json
```

Уже установленный APK содержит старый compile-time URL: изменить файл недостаточно, нужна пересборка/установка. Сначала разрешить старые pending операции на их исходном адресе; запрет повторять их новым ключом/URL. Не удалять защищённое pending-хранилище ради смены окружения. Учебный аккаунт получить лично у капитана через закрытый канал/менеджер паролей; пароль вводится в login, токены/серверные ключи не входят в config.

Checklist **на устройстве**, ещё не выполненный агентом: интернет вне сети капитана → health/feed → login/me/свои точки → мои объявления → фото/upload/read/replay → чужой404 → logout/B → pending/reload → открытие web `/seller` через системный браузер без передачи JWT → отдельный web login. Отдельно камера/микрофон Android и iOS-подпись на Mac. Render Free может просыпаться после простоя; показать ожидание/явный retry, не пустые успешные данные и не новый idempotency key. Постоянные домены не требуют включённого ПК капитана; текущие резервные туннели требуют.
