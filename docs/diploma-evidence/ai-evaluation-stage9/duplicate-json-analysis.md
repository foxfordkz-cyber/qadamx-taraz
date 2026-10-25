# Strict JSON: cause, boundaries and verification

The Stage 8 OpenAI path contained two lossy conversions:

1. HTTP response bytes → `response.json()` → Python dictionary. Duplicate envelope keys, including nested usage or transcription fields, were already gone.
2. Responses API `output[].content[].text` → `json.loads` → transcript replacement → `json.dumps`. Duplicate financial fields disappeared before the common extraction validator's object-pairs hook could inspect them.

A late uniqueness check could not repair either loss. Stage 8's characterization test demonstrated acceptance through OpenAI although direct validation rejected the same raw duplicate. Its original evidence is retained.

## Implemented boundaries

`strict_json_object` accepts only raw text/bytes/bytearray. Its recursive
`object_pairs_hook` checks every object before conversion; escaped spellings of
the same key compare as the same decoded key. Nested objects inside arrays are
also checked. It rejects malformed JSON/UTF-8, non-object roots, nonfinite constants,
overflowing floating-point numbers and recursion errors without including the
response in error messages.

OpenAI HTTP bytes are checked before usage extraction, status selection or STT
text extraction. Its inner extraction text is checked again before transcript
replacement and re-encoding. Gemini HTTP bytes and the common extraction text
use the same decoder. This includes transcription responses because they use the
same OpenAI `post` method.

Already-decoded objects are refused at the raw boundary. They cannot establish
uniqueness, and the implementation does not claim to recover keys discarded by a
remote provider or SDK. Current adapters use httpx raw response content; they do
not depend on SDK objects.

## Schemas and supported responses

Vendor envelope metadata is not an extraction field: legitimate IDs, usage and
reasoning entries remain supported under existing envelope selection rules.
Unexpected **extraction** fields are rejected by the existing Pydantic
`Extraction` schema (`extra=forbid`). That schema runs after strict parsing in
the common extraction pipeline. No external OpenAPI field was added.

Existing limits (32,000 characters for extraction text), completion status,
single message/content requirements, refusal/incomplete handling and authoritative
input/STT transcript behavior remain. The existing provider format suite passes;
this is not a claim that arbitrary future vendor formats will be accepted.

## Errors, retries and writes

Invalid extraction yields the existing HTTP 503 / `AI_UNAVAILABLE`, allowing
manual entry and retaining UI input. A ValueError from malformed/duplicate JSON
does not trigger the OpenAI limited fallback provider. Existing HTTP/rate-limit/
timeout mappings remain. OpenAI malformed output is attempted once; the inherited
Gemini maximum-attempt policy is unchanged, not a newly added retry.

Actual FastAPI routes with a disposable PostgreSQL database verify that duplicate
inner/envelope keys, unexpected fields and malformed JSON create neither draft nor
operation. Unauthenticated/foreign-business requests are rejected before provider
invocation. Browser tests exercise the production inner OpenAI decoder using a
synthetic response-body adapter, while transport tests separately exercise raw
HTTP decoding. Neither is a live OpenAI measurement.

See [test report](integration-test-report.md), [raw logs](logs/) and
[editable extraction flow](extraction-flow.mmd).
