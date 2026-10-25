"""Author Stage10 cases without executing a parser. Never overwrite a freeze."""

import hashlib
import json
import subprocess
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
DATA = ROOT / "docs/diploma-evidence/final-integration"


def build():
    rows = []

    def add(lang, category, text, kind="sale", total=None, received=None, amount=None,
            query=None, names=(), payment="unknown", total_quote=None, pay_quote=None,
            amount_quote=None, expected_received="same", missing=(), uncertain=()):
        ident = f"S10-{len(rows) + 1:03}"
        customers = [
            {"ref": f"{ident}-c{i}", "business": business, "name": name}
            for i, (business, name) in enumerate(names)
        ]
        refs = [c["ref"] for c in customers if c["business"] == "local" and query and query in c["name"]]
        expected = {
            "outcome": "draft", "kind": kind, "total_minor": total,
            "received_minor": received if expected_received == "same" else expected_received,
            "amount_minor": amount, "customer_query": query, "customer_refs": refs,
            "clarification_fields": sorted(missing),
        }
        raw = {
            "transcript": text, "kind": kind, "description": "synthetic item",
            "customer_query": query, "total_minor": total, "received_minor": received,
            "amount_minor": amount, "payment_status": payment,
            "total_evidence": total_quote, "payment_evidence": pay_quote,
            "amount_evidence": amount_quote, "uncertain_fields": list(uncertain),
        }
        rows.append({
            "id": ident, "language": lang, "category": category, "input": text,
            "data_origin": "new researcher-authored synthetic text; no human reviewers",
            "active_business": "local", "customers": customers, "expected": expected,
            "provider_raw": json.dumps(raw, ensure_ascii=False),
        })

    # Independently written intents; no model/runtime calls in this authoring tool.
    material = {
        "ru": [
            "Пакет с блокнотами отдала за 1690 тенге. По карте получил 1690.",
            "Для Нурсулу заказ с упаковкой стоит 7400. Сейчас получила 1950, остаток позже.",
            "Чехол отдали за 3250. Способ и сумму оплаты пока не внесли.",
            "Записала на Гульжан комплект за 2870: всё в долг.",
            "Это доплата за вчерашний заказ: Нурсулу вернула 850.",
            "Клиент Марина взяла лампу за 4360; внесла 1360. В справочнике две Марины.",
            "Клиент Таисия забрала набор за 5100, внесла 1100.",
            "Чек за коврик на 5900, а получил 6000. Не знаю, была ли здесь сдача.",
            "Набор 7600, оплата 920 или 1250: сверка ещё не закончена.",
            "Покажи ассортимент керамики на следующую неделю.",
            "Чехол для пропуска: 184,50 тенге. Получил 84,50 тенге.",
        ],
        "kk": [
            "Қалам салғышты 1690 теңгеге саттым. Картаға 1690 төледі.",
            "Нұрсұлуға қаптамасымен тапсырыс 7400 теңге. Әзірге 1950 төледі, қалдығын кейін береді.",
            "Телефон қабын 3250 теңгеге бердік. Қанша төлегені әлі жазылмады.",
            "Гүлжанға жиынтық 2870 теңге, бәрі қарызға.",
            "Кешегі тапсырыстың қарызынан Нұрсұлу 850 қайтарды.",
            "Марина шамды 4360 теңгеге алды, 1360 төледі. Тізімде екі Марина бар.",
            "Таисия жинақты 5100 теңгеге алды, 1100 төледі.",
            "Кілемшенің бағасы 5900, бірақ 6000 алдым. Қайтарым болғанын білмеймін.",
            "Жиынтық 7600 теңге, төлем 920 әлде 1250, әлі тексерілмеді.",
            "Келесі аптадағы керамика түрлерін көрсет.",
            "Бейдж қабы 184,50 теңге. 84,50 төледі.",
        ],
        "mixed": [
            "Блокноттар пакеті 1690 теңге, получил по карте 1690.",
            "Нұрсұлуға заказ вместе с упаковкой 7400. Получил 1950, қалғанын кейін.",
            "Чехол 3250 теңге, оплату ещё не сверили.",
            "Гүлжанға комплект 2870, всё в долг.",
            "Кешегі заказдың қарызына Нұрсұлу вернула 850.",
            "Марина шам алды за 4360, внесла 1360. Екі Марина бар.",
            "Таисия набор алды за 5100, 1100 төледі.",
            "Кілемше 5900, получил 6000, сдачу ещё не уточнили.",
            "Набор 7600 теңге; төлем 920 или 1250, пока неясно.",
            "Покажи керамика ассортиментін на следующую неделю.",
            "Бейдж қабы 184,50 тенге. Получил 84,50.",
        ],
    }
    for lang, t in material.items():
        n = "Нурсулу" if lang == "ru" else "Нұрсұлу"
        g = "Гульжан" if lang == "ru" else "Гүлжан"
        pay = {
            "ru": ["получил 1690", "получила 1950", "всё в долг", "внесла 1360", "внесла 1100", "получил 6000", "Получил 84,50"],
            "kk": ["1690 төледі", "1950 төледі", "бәрі қарызға", "1360 төледі", "1100 төледі", "6000 алдым", "84,50 төледі"],
            "mixed": ["получил по карте 1690", "Получил 1950", "всё в долг", "внесла 1360", "1100 төледі", "получил 6000", "Получил 84,50"],
        }[lang]
        add(lang, "full_receipt", t[0], total=169000, received=169000, payment="paid", total_quote="1690", pay_quote=pay[0])
        add(lang, "partial_receipt", t[1], total=740000, received=195000, query=n, names=[("local", n)], payment="partial", total_quote="7400", pay_quote=pay[1])
        add(lang, "missing_payment", t[2], total=325000, total_quote="3250", missing=["customer_id", "received_minor"])
        add(lang, "explicit_debt", t[3], total=287000, received=0, query=g, names=[("local", g)], payment="debt", total_quote="2870", pay_quote=pay[2])
        add(lang, "repayment", t[4], kind="repayment", amount=85000, query=n, names=[("local", n)], amount_quote="850", missing=["sale_id"])
        add(lang, "duplicate_customer", t[5], total=436000, received=136000, query="Марина", names=[("local", "Марина"), ("local", "Марина"), ("foreign", "Марина")], payment="partial", total_quote="4360", pay_quote=pay[3], missing=["customer_id"])
        add(lang, "foreign_customer_only", t[6], total=510000, received=110000, query="Таисия", names=[("foreign", "Таисия")], payment="partial", total_quote="5100", pay_quote=pay[4], missing=["customer_id"])
        add(lang, "contradictory_receipt", t[7], total=590000, received=600000, payment="partial", total_quote="5900", pay_quote=pay[5], expected_received=None, missing=["customer_id", "received_minor"])
        add(lang, "unresolved_alternatives", t[8], total=760000, total_quote="7600", missing=["customer_id", "received_minor"], uncertain=["received_minor"])
        add(lang, "non_transaction", t[9], kind="unknown", missing=["kind"])
        add(lang, "decimal_receipt", t[10], total=18450, received=8450, payment="partial", total_quote="184,50", pay_quote=pay[6], missing=["customer_id"])

    # Protocol failures are a distinct structured-response stratum, not clean-text accuracy.
    for lang in ("ru", "kk", "mixed"):
        source = next(r for r in rows if r["language"] == lang and r["category"] == "full_receipt")
        for fault in ("duplicate_nested", "unknown_field", "malformed"):
            raw = source["provider_raw"]
            raw = {
                "duplicate_nested": raw[:-1] + ',"meta":{"paid":1,"paid":2}}',
                "unknown_field": raw[:-1] + ',"balance_minor":0}',
                "malformed": raw[:-1],
            }[fault]
            rows.append({
                **source, "id": f"S10-{len(rows)+1:03}", "category": fault,
                "provider_raw": raw, "expected": dict(outcome="unavailable", kind=None,
                    total_minor=None, received_minor=None, amount_minor=None,
                    customer_query=None, customer_refs=[], clarification_fields=[]),
            })
    return rows


if __name__ == "__main__":
    if (DATA / "challenge-freeze.json").exists():
        raise SystemExit("Frozen challenge already exists; do not regenerate")
    rows = build()
    old = [ROOT / "docs/diploma-evidence/ai-evaluation-stage8/dataset.jsonl"]
    seen = {json.loads(line)["input"] for f in old for line in f.read_text(encoding="utf-8").splitlines()}
    assert not {r["input"] for r in rows} & seen
    DATA.mkdir(parents=True, exist_ok=True)
    text = "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows)
    (DATA / "challenge.jsonl").write_text(text, encoding="utf-8")
    names = ["challenge.jsonl", "independent-qa-methodology.md"]
    hashes = {n: hashlib.sha256((DATA / n).read_bytes().replace(b"\r\n", b"\n")).hexdigest() for n in names}
    freeze = {
        "version": "stage10-new-author-challenge-v1", "count": len(rows),
        "semantics_count": 33, "structured_invalid_count": 9,
        "frozen_at_utc": datetime.now(UTC).isoformat(),
        "base": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
        "hashes_lf": hashes,
        "review": "Same exposed Codex author; new texts, not blinded human independence",
        "paid_calls": 0,
    }
    (DATA / "challenge-freeze.json").write_text(json.dumps(freeze, indent=2)+"\n", encoding="utf-8")
    print(f"Authored/frozen {len(rows)} cases. No evaluation performed.")
