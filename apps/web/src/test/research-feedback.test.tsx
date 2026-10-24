import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../shared/i18n";
import { ApiError, type ApiClient } from "../shared/api/client";
import {
  FeedbackForm,
  validFeedback,
  type Feedback,
} from "../features/seller/research/FeedbackForm";

const id = "ad6203bc-7320-5b36-982b-135504c5af68";
const payload: Feedback = {
  client_request_id: id,
  language: "kk",
  consent: true,
  consent_version: "v1",
  features_used: [],
  sales_debt_clarity: null,
  forecast_usefulness: null,
  risk_clarity: null,
  improve_first: "Өрістер",
  suggestion: "",
  unresolved_problem: "",
  follow_up: false,
};
function setup(
  request = vi.fn(),
  enabled = true,
  drafts?: Map<string, unknown>,
  scope = "a:1",
  businessId = id,
) {
  const view = render(
    <I18nProvider>
      <FeedbackForm
        api={{ request }}
        businessId={businessId}
        enabled={enabled}
        drafts={drafts}
        scope={scope}
      />
    </I18nProvider>,
  );
  return { ...view, request };
}
function fill() {
  fireEvent.change(screen.getByLabelText(/Что улучшить первым/), {
    target: { value: "Крупнее подписи" },
  });
  fireEvent.click(screen.getByLabelText(/Согласен на описанную/));
}
describe("consented research feedback", () => {
  it("requires consent and counts Unicode code points", () => {
    expect(validFeedback({ ...payload, consent: false })).toBe(false);
    expect(
      validFeedback({
        ...payload,
        improve_first: "𐐀".repeat(500),
        suggestion: "Қ".repeat(2000),
      }),
    ).toBe(true);
    expect(validFeedback({ ...payload, improve_first: "𐐀".repeat(501) })).toBe(
      false,
    );
  });
  it("does not send an invalid form or Demo response", () => {
    const { request } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Отправить отзыв" }));
    expect(request).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Проверьте согласие");
  });
  it("disables persistence in Demo", () => {
    const { request } = setup(vi.fn(), false);
    expect(
      screen.getByRole("button", { name: "Отправить отзыв" }),
    ).toBeDisabled();
    expect(request).not.toHaveBeenCalled();
  });
  it("blocks double submission and accepts only a matching receipt", async () => {
    let resolve!: (value: unknown) => void;
    const request = vi.fn<ApiClient["request"]>(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    setup(request);
    fill();
    const button = screen.getByRole("button", { name: "Отправить отзыв" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(request).toHaveBeenCalledTimes(1);
    const body = JSON.parse(request.mock.calls[0][1]!.body as string);
    await act(async () =>
      resolve({
        id,
        client_request_id: body.client_request_id,
        created_at: "2026-10-24T10:00:00Z",
      }),
    );
    expect(screen.getByText(/Ответ сохранён сервером/)).toBeVisible();
  });
  it("preserves exact body and key after a lost response; no automatic retry", async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(0, "NETWORK_ERROR"))
      .mockImplementation(async (_path, init) => ({
        id,
        client_request_id: JSON.parse(init.body).client_request_id,
        created_at: "2026-10-24T10:00:00Z",
      }));
    setup(request);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Отправить отзыв" }));
    const retry = await screen.findByRole("button", {
      name: "Повторить тот же ответ",
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/Что улучшить первым/)).toHaveValue(
      "Крупнее подписи",
    );
    expect(screen.getByLabelText(/Что улучшить первым/)).toBeDisabled();
    fireEvent.click(retry);
    await waitFor(() =>
      expect(screen.getByText(/Ответ сохранён сервером/)).toBeVisible(),
    );
    expect(request.mock.calls[1][1].body).toBe(request.mock.calls[0][1].body);
  });
  it("keeps editable fields after server validation rejection", async () => {
    setup(vi.fn().mockRejectedValue(new ApiError(422, "VALIDATION_ERROR")));
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Отправить отзыв" }));
    await screen.findByText(/Сервер отклонил/);
    expect(screen.getByLabelText(/Что улучшить первым/)).toBeEnabled();
  });
  it("leaves loading on timeout even if transport ignores abort and ignores its late receipt", async () => {
    vi.useFakeTimers();
    try {
      let resolve!: (value: unknown) => void;
      const request = vi.fn<ApiClient["request"]>(
        () =>
          new Promise((done) => {
            resolve = done;
          }),
      );
      setup(request);
      fill();
      fireEvent.click(screen.getByRole("button", { name: "Отправить отзыв" }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20001);
      });
      expect(
        screen.getByRole("button", { name: "Повторить тот же ответ" }),
      ).toBeEnabled();
      expect(request).toHaveBeenCalledTimes(1);
      const body = JSON.parse(request.mock.calls[0][1]!.body as string);
      await act(async () =>
        resolve({
          id,
          client_request_id: body.client_request_id,
          created_at: "2026-10-24T10:00:00Z",
        }),
      );
      expect(
        screen.queryByText(/Ответ сохранён сервером/),
      ).not.toBeInTheDocument();
      expect(screen.getByLabelText(/Что улучшить первым/)).toBeDisabled();
    } finally {
      vi.useRealTimers();
    }
  });
  it("aborts pending work on session/business unmount", async () => {
    const request = vi.fn<ApiClient["request"]>(() => new Promise(() => {}));
    const view = setup(request);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Отправить отзыв" }));
    const signal = request.mock.calls[0][1]!.signal;
    view.unmount();
    expect(signal?.aborted).toBe(true);
  });
  it("restores fields and consent within the same session without Web Storage or POST", () => {
    const drafts = new Map<string, unknown>(),
      request = vi.fn();
    const first = setup(request, true, drafts);
    fill();
    expect(screen.getByText(/Не сохранено на сервере/)).toBeVisible();
    first.unmount();
    setup(request, true, drafts);
    expect(screen.getByLabelText(/Что улучшить первым/)).toHaveValue(
      "Крупнее подписи",
    );
    expect(screen.getByLabelText(/Согласен на описанную/)).toBeChecked();
    expect(request).not.toHaveBeenCalled();
    expect(
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    ).not.toContain("Крупнее подписи");
  });
  it("never shows a draft in another business or authentication generation", () => {
    const drafts = new Map<string, unknown>();
    const first = setup(vi.fn(), true, drafts);
    fill();
    first.unmount();
    const other = setup(vi.fn(), true, drafts, "a:1", "other-business");
    expect(screen.getByLabelText(/Что улучшить первым/)).toHaveValue("");
    other.unmount();
    setup(vi.fn(), true, drafts, "a:3");
    expect(screen.getByLabelText(/Что улучшить первым/)).toHaveValue("");
    expect(screen.getByLabelText(/Согласен на описанную/)).not.toBeChecked();
  });
  it("retains the same immutable intent when a retry rejects after unknown result", async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(0, "NETWORK_ERROR"))
      .mockRejectedValueOnce(new ApiError(422, "VALIDATION_ERROR"))
      .mockImplementation(async (_path, init) => ({
        id,
        client_request_id: JSON.parse(init.body).client_request_id,
        created_at: "2026-10-24T10:00:00Z",
      }));
    setup(request);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Отправить отзыв" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Повторить тот же ответ" }),
    );
    await screen.findByRole("button", { name: "Повторить тот же ответ" });
    expect(screen.getByLabelText(/Что улучшить первым/)).toBeDisabled();
    expect(screen.queryByText(/Сервер отклонил/)).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Повторить тот же ответ" }),
    );
    await screen.findByText(/Ответ сохранён сервером/);
    expect(request.mock.calls.map((c) => c[1].body)).toEqual(
      Array(3).fill(request.mock.calls[0][1].body),
    );
  });
  it("preserves aborted POST intent across navigation and ignores its late response", async () => {
    let complete!: (v: unknown) => void;
    const drafts = new Map<string, unknown>();
    const request = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            complete = resolve;
          }),
      )
      .mockImplementation(async (_path, init) => ({
        id,
        client_request_id: JSON.parse(init.body).client_request_id,
        created_at: "2026-10-24T10:00:00Z",
      }));
    const first = setup(request, true, drafts);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Отправить отзыв" }));
    first.unmount();
    setup(request, true, drafts);
    expect(
      screen.getByRole("button", { name: "Повторить тот же ответ" }),
    ).toBeEnabled();
    const body = request.mock.calls[0][1].body;
    await act(async () =>
      complete({
        id,
        client_request_id: JSON.parse(body).client_request_id,
        created_at: "2026-10-24T10:00:00Z",
      }),
    );
    expect(
      screen.queryByText(/Ответ сохранён сервером/),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Повторить тот же ответ" }),
    );
    await screen.findByText(/Ответ сохранён сервером/);
    expect(request.mock.calls[1][1].body).toBe(body);
    expect(
      [...drafts.keys()].some((k) => k.endsWith(":research-feedback-unsaved")),
    ).toBe(false);
  });
  it("retains confirmed receipt across navigation and prevents another POST", async () => {
    const drafts = new Map<string, unknown>();
    const request = vi.fn().mockImplementation(async (_path, init) => ({
      id,
      client_request_id: JSON.parse(init.body).client_request_id,
      created_at: "2026-10-24T10:00:00Z",
    }));
    const first = setup(request, true, drafts);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Отправить отзыв" }));
    await screen.findByText(/Ответ сохранён сервером/);
    first.unmount();
    setup(request, true, drafts);
    expect(screen.getByText(/Ответ сохранён сервером/)).toHaveTextContent(id);
    expect(
      screen.queryByRole("button", { name: "Отправить отзыв" }),
    ).not.toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("discards an unsubmitted draft only after explicit confirmation", () => {
    const drafts = new Map<string, unknown>();
    const confirm = vi
      .spyOn(window, "confirm")
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    const { request } = setup(vi.fn(), true, drafts);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Удалить черновик" }));
    expect(screen.getByLabelText(/Что улучшить первым/)).toHaveValue(
      "Крупнее подписи",
    );
    fireEvent.click(screen.getByRole("button", { name: "Удалить черновик" }));
    expect(screen.getByLabelText(/Что улучшить первым/)).toHaveValue("");
    expect(
      [...drafts.keys()].some((k) => k.endsWith(":research-feedback-unsaved")),
    ).toBe(false);
    expect(request).not.toHaveBeenCalled();
    expect(confirm).toHaveBeenCalledTimes(2);
  });
});
