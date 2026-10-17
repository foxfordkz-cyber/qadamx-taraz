# Передача APK0.2.2+5: проверенный артефакт, Android-приёмка отдельно

2026-10-17. PR45 **cbb4d0c3ad71d661d3b9c1391443caf7daa0340c**, исходники APK **96ef1c42ba341dc9fcdc6539d9ee499ab797c178**. Ветка основана на main8ee78ae. Diff: версия pubspec0.2.1+4→0.2.2+5 и шесть документов/артефактов; backend/web-код не меняет. Этот PR оставлен отдельно до приёмки устройства, старый APK не собирался.

[Release mobile-v0.2.2-hosted.1](https://github.com/foxfordkz-cyber/qadamx-taraz/releases/tag/mobile-v0.2.2-hosted.1), [APK](https://github.com/foxfordkz-cyber/qadamx-taraz/releases/download/mobile-v0.2.2-hosted.1/qadam-0.2.2-96ef1c4-debug.apk).

- Версия **0.2.2+5**, internal debug build, не магазинная публикация.
- Скачан именно опубликованный файл: **167895465 bytes**.
- Самостоятельно вычислен SHA-256 **6b34d1f7abd01bea036fb02a2d1898f8905dd18b9e0d6d9577a88138b79bcf8f**, совпал с GitHub asset digest и авторским отчётом.
- В распакованных ZIP entries найдены ожидаемые публичные API/Frontend/Supabase URL и publishable key общего проекта; старых trycloudflare ссылок0, приватных env/config-файлов0, известных серверных секретов/шаблонов ключей0. Значения секретов не публиковались.
- Подпись и7config-тестов — результат **автора PR45**; собственная проверка этого этапа — скачивание/hash/config inspection, без пересборки/установки.

Конфигурация: `API_BASE_URL=https://qadamx-taraz.onrender.com/api/v1`, `FRONTEND_BASE_URL=https://qadamx-taraz.vercel.app`, `SUPABASE_URL=https://pdjjdqgoitnkpgkbqjtp.supabase.co`, publishable key того же проекта. API **0.6.2**, серверные переменные разработчику не нужны. Старые APK с туннелями не использовать. Ссылка витрины обновляется на этот **тестовый** выпуск, без утверждения готовности Android.

Нативны оболочка, Supabase Auth, выбор своей точки и Мал базар. CRM (клиенты/recovery/учёт/аналитика/заявки/AI) открывается через `LaunchMode.externalApplication` в системном браузере. Это отдельная браузерная сессия: вход в Flutter не гарантирует вход на сайте; токен не передаётся в URL. Регистрация нативно не включена.

Участник с устройством устанавливает этот APK, фиксирует модель телефона/Android/версию/hash и проходит: A→свои точки→браузерный кабинет (при необходимости отдельный вход); Logout→B/изоляция; камера/галерея→фото→учебная публикация; статусы/«Есть сегодня»/«Продано»; перезапуск и восстановление сессии/потеря сети. Только явно учебные данные, без публикации паролей/токенов. [Протокол автора](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/cbb4d0c3ad71d661d3b9c1391443caf7daa0340c/apps/mobile/docs/ANDROID_TEAM_HANDOFF.md).

**Физическая Android-приёмка не завершена:** результатов устройства нет. HTTP/Chrome/проверка ZIP не заменяют установку, камеру и session lifecycle Android. Это не блокирует независимую web-форму; новый APK этим web-выпуском не создаётся.
