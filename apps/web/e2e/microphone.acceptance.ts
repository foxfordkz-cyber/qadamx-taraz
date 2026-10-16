import { test as base, expect, type Page } from "@playwright/test";
import type { components } from "../src/shared/api/generated";
import { navigateSeller } from "./helpers";

// Dedicated microphone.playwright.config.ts only; not discovered by *.spec.ts.
// Real production App, Supabase SDK, browser MediaRecorder and getUserMedia run
// against local synthetic boundaries. Chromium's fake-device flag substitutes
// generated audio, so this suite never captures a person's microphone.
const origin = "http://127.0.0.1:4191";
const ids = {
  user: "50000000-0000-4000-8000-000000000001",
  business: "10000000-0000-4000-8000-000000000001",
  draft: "40000000-0000-4000-8000-000000000001",
  request: "70000000-0000-4000-8000-000000000001",
};
type Draft = components["schemas"]["DraftResponse"];
type AudioPost = {
  contentType: string;
  names: string[];
  filename: string;
  mime: string;
  bytes: number;
  locale: string;
};
type Services = {
  drafts: AudioPost[];
  draftStatus: number;
  financialWrites: string[];
  unexpected: string[];
  draftGate?: Promise<void>;
};
type MediaProbeWindow = Window & {
  __microphoneStreams?: MediaStream[];
  __microphoneFailures?: { name: string; message: string }[];
  __revokedAudioUrls?: string[];
  __previewAudio?: HTMLAudioElement;
};

function syntheticSession() {
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id: ids.user,
    aud: "authenticated",
    role: "authenticated",
    email: "microphone@example.test",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    created_at: "2026-10-16T00:00:00Z",
  };
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return {
    user,
    access_token: `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, aud: "authenticated", role: "authenticated", iat: now, exp: now + 3600 })}.c3ludGhldGljLW1pYw`,
    refresh_token: "synthetic-microphone-refresh",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600,
  };
}
const draft: Draft = {
  id: ids.draft,
  transcript: "Synthetic browser microphone fixture, not live AI",
  kind: "sale",
  customer_query: null,
  customer_candidates: [],
  sale_candidates: [],
  description: "Synthetic microphone test",
  total_minor: 300000,
  received_minor: 300000,
  amount_minor: null,
  missing_fields: [],
  questions: [],
  expires_at: "2099-10-16T10:30:00Z",
};

async function installSyntheticServices(page: Page): Promise<Services> {
  const session = syntheticSession();
  const state: Services = {
    drafts: [],
    draftStatus: 200,
    financialWrites: [],
    unexpected: [],
  };
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = url.pathname;
    const send = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    const error = (status: number, code: string) =>
      send(
        {
          error: { code, message: "Synthetic microphone boundary", fields: {} },
          request_id: ids.request,
        },
        status,
      );
    if (url.origin !== origin) {
      state.unexpected.push(`${method} ${url.origin}`);
      return route.abort("blockedbyclient");
    }
    if (path.startsWith("/__microphone_auth/")) {
      if (path.endsWith("/auth/v1/token") && method === "POST")
        return send(session);
      if (path.endsWith("/auth/v1/user") && method === "GET")
        return send(session.user);
      if (path.endsWith("/auth/v1/logout") && method === "POST")
        return route.fulfill({ status: 204 });
      state.unexpected.push(`${method} ${path}`);
      return route.abort("blockedbyclient");
    }
    if (!path.startsWith("/api/")) {
      if (method === "GET") return route.continue();
      state.unexpected.push(`${method} ${path}`);
      return route.abort("blockedbyclient");
    }
    if (request.headers().authorization !== `Bearer ${session.access_token}`)
      return error(401, "AUTH_REQUIRED");
    if (path === "/api/v1/me" && method === "GET")
      return send({
        id: ids.user,
        businesses: [
          {
            id: ids.business,
            name: "Synthetic microphone test point",
            slug: "synthetic-microphone",
            role: "owner",
          },
        ],
      });
    if (
      path === `/api/v1/businesses/${ids.business}/drafts` &&
      method === "POST"
    ) {
      const contentType = request.headers()["content-type"] ?? "";
      const raw = request.postDataBuffer();
      if (!raw || !contentType.startsWith("multipart/form-data;")) {
        state.unexpected.push("Invalid multipart request");
        return error(422, "VALIDATION_ERROR");
      }
      // Parse real browser multipart in Node. Keep metadata only, never save
      // audio bytes, request bodies, auth tokens, trace, HAR or recordings.
      const form = await new Response(new Uint8Array(raw), {
        headers: { "Content-Type": contentType },
      }).formData();
      const audio = form.get("audio");
      if (!audio || typeof audio === "string") {
        state.unexpected.push("Draft requested without audio");
        return error(422, "VALIDATION_ERROR");
      }
      state.drafts.push({
        contentType,
        names: [...form.keys()],
        filename: audio.name,
        mime: audio.type,
        bytes: audio.size,
        locale: String(form.get("locale")),
      });
      await state.draftGate;
      if (state.draftStatus !== 200)
        return error(
          state.draftStatus,
          state.draftStatus === 415
            ? "AUDIO_UNSUPPORTED"
            : state.draftStatus === 422
              ? "AUDIO_TOO_LONG"
              : "AI_UNAVAILABLE",
        );
      return send(draft);
    }
    if (method !== "GET") {
      state.financialWrites.push(`${method} ${path}`);
      return route.abort("blockedbyclient");
    }
    if (path === `/api/v1/businesses/${ids.business}/operations`)
      return send({ items: [], next_cursor: null });
    if (path === `/api/v1/businesses/${ids.business}/summary`)
      return send({
        business_id: ids.business,
        date: "2026-10-16",
        sales_minor: 0,
        receipts_minor: 0,
        outstanding_minor: 0,
        new_inquiries_count: 0,
      });
    if (path === `/api/v1/businesses/${ids.business}/customers`)
      return send({ items: [], next_cursor: null });
    if (path === "/api/v1/public/businesses/synthetic-microphone")
      return error(404, "NOT_FOUND");
    state.unexpected.push(`${method} ${path}`);
    return route.abort("blockedbyclient");
  });
  await page.addInitScript(() => {
    const probe = window as MediaProbeWindow;
    probe.__microphoneStreams = [];
    probe.__microphoneFailures = [];
    probe.__revokedAudioUrls = [];
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL = (url) => {
      probe.__revokedAudioUrls?.push(url);
      revoke(url);
    };
    if (navigator.mediaDevices?.getUserMedia) {
      const native = navigator.mediaDevices.getUserMedia.bind(
        navigator.mediaDevices,
      );
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        try {
          const stream = await native(constraints);
          probe.__microphoneStreams?.push(stream);
          return stream;
        } catch (error) {
          probe.__microphoneFailures?.push({
            name: error instanceof Error ? error.name : "UnknownError",
            message: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      };
    }
  });
  return state;
}

const test = base.extend<{ services: Services }>({
  services: async ({ page }, use, testInfo) => {
    // Fail closed before installing the native getUserMedia observer or loading
    // the application. A wrong config must never fall back to a real microphone.
    expect(
      testInfo.project.use.launchOptions?.args ?? [],
      "Safety: this suite requires Chromium's generated fake audio device",
    ).toContain("--use-fake-device-for-media-stream");
    const browser = page.context().browser();
    expect(
      browser,
      "Safety: an inspectable local Chromium process is required",
    ).not.toBeNull();
    const browserCdp = await browser!.newBrowserCDPSession();
    const actual = await browserCdp.send("Browser.getBrowserCommandLine");
    await browserCdp.detach();
    expect(
      actual.arguments,
      "Safety: the ACTUAL Chromium process must use generated fake devices before any getUserMedia call",
    ).toContain("--use-fake-device-for-media-stream");
    if (testInfo.project.name === "synthetic-permission-denied") {
      expect(
        actual.arguments,
        "This branch exercises Chromium's synthetic fake-UI denial, not a real OS/browser permission prompt",
      ).toContain("--use-fake-ui-for-media-stream=deny");
    }
    const services = await installSyntheticServices(page);
    await use(services);
    if (testInfo.status !== testInfo.expectedStatus && !page.isClosed()) {
      const diagnostic = await page.evaluate(async () => ({
        source: "synthetic desktop Chromium fake audio device, not Android",
        secureContext: window.isSecureContext,
        microphonePermission: await navigator.permissions
          .query({ name: "microphone" as PermissionName })
          .then((permission) => permission.state)
          .catch(() => "unavailable"),
        mediaRecorderAvailable: typeof MediaRecorder !== "undefined",
        mimeSupport: [
          "audio/webm;codecs=opus",
          "audio/mp4",
          "audio/ogg;codecs=opus",
        ].map((mime) => ({
          mime,
          supported:
            typeof MediaRecorder !== "undefined" &&
            MediaRecorder.isTypeSupported(mime),
        })),
        streams: (window as MediaProbeWindow).__microphoneStreams?.length ?? 0,
        errors: (window as MediaProbeWindow).__microphoneFailures ?? [],
      }));
      await testInfo.attach("synthetic-browser-media-failure-diagnostic", {
        body: JSON.stringify(diagnostic, null, 2),
        contentType: "application/json",
      });
    }
    expect(
      services.financialWrites,
      "No financial write is allowed by this suite",
    ).toEqual([]);
    expect(
      services.unexpected,
      "No unmocked API/auth/external traffic is allowed",
    ).toEqual([]);
  },
});

async function openSale(page: Page) {
  await page.goto("/login");
  await page
    .getByLabel("Электронная почта", { exact: true })
    .fill("microphone@example.test");
  await page
    .getByLabel("Пароль", { exact: true })
    .fill("synthetic-microphone-password");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Хорошего рабочего дня!" }),
  ).toBeVisible();
  await navigateSeller(page, "sale");
  await expect(
    page.getByRole("heading", { name: "Новая запись", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Записать голос", exact: true }),
  ).toBeEnabled();
}
const fileInput = (page: Page) => page.locator('input[type="file"]');
const prepare = (page: Page) =>
  page.getByRole("button", { name: "Подготовить черновик", exact: true });
async function trackStates(page: Page) {
  return page.evaluate(
    () =>
      (window as MediaProbeWindow).__microphoneStreams?.flatMap((stream) =>
        stream.getAudioTracks().map((track) => track.readyState),
      ) ?? [],
  );
}
async function startRecording(page: Page) {
  await page
    .getByRole("button", { name: "Записать голос", exact: true })
    .click();
  await expect(
    page.getByText("Идёт запись, максимум 30 секунд", { exact: true }),
  ).toBeVisible();
  await expect.poll(() => trackStates(page)).toEqual(["live"]);
}
function syntheticWav() {
  // One second of generated silent PCM, no person/audio fixture file involved.
  const samples = 8000;
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(samples, 24);
  buffer.writeUInt32LE(samples * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples * 2, 40);
  return buffer;
}

test("real desktop Chromium fake-device recording stops, sends actual MIME multipart only after Prepare, and never writes money", async ({
  page,
  services,
}, testInfo) => {
  await openSale(page);
  expect(await page.evaluate(() => window.isSecureContext)).toBe(true);
  await page.getByLabel("Текст для AI").fill("Existing synthetic text");
  await startRecording(page);
  await expect(fileInput(page)).toBeDisabled();
  await expect.poll(() => services.drafts.length).toBe(0);
  await page.waitForTimeout(500); // Let the real recorder collect generated audio.
  await page.getByRole("button", { name: "Остановить", exact: true }).click();
  await expect(page.getByText(/^recording\.(webm|m4a|ogg)$/)).toBeVisible();
  await expect.poll(() => trackStates(page)).toEqual(["ended"]);
  await expect(page.getByLabel("Текст для AI")).toHaveValue("");
  expect(services.drafts).toHaveLength(0);
  await prepare(page).click();
  await expect.poll(() => services.drafts.length).toBe(1);
  const audio = services.drafts[0];
  expect(audio.names.sort()).toEqual(["audio", "locale"]);
  expect(audio.mime).toMatch(/^audio\/(webm|mp4|ogg)(?:;|$)/);
  expect(audio.bytes).toBeGreaterThan(0);
  expect(audio.bytes).toBeLessThanOrEqual(8 * 1024 * 1024);
  expect(audio.locale).toBe("ru");
  expect(audio.contentType).toContain("boundary=");
  await expect(
    page.getByLabel("Сумма продажи, ₸", { exact: true }),
  ).toHaveValue("3000");
  await expect(page.getByLabel("Получено, ₸", { exact: true })).toHaveValue(
    "3000",
  );
  await testInfo.attach("synthetic-browser-media-metadata", {
    body: JSON.stringify({
      source:
        "desktop Chromium generated fake device; not Android or human microphone",
      mime: audio.mime,
      bytes: audio.bytes,
      financialWrites: services.financialWrites.length,
    }),
    contentType: "application/json",
  });
});

test("real recorder automatically stops at the 30-second browser timer and releases its generated audio track", async ({
  page,
  services,
}) => {
  test.setTimeout(55_000);
  await openSale(page);
  const before = Date.now();
  await startRecording(page);
  await expect(
    page.getByRole("button", { name: "Записать голос", exact: true }),
  ).toBeVisible({ timeout: 36_000 });
  expect(Date.now() - before).toBeGreaterThanOrEqual(29_000);
  await expect.poll(() => trackStates(page)).toEqual(["ended"]);
  await expect(page.getByText(/^recording\.(webm|m4a|ogg)$/)).toBeVisible();
  expect(services.drafts).toHaveLength(0);
});

test("synthetic Chromium microphone denial leaves text, audio-file and manual entry available", async ({
  page,
  services,
}) => {
  // Native Chromium fake-UI denial, with real getUserMedia and no method stub.
  // This is a deterministic browser branch, not physical Android permission UI.
  await openSale(page);
  await page
    .getByRole("button", { name: "Записать голос", exact: true })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Микрофон недоступен. Используйте текст или файл." }),
  ).toBeVisible();
  expect(await trackStates(page)).toEqual([]);
  expect(
    await page.evaluate(() =>
      (window as MediaProbeWindow).__microphoneFailures?.map(
        (failure) => failure.name,
      ),
    ),
    "The explicit denied-permission case must fail with NotAllowedError, not an unrelated capture backend error",
  ).toEqual(["NotAllowedError"]);
  await expect(fileInput(page)).toBeEnabled();
  await page.getByLabel("Текст для AI").fill("Synthetic manual fallback");
  await expect(prepare(page)).toBeEnabled();
  await page.getByRole("button", { name: "Ручной ввод", exact: true }).click();
  await page.getByLabel("Сумма продажи, ₸", { exact: true }).fill("3000");
  await expect(
    page.getByLabel("Сумма продажи, ₸", { exact: true }),
  ).toHaveValue("3000");
  expect(services.drafts).toHaveLength(0);
});

test("unsupported recorder MIME fails before requesting a device and keeps file/text fallback", async ({
  page,
  services,
}) => {
  await page.addInitScript(() => {
    MediaRecorder.isTypeSupported = () => false;
  });
  await openSale(page);
  await page
    .getByRole("button", { name: "Записать голос", exact: true })
    .click();
  await expect(
    page.getByText("Микрофон недоступен. Используйте текст или файл.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(await trackStates(page)).toEqual([]);
  await expect(fileInput(page)).toBeEnabled();
  await expect(page.getByLabel("Текст для AI")).toBeEditable();
  expect(services.drafts).toHaveLength(0);
});

test("real file picker sends generated WAV bytes and KK locale as multipart, with no text or financial write", async ({
  page,
  services,
}) => {
  await openSale(page);
  await page.getByRole("button", { name: "KZ", exact: true }).click();
  await fileInput(page).setInputFiles({
    name: "synthetic-silence.wav",
    mimeType: "audio/wav",
    buffer: syntheticWav(),
  });
  await expect(
    page.getByText("synthetic-silence.wav", { exact: true }),
  ).toBeVisible();
  expect(services.drafts).toHaveLength(0);
  await page
    .getByRole("button", { name: "Жазбаны дайындау", exact: true })
    .click();
  await expect.poll(() => services.drafts.length).toBe(1);
  expect(services.drafts[0]).toMatchObject({
    filename: "synthetic-silence.wav",
    mime: "audio/wav",
    bytes: syntheticWav().length,
    locale: "kk",
  });
  expect(services.drafts[0].names.sort()).toEqual(["audio", "locale"]);
  await expect(
    page.getByLabel("Сатылым сомасы, ₸", { exact: true }),
  ).toHaveValue("3000");
});

test("an oversized upload is rejected in the browser without calling the API", async ({
  page,
  services,
}) => {
  await openSale(page);
  await fileInput(page).setInputFiles({
    name: "synthetic-too-large.wav",
    mimeType: "audio/wav",
    buffer: Buffer.alloc(8 * 1024 * 1024 + 1),
  });
  // The current generic microphone wording is a known UX issue, not an
  // acceptance requirement. Only require an accessible rejection and no upload.
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(prepare(page)).toBeDisabled();
  expect(services.drafts).toHaveLength(0);
});

for (const status of [415, 422, 503, 504]) {
  test(`synthetic API ${status} preserves the chosen audio and manual amounts without retry or money writes`, async ({
    page,
    services,
  }) => {
    services.draftStatus = status;
    await openSale(page);
    await page.getByLabel("Сумма продажи, ₸", { exact: true }).fill("1234");
    await page.getByLabel("Получено, ₸", { exact: true }).fill("1200");
    await fileInput(page).setInputFiles({
      name: "synthetic-input.wav",
      mimeType: "audio/wav",
      buffer: syntheticWav(),
    });
    await prepare(page).click();
    await expect(
      page.getByRole("alert").filter({
        hasText:
          "AI временно недоступен. Ввод сохранён; продолжите вручную или повторите позже.",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("synthetic-input.wav", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Сумма продажи, ₸", { exact: true }),
    ).toHaveValue("1234");
    await expect(page.getByLabel("Получено, ₸", { exact: true })).toHaveValue(
      "1200",
    );
    await expect(
      page.getByRole("button", { name: "Ручной ввод", exact: true }),
    ).toBeEnabled();
    expect(services.drafts).toHaveLength(1);
  });
}

test("leaving Sale while recording releases tracks and does not submit an abandoned recording", async ({
  page,
  services,
}) => {
  await openSale(page);
  await startRecording(page);
  await navigateSeller(page, "customers");
  await expect(
    page.getByRole("heading", { name: "Клиенты", exact: true }),
  ).toBeVisible();
  await expect.poll(() => trackStates(page)).toEqual(["ended"]);
  await navigateSeller(page, "sale");
  await expect(prepare(page)).toBeDisabled();
  await expect(page.getByText(/^recording\.(webm|m4a|ogg)$/)).toHaveCount(0);
  expect(services.drafts).toHaveLength(0);
});

// Ordinary red acceptance tests until participant #4 adapts the UI. No skips or
// expected failures: the dedicated microphone command must expose the gaps.
test.describe("owner playback/cancel acceptance @acceptance-gap", () => {
  test("selected audio can be listened to before submitting (currently absent)", async ({
    page,
    services,
  }) => {
    await openSale(page);
    await fileInput(page).setInputFiles({
      name: "synthetic-preview.wav",
      mimeType: "audio/wav",
      buffer: syntheticWav(),
    });
    const audio = page.locator("audio[controls]");
    await expect(audio).toBeVisible();
    await audio.evaluate((element) => {
      const media = element as HTMLAudioElement;
      media.muted = true;
      media.load();
    });
    await expect
      .poll(() =>
        audio.evaluate((element) => {
          const media = element as HTMLAudioElement;
          return (
            media.readyState >= HTMLMediaElement.HAVE_METADATA &&
            Number.isFinite(media.duration) &&
            media.duration > 0
          );
        }),
      )
      .toBe(true);
    const play = page.getByRole("button", {
      name: "Прослушать запись",
      exact: true,
    });
    await play.focus();
    await page.keyboard.press("Enter");
    await expect
      .poll(() =>
        audio.evaluate((element) => (element as HTMLAudioElement).currentTime),
      )
      .toBeGreaterThan(0);
    await page.getByRole("button", { name: "Пауза", exact: true }).click();
    await expect
      .poll(() =>
        audio.evaluate((element) => (element as HTMLAudioElement).paused),
      )
      .toBe(true);
    await play.click();
    await expect
      .poll(() =>
        audio.evaluate((element) => (element as HTMLAudioElement).ended),
      )
      .toBe(true);
    await play.click();
    await expect
      .poll(() =>
        audio.evaluate((element) => (element as HTMLAudioElement).paused),
      )
      .toBe(false);
    expect(services.drafts).toHaveLength(0);
  });

  test("recording can be cancelled and discarded separately from Stop (currently absent)", async ({
    page,
    services,
  }) => {
    await openSale(page);
    await page.getByLabel("Текст для AI").fill("Сохранить текст при отмене");
    await startRecording(page);
    const cancel = page.getByRole("button", {
      name: "Отменить запись",
      exact: true,
    });
    await expect(cancel).toBeVisible();
    await cancel.click();
    await expect.poll(() => trackStates(page)).toEqual(["ended"]);
    await expect(page.getByText(/^recording\.(webm|m4a|ogg)$/)).toHaveCount(0);
    await expect(page.getByLabel("Текст для AI")).toHaveValue(
      "Сохранить текст при отмене",
    );
    await expect(prepare(page)).toBeEnabled();
    await expect(fileInput(page)).toHaveValue("");
    expect(services.drafts).toHaveLength(0);
  });
});

test("double explicit Prepare sends exactly one multipart while upload is pending", async ({
  page,
  services,
}) => {
  await openSale(page);
  await fileInput(page).setInputFiles({
    name: "double.wav",
    mimeType: "audio/wav",
    buffer: syntheticWav(),
  });
  let release!: () => void;
  services.draftGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    await prepare(page).evaluate((element) => {
      (element as HTMLButtonElement).click();
      (element as HTMLButtonElement).click();
    });
    await expect.poll(() => services.drafts.length).toBe(1);
    await expect(prepare(page)).toBeDisabled();
    expect(services.drafts[0].names.sort()).toEqual(["audio", "locale"]);
  } finally {
    release();
  }
  await expect(prepare(page)).toBeEnabled();
  expect(services.drafts).toHaveLength(1);
});

for (const width of [360, 390, 768, 1440]) {
  test(`preview delete/replacement/navigation releases resources and preserves RU/KZ input at ${width}px @acceptance-gap`, async ({
    page,
    services,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openSale(page);
    const text = page.getByLabel("Текст для AI", { exact: true });
    await text.fill("Сохранить ручной текст — Қазақша");
    await fileInput(page).setInputFiles({
      name: "preview.wav",
      mimeType: "audio/wav",
      buffer: syntheticWav(),
    });
    const audio = page.locator("audio[controls]");
    await expect(audio).toBeVisible();
    expect(
      await audio.evaluate((element) => (element as HTMLAudioElement).autoplay),
    ).toBe(false);
    const oldUrl = await audio.evaluate(
      (element) => (element as HTMLAudioElement).src,
    );
    await audio.evaluate((element) => {
      (window as MediaProbeWindow).__previewAudio = element as HTMLAudioElement;
    });
    await page
      .getByRole("button", { name: "Прослушать запись", exact: true })
      .click();
    await expect
      .poll(() =>
        audio.evaluate((element) => (element as HTMLAudioElement).paused),
      )
      .toBe(false);
    const remove = page.getByRole("button", {
      name: "Удалить запись",
      exact: true,
    });
    const box = await remove.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
    await remove.focus();
    await page.keyboard.press("Enter");
    await expect(audio).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as MediaProbeWindow).__previewAudio?.paused,
        ),
      )
      .toBe(true);
    await expect
      .poll(() =>
        page.evaluate(
          (url) =>
            (window as MediaProbeWindow).__revokedAudioUrls?.includes(url),
          oldUrl,
        ),
      )
      .toBe(true);
    await expect(text).toHaveValue("Сохранить ручной текст — Қазақша");
    await expect.poll(() => services.drafts.length).toBe(0);
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page.getByRole("button", { name: "KZ", exact: true }).click();
    await fileInput(page).setInputFiles({
      name: "again.wav",
      mimeType: "audio/wav",
      buffer: syntheticWav(),
    });
    await expect(
      page.getByRole("button", { name: "Жазбаны тыңдау", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Жазбаны жою", exact: true }),
    ).toBeVisible();
    const replacementUrl = await audio.evaluate(
      (element) => (element as HTMLAudioElement).src,
    );
    await fileInput(page).setInputFiles({
      name: "replacement.wav",
      mimeType: "audio/wav",
      buffer: syntheticWav(),
    });
    await expect
      .poll(() =>
        page.evaluate(
          (url) =>
            (window as MediaProbeWindow).__revokedAudioUrls?.includes(url),
          replacementUrl,
        ),
      )
      .toBe(true);
    const finalUrl = await audio.evaluate(
      (element) => (element as HTMLAudioElement).src,
    );
    await page
      .getByRole("button", { name: "Жазбаны тыңдау", exact: true })
      .click();
    await audio.evaluate((element) => {
      (window as MediaProbeWindow).__previewAudio = element as HTMLAudioElement;
    });
    await navigateSeller(page, "customers");
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as MediaProbeWindow).__previewAudio?.paused,
        ),
      )
      .toBe(true);
    await expect
      .poll(() =>
        page.evaluate(
          (url) =>
            (window as MediaProbeWindow).__revokedAudioUrls?.includes(url),
          finalUrl,
        ),
      )
      .toBe(true);
    expect(services.drafts).toHaveLength(0);
  });
}
