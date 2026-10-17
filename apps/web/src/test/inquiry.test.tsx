import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider, LanguageSwitch } from "../shared/i18n";
import { ApiError } from "../shared/api/client";
import { postInquiry } from "../features/explore/api";
import InquiryForm from "../features/inquiry/InquiryForm";

vi.mock("../features/explore/api", () => ({
  postInquiry: vi.fn(),
}));

const businessId = "10000000-0000-4000-8000-000000000001";
const receipt = {
  id: "20000000-0000-4000-8000-000000000001",
  created_at: "2026-10-17T08:00:00Z",
};

function renderForm({ withLanguageSwitch = false } = {}) {
  return render(
    <I18nProvider>
      {withLanguageSwitch && <LanguageSwitch />}
      <InquiryForm businessId={businessId} businessName="Торговый дом Әсем" />
    </I18nProvider>,
  );
}

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole("textbox", { name: /ваше имя/i }), "Алия");
  await user.type(
    screen.getByRole("textbox", { name: /как с вами связаться/i }),
    "buyer@example.test",
  );
  await user.type(
    screen.getByRole("textbox", { name: /что вы ищете/i }),
    "Школьный рюкзак",
  );
}

describe("public shop inquiry form", () => {
  beforeEach(() => vi.clearAllMocks());

  it("validates every contract-required field and accepts free-form contacts", async () => {
    const user = userEvent.setup();
    vi.mocked(postInquiry).mockResolvedValue(receipt);
    renderForm();

    await user.click(screen.getByRole("button", { name: "Отправить заявку" }));

    expect(screen.getAllByText("Обязательное поле")).toHaveLength(3);
    expect(postInquiry).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "P" &&
          element.textContent?.includes("Торговый дом Әсем") === true,
      ),
    ).toBeInTheDocument();

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Отправить заявку" }));

    await waitFor(() => expect(postInquiry).toHaveBeenCalledOnce());
    expect(postInquiry).toHaveBeenCalledWith(
      businessId,
      expect.objectContaining({
        visitor_name: "Алия",
        contact: "buyer@example.test",
        message: "Школьный рюкзак",
      }),
    );
    expect(vi.mocked(postInquiry).mock.calls[0][1].client_request_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("locks duplicate submits and retries an uncertain result with the same request", async () => {
    const user = userEvent.setup();
    let rejectRequest!: (reason: ApiError) => void;
    vi.mocked(postInquiry)
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectRequest = reject;
          }),
      )
      .mockResolvedValueOnce(receipt);
    renderForm();
    await fillForm(user);

    const submit = screen.getByRole("button", { name: "Отправить заявку" });
    await user.click(submit);
    expect(screen.getByRole("button", { name: "Отправляем…" })).toBeDisabled();
    fireEvent.submit(submit.closest("form")!);
    expect(postInquiry).toHaveBeenCalledOnce();

    await act(async () => rejectRequest(new ApiError(0, "NETWORK_ERROR")));
    expect(
      screen.getByText(/Не удалось подтвердить, создана ли заявка/),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /ваше имя/i })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Повторить отправку" }),
    ).toBeEnabled();

    const firstRequest = vi.mocked(postInquiry).mock.calls[0];
    await user.click(
      screen.getByRole("button", { name: "Повторить отправку" }),
    );
    await waitFor(() => expect(postInquiry).toHaveBeenCalledTimes(2));
    expect(vi.mocked(postInquiry).mock.calls[1]).toEqual(firstRequest);
    expect(await screen.findByText("Торговый дом Әсем")).toBeInTheDocument();
    expect(screen.getByText(receipt.id)).toBeInTheDocument();
  });

  it("keeps entered values editable after a definitive API rejection", async () => {
    const user = userEvent.setup();
    vi.mocked(postInquiry).mockRejectedValueOnce(
      new ApiError(422, "VALIDATION_ERROR"),
    );
    renderForm();
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Отправить заявку" }));

    expect(
      await screen.findByText(/Сервер не принял заявку/),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /ваше имя/i })).toHaveValue(
      "Алия",
    );
    expect(
      screen.getByRole("textbox", { name: /как с вами связаться/i }),
    ).toHaveValue("buyer@example.test");
    expect(screen.getByRole("textbox", { name: /ваше имя/i })).toBeEnabled();
  });

  it("shows Kazakh labels when the shared language is switched", async () => {
    const user = userEvent.setup();
    renderForm({ withLanguageSwitch: true });
    await user.click(screen.getByRole("button", { name: "KZ" }));

    expect(
      screen.getByRole("heading", { name: "Өтінім қалдыру" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: /атыңыз/i }),
    ).toBeInTheDocument();
  });
});
