import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import examples from "../../../../packages/contracts/examples.json";
import { AuthProvider } from "../app/auth";
import { BusinessProvider, RuntimeProvider } from "../app/runtime";
import { makeQueryClient } from "../app/query";
import { CreateCustomerForm } from "../features/seller/Customers";
import { I18nProvider, LanguageSwitch } from "../shared/i18n";
import { createApiClient } from "../shared/api/client";
import { createLiveGateway } from "../shared/api/gateway";
import {
  backendBindings,
  customerBody,
  readCustomer,
  readInquiries,
} from "../shared/api/bindings";
import type { CustomerInput } from "../shared/api/models";

const fields = ["display_name", "note", "contact"] as const;
const limits = { display_name: 200, note: 2000, contact: 200 } as const;
const baseInput = { display_name: "Әсел", note: "", contact: "" };
const business = examples.MeResponse.businesses[0];
const response = examples.CustomerResponse;

describe("customer Unicode limits from the accepted API 0.4 contract", () => {
  for (const field of fields) {
    it.each(["Kazakh BMP", "non-BMP", "combining"])(
      `${field} accepts the code-point boundary and rejects max+1 for %s on write and read`,
      (alphabet) => {
        const max = limits[field];
        const boundary =
          alphabet === "Kazakh BMP"
            ? "Қ".repeat(max)
            : alphabet === "non-BMP"
              ? "😀".repeat(max)
              : "И\u0306".repeat(max / 2);
        const input = { ...baseInput, [field]: `  ${boundary}  ` };
        expect(customerBody(input)[field]).toBe(boundary);
        expect(readCustomer({ ...response, [field]: boundary })[field]).toBe(
          boundary,
        );
        expect(() =>
          customerBody({ ...baseInput, [field]: `${boundary}Ә` }),
        ).toThrowError(expect.objectContaining({ code: "VALIDATION_ERROR" }));
        expect(() =>
          readCustomer({ ...response, [field]: `${boundary}Ә` }),
        ).toThrowError(expect.objectContaining({ code: "INVALID_RESPONSE" }));
      },
    );
  }
  it("preserves decomposed text and existing trim, required-name and nullable-contact behavior", () => {
    expect(
      customerBody({ display_name: " И\u0306 Әсел ", note: " ", contact: " " }),
    ).toEqual({ display_name: "И\u0306 Әсел", note: "", contact: null });
    expect(() =>
      customerBody({ ...baseInput, display_name: " \n " }),
    ).toThrow();
    expect(() => readCustomer({ ...response, display_name: "" })).toThrow();
  });
  it("also reads bounded inquiry response text by code points without changing its schema", () => {
    const inquiry = {
      id: response.id,
      business_id: business.id,
      visitor_name: "😀".repeat(100),
      contact: "😀".repeat(200),
      message: "😀".repeat(2000),
      status: "new",
      created_at: "2026-10-16T00:00:00Z",
    };
    expect(
      readInquiries({ items: [inquiry], next_cursor: null }).items[0],
    ).toEqual(inquiry);
    expect(() =>
      readInquiries({
        items: [{ ...inquiry, visitor_name: `${inquiry.visitor_name}Ә` }],
      }),
    ).toThrow();
  });
});

function renderForm() {
  const onCreated = vi.fn();
  const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
    const body = JSON.parse(String(init?.body)) as CustomerInput;
    return new Response(JSON.stringify({ ...response, ...body }), {
      status: 201,
    });
  });
  const gateway = createLiveGateway(
    createApiClient({
      baseUrl: "https://qa.invalid/api/v1",
      getToken: async () => "synthetic-unicode-test-token",
      fetcher,
    }),
    backendBindings,
  );
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <I18nProvider>
        <AuthProvider client={null}>
          <RuntimeProvider gateway={gateway}>
            <BusinessProvider businesses={[business]}>
              <MemoryRouter>
                <LanguageSwitch />
                <CreateCustomerForm onCreated={onCreated} />
              </MemoryRouter>
            </BusinessProvider>
          </RuntimeProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
  return { fetcher, onCreated };
}

const labels = {
  display_name: "Имя",
  note: "Заметка",
  contact: "Контакт (необязательно)",
};

describe("real customer creation form with an intercepted HTTP transport", () => {
  it("retains and submits full non-BMP values at all three boundaries, then reads the server response", async () => {
    const { fetcher, onCreated } = renderForm();
    for (const field of fields) {
      const control = screen.getByLabelText(labels[field]);
      expect(control).not.toHaveAttribute("maxlength");
      const value = "😀".repeat(limits[field]);
      fireEvent.change(control, { target: { value: ` ${value} ` } });
      expect(control).toHaveValue(` ${value} `);
    }
    await userEvent.click(
      screen.getByRole("button", { name: "Создать клиента" }),
    );
    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe(
      `https://qa.invalid/api/v1/businesses/${business.id}/customers`,
    );
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer synthetic-unicode-test-token",
    );
    expect(JSON.parse(String(init?.body))).toEqual({
      display_name: "😀".repeat(200),
      note: "😀".repeat(2000),
      contact: "😀".repeat(200),
    });
    expect(onCreated.mock.calls[0][0].display_name).toBe("😀".repeat(200));
  });
  it.each(fields)(
    "blocks an oversize %s without truncation or POST, describes the error in RU/KZ, and permits correction",
    async (field) => {
      const { fetcher, onCreated } = renderForm();
      fireEvent.change(screen.getByLabelText("Имя"), {
        target: { value: "Әсел" },
      });
      const control = screen.getByLabelText(labels[field]);
      const oversized = "😀".repeat(limits[field] + 1);
      fireEvent.change(control, { target: { value: oversized } });
      await userEvent.click(
        screen.getByRole("button", { name: "Создать клиента" }),
      );
      expect(control).toHaveValue(oversized);
      expect(control).toHaveAttribute("aria-invalid", "true");
      expect(control).toHaveAccessibleDescription(
        new RegExp(`не более ${limits[field]} символов`),
      );
      expect(fetcher).not.toHaveBeenCalled();
      expect(onCreated).not.toHaveBeenCalled();
      await userEvent.click(screen.getByRole("button", { name: "KZ" }));
      expect(control).toHaveValue(oversized);
      expect(control).toHaveAccessibleDescription(
        new RegExp(`${limits[field]} таңбадан артық`),
      );
      fireEvent.change(control, {
        target: { value: "😀".repeat(limits[field]) },
      });
      expect(control).toHaveAttribute("aria-invalid", "false");
      await userEvent.click(
        screen.getByRole("button", { name: "Клиентті құру" }),
      );
      await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
      expect(fetcher).toHaveBeenCalledOnce();
    },
  );
});
