# Small-business-owner research plan

Status: **pending real recruitment and consented responses**. No participant,
interview, quote or satisfaction result is claimed by this implementation.

## Objective and recruitment

Investigate whether owners can understand recorded sales/debt, interpret the limits
of forecasts and rule-based risk, and identify improvements with practical value.
Proposed formative sample: 5–10 adult owners/operators who personally record sales
or collect debts, with varied digital experience, business types and preferred
Russian/Kazakh language. This convenience sample cannot represent all SMEs.
Recruit only volunteers via the team's agreed channels; no scraping contacts,
requiring purchases, fabricated participants or coercion by an employer.

Questions: Which current workflows help? Which information is confusing? What
decision, if any, could a forecast support? Do owners distinguish debt age from
overdue status and a rules score from a probability? What is still missing?

## Consent and session protocol (15–20 minutes)

1. Explain voluntary participation, recording choices, purpose, withdrawal and
   access. Declining does not affect application access. Consent to an interview
   or recording is separate from the form's v1 consent. Do not record audio by default.
2. Record a pseudonymous participant ID, language, business type, recruitment
   channel and experience. Keep any consent/contact linkage in restricted storage,
   outside Git, separately from transcripts. Do not request revenue or customer names.
3. Ask the participant to show a typical workflow using a synthetic/local account.
   Do not create real sales or change balances for this study.
4. Let the participant interpret sales/debt, forecast and risk screens. If real
   eligible history is absent, show the explicitly synthetic example and record
   this limitation. Do not imply its forecast accuracy is established.
5. Ask the neutral questions below. Collect the optional in-app questionnaire;
   ratings allow “not used / cannot assess”. Observe difficulties without leading.
6. Ask separately about a follow-up interview. A checked willingness flag is not
   permission to record or an instruction to send messages automatically.

## Neutral interview questions

- How do you currently record a sale and an unpaid amount?
- Which Qadam functions have you actually used? Describe the last occasion.
- What do these sales/debt values mean to you? What, if anything, is unclear?
- What decision could this forecast affect, if any? When would you not trust it?
- What do you think the risk category means? What evidence would change your view?
- Which task still requires another tool or manual work?
- If one thing changed first, what would you choose and why?

## Collection, review and privacy

The RU/KZ form stores only features used, three optional 1–5 ratings, unresolved
problem, first improvement, optional suggestion, follow-up willingness, consent
version/language, timestamp and the existing account/business IDs. No contact field.
This is **identified private feedback**, not anonymous feedback. The API checks JWT
and owner membership and lists only the submitting user's responses in that point.
`POST /businesses/{id}/research/feedback` is idempotent by that user's
`client_request_id`; changed content under a committed key is 409. Only committed
201 is success; errors/timeouts retain the form in the current tab for explicit retry.

Review/export: on the research screen load **My saved responses**, page through
records and download each visible page as JSON. This is intentionally not an
unrestricted cross-business research endpoint. The owner may voluntarily provide
their export through an agreed private channel. Before analysis, the researcher
removes account/business/receipt IDs and potentially identifying free text.
Do not commit private exports or raw responses. Store them in access-controlled
research storage, not browser persistent storage. Restrict raw access to the named
researcher and captain; publish only reviewed aggregates/anonymous excerpts with
separate quote permission. A willingness flag does not expose an email address.

Operational retention: raw responses should be removed within 90 days or on a
verified withdrawal request using the receipt ID; the captain is responsible for
restricted administrative deletion and reviewing backups/exports. There is no
automatic scheduled purge in this feature; configure the retention process before
recruitment. Any longer retention requires renewed consent. Do not start actual
recruitment until the named contact, secure storage and deletion process are assigned.

## Analysis and findings template

Describe recruitment and drop-outs. Report actual N, missing/not-used ratings and
counts/distributions; do not convert missing responses into zero. Small ordinal
ratings are not proof of causal benefit. Code comments into usability, comprehension,
trust, missing capability and business-value themes; keep negative feedback and
contradictory cases. If possible, have a second reviewer check codes. Deduplicate
retries by receipt/request ID; explicitly decide how multiple submissions from one
participant are handled, without silently removing negative results.

| Field | Actual finding (pending) |
|---|---|
| Recruitment dates, channel, consent version | Not collected |
| Participant count / profile / language | Not collected |
| Functions actually used / unassessed ratings | Not collected |
| Difficulties and counterexamples | Not collected |
| Themes and representative consented excerpts | Not collected |
| Prioritized changes and rationale | Not collected |
| Withdrawals, duplicate-handling and limitations | Not collected |

Limitations: convenience sampling, self-selection, social desirability, small N,
novelty, language translation, synthetic demonstration and incomplete business
history. Separate observed behavior from participant opinion and team interpretation.
