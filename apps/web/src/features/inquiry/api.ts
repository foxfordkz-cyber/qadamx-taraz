import { ApiError } from "../../shared/api/client";
import { publicRequest } from "../explore/api";
import type { InquiryInput, InquiryResult } from "../explore/types";

export const REQUEST_TIMEOUT_MS = 20_000;
export const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/** Same public transport and published route. No seller token, new API or field. */
export async function sendInquiry(
  businessId: string,
  body: InquiryInput,
  controller: AbortController,
): Promise<InquiryResult> {
  if (!isUuid(businessId)) throw new ApiError(400, "INVALID_BUSINESS");
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const receipt = await publicRequest(`/businesses/${businessId}/inquiries`, {
      method: "POST",
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (
      !receipt ||
      typeof receipt !== "object" ||
      Array.isArray(receipt) ||
      !("id" in receipt) ||
      !isUuid(receipt.id) ||
      !("created_at" in receipt) ||
      typeof receipt.created_at !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i.test(
        receipt.created_at,
      ) ||
      !Number.isFinite(Date.parse(receipt.created_at))
    )
      throw new ApiError(0, "INVALID_RESPONSE");
    return { id: receipt.id, created_at: receipt.created_at };
  } finally {
    clearTimeout(timer);
  }
}
