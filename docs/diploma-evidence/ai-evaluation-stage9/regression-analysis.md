# All twelve Stage 8 regressions

The old Stage 8 comparison had twelve regressions relative to Stage 6.
Here “before” means the exact Stage 8 runtime at 08fd3eef, not Stage 6.
All values below are read from frozen records and actual paired outputs.
Money is integer tiyn; null means unknown, not zero. customer_refs are synthetic
fixture aliases, not merchant customer IDs.

All twelve have a source-supported correction. Some still require safety
clarification: S8-016 payment; S8-030/034/036 original sale. Those are deliberately
retained. No identity or original-sale ID is guessed.

## S8-003 — ru

Input: На кассе книга за 640. За неё получено 640, сдачу уже вернул.

Cause: Receipt lexicon omitted «получено»; supported numeric payment became null, which also forced customer clarification.

Safety judgement/fix: Unnecessary. Accept the explicit receipt phrase; no customer is needed for full payment.

Exact expected / before / after:

~~~json
{
  "expected": {
    "outcome": "draft",
    "kind": "sale",
    "total_minor": 64000,
    "received_minor": 64000,
    "amount_minor": null,
    "customer_query": null,
    "customer_refs": [],
    "clarification_fields": []
  },
  "before": {
    "outcome": "draft",
    "kind": "sale",
    "total_minor": 64000,
    "received_minor": null,
    "amount_minor": null,
    "customer_query": null,
    "customer_refs": [],
    "clarification_fields": [
      "customer_id",
      "received_minor"
    ]
  },
  "after": {
    "outcome": "draft",
    "kind": "sale",
    "total_minor": 64000,
    "received_minor": 64000,
    "amount_minor": null,
    "customer_query": null,
    "customer_refs": [],
    "clarification_fields": []
  }
}
~~~

## S8-006 — kk

Input: Алдымен 2300 берді. Ләззаттың орамалының толық бағасы 9100.

Cause: Name evidence recognized Ләззат but did not include Kazakh genitive ending -тың; query and local candidate were dropped.

Safety judgement/fix: Unnecessary customer clarification. Add bounded genitive morphology; keep business lookup.

Exact expected / before / after:

~~~json
{
  "expected": {
    "outcome": "draft",
    "kind": "sale",
    "total_minor": 910000,
    "received_minor": 230000,
    "amount_minor": null,
    "customer_query": "Ләззат",
    "customer_refs": [
      "S8-006-local"
    ],
    "clarification_fields": []
  },
  "before": {
    "outcome": "draft",
    "kind": "sale",
    "total_minor": 910000,
    "received_minor": 230000,
    "amount_minor": null,
    "customer_query": null,
    "customer_refs": [],
    "clarification_fields": [
      "customer_id"
    ]
  },
  "after": {
    "outcome": "draft",
    "kind": "sale",
    "total_minor": 910000,
    "received_minor": 230000,
    "amount_minor": null,
    "customer_query": "Ләззат",
    "customer_refs": [
      "S8-006-local"
    ],
    "clarification_fields": []
  }
}
~~~

## S8-011 — mixed

Input: Кітап 640 стоит. Получено 640, қайтарым берілді.

Cause: Mixed input contains the same unsupported «Получено» receipt form.

Safety judgement/fix: Unnecessary. The source explicitly supplies both 640 values.

Exact expected / before / after:

~~~json
{
  "expected": {
    "outcome": "draft",
    "kind": "sale",
    "total_minor": 64000,
    "received_minor": 64000,
    "amount_minor": null,
    "customer_query": null,
    "customer_refs": [],
    "clarification_fields": []
  },
  "before": {
    "outcome": "draft",
    "kind": "sale",
    "total_minor": 64000,
    "received_minor": null,
    "amount_minor": null,
    "customer_query": null,
    "customer_refs": [],
    "clarification_fields": [
      "customer_id",
      "received_minor"
    ]
  },
  "after": {
    "outcome": "draft",
    "kind": "sale",
    "total_minor": 64000,
    "received_minor": 64000,
    "amount_minor": null,
    "customer_query": null,
    "customer_refs": [],
    "clarification_fields": []
  }
}
~~~

## S8-013 — ru

Input: Термос для Риммы стоит 5600. В кассу ничего не заплатила; всё в долг.

Cause: The earlier explicit nonpayment «ничего не заплатила» was treated as negation of following «всё в долг».

Safety judgement/fix: Unnecessary payment clarification. Mask only recognized affirmative zero clauses in the prefix; retain surrounding conditional/negation guards.

Exact expected / before / after:

~~~json
{
  "expected": {
    "outcome": "draft",
    "kind": "sale",
    "total_minor": 560000,
    "received_minor": 0,
    "amount_minor": null,
    "customer_query": "Римма",
    "customer_refs": [
      "S8-013-local"
    ],
    "clarification_fields": []
  },
  "before": {
    "outcome": "draft",
    "kind": "sale",
    "total_minor": 560000,
    "received_minor": null,
    "amount_minor": null,
    "customer_query": "Римма",
    "customer_refs": [
      "S8-013-local"
    ],
    "clarification_fields": [
      "received_minor"
    ]
  },
  "after": {
    "outcome": "draft",
    "kind": "sale",
    "total_minor": 560000,
    "received_minor": 0,
    "amount_minor": null,
    "customer_query": "Римма",
    "customer_refs": [
      "S8-013-local"
    ],
    "clarification_fields": []
  }
}
~~~

## S8-016 — ru

Input: Мука для Инги на 9800. Она собирается заплатить завтра, сумму не называла.

Cause: Инга→Инги was missing from bounded Russian name morphology; customer clarification was added.

Safety judgement/fix: Only customer clarification is unnecessary. Payment remains unknown: tomorrow's intended payment is not a received amount.

Exact expected / before / after:

~~~json
{
  "expected": {
    "outcome": "draft",
    "kind": "sale",
    "total_minor": 980000,
    "received_minor": null,
    "amount_minor": null,
    "customer_query": "Инга",
    "customer_refs": [
      "S8-016-local"
    ],
    "clarification_fields": [
      "received_minor"
    ]
  },
  "before": {
    "outcome": "draft",
    "kind": "sale",
    "total_minor": 980000,
    "received_minor": null,
    "amount_minor": null,
    "customer_query": null,
    "customer_refs": [],
    "clarification_fields": [
      "customer_id",
      "received_minor"
    ]
  },
  "after": {
    "outcome": "draft",
    "kind": "sale",
    "total_minor": 980000,
    "received_minor": null,
    "amount_minor": null,
    "customer_query": "Инга",
    "customer_refs": [
      "S8-016-local"
    ],
    "clarification_fields": [
      "received_minor"
    ]
  }
}
~~~

## S8-018 — kk

Input: Азық-түлік бағасы 7350. Картадан 7350 түсті.

Cause: Receipt lexicon omitted «түсті», so an explicit 7350 receipt was nulled.

Safety judgement/fix: Unnecessary. Add bounded past receipt form, with question/negation/future guards.

Exact expected / before / after:

~~~json
{
  "expected": {
    "outcome": "draft",
    "kind": "sale",
    "total_minor": 735000,
    "received_minor": 735000,
    "amount_minor": null,
    "customer_query": null,
    "customer_refs": [],
    "clarification_fields": []
  },
  "before": {
    "outcome": "draft",
    "kind": "sale",
    "total_minor": 735000,
    "received_minor": null,
    "amount_minor": null,
    "customer_query": null,
    "customer_refs": [],
    "clarification_fields": [
      "customer_id",
      "received_minor"
    ]
  },
  "after": {
    "outcome": "draft",
    "kind": "sale",
    "total_minor": 735000,
    "received_minor": 735000,
    "amount_minor": null,
    "customer_query": null,
    "customer_refs": [],
    "clarification_fields": []
  }
}
~~~

## S8-030 — kk

Input: Бұл жаңа сату емес: Мақсаттың ескі қарызына 805 түсті.

Cause: Мақсаттың was not recognized as source support for Мақсат.

Safety judgement/fix: Customer clarification is unnecessary; sale_id clarification is necessary and retained.

Exact expected / before / after:

~~~json
{
  "expected": {
    "outcome": "draft",
    "kind": "repayment",
    "total_minor": null,
    "received_minor": null,
    "amount_minor": 80500,
    "customer_query": "Мақсат",
    "customer_refs": [
      "S8-030-local"
    ],
    "clarification_fields": [
      "sale_id"
    ]
  },
  "before": {
    "outcome": "draft",
    "kind": "repayment",
    "total_minor": null,
    "received_minor": null,
    "amount_minor": 80500,
    "customer_query": null,
    "customer_refs": [],
    "clarification_fields": [
      "customer_id",
      "sale_id"
    ]
  },
  "after": {
    "outcome": "draft",
    "kind": "repayment",
    "total_minor": null,
    "received_minor": null,
    "amount_minor": 80500,
    "customer_query": "Мақсат",
    "customer_refs": [
      "S8-030-local"
    ],
    "clarification_fields": [
      "sale_id"
    ]
  }
}
~~~

## S8-034 — mixed

Input: Мақсаттың қарызына поступило 805, бұл сатылым емес.

Cause: Same missing genitive ending in mixed-language repayment.

Safety judgement/fix: Retain original-sale selection; repair only query/candidate evidence.

Exact expected / before / after:

~~~json
{
  "expected": {
    "outcome": "draft",
    "kind": "repayment",
    "total_minor": null,
    "received_minor": null,
    "amount_minor": 80500,
    "customer_query": "Мақсат",
    "customer_refs": [
      "S8-034-local"
    ],
    "clarification_fields": [
      "sale_id"
    ]
  },
  "before": {
    "outcome": "draft",
    "kind": "repayment",
    "total_minor": null,
    "received_minor": null,
    "amount_minor": 80500,
    "customer_query": null,
    "customer_refs": [],
    "clarification_fields": [
      "customer_id",
      "sale_id"
    ]
  },
  "after": {
    "outcome": "draft",
    "kind": "repayment",
    "total_minor": null,
    "received_minor": null,
    "amount_minor": 80500,
    "customer_query": "Мақсат",
    "customer_refs": [
      "S8-034-local"
    ],
    "clarification_fields": [
      "sale_id"
    ]
  }
}
~~~

## S8-036 — mixed

Input: Ләззаттың екі чегі бар, погашение 250, чек пока не выбрали.

Cause: Ләззаттың was dropped despite explicit name. Two receipts also mean sale_id remains unresolved.

Safety judgement/fix: Repair customer query only. Selecting an original sale remains mandatory.

Exact expected / before / after:

~~~json
{
  "expected": {
    "outcome": "draft",
    "kind": "repayment",
    "total_minor": null,
    "received_minor": null,
    "amount_minor": 25000,
    "customer_query": "Ләззат",
    "customer_refs": [
      "S8-036-local"
    ],
    "clarification_fields": [
      "sale_id"
    ]
  },
  "before": {
    "outcome": "draft",
    "kind": "repayment",
    "total_minor": null,
    "received_minor": null,
    "amount_minor": 25000,
    "customer_query": null,
    "customer_refs": [],
    "clarification_fields": [
      "customer_id",
      "sale_id"
    ]
  },
  "after": {
    "outcome": "draft",
    "kind": "repayment",
    "total_minor": null,
    "received_minor": null,
    "amount_minor": 25000,
    "customer_query": "Ләззат",
    "customer_refs": [
      "S8-036-local"
    ],
    "clarification_fields": [
      "sale_id"
    ]
  }
}
~~~

## S8-086 — ru

Input: Комплект на полторы тысячи. Денежку всю занесли, но чека у меня пока нет.

Cause: Full-payment grammar omitted «Денежку всю занесли»; paid label alone was correctly insufficient.

Safety judgement/fix: Source supports full receipt. Add cash-object + entirety + past-transfer grammar, never paid-label-only inference.

Exact expected / before / after:

~~~json
{
  "expected": {
    "outcome": "draft",
    "kind": "sale",
    "total_minor": 150000,
    "received_minor": 150000,
    "amount_minor": null,
    "customer_query": null,
    "customer_refs": [],
    "clarification_fields": []
  },
  "before": {
    "outcome": "draft",
    "kind": "sale",
    "total_minor": 150000,
    "received_minor": null,
    "amount_minor": null,
    "customer_query": null,
    "customer_refs": [],
    "clarification_fields": [
      "customer_id",
      "received_minor"
    ]
  },
  "after": {
    "outcome": "draft",
    "kind": "sale",
    "total_minor": 150000,
    "received_minor": 150000,
    "amount_minor": null,
    "customer_query": null,
    "customer_refs": [],
    "clarification_fields": []
  }
}
~~~

## S8-090 — kk

Input: Жинақ бір жарым мың. Ақшасын түгелдей ұстатты, чек қолымда жоқ.

Cause: Full-payment grammar omitted «Ақшасын түгелдей ұстатты».

Safety judgement/fix: Source-supported full receipt; add bounded grammar with uncertainty guards.

Exact expected / before / after:

~~~json
{
  "expected": {
    "outcome": "draft",
    "kind": "sale",
    "total_minor": 150000,
    "received_minor": 150000,
    "amount_minor": null,
    "customer_query": null,
    "customer_refs": [],
    "clarification_fields": []
  },
  "before": {
    "outcome": "draft",
    "kind": "sale",
    "total_minor": 150000,
    "received_minor": null,
    "amount_minor": null,
    "customer_query": null,
    "customer_refs": [],
    "clarification_fields": [
      "customer_id",
      "received_minor"
    ]
  },
  "after": {
    "outcome": "draft",
    "kind": "sale",
    "total_minor": 150000,
    "received_minor": 150000,
    "amount_minor": null,
    "customer_query": null,
    "customer_refs": [],
    "clarification_fields": []
  }
}
~~~

## S8-094 — mixed

Input: Набор бір жарым мың. Денежку всю ұстатты, чека нет.

Cause: Mixed cash-object/full-transfer phrase «Денежку всю ұстатты» was unsupported.

Safety judgement/fix: Source-supported full receipt; same general grammar, no case-specific amounts.

Exact expected / before / after:

~~~json
{
  "expected": {
    "outcome": "draft",
    "kind": "sale",
    "total_minor": 150000,
    "received_minor": 150000,
    "amount_minor": null,
    "customer_query": null,
    "customer_refs": [],
    "clarification_fields": []
  },
  "before": {
    "outcome": "draft",
    "kind": "sale",
    "total_minor": 150000,
    "received_minor": null,
    "amount_minor": null,
    "customer_query": null,
    "customer_refs": [],
    "clarification_fields": [
      "customer_id",
      "received_minor"
    ]
  },
  "after": {
    "outcome": "draft",
    "kind": "sale",
    "total_minor": 150000,
    "received_minor": 150000,
    "amount_minor": null,
    "customer_query": null,
    "customer_refs": [],
    "clarification_fields": []
  }
}
~~~

## Remaining conservative failures outside those twelve

S8-080 and S8-084 retain the repeated “мың” ambiguity described in
[comparison results](comparison-results.md). They are still wrong against gold,
but weakening the occurrence rule just for them is not justified.
The supplementary suite checks different amounts/names, omitted negations,
questions, alternatives, future intent, explicit zero versus conditional zero,
ambiguous names, malformed output and nested duplicate keys.
