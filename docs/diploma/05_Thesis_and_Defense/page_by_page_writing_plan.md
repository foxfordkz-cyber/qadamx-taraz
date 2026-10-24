# Бет аралығы бойынша жазу жоспары

**Тақырып:** «Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу».

**Нұсқа күні:** 24.10.2026. Негізгі source: `main@2518b2e80b8c`. Зерттеу кандидаты: `feature/ml-sales-debt-research@b7c4750b158a`. Ресми жұмыс/жоба жіктелімі расталмаған.



**Мағынасы:** нөмірлер — intro+chapters+conclusion ішіндегі content page index. Front matter counted physical printed page number емес.50бет conditional planning budget; official work/project classification және R21/R22 conflict шешілмей final compliant allocation ретінде қолданылмайды. Әр2бет block — writing brief, дайын body text не ойдан алынған қорытынды емес. Төмендегі references Lxx source register-ге байланған; source review gap-тары ашық.

Қорытынды деңгейі: «күтілген академиялық қорытынды» қандай сұраққа жауап алынуы тиіс екенін білдіреді. Evidence жоқ жерде нәтиже жазылмайды; missing белгісі сақталады.

## Мазмұн беттері 1–2 — Кіріспе

| Өріс | Жазу міндеті |
|---|---|
| Мақсат | Тақырыптың нақты есебі, мақсат/объект/пән және зерттеу шекарасын қою |
| Ұғымдар және түсіндіру | Sales vs receipts vs outstanding; RU/KK енгізу; RQ A–D; классификация белгісіз |
| Ғылыми/техникалық references | L01,L05,L26 |
| Кесте атауы және міндетті бағандар | Зерттеу міндеттері — RQ, міндет, әдіс, evidence, шектеу |
| Сурет атауы және элементтер | System context — seller, clients, API, auth, AI, DB |
| Code/UI evidence | research_passport; main/candidate SHA; real dataset жоқ |
| Формула | Формула қажет емес |
| Күтілетін қорытындының шекарасы | Өзектілік дәлелмен негізделеді; business impact әлі өлшенбеген |
| Жетіспейтін ақпарат | Кафедра жіктелімі; студент/жетекші identity; Қазақстан SME empirical source |

## Мазмұн беттері 3–4 — 1.1 Шағын бизнестегі сатылым және қарыз

| Өріс | Жазу міндеті |
|---|---|
| Мақсат | Қаржылық ұғымдарды операцияға сай анықтау |
| Ұғымдар және түсіндіру | Sale, initial payment, later repayment, open debt, reversal; B2B trade credit пен retail айырмасы |
| Ғылыми/техникалық references | L01; қосымша Қазақстан retail research қажет |
| Кесте атауы және міндетті бағандар | Қаржылық ұғымдар — ұғым, операция, бірлік, Qadam field, мысал түрі |
| Сурет атауы және элементтер | Financial activity — sale/repayment/validation/commit |
| Code/UI evidence | ledger.py immutable source; synthetic sale мысалы ғана |
| Формула | initial_debt=total−initial_paid; balance=initial_debt−net_later_paid |
| Күтілетін қорытындының шекарасы | Операция мен ақша түсімінің айырмасы формалданады |
| Жетіспейтін ақпарат | Нақты бизнес pain-point интервьюсы; domain-specific source |

## Мазмұн беттері 5–6 — 1.2 Аналогтар және зерттеу орны

| Өріс | Жазу міндеті |
|---|---|
| Мақсат | Үш ресми өнім құжатын бірдей критериймен салыстыру |
| Ұғымдар және түсіндіру | Debt tracking, manual vs automated reminders, language unknown, scope |
| Ғылыми/техникалық references | L22,L23,L24 |
| Кесте атауы және міндетті бағандар | Аналогтар — продукт, verified accounting, reminder, тіл evidence, unknown, source/date |
| Сурет атауы және элементтер | Қажет емес; бар болса бірдей task-flow comparison |
| Code/UI evidence | competitor_analysis; no trial conducted |
| Формула | Рейтинг формуласы жоқ |
| Күтілетін қорытындының шекарасы | Qadam scope және салыстырылмаған қасиеттер айқын |
| Жетіспейтін ақпарат | Бірдей seed-пен hands-on trial; pricing/local edition тексерілмеген |

## Мазмұн беттері 7–8 — 1.3 Speech-to-text және multilingual NLP

| Өріс | Жазу міндеті |
|---|---|
| Мақсат | STT қатесін extraction қатесінен бөлу |
| Ұғымдар және түсіндіру | Whisper; KSC/KSC2; kk/ru/code-switch; audio vs text gold |
| Ғылыми/техникалық references | L02,L03,L04,L25 |
| Кесте атауы және міндетті бағандар | Speech деректерін салыстыру — corpus, тіл, license, domain, shop applicability |
| Сурет атауы және элементтер | Voice sequence — STT/extract/preview/confirm boundaries |
| Code/UI evidence | openai_provider.py; ai.py adapters; audio.py |
| Формула | WER=(S+D+I)/N |
| Күтілетін қорытындының шекарасы | General ASR dataset shop-finance gold-ты алмастырмайды |
| Жетіспейтін ақпарат | Consented shop speech және reference transcripts жоқ |

## Мазмұн беттері 9–10 — 1.4 Structured extraction

| Өріс | Жазу міндеті |
|---|---|
| Мақсат | Схема сәйкестігі мен қаржылық мағынаны ажырату |
| Ұғымдар және түсіндіру | Pydantic/JSON schema; strict amount/null; evidence span; clarification |
| Ғылыми/техникалық references | L19,L21,L15; financial NLP paper gap |
| Кесте атауы және міндетті бағандар | Extraction gold — case,kind,amount,paid,customer,missing,clarify |
| Сурет атауы және элементтер | Draft pipeline — raw→structured→validated draft |
| Code/UI evidence | ai_schemas.py; provider adapters; fixtures8 |
| Формула | ExactMatch_field=correct/eligible_gold |
| Күтілетін қорытындының шекарасы | Typed schema semantic accuracy-ді өздігінен дәлелдемейді |
| Жетіспейтін ақпарат | Locked kk/ru/mixed gold labels; live model/prompt version |

## Мазмұн беттері 11–12 — 1.5 Human-in-the-loop және factual validation

| Өріс | Жазу міндеті |
|---|---|
| Мақсат | Адам растауы мен server fact binding қағидаларын негіздеу |
| Ұғымдар және түсіндіру | Draft confirmation; numeric membership gap; fact/entity IDs; fallback; source disclosure |
| Ғылыми/техникалық references | L05,L19,L10; verification paper gap |
| Кесте атауы және міндетті бағандар | Қате типтері — mutation, valid/invalid, current action, safe behavior |
| Сурет атауы және элементтер | Assistant flowchart — current validator + proposed boundary |
| Code/UI evidence | assistant.py validate_answer; pilot4; Stage1 scope |
| Формула | FAR=FP/(FP+TN);FRR=FN/(TP+FN) |
| Күтілетін қорытындының шекарасы | Current gap өлшенетін қарсы мысалмен қойылады, v2 нәтиже деп көрсетілмейді |
| Жетіспейтін ақпарат | Balanced locked cases және v2 implementation жоқ |

## Мазмұн беттері 13–14 — 1.6 Forecasting және debt review әдістері

| Өріс | Жазу міндеті |
|---|---|
| Мақсат | Baseline, ridge және rule-based score ұғымдарын салыстыру |
| Ұғымдар және түсіндіру | Seasonal naive; rolling mean; recursive horizon; L2; debt age≠overdue; labels/censoring |
| Ғылыми/техникалық references | L09,L12,L08,L07,L10 |
| Кесте атауы және міндетті бағандар | Әдістер — method,input,training,target,metrics,eligibility |
| Сурет атауы және элементтер | Chronological split — train/validation/test, h7/h30 |
| Code/UI evidence | candidate forecasting.py/debt_risk.py |
| Формула | MAE,RMSE; ridge objective; weighted rule sum |
| Күтілетін қорытындының шекарасы | Trained sales regression мен deterministic debt rules бөлек түсіндіріледі |
| Жетіспейтін ақпарат | Шынайы sales history; mature repayment labels |

## Мазмұн беттері 15–16 — 1.7 Зерттеу міндеті және гипотезалар

| Өріс | Жазу міндеті |
|---|---|
| Мақсат | Теорияны A–D эксперименттерімен байланыстыру |
| Ұғымдар және түсіндіру | Research gap; hypotheses; evidence grading; no data policy |
| Ғылыми/техникалық references | L06,L07,L08,L26 |
| Кесте атауы және міндетті бағандар | RQ mapping — question,hypothesis,dataset,metric,decision,limitation |
| Сурет атауы және элементтер | Research workflow — source→protocol→raw→metrics→student interpretation |
| Code/UI evidence | research_questions; dataset register |
| Формула | Precision/recall/F1 meaningful denominators only |
| Күтілетін қорытындының шекарасы | Әр гипотезаның тексерілу шарты алдын ала анықталады |
| Жетіспейтін ақпарат | Protocol student signoff; minimum30 actually used citations |

## Мазмұн беттері 17–18 — 2.1 Талаптар және actor рөлдері

| Өріс | Жазу міндеті |
|---|---|
| Мақсат | Іске асқан талаптарды proposed кеңейтімнен бөлу |
| Ұғымдар және түсіндіру | Owner/seller membership; tenant; main vs candidate; money integer |
| Ғылыми/техникалық references | L15,L16,L26 |
| Кесте атауы және міндетті бағандар | FR/NFR traceability — ID,actor,trigger,expected behavior,source,test |
| Сурет атауы және элементтер | Use cases — register sale,repay,reverse,customers,AI,analytics,proposed research |
| Code/UI evidence | auth.py; models; routers; technical_specification |
| Формула | Money minor integer invariants |
| Күтілетін қорытындының шекарасы | Талаптар source/test ID-мен тексерілетін түрде беріледі |
| Жетіспейтін ақпарат | Нақты owner acceptance/latency targets бекітілмеген |

## Мазмұн беттері 19–20 — 2.2 Компонент архитектурасы

| Өріс | Жазу міндеті |
|---|---|
| Мақсат | Web/mobile/API/Auth/AI/DB шекарасын түсіндіру |
| Ұғымдар және түсіндіру | React runtime/modules; Flutter CrmApi; FastAPI composition; external provider |
| Ғылыми/техникалық references | L17,L18,L15,L16 |
| Кесте атауы және міндетті бағандар | Компоненттер — component,responsibility,contract,source,baseline |
| Сурет атауы және элементтер | Context және components — candidate box dashed/labelled |
| Code/UI evidence | App.tsx; runtime.tsx; crm_api.dart; main.py |
| Формула | Формула қажет емес |
| Күтілетін қорытындының шекарасы | Клиент draft ұсынады, backend қаржылық invariant қорғайды |
| Жетіспейтін ақпарат | Flutter run/device evidence; deployed SHA unverified |

## Мазмұн беттері 21–22 — 2.3 API және client contract

| Өріс | Жазу міндеті |
|---|---|
| Мақсат | Қаржылық request/retry/response мәнін формалдау |
| Ұғымдар және түсіндіру | OpenAPI generation; request_id; draft_id; receipt; errors; research endpoints candidate |
| Ғылыми/техникалық references | L15,L14 |
| Кесте атауы және міндетті бағандар | API contracts — method,path,input,output,auth,error,source SHA |
| Сурет атауы және элементтер | API request sequence қажет болса financial sequence-ке сілтеме |
| Code/UI evidence | contracts/openapi; routers/draft_routes; web generated contracts |
| Формула | Same request+body→same effect; changed body→conflict |
| Күтілетін қорытындының шекарасы | Idempotency contract UI retry-мен байланыстырылады |
| Жетіспейтін ақпарат | Candidate generated contract review және DB E2E |

## Мазмұн беттері 23–24 — 2.4 PostgreSQL моделі

| Өріс | Жазу міндеті |
|---|---|
| Мақсат | Entity/FK/tenant және journal provenance көрсету |
| Ұғымдар және түсіндіру | Business,Membership,Customer,Operation,Draft,receipt; additive migration; core vs candidate table |
| Ғылыми/техникалық references | L13,L14,L16 |
| Кесте атауы және міндетті бағандар | Entity dictionary — entity,PK,tenant FK,key fields,constraint,migration |
| Сурет атауы және элементтер | ER — verified core entities; ResearchFeedback candidate labelled |
| Code/UI evidence | models/__init__.py; migrations0002/0003/0006/0009 |
| Формула | Tenant FK equality; debt aggregation identity |
| Күтілетін қорытындының шекарасы | Журнал түзетуі тарихты сақтайды; feedback бөлек experimental table |
| Жетіспейтін ақпарат | Таза DB migration және schema inspection run жоқ |

## Мазмұн беттері 25–26 — 2.5 Қаржылық операция алгоритмі

| Өріс | Жазу міндеті |
|---|---|
| Мақсат | Atomicity/reversal/repayment ережесін дәл көрсету |
| Ұғымдар және түсіндіру | Business lock, draft consume, idempotency receipt; no direct AI write |
| Ғылыми/техникалық references | L13,L14 |
| Кесте атауы және міндетті бағандар | Operation invariants — condition,accept/reject,balance effect,test |
| Сурет атауы және элементтер | Financial activity — transaction gates,commit,rollback |
| Code/UI evidence | ledger.py write_operation; tests named not presumed passed |
| Формула | sales≠receipts; current outstanding=sum valid remaining debts |
| Күтілетін қорытындының шекарасы | Қарыз есебі болжам емес, журнал фактілері |
| Жетіспейтін ақпарат | DB concurrency/reversal tests execution pending |

## Мазмұн беттері 27–28 — 2.6 AI draft және factual validator дизайны

| Өріс | Жазу міндеті |
|---|---|
| Мақсат | Existing AI pipeline және proposed S1 interface беру |
| Ұғымдар және түсіндіру | Provider fallback; schema; spans; internal claim key; server rendering; actions |
| Ғылыми/техникалық references | L05,L19,L21 |
| Кесте атауы және міндетті бағандар | Validator contract — claim type,allowed fact key,entity binding,reject case |
| Сурет атауы және элементтер | Voice sequence + assistant validation flow |
| Code/UI evidence | Current assistant.py; STAGE_1_SCOPE; draft routes |
| Формула | Strict fact-value equality per snapshot; no free amount synthesis |
| Күтілетін қорытындының шекарасы | S1 design current failure class-ін нысанаға алады |
| Жетіспейтін ақпарат | Stage1 code implemented/contract tests passed; isolated DB and live provider still pending |

## Мазмұн беттері 29–30 — 2.7 Forecast/risk кеңейтімінің дизайны

| Өріс | Жазу міндеті |
|---|---|
| Мақсат | Existing candidate-ті қайта жазбай алгоритм және eligibility сипаттау |
| Ұғымдар және түсіндіру | 11features; alpha selection; recursive horizon; rules factors; no-data state |
| Ғылыми/техникалық references | L09,L12,L07,L08 |
| Кесте атауы және міндетті бағандар | Candidate configuration — version,features,train minimum,horizon,metric,limitation |
| Сурет атауы және элементтер | Chronological evaluation — no future actual arrows |
| Code/UI evidence | candidate forecasting/research/debt_risk; schemas |
| Формула | Required_days=84+2h;rule sum(age,share,payment) |
| Күтілетін қорытындының шекарасы | Real-data gate және honest unavailable behavior формалданады |
| Жетіспейтін ақпарат | Recording completeness; multiple origins; integration UI |

## Мазмұн беттері 31–32 — 2.8 Privacy және experiment design

| Өріс | Жазу міндеті |
|---|---|
| Мақсат | Қауіпсіздік пен reproducibility-ді implementation-ға байлау |
| Ұғымдар және түсіндіру | JWT vs business role; tenant; consent; private audio; dataset datasheet; exports |
| Ғылыми/техникалық references | L06,L07,L08,L16,L26 |
| Кесте атауы және міндетті бағандар | Threat/evaluation controls — asset,threat,control,test,remaining gap |
| Сурет атауы және элементтер | Study data flow қажет болса private/public boundary |
| Code/UI evidence | security_and_privacy; protocols; candidate migration0009 |
| Формула | No metric without denominator; test data isolation |
| Күтілетін қорытындының шекарасы | Raw observations/private mapping бөлек сақталады |
| Жетіспейтін ақпарат | Study contact/storage/deletion owner; official consent form |

## Мазмұн беттері 33–34 — 3.1 Іске асқан clients және scenarios

| Өріс | Жазу міндеті |
|---|---|
| Мақсат | Main UI scope-ты шынайы screenshot-пен көрсету |
| Ұғымдар және түсіндіру | React views; RU/KK; Flutter source-only scope; demo provenance |
| Ғылыми/техникалық references | L17,L18; main SHA |
| Кесте атауы және міндетті бағандар | Implementation evidence — feature,client,source,test scope,limitation |
| Сурет атауы және элементтер | SS01 dashboard demo; қосымша actual screenshots кейін |
| Code/UI evidence | evidence/screenshots SS01; feature matrix F01–F12 |
| Формула | Формула жоқ |
| Күтілетін қорытындының шекарасы | Көрсетілген UI source revision-мен байланысты; demo real adoption емес |
| Жетіспейтін ақпарат | Core sale/repayment/voice/assistant actual captures; Flutter test |

## Мазмұн беттері 35–36 — 3.2 Ledger/customer/analytics іске асуы

| Өріс | Жазу міндеті |
|---|---|
| Мақсат | Sale→partial→repayment→reversal synthetic сценарийін дәлелдеу |
| Ұғымдар және түсіндіру | Customer recovery; journal history; sales vs receipts; reminder preparation |
| Ғылыми/техникалық references | L13,L14; core code |
| Кесте атауы және міндетті бағандар | Scenario before/after — operation,total,paid,balance,request,expected,observed |
| Сурет атауы және элементтер | Local synthetic ledger/analytics screenshot to collect |
| Code/UI evidence | ledger/customer/analytics source + future isolated DB results |
| Формула | Balance=initial debt−net later repayments |
| Күтілетін қорытындының шекарасы | Қаржылық invariant нәтижесі нақты run болғанда ғана жазылады |
| Жетіспейтін ақпарат | DB run жоқ; WhatsApp delivery measured емес |

## Мазмұн беттері 37–38 — 3.3 Voice draft және assistant іске асуы

| Өріс | Жазу міндеті |
|---|---|
| Мақсат | Нақты provider adapter/code мен fail-safe behavior көрсету |
| Ұғымдар және түсіндіру | Draft statuses; manual correction; cancel/retry; facts/fallback source |
| Ғылыми/техникалық references | L02,L05,L19,L21 |
| Кесте атауы және міндетті бағандар | AI execution evidence — adapter,stub/live,input,result,failure,source |
| Сурет атауы және элементтер | Actual draft preview + assistant facts state capture later |
| Code/UI evidence | Main AI tests previous; code; no live accuracy |
| Формула | Field exact match/WER formula only when actual N exists |
| Күтілетін қорытындының шекарасы | Unit/stub scope пен live quality айырмасы ашылады |
| Жетіспейтін ақпарат | Audio gold/live request budget; provider/prompt logs |

## Мазмұн беттері 39–40 — 3.4 Factual validation салыстыруы

| Өріс | Жазу міндеті |
|---|---|
| Мақсат | Counterexample pilot және кейін S1 paired experiment көрсету |
| Ұғымдар және түсіндіру | Invalid associations, valid controls; TP/FP/FN/TN; paired outcomes |
| Ғылыми/техникалық references | L10,L19; EXP-B protocol |
| Кесте атауы және міндетті бағандар | Current vs v2 — case,gold,mutation,current,v2,reason |
| Сурет атауы және элементтер | Error-class bar chart only after balanced measured run |
| Code/UI evidence | 4-case pilot +frozen42 paired CSV/JSONL;implementation 6ac5266abddffa7f1278d403ece55cc3eba457a1 |
| Формула | FAR,FRR,P,R,F1 if denominators meaningful |
| Күтілетін қорытындының шекарасы | Current numeric check шектеуі бар; v2 superiority тек іске асқаннан кейін |
| Жетіспейтін ақпарат | Stage1 frozen18valid/24invalid completed;actual paired metrics available;live relevance/generalization absent |

## Мазмұн беттері 41–42 — 3.5 Functional/integration verification

| Өріс | Жазу міндеті |
|---|---|
| Мақсат | Passed/failed/skipped/not-run-ды scope бойынша көрсету |
| Ұғымдар және түсіндіру | API non-DB; web failed first/rerun; demo E2E; pure candidate; DB gaps |
| Ғылыми/техникалық references | L15; actual logs |
| Кесте атауы және міндетті бағандар | Test results — test ID,SHA,environment,count,pass/fail/skip,artifact,limits |
| Сурет атауы және элементтер | Test scope diagram optional; no fake test screenshot |
| Code/UI evidence | T01–T12; previous logs; current pure JUnit25 |
| Формула | Pass counts не coverage пайызын өздігінен алмастырмайды |
| Күтілетін қорытындының шекарасы | Жүйе сенімділігі тек орындалған scope шегінде бағаланады |
| Жетіспейтін ақпарат | Postgres/Flutter/candidate API/UI execution |

## Мазмұн беттері 43–44 — 3.6 Extraction experiment A

| Өріс | Жазу міндеті |
|---|---|
| Мақсат | Жиналғанда тіл/field/WER/latency нәтижесін түсіндіру |
| Ұғымдар және түсіндіру | Frozen labels; failures; uncertainty; no paraphrase leakage |
| Ғылыми/техникалық references | L02,L03,L04,L05,L06 |
| Кесте атауы және міндетті бағандар | A results — language,N,kindEM,amountEM,customerEM,missing,clarify,WER,latency/errors |
| Сурет атауы және элементтер | Per-language error distribution actual measured only |
| Code/UI evidence | EXP-A currently blocked; raw template available |
| Формула | EM;WER;Wilson intervals;median/p95 with N |
| Күтілетін қорытындының шекарасы | Қандай error manual confirmation қажет ететіні нақты дерекпен талданады |
| Жетіспейтін ақпарат | Consented corpus and live observations entirely missing |

## Мазмұн беттері 45–46 — 3.7 Forecast experiment C

| Өріс | Жазу міндеті |
|---|---|
| Мақсат | Synthetic engineering rerun мен болашақ real evaluation бөлу |
| Ұғымдар және түсіндіру | h7/h30; baseline vs ridge; origin; selection; no-data; recording coverage |
| Ғылыми/техникалық references | L09,L12,L08,L07 |
| Кесте атауы және міндетті бағандар | C results — origin,horizon,source,baseline,MAE/RMSE,selected,N,limitation |
| Сурет атауы және элементтер | Synthetic actual vs forecast clearly captioned; real plot only if available |
| Code/UI evidence | Synthetic reports/raw180; candidate tests; real metrics null |
| Формула | MAE/RMSE minor→₸÷100; true recursive h |
| Күтілетін қорытындының шекарасы | Synthetic code works on engineered trend; business superiority белгісіз |
| Жетіспейтін ақпарат | Eligible authorized history/multiple origins/solver reference |

## Мазмұн беттері 47–48 — 3.8 Debt review және owner study шектеулері

| Өріс | Жазу міндеті |
|---|---|
| Мақсат | Rule correctness-ті predictive/owner outcome-нан бөлу |
| Ұғымдар және түсіндіру | Age factors; not overdue/probability; no labels; formative sample bias |
| Ғылыми/техникалық references | L01,L07,L10,L05,L06 |
| Кесте атауы және міндетті бағандар | Rules evidence + study state — factor,boundary,test,outcome label,actual N,unknown |
| Сурет атауы және элементтер | Rule explanation UI capture after integration |
| Code/UI evidence | Candidate rules/feedback source;25pure tests; Nparticipants0 |
| Формула | Rules sum; supervised metrics null without labels |
| Күтілетін қорытындының шекарасы | Түсіндірілетін prototype бар, тиімділік/болжау дәлелденбеген |
| Жетіспейтін ақпарат | Mature labels; consent workflow; integrated feedback UI; actual sessions |

## Мазмұн беттері 49–50 — Қорытынды

| Өріс | Жазу міндеті |
|---|---|
| Мақсат | Тек орындалған міндет пен дәлелденген шектеуді жинақтау |
| Ұғымдар және түсіндіру | RQ status; implementation vs experiment; limits; future S1–S6 |
| Ғылыми/техникалық references | Негізгі мәтінде шын қолданылған деректер |
| Кесте атауы және міндетті бағандар | Міндет орындалуы — RQ,evidence,observed finding,limitation,next step |
| Сурет атауы және элементтер | Қажет емес |
| Code/UI evidence | Final accepted code/run/source manifest; contribution signoff |
| Формула | Жаңа метрика/дерек енгізілмейді |
| Күтілетін қорытындының шекарасы | Қорытынды student independent analysis негізінде жазылады |
| Жетіспейтін ақпарат | Көптеген scientific results әлі жиналмаған; final text осы жерде жасалмайды |

## Stage1 evidence update

27–28/39–42мазмұн беттеріне енді [actualStage1 report](../04_Implementation_Evidence/stage1_implementation_report.md) және [finite paired comparison](../03_Datasets_and_Experiments/stage1_experiment_results.md) бар. V2implementation/validcontrols missing деген ескі planning remarks осы scope үшін жабылды. Live relevance,real DB,student interpretation open.50contentpages conditional classification өзгермеді.
