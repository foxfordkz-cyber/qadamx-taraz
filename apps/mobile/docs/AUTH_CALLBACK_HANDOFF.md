# Mobile Auth: согласование возврата из письма

Состояние17.10.2026: владелец PR43 [предложил точные mobile URI](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/43#issuecomment-6236287234).
Mobile принимает эти URI для контракта. **Это согласование следующей реализации,
не выполненная настройка Supabase и не возможность APK0.5.2.**

| Назначение | Точный адрес |
|---|---|
| Flutter signup / resend, PKCE | `kz.qadam.mobile://auth/callback` |
| Flutter password recovery | `kz.qadam.mobile://auth/recovery` |
| Web callback владельца43 | `https://qadamx-taraz.pages.dev/auth/callback` — только web, не мост во Flutter |

Android package: `kz.qadam.qadam_mobile`; собственная схема callback не переименовывает package.
Mobile владеет точными Android intent-filter и iOS URL Types, native handler, холодным/тёплым
запуском и обработкой сессии. Капитан владеет Supabase exact redirect allowlist, Site URL
и email template. Existing allowlist не удаляется; широкие wildcard не предлагаются.
App Links/AASA/assetlinks не подменяют эту договорённость без отдельного владельца/подписи.

## Поведение согласованного сценария

- Существующий единственный Supabase SDK, PKCE. Пароль не сохраняется вручную,
  verifier/session обслуживает SDK с защищённым мобильным хранилищем.
- Signup и resend отправляют ровно callback выше. Session:null — ожидание письма,
  не вход. Ни демо-membership, ни бизнес автоматически не создаются.
- URI принимается только при точном scheme/host/path. Только одно выполнение обмена
  для исходной попытки: SDK handler и ручной exchange одновременно не запускать.
  Код/URI письма, verifier, JWT и пароль не выводить в UI/логи/отчёт.
  Access/refresh tokens и пароли через URL/web-мост не передаются.
- Привязка к исходному auth generation; позднее письмо/ответ не заменяет более новую
  сессию. A→B и смена точки очищают приватный UI, не переотправляют pending другого scope.
- После подтверждённой сессии — настоящий GET /me; zero-membership показывает email,
  ожидание, refresh/logout. Ошибка сети/401 не подменяется пустым списком.
- При неизвестном результате обмена нет автоматического повторного code exchange.
  Сначала проверить SDK session и /me; затем обычный вход или явный resend.
- Recovery открывает отдельную форму смены пароля только после PASSWORD_RECOVERY,
  не обычный кабинет. Новый пароль меняет SDK после явного действия пользователя.
- Письмо другого устройства без исходного verifier не объявляет авто-вход успешным.
  Повторная/просроченная ссылка имеет нейтральное состояние и ручной путь.
- Фактические signup, письмо, cold/warm return, resend, recovery, повторная ссылка,
  другой verifier, /me, login/reload/logout проверяются отдельно на устройстве.

## Что есть в APK0.5.2

Только прежние password sign-in, SDK refresh/restoration/local logout,
выбор доступной точки и изоляция pending. Intent-filter/URL Types для предложенных
URI и регистрационные экраны в этот APK **не включены**. Учётные данные/секреты
не запрашиваются для согласования публичного контракта.

## Открытые условия

1. Капитан подтверждает применение двух exact mobile URI в общей allowlist, сохранив web.
2. Владелец43 фиксирует взаимное принятие в общем Auth-контракте.
3. Mobile реализует handler/screens с тестами cold/warm/epoch/single-flight и безопасным recovery.
4. Настоящее письмо возвращает в установленное приложение с проверенным /me;
   физическая приёмка и подписанный APK новой версии публикуются отдельно.

Исходники0.5.2 и его checksum не меняются от публикации этого документа.
