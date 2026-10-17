import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, expectTypeOf, it, vi } from "vitest";
import { I18nProvider, LanguageSwitch } from "../../shared/i18n";
import { postInquiry } from "../explore/api";
import InquiryForm, { type InquiryFormProps } from "./InquiryForm";

vi.mock("../explore/api", () => ({ postInquiry: vi.fn() }));

const businessId = "10000000-0000-4000-8000-000000000001";
const receipt = {
  id: "20000000-0000-4000-8000-000000000001",
  created_at: "2026-10-17T08:00:00Z",
};

beforeEach(() => vi.clearAllMocks());

function setup() {
  return render(
    <I18nProvider>
      <LanguageSwitch />
      <InquiryForm
        businessId={businessId}
        businessName="Учебный магазин Әсем"
      />
    </I18nProvider>,
  );
}

it("requires the agreed recipient props, without external callbacks", () => {
  expectTypeOf<InquiryFormProps>().toEqualTypeOf<{
    businessId: string;
    businessName: string;
  }>();
});

it("focuses the first invalid field in order and links visible errors", async () => {
  setup();
  const user = userEvent.setup();
  const inputs = screen.getAllByRole("textbox");
  const submit = screen.getByRole("button", { name: "Отправить заявку" });
  await user.click(submit);
  for (let index = 0; index < inputs.length; index++) {
    expect(inputs[index]).toHaveFocus();
    expect(inputs[index]).toHaveAttribute("aria-invalid", "true");
    expect(inputs[index]).toHaveAccessibleDescription(/Обязательное поле/);
    await user.type(inputs[index], "Учебный текст");
    expect(inputs[index]).toHaveAttribute("aria-invalid", "false");
    if (index < inputs.length - 1) await user.click(submit);
  }
  expect(postInquiry).not.toHaveBeenCalled();
  expect(screen.getByText("Все поля обязательны.")).toBeVisible();
});

it("keeps accessible IDs local to each mounted form", async () => {
  render(
    <I18nProvider>
      <InquiryForm businessId={businessId} businessName="Магазин A" />
      <InquiryForm
        businessId="10000000-0000-4000-8000-000000000002"
        businessName="Магазин B"
      />
    </I18nProvider>,
  );
  for (const region of screen.getAllByRole("region", {
    name: "Оставить заявку",
  })) {
    fireEvent.submit(region.querySelector("form")!);
    for (const input of within(region).getAllByRole("textbox")) {
      for (const id of input.getAttribute("aria-describedby")!.split(" ")) {
        expect(region.contains(document.getElementById(id))).toBe(true);
      }
    }
  }
  const ids = [...document.querySelectorAll("[id]")].map((node) => node.id);
  expect(new Set(ids).size).toBe(ids.length);
});

it("moves focus to API-confirmed success, then back to a new empty form", async () => {
  let resolve!: (value: typeof receipt) => void;
  vi.mocked(postInquiry).mockReturnValue(
    new Promise((done) => (resolve = done)),
  );
  setup();
  const user = userEvent.setup();
  for (const input of screen.getAllByRole("textbox")) {
    await user.type(input, "Synthetic input");
  }
  await user.click(screen.getByRole("button", { name: "Отправить заявку" }));
  expect(screen.getByRole("button", { name: "Отправляем…" })).toBeDisabled();
  expect(screen.queryByText("Заявка отправлена:")).not.toBeInTheDocument();
  await act(async () => resolve(receipt));
  const confirmation = screen.getByRole("region", {
    name: "Заявка отправлена:",
  });
  expect(confirmation).toHaveFocus();
  expect(within(confirmation).getByText("Учебный магазин Әсем")).toBeVisible();
  await user.tab();
  expect(
    screen.getByRole("button", { name: "Отправить ещё одну" }),
  ).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(screen.getByRole("textbox", { name: /Ваше имя/ })).toHaveFocus();
  for (const input of screen.getAllByRole("textbox"))
    expect(input).toHaveValue("");
  expect(postInquiry).toHaveBeenCalledOnce();
});

it("keeps general contacts editable without mobile autocorrection and localizes errors", async () => {
  setup();
  const user = userEvent.setup();
  const contact = screen.getByRole("textbox", { name: /Как с вами связаться/ });
  expect(contact).toHaveAttribute("inputmode", "text");
  expect(contact).toHaveAttribute("enterkeyhint", "next");
  expect(contact).toHaveAttribute("autocapitalize", "none");
  expect(contact).toHaveAttribute("autocorrect", "off");
  expect(contact).toHaveAttribute("spellcheck", "false");
  await user.type(contact, "@synthetic_buyer");
  await user.click(screen.getByRole("button", { name: "KZ" }));
  await user.click(screen.getByRole("button", { name: "Өтінім жіберу" }));
  expect(screen.getByRole("textbox", { name: /Атыңыз/ })).toHaveFocus();
  expect(screen.getAllByText("Міндетті өріс")).toHaveLength(2);
  expect(contact).toHaveValue("@synthetic_buyer");
  expect(screen.getByText("Барлық өрісті толтыру қажет.")).toBeVisible();
});
