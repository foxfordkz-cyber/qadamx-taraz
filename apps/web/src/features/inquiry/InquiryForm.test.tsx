import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import InquiryForm from "./InquiryForm";
import { REQUEST_TIMEOUT_MS } from "./api";
import { I18nProvider, LanguageSwitch } from "../../shared/i18n";

// All HTTP is intercepted. No real contacts, credentials or live database.
const shopA = {
  businessId: "22222222-2222-4222-8222-222222222222",
  businessName: "Учебный магазин A",
};
const shopB = {
  businessId: "55555555-5555-4555-8555-555555555555",
  businessName: "Учебный магазин B",
};
const receipt = {
  id: "33333333-3333-4333-8333-333333333333",
  created_at: "2026-10-17T10:00:00Z",
};
const fetcher = vi.fn<typeof fetch>();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const rejected = (status: number) =>
  json(
    {
      error: {
        code: `HTTP_${status}`,
        message: "DO_NOT_RENDER_SERVER_DETAILS",
      },
    },
    status,
  );

beforeEach(() => {
  fetcher.mockReset();
  fetcher.mockRejectedValue(new TypeError("Synthetic lost response"));
  vi.stubGlobal("fetch", fetcher);
  vi.stubEnv("VITE_API_BASE_URL", "https://inquiry-test.invalid/api/v1");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider>
    <LanguageSwitch />
    {children}
  </I18nProvider>
);
const open = () => render(<InquiryForm {...shopA} />, { wrapper });
function fill() {
  for (const [label, value] of [
    ["Имя посетителя", "  Synthetic visitor  "],
    ["Контакт", "  synthetic@example.test  "],
    ["Сообщение", "  Synthetic request  "],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
const submit = () =>
  fireEvent.submit(screen.getByLabelText("Имя посетителя").closest("form")!);
const success = () =>
  screen.findByRole("heading", { name: "Заявка отправлена" });
const pendingResponse = () => {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => {
    resolve = done;
  });
  fetcher.mockImplementationOnce(() => promise);
  return resolve;
};

it("requires exactly the three contract fields and focuses the first visible error", () => {
  open();
  submit();
  expect(screen.getAllByText("Заполните поле")).toHaveLength(3);
  expect(screen.getByLabelText("Имя посетителя")).toHaveFocus();
  for (const label of ["Имя посетителя", "Контакт", "Сообщение"]) {
    const input = screen.getByLabelText(label);
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Заполните поле");
  }
  fireEvent.change(screen.getByLabelText("Имя посетителя"), {
    target: { value: "S" },
  });
  expect(screen.getByLabelText("Имя посетителя")).toHaveFocus();
  expect(fetcher).not.toHaveBeenCalled();
});

it.each([
  ["Имя посетителя", 100],
  ["Контакт", 200],
  ["Сообщение", 2000],
] as const)(
  "validates %s whitespace and contract maximum %i",
  (label, limit) => {
    open();
    fill();
    expect(screen.getByLabelText(label)).toHaveAttribute(
      "maxlength",
      String(limit),
    );
    fireEvent.change(screen.getByLabelText(label), { target: { value: " " } });
    submit();
    expect(screen.getByLabelText(label)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    fireEvent.change(screen.getByLabelText(label), {
      target: { value: "x".repeat(limit + 1) },
    });
    submit();
    expect(screen.getByLabelText(label)).toHaveAccessibleDescription(
      /Сократите текст/,
    );
    expect(fetcher).not.toHaveBeenCalled();
  },
);

it("sends to the UUID, trims input, excludes display name/product/auth and confirms only after API", async () => {
  const finish = pendingResponse();
  open();
  fill();
  submit();
  submit();
  expect(fetcher).toHaveBeenCalledTimes(1);
  const [url, options] = fetcher.mock.calls[0];
  expect(url).toBe(
    `https://inquiry-test.invalid/api/v1/businesses/${shopA.businessId}/inquiries`,
  );
  expect(options).toMatchObject({
    method: "POST",
    credentials: "omit",
    redirect: "error",
  });
  expect(new Headers(options?.headers).has("Authorization")).toBe(false);
  expect(JSON.parse(String(options?.body))).toEqual({
    client_request_id: expect.stringMatching(/^[\da-f-]{36}$/i),
    visitor_name: "Synthetic visitor",
    contact: "synthetic@example.test",
    message: "Synthetic request",
  });
  expect(screen.getByRole("button", { name: "Отправляем…" })).toBeDisabled();
  expect(
    screen.queryByRole("heading", { name: "Заявка отправлена" }),
  ).not.toBeInTheDocument();
  await act(async () => finish(json(receipt)));
  await success();
  expect(screen.getByRole("status")).toHaveTextContent(
    `Заявка отправлена в магазин ${shopA.businessName}`,
  );
  expect(screen.getByText(receipt.id)).toBeVisible();
  expect(screen.getByRole("status").parentElement).toHaveFocus();
});

it.each([0, 408, 500, 502, 409])(
  "preserves input/key/body for uncertain outcome %i and only retries explicitly",
  async (status) => {
    if (status) fetcher.mockResolvedValueOnce(rejected(status));
    open();
    fill();
    submit();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/могла сохраниться/);
    expect(alert).not.toHaveTextContent("не отправлена");
    expect(alert).not.toHaveTextContent("DO_NOT_RENDER_SERVER_DETAILS");
    const contact = screen.getByLabelText("Контакт");
    expect(contact).toHaveValue("  synthetic@example.test  ");
    expect(contact).toHaveAttribute("readonly");
    expect(contact).not.toBeDisabled();
    expect(fetcher).toHaveBeenCalledTimes(1);
    fetcher.mockResolvedValueOnce(json(receipt));
    fireEvent.click(screen.getByRole("button", { name: "Повторить отправку" }));
    await success();
    expect(fetcher.mock.calls[1][1]?.body).toBe(fetcher.mock.calls[0][1]?.body);
  },
);

it("does not unlock an uncertain request when a later retry receives a 422", async () => {
  open();
  fill();
  submit();
  await screen.findByRole("alert");
  const original = fetcher.mock.calls[0][1]?.body;
  fetcher.mockResolvedValueOnce(rejected(422));
  fireEvent.click(screen.getByRole("button", { name: "Повторить отправку" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Результат отправки пока неизвестен",
  );
  expect(screen.getByLabelText("Контакт")).toHaveAttribute("readonly");
  fetcher.mockResolvedValueOnce(json(receipt));
  fireEvent.click(screen.getByRole("button", { name: "Повторить отправку" }));
  await success();
  expect(fetcher.mock.calls.map((call) => call[1]?.body)).toEqual([
    original,
    original,
    original,
  ]);
});

it.each([400, 401, 403, 404, 422, 429])(
  "retains editable input after confirmed rejection %i",
  async (status) => {
    fetcher.mockResolvedValueOnce(rejected(status));
    open();
    fill();
    submit();
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Контакт")).toHaveValue(
      "  synthetic@example.test  ",
    );
    expect(screen.getByLabelText("Контакт")).not.toHaveAttribute("readonly");
    expect(
      screen.queryByRole("heading", { name: "Заявка отправлена" }),
    ).not.toBeInTheDocument();
    const previous = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
    fireEvent.change(screen.getByLabelText("Сообщение"), {
      target: { value: "Corrected request" },
    });
    fetcher.mockResolvedValueOnce(json(receipt));
    fireEvent.click(screen.getByRole("button", { name: "Повторить отправку" }));
    await success();
    const next = JSON.parse(String(fetcher.mock.calls[1][1]?.body));
    expect(next.message).toBe("Corrected request");
    expect(next.client_request_id).not.toBe(previous.client_request_id);
  },
);

it.each([
  null,
  {},
  { id: "", created_at: "" },
  { ...receipt, id: "not-a-uuid" },
  { ...receipt, created_at: "tomorrow" },
  { ...receipt, created_at: "2026-10-17T10:00:00" },
])("never confirms a malformed 200 receipt (%j)", async (body) => {
  fetcher.mockResolvedValueOnce(json(body));
  open();
  fill();
  submit();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Результат отправки пока неизвестен",
  );
  expect(
    screen.queryByRole("heading", { name: "Заявка отправлена" }),
  ).not.toBeInTheDocument();
  expect(screen.getByLabelText("Контакт")).toHaveAttribute("readonly");
});

it("treats non-JSON success as unknown", async () => {
  fetcher.mockResolvedValueOnce(new Response("not-json", { status: 200 }));
  open();
  fill();
  submit();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Результат отправки пока неизвестен",
  );
});

it("bounds a stalled request, retains its key/body and does not auto-retry", async () => {
  vi.useFakeTimers();
  fetcher.mockImplementationOnce(
    (_url, options) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      }),
  );
  open();
  fill();
  submit();
  await act(async () => vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS));
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Результат отправки пока неизвестен",
  );
  expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
  expect(fetcher).toHaveBeenCalledTimes(1);
  fetcher.mockResolvedValueOnce(json(receipt));
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "Повторить отправку" })),
  );
  expect(
    screen.getByRole("heading", { name: "Заявка отправлена" }),
  ).toBeVisible();
  expect(fetcher.mock.calls[1][1]?.body).toBe(fetcher.mock.calls[0][1]?.body);
});

it.each(["success", "error"])(
  "ignores a late %s from another shop even if the caller supplies no key",
  async (outcome) => {
    const finish = pendingResponse();
    const view = open();
    fill();
    submit();
    const signal = fetcher.mock.calls[0][1]?.signal;
    view.rerender(<InquiryForm {...shopB} />);
    expect(signal?.aborted).toBe(true);
    expect(screen.getByText(shopB.businessName)).toBeVisible();
    expect(screen.getByLabelText("Контакт")).toHaveValue("");
    await act(async () =>
      finish(outcome === "success" ? json(receipt) : rejected(500)),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Заявка отправлена" }),
    ).not.toBeInTheDocument();
    fetcher.mockResolvedValueOnce(json(receipt));
    fill();
    submit();
    await success();
    expect(fetcher.mock.calls[1][0]).toContain(
      `/businesses/${shopB.businessId}/inquiries`,
    );
    expect(screen.getByRole("status")).toHaveTextContent(shopB.businessName);
  },
);

it("ignores an old A response after A → B → A remount", async () => {
  const finish = pendingResponse();
  const view = open();
  fill();
  submit();
  view.rerender(<InquiryForm {...shopB} />);
  view.rerender(<InquiryForm {...shopA} />);
  await act(async () => finish(json(receipt)));
  expect(screen.getByLabelText("Контакт")).toHaveValue("");
  expect(
    screen.queryByRole("heading", { name: "Заявка отправлена" }),
  ).not.toBeInTheDocument();
});

it("switches RU/KZ without losing input or replay context and translates failure/success", async () => {
  open();
  fill();
  submit();
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "KZ" }));
  expect(screen.getByLabelText("Келушінің аты")).toHaveValue(
    "  Synthetic visitor  ",
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Жіберу нәтижесі әзірге белгісіз",
  );
  fetcher.mockResolvedValueOnce(json(receipt));
  fireEvent.click(screen.getByRole("button", { name: "Қайта жіберу" }));
  await screen.findByRole("heading", { name: "Өтінім жіберілді" });
  expect(screen.getByRole("status")).toHaveTextContent(shopA.businessName);
  expect(fetcher.mock.calls[1][1]?.body).toBe(fetcher.mock.calls[0][1]?.body);
});

it("uses a fresh key only for a deliberate new inquiry after success", async () => {
  fetcher.mockResolvedValue(json(receipt));
  open();
  fill();
  submit();
  await success();
  fireEvent.click(screen.getByRole("button", { name: "Отправить ещё одну" }));
  expect(screen.getByLabelText("Контакт")).toHaveValue("");
  expect(fetcher).toHaveBeenCalledTimes(1);
  fetcher.mockResolvedValueOnce(json(receipt));
  fill();
  submit();
  await success();
  const bodies = fetcher.mock.calls.map((call) =>
    JSON.parse(String(call[1]?.body)),
  );
  expect(bodies[0].client_request_id).not.toBe(bodies[1].client_request_id);
});

it("does not send without API configuration and allows correction/retry", async () => {
  vi.stubEnv("VITE_API_BASE_URL", "");
  open();
  fill();
  submit();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Отправка сейчас недоступна",
  );
  expect(fetcher).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Контакт")).not.toHaveAttribute("readonly");
});

it("fails closed for an invalid recipient rather than posting to an arbitrary path", () => {
  render(<InquiryForm businessId="../other" businessName="Synthetic" />, {
    wrapper,
  });
  expect(
    screen.getByRole("button", { name: "Отправить заявку" }),
  ).toBeDisabled();
  submit();
  expect(fetcher).not.toHaveBeenCalled();
});

it("keeps distinct accessible field IDs across mounted forms", () => {
  render(
    <>
      <InquiryForm {...shopA} />
      <InquiryForm {...shopB} />
    </>,
    { wrapper },
  );
  const ids = [...document.querySelectorAll("[id]")].map(
    (element) => element.id,
  );
  expect(new Set(ids).size).toBe(ids.length);
});

it("never writes buyer details to logs or browser storage on success/error", async () => {
  const logs = ["log", "error", "warn", "info", "debug"] as const;
  const spies = logs.map((method) =>
    vi.spyOn(console, method).mockImplementation(() => {}),
  );
  open();
  fill();
  submit();
  await screen.findByRole("alert");
  fetcher.mockResolvedValueOnce(json(receipt));
  fireEvent.click(screen.getByRole("button", { name: "Повторить отправку" }));
  await success();
  for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  expect(JSON.stringify(localStorage)).not.toContain("synthetic@example.test");
  expect(sessionStorage.length).toBe(0);
});
