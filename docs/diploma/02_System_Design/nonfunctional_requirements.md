# Функционалдық емес талаптар

**Тақырып:** «Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу».

**Нұсқа күні:** 24.10.2026. Негізгі source: `main@2518b2e80b8c`. Зерттеу кандидаты: `feature/ml-sales-debt-research@b7c4750b158a`. Ресми жұмыс/жоба жіктелімі расталмаған.

| ID | Санат | Критерий | Дәлел/шектеу |
|---|---|---|---|
| NFR01 | Correctness | Minor integer, constraints, atomic receipt | Код бар; isolated DB regression әлі қажет |
| NFR02 | Idempotency | Ledger durable receipt; web money pending runtime memory | Browser refresh financial recovery шектеуі сақталады |
| NFR03 | Security | JWT claims және owner membership, tenant FK | Core RLS деп жарияланбайды; candidate feedback RLS бөлек |
| NFR04 | AI resilience | Timeout/429/invalid JSON→manual/fallback | Stub tests live provider quality емес |
| NFR05 | Latency | Decode/STT/extraction/validation бөлек timing | Қатаң production p95 target өлшенген жоқ; SLO owner бекітеді |
| NFR06 | Multilingual | RU/KK interface және input; mixed evaluation stratum | mixed locale API enum емес, API auto қолданылуы мүмкін |
| NFR07 | Privacy | Secret server-side; raw finance/audio no Git | Provider-ге transcript/customer fact берілуі мүмкін; study consent бөлек |
| NFR08 | Reproducibility | Source SHA, dataset hash, config, raw observations | Synthetic, public real, authorized бөлек tags |
| NFR09 | No-data honesty | Missing≠0; real dataset absent→unavailable | Forecast SQL бос күнді0 етеді; completeness assumption сырттан расталуы керек |
| NFR10 | Maintainability | Бір FastAPI, shared contract, additive research | API schema және generated TS бірге тексеріледі |

Жүктеме, uptime, user count не latency мәндері ойдан қойылмады. Engineering budget және academic metric қабылдауы нақты protocol-мен алдын ала бекітіледі.
