# PR67: независимый review мобильной аналитики

2026-10-17. Точный remote head **8da93dc48ff998230212be4f31c32944a173f53b**,
`fix/analytics-mobile-compact`, [Draft PR67](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/67).
База main **1a541efb97ca402fb8165b5841bbbeff03afd4b1**. Проверялся именно этот
commit в отдельной локальной ветке `review/analytics-compact-67`.
Код PR67 не включён в backend rollout, PR64 или production/deploy-ветки.

Блокирующих дефектов в проверенном diff не найдено. Готов к будущей совместной
frontend-приёмке; это не разрешение на текущий Vercel deploy.

## Содержание и ограничения diff

- Сохранены шесть серверных показателей, отделены период7/30 и текущий долг по
  всем датам. На≤700px две подписанные группы, без повторных scope-подписей и иконок;
  desktop сохраняет прежнюю сетку. Имена карточек доступны через aria-labelledby.
- Пустые графики сворачиваются, только если все дневные/почасовые значения нулевые.
  Компенсированные положительные/отрицательные поступления не исчезают при нулевом
  итоговом receipts. Текущий долг/действия остаются видимыми.
- Нативный details открывается клавиатурой, сбрасывается при смене точки/периода;
  ошибка не маскируется пустым отчётом. ResizeObserver отключается при unmount.
- Выбор/клавиатура/resize прокручивают график, сохраняя целые крайние подписи;
  значения денег и timezone/даты из текущего контракта не изменены.
- Runtime diff: AnalyticsPage, Charts, analytics.css, один ключ в ru/kk.
  API/backend/OpenAPI/generated, Auth/recovery, model/live/queries/demo, зависимости
  и `shared/format.ts` **без изменений**. Перенос дат в shared не включён: согласование
  с Бекзатом ожидается. Общий refactor дат не является частью принятого SHA.

## Собственные проверки этого review

| Проверка | Фактический результат |
|---|---|
| npm ci --no-audit --no-fund | PASS, lock не изменён |
| npm test -- --no-file-parallelism | **347/347**,25файлов,78.60с |
| npm run typecheck / lint / build / check:api | PASS |
| analytics-compact.spec.ts | **3/3 E2E**,18.5с; Chrome/Chromium, localhost4181 |

E2E проверил RU/KZ ×7/30 ×1440/768/700/390/360, отсутствие page overflow,
целые подписи и выбранную колонку, Home/End/стрелки и resize; Enter/Space,
summary≥44px, сброс details, пустой/ошибочный сценарии. Третий тест создал10
новых Demo-снимков; осмотрены RU390empty, KZ360active и RU1440active.
Размеры совпали с переданными автором измерениями: RU390active3589px,
KZ360active3774px, RU390empty2313px; scrollWidth равен viewport.

Синтетический Demo и API/Auth fixtures, не живые Supabase/Render, не физический
Android. Полные32/21 E2E из отчёта автора здесь заново не заявляются и не суммируются
с этими3. Полный347unit включает20analytics-ui; отдельно не прибавлять их к итогу.
Унаследованы предупреждения Vite о большом3Dchunk и npm deprecated dependencies.
Новых dependencies, API, денежных записей, paidAI или данных общей БД нет.

Следующий шаг: капитан/владелец frontend принимает оформление и включает этот
точный SHA в будущую отдельную frontend-сборку с повторной проверкой её состава.
Backend window PR61 и будущий ids frontend/PR65 идут по отдельной последовательности.
Ветки автора не изменялись; отчёт опубликован только как документация интегратора.
