# Error analysis

## Failures observed in the frozen original implementation

| Mechanism | Example cases | Implemented response |
|---|---|---|
| Wrong KZT/tiyn scale or numeric value despite a source quote | S7-003, S7-011, S7-062 | Parse supported quoted RU/KK numerals using Decimal; retain integer tiyn and contract cap |
| Paid/debt label replaces an explicitly stated partial receipt | S7-021, S7-022, S7-034 | Ground receipt in its source quote; do not blindly equate paid with total or debt with zero |
| Missing payment guessed as zero | S7-053 through S7-056 | Null receipt and existing localized clarification |
| Ambiguous or unspoken customer attached to draft | S7-081 through S7-086 | Require a supported spoken name form; clear uncertain query; existing scoped picker remains authoritative |
| Unsupported/ambiguous amount retained | S7-087, S7-088 | Request clarification instead of guessing |
| Duplicate JSON key silently overwrites amount | S7-096 | Reject provider output; existing manual fallback and retry policy |

See raw case rows for exact before/after values; categories overlap and this table is not a
second denominator. Additional regression tests use unseen amounts/names and adjacent
negation, rather than inserting case IDs or example sentences into production code.

## Retained conservative regression: S7-090

Source: “Ерланға мыңға тауар, екі мың төледі”.
The provider quotes just “мың” for the sale total. That fragment occurs both on its own and
inside “екі мың”. The new boundary check refuses to treat both occurrences as the same
unambiguous amount. It clears total and asks for clarification. A quoted receipt of 2000 is
retained, but cannot be saved as a sale without a valid total and confirmation.

Gold expects total 1000 and an unknown payment because 2000 exceeds that total. Consequently
amount, payment, clarification and full-match metrics lose this one case. The existing
operation schema rejects overpayment; no financial safeguard was weakened.
We retain the conservative implementation instead of special-casing this sentence.

## Limits and remaining work

- Source-to-amount parsing is deliberately bounded, not a general Kazakh/Russian grammar.
  Unsupported slang, fractional syntax, negative/approximate amounts and unfamiliar
  inflections may require manual correction.
- The provider still chooses intent and which source fragment describes which field.
  Grounding a number proves the quoted value, not that the semantic role is correct.
- For audio, the transcript itself comes from the provider. A plausible but incorrect ASR
  transcript is not detectable with this text-only validation.
- Name grounding is not person identity or a replacement for tenant-scoped candidate lookup.
  Multiword names, alternative conjunctions and complex discourse need independent evaluation.
- Strict repeated-fragment, context and foreign-currency checks can over-clarify.
  No automatic currency conversion is implemented.
- Explicit uncertain fields remain null. Unsupported output is never a reason to write money.
- Development corpus annotations were authored by the implementer; no blind holdout or
  independent linguistic adjudication exists. Provider failures were injected, not collected.

Stage 8 should freeze a separate independently reviewed holdout, agree a live-provider
budget/model configuration, collect raw anonymized outcomes with consent, and test ASR on
physical devices. Evaluate abstention and correction burden separately from exact match.
Improve citation spans/role validation only after those errors are observed; preserve
human confirmation, tenant boundaries and ledger idempotency.
