# Регистрация и подтверждение email: контракт общего окружения

Согласование backend/integration для владельца PR #43, 2026-10-17. **Контракт следующего этапа, не включённая регистрация.** PR #43 `eba0f911682e03ce2207c9d71eb4939b236a5ea9` остаётся отдельно от recovery/polish; callback и полный живой email-сценарий пока не приняты. Ни настроек Supabase, ни рассылки писем этот документ не применяет.

## Один проект и постоянные адреса

| Настройка | Значение / назначение |
|---|---|
| Общий Supabase Project URL | `https://pdjjdqgoitnkpgkbqjtp.supabase.co` |
| Frontend `VITE_SUPABASE_URL` | Тот же Project URL; не Dashboard, REST endpoint или ссылка другого участника |
| Frontend `VITE_SUPABASE_PUBLISHABLE_KEY` | Публичный ключ **этого** проекта из текущей конфигурации; серверные ключи не нужны |
| Backend `SUPABASE_URL` | Тот же Project URL |
| Backend JWT issuer | `https://pdjjdqgoitnkpgkbqjtp.supabase.co/auth/v1` |
| API / версия | `https://qadamx-taraz.onrender.com/api/v1`, **0.6.2** |
| Site URL | `https://qadamx-taraz.vercel.app` |
| Единственный production callback | `https://qadamx-taraz.vercel.app/auth/callback` |
| Успешное назначение | `/seller`; дальше существующая проверка `/me` и memberships |

Backend сохраняет текущую проверку JWT/JWKS/audience и memberships. JWT проекта другого участника не принимается. Создание точки, invitation, автоматический seed и demo-memberships сюда не входят.

## Механизм для реализации владельцем frontend

1. Один существующий Supabase client/AuthProvider, без второго login/router. При реализации callback явно включить `flowType: "pkce"`; сохранить `detectSessionInUrl: false`, чтобы код обменивал только обработчик callback, а не одновременно SDK и компонент.
2. `signUp({email,password,options:{emailRedirectTo: CALLBACK}})` и `resend({type:"signup",email,options:{emailRedirectTo: CALLBACK}})` используют один фиксированный production callback. `session:null` означает ожидание подтверждения, а не вход. Email/пароль не сохранять в recovery/localStorage вручную; SDK хранит свой verifier/session штатно.
3. Письмо «Confirm signup» сохраняет штатную Supabase `ConfirmationURL` (verify URL с учётом redirect), а не прямую ссылку на `/seller`. Не менять template/SMTP/TTL вслепую: капитан сначала фиксирует текущие значения и проверяет фактическую доставку/шаблон в отдельном этапе.
4. `/auth/callback` доступен без seller guard. Обработчик разбирает один `code` либо фиксированные ошибки Auth. Обмен через `exchangeCodeForSession(code)` выполняется один раз, с общим single-flight на StrictMode/remount; callback не создаёт собственного access token. Не включать параллельный implicit/token_hash механизм.
5. Code и provider error description не показывать в UI/логах. После захвата параметров убрать query/hash через replaceState; хранить code только в памяти текущей попытки. На время обмена показывать ожидание; после успешной сессии проверять настоящий `/me`, затем `navigate('/seller',{replace:true})`. Только локальное фиксированное назначение: произвольный `next`/внешний redirect запрещён.
6. При сетевом или неизвестном результате не повторять code exchange автоматически. Сначала проверить текущую SDK-сессию и `/me`; если достоверной сессии нет, предложить обычный вход или явный повтор отправки письма. Не очищать существующую чужую/новую сессию из позднего callback; привязать завершение к текущей auth generation.

Одноразовый PKCE code требует сохранённого verifier того же браузера/устройства; срок code exchange не равен сроку email-ссылки. Не включать экспериментальную поддержку overlapping flows ради этого MVP. [Официальный PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow).

## Site URL и redirect allowlist

Перед настройкой капитан сохраняет текущие Site URL, allowlist и шаблон без токенов/ключей. **Добавить точный** `https://qadamx-taraz.vercel.app/auth/callback`, сохранив уже согласованные callback мобильного клиента и другие действующие URLs. Site URL сверить со значением выше; изменения только после отдельного согласования владельца общего Auth.

Не добавлять `https://*.vercel.app/**`, произвольные туннели или localhost в production allowlist. Для отдельного тестового preview согласовать его точный HTTPS callback и окружение заранее; порт localhost сам по себе не доступен на другом ПК. Redirect URL и `emailRedirectTo` должны совпадать с выбранным окружением. [Официальные redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## Состояния и ошибки

| Ситуация | Поведение frontend |
|---|---|
| SignUp требует подтверждения | Нейтральное «Проверьте почту», явный resend с обработкой server rate limit; не раскрывать наличие аккаунта |
| Успешный callback + валидный `/me` | Существующий кабинет; только свои точки |
| Валидный `/me` с `businesses: []` | «Ожидается подключение торговой точки», Refresh и Logout; не Demo, не error, не автоматически первая чужая точка |
| `/me` 401 | Вход/истёкшая сессия; не маскировать под отсутствие точек |
| `/me` сеть/403/404/500/невалидный200 | Явная ошибка и безопасный GET retry; не пустые данные и не создание memberships |
| `otp_expired`, использованная/недействительная ссылка | Нейтральное «Ссылка недействительна или уже использована»; кнопки входа и явного resend. Не утверждать точную причину только по общему коду |
| Повторно открыт callback, уже есть валидная сессия | Проверить `/me`, перейти к своему кабинету без второго exchange и без смены личности по параметрам ссылки |
| Другой браузер/устройство, verifier отсутствует | Объяснить необходимость исходного браузера либо обычного входа после подтверждения email; не объявлять автоматический вход успешным |
| Callback без code и без сессии | Понятное сообщение и вход; не цикл redirect и не автоматическая отправка писем |

Состояние без точки — текущий серверный ответ, не новый endpoint. Пример тела `GET /me` брать из [OpenAPI](openapi.json), с пустым массивом `businesses`; другие обязательные поля сохраняются. Штатный password sign-in остаётся существующим механизмом. [Supabase Password Auth](https://supabase.com/docs/guides/auth/passwords).

## Gate включения PR #43

Владелец frontend реализует этот callback в своей ветке; капитан отдельно подтверждает конфигурацию общего проекта. Прежде чем включать регистрацию в production, нужны реальные email confirmation → SDK session → HTTP `/me`, новый пользователь без membership, login/reload/logout, истёкшая/повторная ссылка и другой браузер. Синтетические тесты и включённый provider email не доказывают доставку письма или полный сценарий. Существующие A/B не регистрировать заново и не менять их memberships. До прохождения gate PR #43 остаётся Draft и вне совместного релиза.
