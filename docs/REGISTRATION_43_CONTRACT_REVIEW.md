# PR43: проверка реализации по уже согласованному контракту

2026-10-17, head **eba0f911682e03ce2207c9d71eb4939b236a5ea9** не изменился. Контракт [REGISTRATION_CALLBACK](../packages/contracts/REGISTRATION_CALLBACK.md) уже принят в main8ee78ae; заново выбирать механизм или callback не требуется. PR43 в этот выпуск **не входит**, параллельная реализация не создаётся.

| Требование | Реализация PR43 / статус |
|---|---|
| Один общий Supabase | Использует существующий AuthProvider/client; проверяет форму URL; для общего backend нужен только проект pdjjdqgoitnkpgkbqjtp |
| SignUp/resend, session:null | Есть ожидание подтверждения, защита double submit, RU/KZ; session:null не объявляется входом |
| `/auth/callback` | **Нет маршрута** в App.tsx |
| PKCE | `flowType:"pkce"` **не задан**, оставлены defaults; `detectSessionInUrl:false` |
| Redirect для signup/resend | `emailRedirectTo`/resend redirect **не передаются** |
| Однократный code exchange | **Нет** обработчика exchangeCodeForSession/single-flight/generation guard callback |
| `/me` и отсутствие точек | Существующие guards/error distinction/no-business/Refresh/Logout сохранены; автоматического demo-membership нет |
| Expired/reused/other browser | Callback не реализован, реальные сценарии не пройдены |

По текущей публичной `/auth/v1/settings`: email provider включён, `disable_signup:false`, `mailer_autoconfirm:false`, `phone_autoconfirm:false`. Это подтверждает необходимость email confirmation, **но не доказывает Site URL, redirect allowlist, шаблон письма или доставку**. Read-only снимок публичных полей сохранён в артефактах выпуска. Новые письма/аккаунты не создавались.

## Точное применение настроек после готовности кода

Общий проект: `https://pdjjdqgoitnkpgkbqjtp.supabase.co`. Желаемый Site URL: `https://qadamx-taraz.vercel.app`. Точный callback: `https://qadamx-taraz.vercel.app/auth/callback`; успешное назначение `/seller` с проверкой настоящего `/me`, пустой businesses → ожидание подключения и Logout, без выдачи точек.

1. Владелец frontend реализует PKCE/callback по существующему контракту, один exchange, error/expired/reused/other-browser поведение. Не включать незавершённый signup на production.
2. Капитан/администратор общего проекта **перед изменением** экспортирует текущие Site URL, список redirect URLs, template Confirm signup и настройки confirmation/TTL/resend без секретов. В этом окружении нет management-авторизации Supabase; публичный endpoint этих значений не отдаёт. Их текущие значения **не известны**, нельзя назвать их сохранёнными или утверждать, что нужный URL уже добавлен.
3. Сверить Site URL с указанным; добавить точный callback в allowlist **с сохранением** всех действующих согласованных URL/mobile callbacks. Не заменять весь список, не добавлять wildcard. Не отключать email confirmation. Сохранить штатный ConfirmationURL template; SMTP/TTL не менять без конкретной необходимости и зафиксированных исходных значений.
4. В signup/resend использовать точный emailRedirectTo, как в контракте. Проверить письмо в согласованном тестовом ящике: confirmation→SDK session→`/me`,0memberships, повтор/истечение ссылки, reload/logout и другой браузер.

**Чего не хватает:** прежде всего реализации callback у автора PR43; для последующего применения — read/write доступ администратора к Auth URL Configuration либо выполненный капитаном snapshot и настройка, затем доступ владельца тестового ящика/результаты настоящего письма. Не нужен DATABASE_URL, server key или новый Supabase-проект. Эти блокеры не препятствуют независимому выпуску заявки. Настройки общего Auth этой задачей не изменялись.
