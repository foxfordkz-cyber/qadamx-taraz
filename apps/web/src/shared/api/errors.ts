import type { components } from "./generated";

type ErrorFields = NonNullable<components["schemas"]["ErrorDetail"]["fields"]>;
export interface ErrorMetadata {
  requestId?: string;
  fields?: ErrorFields;
}
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly metadata: ErrorMetadata = {},
  ) {
    super(code);
  }
}
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/** Validate the published ErrorResponse envelope. Never retain raw server messages. */
export function parseApiError(
  status: number,
  payload: unknown,
  headerId: string | null,
): ApiError {
  const requestId =
    record(payload) && uuid(payload.request_id)
      ? payload.request_id
      : uuid(headerId)
        ? headerId
        : undefined;
  const detail =
    record(payload) && record(payload.error) ? payload.error : null;
  const code =
    detail &&
    typeof detail.code === "string" &&
    /^[A-Z][A-Z0-9_]{0,63}$/.test(detail.code)
      ? detail.code
      : `HTTP_${status}`;
  const fields: ErrorFields = Object.create(null);
  if (detail && record(detail.fields)) {
    for (const [path, values] of Object.entries(detail.fields).slice(0, 50)) {
      if (
        path.length <= 200 &&
        Array.isArray(values) &&
        values.length <= 20 &&
        values.every(
          (value) => typeof value === "string" && value.length <= 100,
        )
      ) {
        fields[path] = values;
      }
    }
  }
  return new ApiError(status, code, { requestId, fields });
}
