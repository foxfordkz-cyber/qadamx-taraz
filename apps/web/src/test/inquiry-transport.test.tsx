import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { postInquiry } from "../features/explore/api";
import InquiryForm from "../features/inquiry/InquiryForm";
import { I18nProvider } from "../shared/i18n";

const business = "10000000-0000-4000-8000-000000000001";
const receipt = {
  id: "20000000-0000-4000-8000-000000000001",
  created_at: "2026-10-17T08:00:00Z",
};
const body = {
  client_request_id: "30000000-0000-4000-8000-000000000001",
  visitor_name: "Алия",
  contact: "buyer@example.test",
  message: "Учебная заявка",
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/api/v1");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it.each([
  { ...receipt, id: "not-a-uuid" },
  { ...receipt, created_at: "tomorrow" },
  { ...receipt, created_at: "2026-10-17T08:00:00" },
  { ...receipt, created_at: "2026-99-17T08:00:00Z" },
  null,
  [],
])(
  "rejects an invalid success receipt without claiming rejection of the POST: %j",
  async (value) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(value))),
    );
    await expect(postInquiry(business, body)).rejects.toMatchObject({
      status: 0,
      code: "INVALID_RESPONSE",
    });
    expect(vi.getTimerCount()).toBe(0);
  },
);

it("accepts an API receipt, clears its deadline and sends no seller credentials", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify(receipt)));
  vi.stubGlobal("fetch", fetch);
  await expect(postInquiry(business, body)).resolves.toEqual(receipt);
  expect(fetch).toHaveBeenCalledWith(
    `https://api.example.test/api/v1/businesses/${business}/inquiries`,
    expect.objectContaining({
      method: "POST",
      credentials: "omit",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }),
  );
  expect(vi.getTimerCount()).toBe(0);
});

it("deadline unlocks explicit retry while preserving the exact request after unknown outcome", async () => {
  const fetch = vi
    .fn()
    .mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal!.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    )
    .mockResolvedValueOnce(new Response(JSON.stringify(receipt)));
  vi.stubGlobal("fetch", fetch);
  render(
    <I18nProvider>
      <InquiryForm businessId={business} businessName="Учебный магазин" />
    </I18nProvider>,
  );
  fireEvent.change(screen.getByRole("textbox", { name: /ваше имя/i }), {
    target: { value: body.visitor_name },
  });
  fireEvent.change(
    screen.getByRole("textbox", { name: /как с вами связаться/i }),
    { target: { value: body.contact } },
  );
  fireEvent.change(screen.getByRole("textbox", { name: /что вы ищете/i }), {
    target: { value: body.message },
  });
  fireEvent.click(screen.getByRole("button", { name: "Отправить заявку" }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(20_000);
  });
  expect(screen.getByRole("alert")).toHaveTextContent("Не удалось подтвердить");
  expect(screen.getByRole("textbox", { name: /ваше имя/i })).toBeDisabled();
  expect(fetch).toHaveBeenCalledTimes(1);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Повторить отправку" }));
  });
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls[1][1].body).toBe(fetch.mock.calls[0][1].body);
  expect(screen.getByText("Заявка отправлена:")).toBeInTheDocument();
});
