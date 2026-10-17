import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthApiError, type SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EMAIL_CALLBACK_URL } from "../app/auth-callback-model";
import * as callbackConfig from "../app/auth-callback-config";
import { ConfirmationNotice } from "../app/registration";
import {
  hasPendingConfirmation,
  rememberConfirmation,
} from "../app/registration-model";
import { I18nProvider } from "../shared/i18n";
import { deferred, ids, json, renderQa, session } from "./qa-fixtures";

type Signup = SupabaseClient["auth"]["signUp"];
type Resend = SupabaseClient["auth"]["resend"];
const confirmationResponse = {
  data: { user: session().user, session: null },
  error: null,
};
function setup() {
  const qa = renderQa({
    initial: null,
    route: "/register",
    fetcher: vi.fn(async () => json({ id: ids.a, businesses: [] })),
  });
  const sdk = Object.assign(qa.mock.auth, {
    signUp: vi.fn<Signup>(async () => confirmationResponse),
    resend: vi.fn<Resend>(async () => ({
      data: { user: null, session: null },
      error: null,
    })),
  });
  return { ...qa, sdk };
}
async function fill(password = "synthetic-password", confirmation = password) {
  await screen.findByRole("heading", { name: "Регистрация" });
  fireEvent.change(screen.getByLabelText("Электронная почта"), {
    target: { value: "qa@example.test" },
  });
  fireEvent.change(screen.getByLabelText("Пароль"), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText("Подтвердите пароль"), {
    target: { value: confirmation },
  });
}
async function submit() {
  await userEvent.click(
    screen.getByRole("button", { name: "Зарегистрироваться" }),
  );
}
async function waitForConfirmation() {
  await screen.findByRole("heading", {
    name: "Подтвердите адрес электронной почты",
  });
}
afterEach(() => {
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("approved registration MVP through the existing AuthProvider (synthetic SDK)", () => {
  it("blocks signup and resend at the provider boundary on a wrong Preview origin", async () => {
    vi.spyOn(callbackConfig, "registrationOriginAllowed").mockReturnValue(
      false,
    );
    const qa = setup();
    await screen.findByText(
      "Регистрация по этому адресу ещё не настроена. Обратитесь к администратору Qadam.",
    );
    expect(
      screen.queryByRole("link", { name: "Открыть тестовую регистрацию" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Пароль")).not.toBeInTheDocument();
    await expect(
      qa.auth().signUp("qa@example.test", "synthetic-password"),
    ).rejects.toThrow();
    await expect(
      qa.auth().resendConfirmation("qa@example.test"),
    ).rejects.toThrow();
    expect(qa.sdk.signUp).not.toHaveBeenCalled();
    expect(qa.sdk.resend).not.toHaveBeenCalled();
    expect(qa.fetcher).not.toHaveBeenCalled();
  });
  it("keeps null-session signup anonymous, forgets passwords, supports RU/KZ and only explicit resend", async () => {
    const qa = setup();
    await fill();
    await userEvent.click(screen.getByRole("button", { name: "KZ" }));
    expect(screen.getByLabelText("Құпиясөз")).toHaveValue("synthetic-password");
    await userEvent.click(screen.getByRole("button", { name: "RU" }));
    await submit();
    await waitForConfirmation();
    expect(qa.sdk.signUp).toHaveBeenCalledExactlyOnceWith({
      email: "qa@example.test",
      password: "synthetic-password",
      options: { emailRedirectTo: EMAIL_CALLBACK_URL },
    });
    expect(qa.auth().session).toBeNull();
    expect(qa.auth().demo).toBe(false);
    expect(qa.fetcher).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Пароль")).not.toBeInTheDocument();
    expect(qa.sdk.resend).not.toHaveBeenCalled();
    expect(Object.values(sessionStorage)).toEqual(["1"]);
    await userEvent.click(
      screen.getByRole("button", { name: "Отправить письмо повторно" }),
    );
    expect(qa.sdk.resend).toHaveBeenCalledExactlyOnceWith({
      type: "signup",
      email: "qa@example.test",
      options: { emailRedirectTo: EMAIL_CALLBACK_URL },
    });
    await screen.findByText(/Запрос принят/);
    await userEvent.click(
      screen.getByRole("button", { name: "Указать другой адрес" }),
    );
    expect(screen.getByLabelText("Пароль")).toHaveValue("");
    expect(screen.getByLabelText("Подтвердите пароль")).toHaveValue("");
  });

  it.each(["invalid-email", ""])(
    "validates email %j without calling the SDK",
    async (email) => {
      const qa = setup();
      await fill();
      fireEvent.change(screen.getByLabelText("Электронная почта"), {
        target: { value: email },
      });
      await submit();
      expect(qa.sdk.signUp).not.toHaveBeenCalled();
    },
  );
  it("rejects too-short and mismatched passwords before SDK, focuses confirmation", async () => {
    const qa = setup();
    await fill("123", "123");
    await submit();
    expect(qa.sdk.signUp).not.toHaveBeenCalled();
    await fill("synthetic-password", "different");
    await submit();
    await screen.findAllByText("Пароли не совпадают.");
    expect(screen.getByLabelText("Подтвердите пароль")).toHaveFocus();
    expect(qa.sdk.signUp).not.toHaveBeenCalled();
  });
  it.each([
    ["weak_password", 422, "Выберите более надёжный пароль."],
    [
      "validation_failed",
      422,
      "Проверьте адрес электронной почты и введённые данные.",
    ],
    ["over_email_send_rate_limit", 429, "Слишком много запросов."],
    ["signup_disabled", 400, "Регистрация сейчас недоступна."],
    ["unexpected_failure", 500, "Не удалось подтвердить результат запроса."],
  ])(
    "handles SDK %s without logging/rendering its payload",
    async (code, status, text) => {
      const qa = setup();
      qa.sdk.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: new AuthApiError("PRIVATE_DETAILS", status, code),
      });
      await fill();
      await submit();
      await screen.findByText((content) => content.startsWith(text));
      expect(screen.queryByText("PRIVATE_DETAILS")).not.toBeInTheDocument();
      expect(qa.auth().session).toBeNull();
      expect(qa.sdk.signUp).toHaveBeenCalledTimes(1);
      expect(qa.fetcher).not.toHaveBeenCalled();
    },
  );
  it.each(["user_already_exists", "email_exists"])(
    "masks explicit duplicate %s like the ordinary confirmation response",
    async (code) => {
      const qa = setup();
      qa.sdk.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: new AuthApiError("Already registered private email", 422, code),
      });
      await fill();
      await submit();
      await waitForConfirmation();
      expect(screen.queryByText(/Already registered/)).not.toBeInTheDocument();
      expect(qa.auth().session).toBeNull();
      expect(qa.fetcher).not.toHaveBeenCalled();
    },
  );
  it("handles network failure and malformed success without claiming creation", async () => {
    const qa = setup();
    qa.sdk.signUp.mockRejectedValueOnce(new TypeError("network"));
    await fill();
    await submit();
    await screen.findByText(/Не удалось получить ответ/);
    qa.sdk.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: null,
    });
    await submit();
    await screen.findByText(/Не удалось подтвердить результат запроса/);
    expect(qa.auth().session).toBeNull();
    expect(hasPendingConfirmation()).toBe(false);
  });
  it("blocks synchronous duplicate signup and provider-level resend while pending", async () => {
    const qa = setup();
    const held = deferred<Awaited<ReturnType<Signup>>>();
    qa.sdk.signUp.mockReturnValue(held.promise);
    await fill();
    const form = screen
      .getByRole("button", { name: "Зарегистрироваться" })
      .closest("form")!;
    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    expect(qa.sdk.signUp).toHaveBeenCalledTimes(1);
    await expect(
      qa.auth().resendConfirmation("qa@example.test"),
    ).rejects.toThrow();
    expect(qa.sdk.resend).not.toHaveBeenCalled();
    await act(async () => held.resolve(confirmationResponse));
    await waitForConfirmation();
  });
  it.each(["network", "rate", "invalid"])(
    "shows explicit resend %s failure, never retries automatically",
    async (kind) => {
      const qa = setup();
      await fill();
      await submit();
      await waitForConfirmation();
      if (kind === "network")
        qa.sdk.resend.mockRejectedValue(new TypeError("network"));
      else
        qa.sdk.resend.mockResolvedValue(
          kind === "rate"
            ? {
                data: { user: null, session: null },
                error: new AuthApiError(
                  "PRIVATE",
                  429,
                  "over_email_send_rate_limit",
                ),
              }
            : ({ data: null, error: null } as unknown as Awaited<
                ReturnType<Resend>
              >),
        );
      await userEvent.click(
        screen.getByRole("button", { name: "Отправить письмо повторно" }),
      );
      await screen.findByRole("alert");
      expect(qa.sdk.resend).toHaveBeenCalledTimes(1);
      expect(qa.auth().session).toBeNull();
      expect(screen.getByLabelText("Электронная почта")).toHaveValue(
        "qa@example.test",
      );
    },
  );
  it("deduplicates a pending resend and keeps the neutral success message", async () => {
    const qa = setup();
    await fill();
    await submit();
    await waitForConfirmation();
    const held = deferred<Awaited<ReturnType<Resend>>>();
    qa.sdk.resend.mockReturnValue(held.promise);
    const form = screen
      .getByRole("button", { name: "Отправить письмо повторно" })
      .closest("form")!;
    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    expect(qa.sdk.resend).toHaveBeenCalledTimes(1);
    await act(async () =>
      held.resolve({ data: { user: null, session: null }, error: null }),
    );
    await screen.findByText(/Запрос принят/);
  });
  it("restores only waiting state on remount, asks for email and sends nothing", async () => {
    rememberConfirmation(true);
    const qa = setup();
    await waitForConfirmation();
    expect(screen.getByLabelText("Электронная почта")).toHaveValue("");
    expect(qa.sdk.signUp).not.toHaveBeenCalled();
    expect(qa.sdk.resend).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Пароль")).not.toBeInTheDocument();
  });
  it("uses SDK session events and /me, never manufactured memberships, when a session really exists", async () => {
    const qa = setup();
    qa.sdk.signUp.mockImplementation(async () => {
      const next = session();
      qa.mock.emit(next);
      return { data: { user: next.user, session: next }, error: null };
    });
    await fill();
    await submit();
    await screen.findByRole("heading", {
      name: "У вас пока нет торговых точек",
    });
    expect(qa.auth().session?.user.id).toBe(ids.a);
    expect(qa.auth().demo).toBe(false);
    expect(hasPendingConfirmation()).toBe(false);
    expect(qa.fetcher).toHaveBeenCalledTimes(1);
  });
  it("ignores a late registration UI result after another account establishes its session", async () => {
    const qa = setup();
    const held = deferred<Awaited<ReturnType<Signup>>>();
    qa.sdk.signUp.mockReturnValue(held.promise);
    await fill();
    await submit();
    act(() => qa.mock.emit(session()));
    await screen.findByRole("heading", {
      name: "У вас пока нет торговых точек",
    });
    const scope = qa.auth().scope;
    await act(async () => held.resolve(confirmationResponse));
    expect(qa.auth().scope).toBe(scope);
    expect(hasPendingConfirmation()).toBe(false);
    expect(
      screen.queryByRole("heading", {
        name: "Подтвердите адрес электронной почты",
      }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Выйти" }));
    await screen.findByRole("button", { name: "Войти" });
    expect(qa.auth().session).toBeNull();
  });
  it("works without sessionStorage and does not persist email/password", async () => {
    const qa = setup();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    await fill();
    await submit();
    await waitForConfirmation();
    expect(qa.auth().session).toBeNull();
  });
});

describe("prepared callback notices only — no callback route or token exchange approved", () => {
  it.each(["expired", "invalid"] as const)(
    "renders a localized %s notice without any auth/network side effect",
    async (status) => {
      const fetcher = vi.fn();
      vi.stubGlobal("fetch", fetcher);
      render(
        <I18nProvider>
          <ConfirmationNotice status={status} />
        </I18nProvider>,
      );
      await waitFor(() =>
        expect(screen.getByRole("alert")).toBeInTheDocument(),
      );
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
});
