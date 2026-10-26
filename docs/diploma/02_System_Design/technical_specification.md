# Техникалық тапсырма

**Тақырып:** «Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу».

**Нұсқа күні:** 24.10.2026. Негізгі source: `main@2518b2e80b8c`. Зерттеу кандидаты: `feature/ml-sales-debt-research@b7c4750b158a`. Ресми жұмыс/жоба жіктелімі расталмаған.


## Өнім және шекара

Qadam — шағын сауда нүктесінің KZT сатылым/түсім/қарыз журналы. Web және Flutter бір FastAPI-мен байланысады. Көлемді бухгалтерия, stock ledger және салық есебі scope-ке кірмейді. Main-ның MVP-і rewrite жасалмай сипатталады; candidate research модульдері қабылдау қақпасынан кейін ғана қосылады.

## Негізгі сценарий

Сатушы мәтін/аудио береді → structured draft алады → клиент/соманы тексереді → explicit confirm → атомарлық операция. Қарызды өтеу жаңа sale емес. Reversal journal-ды өшірмейді. Ашық қарыз current journal delta-ларынан есептеледі. [`apps/api/app/services/ledger.py:78`](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/2518b2e80b8c8ef881063a968645382d61aeb37e/apps/api/app/services/ledger.py#L78).

## Қабылдау жүйесі

FR/NFR файлдарындағы талап ID-лері feature ID және test plan-мен байланысады. Source болғаны, synthetic suite өткені және real empirical нәтиже үш түрлі дәлел. Нақты release/deployment осы тапсырмаға кірмейді. Негізгі жұмыс нұсқасы main; candidate өз SHA-мен бөлек танылады.

## Кеңейтім шекарасы

S1 — assistant internal validation, public response contract сақтау. S2 — offline/live-provider evaluation тек жеке рұқсат/бюджетпен. S3 — existing ridge candidate тексеруі. S4 — existing debt review rules, supervised path тек label болса. S5 — existing feedback code-ты UI/privacy lifecycle-мен аяқтау. S6 — integration evidence. Бәрін бірден implementation етуге тапсырма берілген жоқ.

## Ақпарат көздері

[`apps/api/app/main.py:51`](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/2518b2e80b8c8ef881063a968645382d61aeb37e/apps/api/app/main.py#L51); [`apps/web/src/app/App.tsx:104`](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/2518b2e80b8c8ef881063a968645382d61aeb37e/apps/web/src/app/App.tsx#L104); [`apps/mobile/lib/main.dart:7`](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/2518b2e80b8c8ef881063a968645382d61aeb37e/apps/mobile/lib/main.dart#L7); candidate [`apps/api/app/research_routes.py:17`](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/b7c4750b158a6b1fc747e63a68ae7b2d078b5107/apps/api/app/research_routes.py#L17). Team ownership source: README және CONTRIBUTING. Бұл workspace жаңа application коды емес.
