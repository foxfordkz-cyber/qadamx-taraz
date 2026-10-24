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
function setup(request = vi.fn(), enabled = true) {
  const view = render(
    <I18nProvider>
      <FeedbackForm api={{ request }} businessId={id} enabled={enabled} />
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
  it("aborts pending work on session/business unmount", async () => {
    const request = vi.fn<ApiClient["request"]>(() => new Promise(() => {}));
    const view = setup(request);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Отправить отзыв" }));
    const signal = request.mock.calls[0][1]!.signal;
    view.unmount();
    expect(signal?.aborted).toBe(true);
  });
});
