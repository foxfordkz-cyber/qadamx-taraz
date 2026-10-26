# Қайта өндіру нұсқаулығы

**Тақырып:** «Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу».

**Нұсқа күні:** 24.10.2026. Негізгі source: `main@2518b2e80b8c`. Зерттеу кандидаты: `feature/ml-sales-debt-research@b7c4750b158a`. Ресми жұмыс/жоба жіктелімі расталмаған.


## Source және data freeze

Core `2518b2e80b8c8ef881063a968645382d61aeb37e`; research candidate `b7c4750b158a6b1fc747e63a68ae7b2d078b5107`. Root `SOURCE_BASELINE.md`, `evidence/source_links.json`, `MANIFEST_SHA256.csv` exact source/file hashes береді. Historical previous audit сақталған, жаңа scope оған тәуелсіз салыстырылған. Model calls, DB migrations, deployment жасалмады. Dependencies/API uv.lock арқылы pinned; system runtime нұсқалары root verification-да беріледі.

## Өлшенген engineering artifacts

- `evidence/candidate-pure-tests.log/xml`: кандидаттың `test_forecasting.py` және `test_debt_risk.py`,25passed,1warning. DB/API/UI кандидаты орындалмады.
- `evidence/synthetic-forecast-7.json`, `synthetic-forecast-30.json`: existing CLI generated engineering series; `synthetic-sales-180.csv` дәл сол formula/start/day саны; raw forecast actual/pred rows `synthetic-predictions.csv` ішінде.
- `evidence/no-real-data.json`: insufficient_data, observed0, required98. Нақты бизнес метрикасы null.
- `evidence/assistant-counterexamples.jsonl`: төрт targeted invalid case, current accepted/rejected; valid class жоқ.
- Prior main logs `evidence/previous_runs/`: API229/32skip/129deselected, web rerun610, demoE2E6. Fresh all-suite run деп аталмайды; initial web16fail log та сақталады.

## Candidate engineering rerun

Таза isolated checkout-та candidate SHA-ны таңдаңыз. API lock dependency орнатылған соң `apps/api` ішінде `python -m pytest -q tests/test_forecasting.py tests/test_debt_risk.py`; DB/Auth/AI environment unset, network call жоқ. Existing CLI: `python -m app.evaluate_research --help`; осы CLI-дің нақты аргументтері `evidence/reproduction_commands.txt` ішінде. Dependency/runtime нұсқасы өзгере қалса жаңа run ID сақтаңыз.

Self-contained pure synthetic replay: пакет түбірінде `python tools/reproduce_synthetic.py`. Ол SHA-labelled forecasting source snapshot пен deterministic180 күнді пайдаланады, ешқандай database/network қажет етпейді. `replayed_synthetic_results.json` сол іске қосылған каталогта жазылады. Snapshot application-ға install/merge жасалмайды; бұл code evidence көшірмесі. Script hash/data hash numeric comparison қосымша тексеріледі.

## Жариялау және private data

Private gold/audio/business/person-linked feedback Git/ZIP-ке түспейді. Hash metadata sensitive identifiers-ді жасырмайды: public sample тек synthetic. Public UCI/KSC жүктелмеген; license attribution/download version кейін бекітіледі. Catering project-generated dataset қолданылмады. Failed observations өшірілмейді; rerun previous failed run-ды алмастырмайды.
