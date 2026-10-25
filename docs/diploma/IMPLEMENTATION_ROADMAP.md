# Алты кезеңді implementation roadmap

**Тақырып:** «Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу».

**Нұсқа күні:** 24.10.2026. Негізгі source: `main@2518b2e80b8c`. Зерттеу кандидаты: `feature/ml-sales-debt-research@b7c4750b158a`. Ресми жұмыс/жоба жіктелімі расталмаған.


Бастапқы roadmap кейінгі coding жұмысына арналған. Stage1 local code-та іске асырылып, тексерілді; S2–S6 кейінгі жұмыс болып қалады. S3–S5 In progress — бұрынғы candidate code бар болғандықтан; бастапқы docs stage implementation completion емес. S1 басым,себебі current assistant semantic association gap code+counterexample арқылы расталған.

## S1 — AI factual validation improvements (P1)

| Өріс | Нақты scope |
|---|---|
| Күй | Tested |
| Тәуелділік | main baseline frozen; current/candidate assistant byte-equivalent; EXP-B pilot |
| Repository modules (apps/api prefix unless web) | apps/api/app/services/assistant.py; proposed apps/api/app/services/assistant_structured.py; apps/api/tests/test_assistant.py; proposed apps/api/tests/test_assistant_semantics.py |
| Implementation tasks | Fact/entity keyed internal claim schema; server-only rendering; fail-closed fallback; public AssistantResponse сақтау |
| Required tests | Wrong metric/customer/amount/sign/unit/unknown key; RU/KK valid controls; no-money-write; current UI compatibility |
| DB changes | Жоқ |
| Expected evidence | EXP-B-01 raw per-case JSONL; regression report; current-vs-new comparison |
| Acceptance | Locked invalid binding suite-де false acceptance0; valid controls false rejection0; public schema unchanged; no new money writes |
| Risks | Еркін model prose ішіндегі hidden factual claim; display rounding; incomplete facts |
| Rollback | AI wording-ті өшіру/сервер facts fallback; schema/data migration жоқ. Legacy unsafe prose-ге үнсіз қайтпау |


Stage1 implementation 6ac5266abddffa7f1278d403ece55cc3eba457a1;frozen42target passed;realDB/liveAI/production rollout бөлек.

## S2 — Reproducible AI extraction evaluation (P2)

| Өріс | Нақты scope |
|---|---|
| Күй | Not started |
| Тәуелділік | S1 regression stable; DS-A consent and model budget |
| Repository modules (apps/api prefix unless web) | apps/api/app/services/ai.py; apps/api/app/services/openai_provider.py; apps/api/app/services/audio.py; apps/api/scripts/smoke_ai.py; proposed apps/api/tools/diploma_eval/extraction.py |
| Implementation tasks | Dataset/version manifest; speaker/template split; strict gold annotations; provider/model/prompt capture |
| Required tests | Unknown payment/null; partial/repayment; mixed speech; hallucinated evidence; timeout/cancel; manual confirm |
| DB changes | Жоқ; eval offline/stub, money endpoints шақырылмайды |
| Expected evidence | EXP-A-01 per-utterance raw output/error/timing, WER және field scoring |
| Acceptance | Нақты N және per-language denominators; no leakage; measured errors retained; no unsupported accuracy claim |
| Risks | PII in audio, costs, small sample, model drift |
| Rollback | Eval harness бөлек; application transport сақталады; private audio келісімге сай жойылады |

## S3 — Forecast candidate validation and integration (P3)

| Өріс | Нақты scope |
|---|---|
| Күй | In progress |
| Тәуелділік | Candidate RS review; DS-C-REAL completeness; S1/S2 integration contract |
| Repository modules (apps/api prefix unless web) | candidate apps/api/app/services/forecasting.py; apps/api/app/services/research.py; apps/api/app/research_routes.py; apps/api/app/research_schemas.py; proposed apps/web/src/features/seller/research/ResearchPage.tsx |
| Implementation tasks | Existing ridge/mean/seasonal code-ті reuse; solver cross-check; rolling origins; true7/30 forecasts; no-data UI |
| Required tests | No future reversal leakage; unknown gaps vs0; threshold97/98,143/144; recursive test; baseline can win; tenant isolation |
| DB changes | Forecast үшін жаңа migration қажет емес; journal read-only |
| Expected evidence | Candidate pure25 report; synthetic JSON; real out-of-time report; screen provenance |
| Acceptance | No real eligible data→insufficient_data; h+cutoff visible; model selection validation only; deployed claims separate |
| Risks | No actual history; incomplete recording; single-origin instability; custom solver numeric error |
| Rollback | Research UI/route feature flag өшіру; existing analytics/journal untouched; source revert ғана |

## S4 — Debt risk assessment validation (P4)

| Өріс | Нақты scope |
|---|---|
| Күй | In progress |
| Тәуелділік | Candidate rules reviewed; actual debt semantics; supervised data gate |
| Repository modules (apps/api prefix unless web) | candidate apps/api/app/services/debt_risk.py; apps/api/app/services/research.py; apps/api/app/research_schemas.py; proposed apps/web/src/features/seller/research/ResearchPage.tsx |
| Implementation tasks | Existing rules-v1 reuse; review-priority wording; factor provenance; supervised path тек trustworthy labels болса |
| Required tests | Age7/8/30/31; initial_debt=balance+later_paid; reversals; paid/no-debt; cursor and tenant scopes |
| DB changes | Rules read-only; future labels үшін жаңа schema бөлек design review |
| Expected evidence | Boundary report; owner interpretation notes; label/censoring datasheet if feasible |
| Acceptance | No due dates→overdue unknown; score probability емес; metrics null without labels; no automatic decisions |
| Risks | Age overdue деп қате түсініледі; censored/noisy labels; rule weights емпирикалық емес |
| Rollback | Risk layer өшіру; debt list/balances unchanged; no ledger rewrite |

## S5 — Owner research workflow integration (P5)

| Өріс | Нақты scope |
|---|---|
| Күй | In progress |
| Тәуелділік | Candidate feedback0009 review; named researcher; consent/retention; route integration |
| Repository modules (apps/api prefix unless web) | candidate apps/api/app/models/__init__.py; apps/api/migrations/versions/0009_research_feedback.py; apps/api/app/services/research_feedback.py; apps/web/src/features/seller/research/FeedbackForm.tsx; proposed research page/router wiring |
| Implementation tasks | Standalone form-ды scoped route-қа қосу; private list/export implementation тексеру; recruitment protocol; withdrawal process |
| Required tests | Consent false→422; same request replay; changed body409; foreign user/business404; late response/session change; no PII logs |
| DB changes | Candidate0009 pending; тек isolated test DB; shared rollout separately authorized |
| Expected evidence | Consent text/version; DB/UI E2E evidence; actual pseudonymized raw sessions; no invented response |
| Acceptance | No recruitment before contact/storage/deletion assigned; not-used ratingnull; identified feedback truthfully labelled |
| Risks | Free-text PII; consent backend!=study permission; doc describes screen not yet wired |
| Rollback | Disable research navigation; preserve consented data; no DROP on shared DB; controlled forward fix |

## S6 — Full integration and diploma evidence package (P6)

| Өріс | Нақты scope |
|---|---|
| Күй | Not started |
| Тәуелділік | S1–S5 accepted or limitations explicit; official classification; author contribution |
| Repository modules (apps/api prefix unless web) | apps/api/tests/; apps/web/src/; apps/web/e2e/; apps/mobile/test/; packages/contracts/; docs/diploma/ |
| Implementation tasks | Fresh isolated integration run; type/lint/build/E2E; screenshot/experiment hash manifest; university and authorship review |
| Required tests | Existing ledger regression; generated contracts; real test DB rollback/isolation; RU/KK/mobile boundaries |
| DB changes | Тек қабылданған additive migrations; no automatic shared migration |
| Expected evidence | Final run logs; screenshots; experiment registry; author signoff; Platonus actual report later |
| Acceptance | All thesis claims mapped; missing results explicit; no synthetic→real conflation; no direct main merge |
| Risks | Environment mismatch, evidence stale, unresolved volume rules |
| Rollback | Docs/feature branch retained; deployments only later approved rollout; ledger backup/restore procedure owned by captain |
