/** Owner-adaptation regressions. Synthetic media/API boundaries, never live AI/audio. */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../shared/i18n";
import { ApiError } from "../shared/api/client";
import {
  normalizeAudioFile,
  validAudio,
} from "../features/voice/audioContract";
import {
  deferred,
  microphoneHarness,
  renderMicrophone,
  startMicrophone,
} from "./microphone-fixtures";

const state = vi.hoisted(() => ({
  business: { id: "business-A" },
  scope: "account-A",
  drafts: new Map<string, unknown>(),
  gateway: { mode: "live", customers: vi.fn() },
  api: { request: vi.fn() },
}));
vi.mock("../app/runtime", () => ({
  useRuntime: () => state,
  useBusiness: () => ({ business: state.business }),
}));
import { Sale } from "../features/voice/Sale";

const draft = {
  id: "synthetic-draft-A",
  transcript: "Синтетическая продажа",
  kind: "sale",
  description: "Synthetic analysis",
  total_minor: 300000,
  received_minor: 100000,
  amount_minor: null,
  customer_query: null,
  customer_candidates: [],
  sale_candidates: [],
  missing_fields: [],
  questions: [],
  expires_at: "2099-10-16T10:00:00Z",
};
const queries: QueryClient[] = [];
beforeEach(() => {
  state.business = { id: "business-A" };
  state.scope = "account-A";
  state.drafts.clear();
  state.gateway.customers.mockReset().mockResolvedValue({
    items: [
      {
        id: "customer-A",
        business_id: "business-A",
        display_name: "Учебный клиент",
        note: "",
        contact: null,
        balance_minor: 0,
      },
    ],
    next_cursor: null,
  });
  state.api.request.mockReset().mockImplementation(async (path: string) => {
    if (path.includes("/summary"))
      return {
        sales_minor: 0,
        receipts_minor: 0,
        outstanding_minor: 0,
        new_inquiries_count: 0,
      };
    return { items: [], next_cursor: null };
  });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    writable: true,
    value: vi.fn(() => "blob:synthetic-voice-test"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
});

describe("archive AI flow adapted to the shared contract", () => {
  function answerWith(value: unknown = draft) {
    const fallback = state.api.request.getMockImplementation()!;
    state.api.request.mockImplementation(
      async (path: string, init?: RequestInit) => {
        if (path.endsWith("/drafts")) return value;
        return fallback(path, init);
      },
    );
  }
  it.each([
    ["ru", "Продал на 3000, получил 1000"],
    ["kk", "3000 теңгеге саттым, 1000 теңге алдым"],
    ["auto", "Продал 3000 теңгеге, алдым 1000"],
  ])(
    "%s text uses one source and cannot create debt without a selected customer",
    async (language, phrase) => {
      answerWith({ ...draft, transcript: phrase });
      renderSale();
      fireEvent.change(screen.getByLabelText("Язык записи"), {
        target: { value: language },
      });
      fireEvent.change(screen.getByLabelText("Текст для AI"), {
        target: { value: phrase },
      });
      await act(async () =>
        fireEvent.click(
          screen.getByRole("button", { name: "Подготовить черновик" }),
        ),
      );
      const form = draftCalls()[0][1].body as FormData;
      expect([...form.keys()].sort()).toEqual(["locale", "text"]);
      expect(form.get("locale")).toBe(language);
      expect(form.get("text")).toBe(phrase);
      expect(screen.getByLabelText("Сумма продажи, ₸")).toHaveValue("3000");
      expect(screen.getByLabelText("Получено, ₸")).toHaveValue("1000");
      expect(screen.getByText(/Долг по этой продаже/)).toHaveTextContent(
        /2\s*000/,
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Подтвердить запись" }),
      );
      expect(financialCalls()).toHaveLength(0);
      fireEvent.click(screen.getByRole("button", { name: "Выбрать клиента" }));
      fireEvent.click(
        await screen.findByRole("button", { name: /Учебный клиент/ }),
      );
      const confirmation = deferred<unknown>();
      const fallback = state.api.request.getMockImplementation()!;
      state.api.request.mockImplementation(
        (path: string, init?: RequestInit) =>
          path.endsWith("/operations") && init?.method === "POST"
            ? confirmation.promise
            : fallback(path, init),
      );
      const confirm = screen.getByRole("button", {
        name: "Подтвердить запись",
      });
      fireEvent.click(confirm);
      fireEvent.click(confirm);
      expect(financialCalls()).toHaveLength(1);
      const [path, init] = financialCalls()[0];
      expect(path).toBe("/businesses/business-A/operations");
      expect(JSON.parse(init.body)).toMatchObject({
        draft_id: draft.id,
        customer_id: "customer-A",
        total_minor: 300000,
        received_minor: 100000,
      });
      await act(async () =>
        confirmation.resolve({
          operation: { id: "op-A", business_id: "business-A" },
          sale_balance_minor: 200000,
        }),
      );
      expect(
        await screen.findByText("Запись сохранена сервером"),
      ).toBeVisible();
    },
  );

  it("clarification includes original transcript, replaces only the draft and blocks stale confirmation", async () => {
    answerWith();
    renderSale();
    await prepare();
    fireEvent.change(screen.getByLabelText("Уточнение"), {
      target: { value: "Сумма 3500, получил 2000" },
    });
    expect(
      screen.getByRole("button", { name: "Подтвердить запись" }),
    ).toBeDisabled();
    answerWith({
      ...draft,
      id: "corrected",
      total_minor: 350000,
      received_minor: 200000,
    });
    await act(async () =>
      fireEvent.click(
        screen.getByRole("button", { name: "Уточнить и пересчитать черновик" }),
      ),
    );
    const form = draftCalls()[1][1].body as FormData;
    expect(form.get("text")).toBe(
      `${draft.transcript}\nНақтылау / Уточнение: Сумма 3500, получил 2000`,
    );
    expect(form.has("audio")).toBe(false);
    expect(screen.getByLabelText("Сумма продажи, ₸")).toHaveValue("3500");
    expect(screen.getByLabelText("Получено, ₸")).toHaveValue("2000");
    expect(financialCalls()).toHaveLength(0);
    fireEvent.change(screen.getByLabelText("Текст для AI"), {
      target: { value: "Другая продажа" },
    });
    expect(screen.queryByLabelText("Уточнение")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Текст для AI")).toHaveValue("Другая продажа");
    expect(
      screen.getByRole("button", { name: "Подтвердить запись" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Заполнить вручную" }));
    expect(
      screen.getByRole("button", { name: "Подтвердить запись" }),
    ).toBeEnabled();
  });

  it("a cancelled clarification keeps the checked fields but cannot confirm the old draft", async () => {
    answerWith();
    renderSale();
    await prepare();
    const late = holdAnalysis();
    fireEvent.change(screen.getByLabelText("Уточнение"), {
      target: { value: "Итого 9000" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Уточнить и пересчитать черновик" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Отменить анализ" }));
    await act(async () => late.resolve({ ...draft, total_minor: 900000 }));
    expect(screen.getByLabelText("Сумма продажи, ₸")).toHaveValue("3000");
    expect(
      screen.getByRole("button", { name: "Подтвердить запись" }),
    ).toBeDisabled();
    expect(financialCalls()).toHaveLength(0);
  });

  it("rejects combined clarification over the API limit without a request", async () => {
    answerWith({ ...draft, transcript: "а".repeat(3990) });
    renderSale();
    await prepare();
    fireEvent.change(screen.getByLabelText("Уточнение"), {
      target: { value: "Исправить сумму" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Уточнить и пересчитать черновик" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("4000");
    expect(draftCalls()).toHaveLength(1);
  });

  it.each([
    [429, "AI_QUOTA_EXCEEDED", "Лимит AI"],
    [503, "AI_QUOTA_EXCEEDED", "Лимит AI"],
    [0, "NETWORK_ERROR", "Проверьте интернет"],
    [503, "AI_UNAVAILABLE", "не смог обработать"],
  ])(
    "AI error %s preserves input, offers manual/retry and never invents an answer",
    async (status, code, message) => {
      const fallback = state.api.request.getMockImplementation()!;
      state.api.request.mockImplementation(
        (path: string, init?: RequestInit) =>
          path.endsWith("/drafts")
            ? Promise.reject(new ApiError(status, code))
            : fallback(path, init),
      );
      renderSale();
      await prepare();
      expect(screen.getByRole("alert")).toHaveTextContent(message);
      expect(screen.getByLabelText("Текст для AI")).toHaveValue(
        "Продал на 3000, получил 1000",
      );
      expect(screen.getByLabelText("Сумма продажи, ₸")).toHaveValue("");
      expect(
        screen.getByRole("button", { name: "Заполнить вручную" }),
      ).toBeEnabled();
      answerWith();
      await act(async () =>
        fireEvent.click(screen.getByRole("button", { name: "Повторить" })),
      );
      expect(screen.getByLabelText("Сумма продажи, ₸")).toHaveValue("3000");
      expect(financialCalls()).toHaveLength(0);
    },
  );

  it("normalizes missing picker MIME without admitting arbitrary files or unsupported AAC", () => {
    expect(
      validAudio(normalizeAudioFile(new File(["audio"], "voice.M4A"))),
    ).toBe(true);
    expect(
      normalizeAudioFile(
        new File(["audio"], "voice.m4a", { type: "video/mp4" }),
      ).type,
    ).toBe("audio/mp4");
    expect(
      validAudio(normalizeAudioFile(new File(["audio"], "voice.aac"))),
    ).toBe(false);
    expect(
      validAudio(
        normalizeAudioFile(
          new File(["bad"], "file.wav", { type: "text/plain" }),
        ),
      ),
    ).toBe(false);
  });
});
afterEach(() => {
  cleanup();
  queries.splice(0).forEach((client) => client.clear());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function renderSale() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queries.push(client);
  // Actual App keys RuntimeProvider by auth.scope and SellerLayout main by business.id.
  const tree = () => (
    <QueryClientProvider client={client}>
      <I18nProvider>
        <MemoryRouter>
          <Sale key={`${state.scope}:${state.business.id}`} />
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>
  );
  const view = render(tree());
  return { ...view, changeContext: () => view.rerender(tree()) };
}
function holdAnalysis() {
  const pending = deferred<unknown>();
  const fallback = state.api.request.getMockImplementation()!;
  state.api.request.mockImplementation((path: string, init?: RequestInit) =>
    path.endsWith("/drafts") ? pending.promise : fallback(path, init),
  );
  return pending;
}
async function prepare() {
  fireEvent.change(screen.getByLabelText("Текст для AI"), {
    target: { value: "Продал на 3000, получил 1000" },
  });
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: "Подготовить черновик" }),
    );
  });
}
const draftCalls = () =>
  state.api.request.mock.calls.filter(([path]) =>
    String(path).endsWith("/drafts"),
  );
const financialCalls = () =>
  state.api.request.mock.calls.filter(
    ([path, init]) =>
      String(path).includes("/operations") && init?.method === "POST",
  );

describe("supported recorder controls", () => {
  it("offers pause/resume only with browser support and cancel stops a paused recorder", async () => {
    const boundary = microphoneHarness();
    Object.assign(boundary.Recorder.prototype, {
      pause: vi.fn(function (this: { state: RecordingState }) {
        this.state = "paused";
      }),
      resume: vi.fn(function (this: { state: RecordingState }) {
        this.state = "recording";
      }),
    });
    const view = renderMicrophone();
    await startMicrophone();
    fireEvent.click(
      screen.getByRole("button", { name: "Приостановить запись" }),
    );
    expect(boundary.Recorder.instances[0].state).toBe("paused");
    fireEvent.click(screen.getByRole("button", { name: "Продолжить запись" }));
    expect(boundary.Recorder.instances[0].state).toBe("recording");
    fireEvent.click(
      screen.getByRole("button", { name: "Приостановить запись" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Отменить запись" }));
    expect(boundary.Recorder.instances[0].stop).toHaveBeenCalledTimes(1);
    boundary.tracks.forEach((track) => expect(track.readyState).toBe("ended"));
    expect(view.onFile).not.toHaveBeenCalled();
  });

  it("does not offer pause when recorder pause/resume are absent", async () => {
    microphoneHarness();
    renderMicrophone();
    await startMicrophone();
    expect(
      screen.queryByRole("button", { name: "Приостановить запись" }),
    ).not.toBeInTheDocument();
  });

  it("uses the browser default recorder when MIME probing is unavailable", async () => {
    const boundary = microphoneHarness();
    class DefaultRecorder extends boundary.Recorder {
      constructor(stream: MediaStream, options: MediaRecorderOptions = {}) {
        super(stream, options);
        this.mimeType = "audio/webm";
      }
    }
    Object.defineProperty(DefaultRecorder, "isTypeSupported", {
      value: undefined,
    });
    vi.stubGlobal("MediaRecorder", DefaultRecorder);
    renderMicrophone();
    await startMicrophone();
    expect(boundary.getUserMedia).toHaveBeenCalledExactlyOnceWith({
      audio: true,
    });
    expect(boundary.Recorder.instances).toHaveLength(1);
    expect(boundary.Recorder.instances[0].state).toBe("recording");
  });
});

describe("AI request lifecycle with stub transport that deliberately ignores abort", () => {
  it("cancel aborts the signal, preserves input and ignores a late successful draft", async () => {
    const pending = holdAnalysis();
    renderSale();
    await prepare();
    const signal = draftCalls()[0][1].signal as AbortSignal;
    fireEvent.click(screen.getByRole("button", { name: "Отменить анализ" }));
    expect(signal.aborted).toBe(true);
    expect(
      screen.getByRole("button", { name: "Подготовить черновик" }),
    ).toBeEnabled();
    await act(async () => pending.resolve(draft));
    expect(screen.queryByText(draft.transcript)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Сумма продажи, ₸")).toHaveValue("");
    expect(screen.getByLabelText("Текст для AI")).toHaveValue(
      "Продал на 3000, получил 1000",
    );
    expect(financialCalls()).toHaveLength(0);
  });

  it("a cancelled old result cannot overwrite a newer successful request", async () => {
    const old = holdAnalysis();
    renderSale();
    await prepare();
    fireEvent.click(screen.getByRole("button", { name: "Отменить анализ" }));
    state.api.request.mockImplementation(async (path: string) =>
      path.endsWith("/drafts")
        ? { ...draft, total_minor: 500000, transcript: "New request" }
        : { items: [], next_cursor: null },
    );
    await prepare();
    expect(screen.getByLabelText("Сумма продажи, ₸")).toHaveValue("5000");
    await act(async () => old.resolve(draft));
    expect(screen.getByLabelText("Сумма продажи, ₸")).toHaveValue("5000");
    expect(screen.queryByText(draft.transcript)).not.toBeInTheDocument();
    expect(financialCalls()).toHaveLength(0);
  });

  it("timeout leaves finite loading and manual input, even if transport never settles", async () => {
    vi.useFakeTimers();
    const pending = holdAnalysis();
    renderSale();
    await prepare();
    const signal = draftCalls()[0][1].signal as AbortSignal;
    await act(async () => vi.advanceTimersByTime(60_000));
    expect(signal.aborted).toBe(true);
    expect(
      screen.getByRole("button", { name: "Заполнить вручную" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Подготовить черновик" }),
    ).toBeEnabled();
    expect(screen.getByRole("alert")).toBeVisible();
    expect(screen.getByLabelText("Текст для AI")).toHaveValue(
      "Продал на 3000, получил 1000",
    );
    await act(async () => pending.resolve(draft));
    expect(screen.queryByText(draft.transcript)).not.toBeInTheDocument();
    expect(financialCalls()).toHaveLength(0);
  });

  it.each(["account", "point"])(
    "%s switch aborts old analysis and never exposes its draft in new context",
    async (kind) => {
      const pending = holdAnalysis();
      const view = renderSale();
      await prepare();
      const signal = draftCalls()[0][1].signal as AbortSignal;
      if (kind === "account") {
        state.scope = "account-B";
        state.drafts = new Map();
      } else state.business = { id: "business-B" };
      view.changeContext();
      expect(signal.aborted).toBe(true);
      await act(async () => pending.resolve(draft));
      expect(screen.queryByText(draft.transcript)).not.toBeInTheDocument();
      expect(screen.getByLabelText("Сумма продажи, ₸")).toHaveValue("");
      fireEvent.click(
        screen.getByRole("button", { name: "Подтвердить запись" }),
      );
      expect(financialCalls()).toHaveLength(0);
    },
  );
});
