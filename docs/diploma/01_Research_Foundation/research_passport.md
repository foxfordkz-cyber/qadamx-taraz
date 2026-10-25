# Зерттеу паспорты

**Тақырып:** «Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу».

**Нұсқа күні:** 24.10.2026. Негізгі source: `main@2518b2e80b8c`. Зерттеу кандидаты: `feature/ml-sales-debt-research@b7c4750b158a`. Ресми жұмыс/жоба жіктелімі расталмаған.


## Мақсат, объект және пән

**Мақсат:** Qadam Business негізінде шағын бизнестегі сатылым мен қарыз есебінің нақты іске асырылған шешімдерін жүйелеу, AI енгізу мен фактілік тексеруді бағалау әдістемесін дайындау және кодта бар зерттеу кеңейтімдерін дәлелге сүйеніп тексеру.

**Объект:** сауда нүктесінде сатылымды, алғашқы/кейінгі төлемді және ашық қарызды тіркеу үдерісі. **Пән:** көптілді structured extraction, адам растауы, транзакциялық journal және фактілермен байланысты AI түсіндірмесі. Forecast және debt review — нақты дерек жарамдылығы тексерілетін қосымша зерттеу бағыттары.

## Міндеттер

1. Сауда қарызы, STT/NLP, human–AI validation және reproducibility әдебиетін тексеру.
2. Core main мен research candidate мүмкіндіктерін бөлу, code/API/schema дәлелін бекіту.
3. A–D эксперименттерінің gold label, split, metric және eligibility шарттарын анықтау.
4. Current validator шектеуіне қарсы Stage 1 internal structured claim дизайнын ұсыну.
5. Candidate forecasting/rules/feedback кодын қайта жасамай, тексеру мен integration gap-тарын белгілеу.
6. Үш тараулы outline, бет жоспары және university compliance evidence тізілімін дайындау.

## Жұмыс гипотезасы

Қаржылық сан/клиентті еркін мәтіннен post-hoc іздеуден гөрі, сервер факт идентификаторына байланыстырып қайта құрастыру semantic false acceptance-ті азайтады. Бұл Stage 1 орындалғанға дейін **тексерілмеген гипотеза**. Current pilot толық сапа метрикасы емес.

## Практикалық маңызының шекарасы

Сатушыға сатылым/төлем/қарызды бір жерде жүргізетін прототип бар. Уақыт үнемі, табыс өсімі немесе қарыз қайтару тиімділігі осы пакетте дәлелденбейді. Нақты деректер жоқ болса, forecast нәтижесі тек engineering fixture болып қалады; debt score — түсіндірілетін шолу басымдығы.

## Авторлық және академиялық дербестік

Студенттің аты/жеке commit үлесі берілген жоқ. Алты адамдық team code түгел бір авторға жазылмайды. Candidate README «for Bekzat» деп сипаттайды, бірақ бұл пайдаланушының жеке тұлғасын не жеке үлесін растамайды. Қатысушыны сәйкестендіру — `individual_contribution_register.md` ішіндегі ашық міндет.

AI осы workspace-де code reading, жоспарлау, source register және diagnostic ұйымдастыруға қолданылды. Түпкі әдіс таңдау, дерек интерпретациясы мен диплом қорытындысы студентке тиесілі. PDF 23–24-б., 11.21–11.27 талаптарына сай disclosure қажет. Толық диплом мәтіні жасалған жоқ.

## Дәлел тіректері

Core journal: [`apps/api/app/services/ledger.py:78`](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/2518b2e80b8c8ef881063a968645382d61aeb37e/apps/api/app/services/ledger.py#L78). Current validator: [`apps/api/app/services/assistant.py:199`](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/2518b2e80b8c8ef881063a968645382d61aeb37e/apps/api/app/services/assistant.py#L199). Candidate regression: [`apps/api/app/services/forecasting.py:113`](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/b7c4750b158a6b1fc747e63a68ae7b2d078b5107/apps/api/app/services/forecasting.py#L113). Тақырыптағы «қарыздарын» сөзі жаңа тапсырмаға сай сақталды; алдыңғы аудиттегі «қаржыларын» формасы historical source snapshot ретінде ғана қалдырылды.
