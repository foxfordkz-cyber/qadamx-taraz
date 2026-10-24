# Stage1 — factual validation экспериментінің нақты нәтижелері

**Тақырып:** «Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу».

24.10.2026. Local branch `feature/stage1-factual-validation`;base main `2518b2e80b8c8ef881063a968645382d61aeb37e`;implementation `6ac5266abddffa7f1278d403ece55cc3eba457a1`;freeze `3cb1ee19cc43a4b9fe5fcfd8436503cc864dbf8d`. Main/candidate merge немесе deployment жасалмады.


## Хаттама және freeze

`DS-B-LOCKED-42-v1`:18gold-valid,24gold-invalid synthetic engineering cases. Бастапқы4counterexample бөлекP01–P04. Freeze commit `3cb1ee19cc43a4b9fe5fcfd8436503cc864dbf8d` implementation-нан бұрын жасалды. Dataset/gold/snapshots өзгермеді. Ескі validator-дың critical definitions AST-ы main-мен бірдей; original run-да copy және live original нәтижелері әр case бойынша тең болды.

**Салыстыру шегі:** бірдей intent/snapshot/locale/days,ал protocol encoding бөлек: legacy free-prose JSON vs strict ID-only JSON. Екі payload алдын ала frozen fixture-де сақталған. Бірдей raw JSON екеуіне берілді деп айтылмайды. New format-та amount/name/unit override тыйым салынған; бұл validation+rendering architecture intervention. Duplicate/malformed policy cases те бар. Бұл model-generated жауаптардың кездейсоқ sample-ы немесе population accuracy benchmark емес.

Original Windows byte hash `46732cf49f163a0b571019c32ea44e9910c6e46d96a65f961786e0db66988700`;Git LF content hash `1ae46abeb313140c24475e5896b5d78362280f948022dabe63d0d95035781ccf`. Repo `.gitattributes` LF қолданады. Loader тек LF/CRLF айырмасын қабылдайды;басқа byte өзгерісі reject. Frozen fixture/manifest baseline-нен кейін өңделген жоқ. LF checkout portability regression өтті.

## Нақты paired нәтиже

Gold-positive=valid. FAR=FP/(FP+TN),FRR=FN/(TP+FN),P=TP/(TP+FP),R=TP/(TP+FN),F1=2TP/(2TP+FP+FN). Denominator0→null;осы жиында denominators нөл емес.

| Көрсеткіш | Original numeric v1 | fact-bindings-v1 |
|---|---|---|
| TP | 18 | 18 |
| FP | 19 | 0 |
| TN | 5 | 24 |
| FN | 0 | 0 |
| False acceptance rate | 0.791667 | 0.000000 |
| False rejection rate | 0.000000 | 0.000000 |
| Precision | 0.486486 | 1.000000 |
| Recall | 1.000000 | 1.000000 |
| F1 | 0.654545 | 1.000000 |

Жаңа validator18/18valid қабылдап,24/24invalid кері қайтарды. Finite frozen set үшін FP0/FN0 target орындалды. Модельдің нақты дүкен сұрағына релевант fact таңдауы, live provider adherence/latency, real business accuracy немесе causal business impact өлшенген жоқ. Precision/F1 sample class mix пен protocol-policy cases-ке тәуелді;бұл мәндерді жалпы AI дәлдігі деп жариялауға болмайды.

## Original4counterexamples

P01inventedcustomer,P02wrongmetric,P03wrongdebtoramount originalда accepted,newда rejected;P04unsupportednumber екеуінде rejected. New protocol value/name/text қабылдамайды,нақты server value-ті өзі қайта құрастырады. Proposed ID тек current tenant snapshot-та бар болса ғана қолданылады.


## Санаттар және салыстырудың шегі

19 original acceptance-тің бәрі қаржылық жалған тұжырым емес: duplicate/strict-type сияқты кейбір жағдайлар жаңа ортақ gold policy бойынша invalid, ал ескі protocol оларды қабылдайтын. Сондықтан жалпы FAR/F1 — осы алдын ала бекітілген policy мен paired encoding-ке қатысты мәндер. Қаржылық association қателері мен format-policy жағдайлары төменде бөлек көрсетілген.

| Қате санаты | N invalid | Original accepted | New accepted |
|---|---|---|---|
| metric_binding | 1 | 1 | 0 |
| customer_binding | 3 | 3 | 0 |
| sign | 1 | 1 | 0 |
| unit | 2 | 2 | 0 |
| unknown_fact | 1 | 1 | 0 |
| missing_fact | 1 | 1 | 0 |
| tenant | 1 | 0 | 0 |
| duplicate_policy | 3 | 3 | 0 |
| contradiction | 1 | 1 | 0 |
| prose_bypass | 1 | 1 | 0 |
| malformed | 2 | 0 | 0 |
| unsupported_action | 1 | 0 | 0 |
| strict_type | 1 | 1 | 0 |
| action_binding | 1 | 1 | 0 |
| original_counterexample | 4 | 3 | 0 |

## Raw observations

- [Full per-case CSV](stage1/comparison/comparison_cases.csv)
- [JSONL:reason/config/factIDs/rendered output](stage1/comparison/comparison_cases.jsonl)
- [Aggregate/config/code hashes](stage1/comparison/comparison_summary.json)
- [Original pre-change measurements](stage1/original/original_summary.json)
- [Frozen protocol](stage1/evaluation_protocol_v1.md)

| Case | Gold valid | Category | Original | New | New rejection |
|---|---|---|---|---|---|
| V01_sales_ru | True | valid_binding | accept | accept |  |
| V02_sales_kk | True | valid_binding | accept | accept |  |
| V03_receipts_decimal | True | valid_binding | accept | accept |  |
| V04_outstanding_kk | True | valid_binding | accept | accept |  |
| V05_customer_a | True | valid_binding | accept | accept |  |
| V06_customer_b_kk | True | valid_binding | accept | accept |  |
| V07_sales_count | True | valid_binding | accept | accept |  |
| V08_debtors_count_kk | True | valid_binding | accept | accept |  |
| V09_two_metrics | True | valid_binding | accept | accept |  |
| V10_previous_period_kk | True | valid_binding | accept | accept |  |
| V11_signed_change | True | valid_binding | accept | accept |  |
| V12_today_zero_kk | True | valid_binding | accept | accept |  |
| V13_today_receipts_zero | True | valid_binding | accept | accept |  |
| V14_average_ticket_kk | True | valid_binding | accept | accept |  |
| V15_reminder_a | True | valid_reminder | accept | accept |  |
| V16_reminder_b_kk | True | valid_reminder | accept | accept |  |
| V17_no_debt | True | zero_snapshot | accept | accept |  |
| V18_navigation_kk | True | valid_navigation | accept | accept |  |
| I01_wrong_metric_value | False | metric_binding | accept | reject | 1 validation error for BoundAnswer |
| I02_wrong_customer_value | False | customer_binding | accept | reject | 1 validation error for BoundAnswer |
| I03_invented_name | False | customer_binding | accept | reject | 1 validation error for BoundAnswer |
| I04_wrong_sign | False | sign | accept | reject | 1 validation error for BoundAnswer |
| I05_wrong_currency | False | unit | accept | reject | 1 validation error for BoundAnswer |
| I06_wrong_minor_unit | False | unit | accept | reject | 1 validation error for BoundAnswer |
| I07_unknown_metric | False | unknown_fact | accept | reject | unknown_fact_id |
| I08_missing_fact | False | missing_fact | accept | reject | unknown_fact_id |
| I09_foreign_customer | False | tenant | reject | reject | unknown_fact_id |
| I10_wrong_recipient | False | customer_binding | accept | reject | 1 validation error for BoundAnswer |
| I11_duplicate_claim | False | duplicate_policy | accept | reject | duplicate_claim |
| I12_contradictory_claim | False | contradiction | accept | reject | 1 validation error for BoundAnswer |
| I13_unrestricted_prose | False | prose_bypass | accept | reject | 1 validation error for BoundAnswer |
| I14_invalid_json | False | malformed | reject | reject | Expecting value: line 1 column 12 (char 11) |
| I15_duplicate_json_key | False | duplicate_policy | accept | reject | duplicate_json_key |
| I16_missing_claims | False | malformed | reject | reject | 1 validation error for BoundAnswer |
| I17_unknown_action | False | unsupported_action | reject | reject | 1 validation error for BoundAnswer |
| I18_fact_id_boolean | False | strict_type | accept | reject | 1 validation error for BoundAnswer |
| I19_metric_reminder | False | action_binding | accept | reject | invalid_reminder_fact |
| I20_duplicate_action | False | duplicate_policy | accept | reject | duplicate_action |
| P01_invented_customer | False | original_counterexample | accept | reject | 1 validation error for BoundAnswer |
| P02_wrong_fact_binding | False | original_counterexample | accept | reject | 1 validation error for BoundAnswer |
| P03_wrong_debtor_amount | False | original_counterexample | accept | reject | 1 validation error for BoundAnswer |
| P04_new_number_control | False | original_counterexample | reject | reject | 1 validation error for BoundAnswer |

## Қайта өндіру

Осы implementation SHA checkout-та project `apps/api/uv.lock` dependency environment-ын қолданыңыз. Біз Python3.12.14 және сол lock нұсқаларына pinned бөлек test directory қолдандық;production credentials өшірілді. Төмендегі offline comparison DB/AI/service credentials қолданбайды:

```powershell
cd apps/api
uv sync --frozen
uv run python tools/diploma_eval/evaluate_stage1.py --output-dir ../../stage1-reproduction
uv run pytest -q -m "not postgres"
uv run python -m app.export_contracts --check
uv run ruff check .
uv run ruff format --check .
```

Тест үшін TEST_DATABASE_URL/DATABASE_URL және `.env` production ортадан ажыратылсын. PostgreSQL tests тек disposable *_test DB-мен;осы орындауда ол жоқ. `--baseline-only --verify-original` тарихи pre-change режиміне арналған,current application өзгерген соң оны қолданбаңыз. Current comparison original code-ты тек `tests/evaluation_baselines`-тен жүктейді;production app бұл baseline-ды импорттамайды. Git жоқ export-та commit SHA null болуы мүмкін,source hash бәрібір сақталады;dirty source болса implementation_commit_sha=null деп ашық көрсетіледі.

## Регрессия және нәтижесіз қалған scope

Final backend318passed,32skipped,129deselected,1Starlette/httpx deprecation warning. Соның ішінде assistant scope 108 test. Web57passed/3files;API types,TypeScript,ESLint passed. Ruff check/format және API export check passed. [Нақты logs/check configs](stage1/checks/result_counts.json).

Initial assistant run103pass/1fail: test newline escape-ті `\n` деп ғана күткен,renderer `\u000a` қолданған. Assertion екі қауіпсіз escaped representation-ды қабылдайтындай түзетілді;frozen labels/payloads өзгермеді. Initial failed log сақталды. Sandbox-only run asyncio/TestClient кезінде аяқталмай тоқтатылды;pass/fail санына қосылмады. Жергілікті socket рұқсаты бар run ғана completed counts береді.

PostgreSQL daemon қолжетімсіз,real DB migration/ledger isolation suite орындалмады;HTTP tests dependency doubles қолданады. Flutter/device,live AI және real owner/business evaluation орындалмады. Initial317/315 сияқты development run-дарды final318-ге механикалық қоспаймыз. Әр log өз scope-ымен сақталған.

## Академиялық интерпретация

Бұл тар engineered set-те structural restriction wrong financial associations-ті өткізбеді. Мұны NLP semantic comprehension немесе universal truth guarantee деп атауға болмайды. Сервер snapshot-ының бастапқы дерегі/сапасы бөлек prerequisite;as_of-тен кейін өзгерген balance осы жауапқа ретроактив әсер етпейді. Student осы synthetic set bias-ын,paired-encoding әсерін және actual model relevance-ті independently талдап,жеке үлесі мен AI көмегін ашуы тиіс. Final thesis chapter мәтіні автоматты жазылған жоқ.
