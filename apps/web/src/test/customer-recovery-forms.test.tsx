import { webcrypto } from "node:crypto";
import { useState, type ReactNode } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../app/auth";
import { BusinessProvider, RuntimeProvider, useRuntime } from "../app/runtime";
import { CreateCustomerForm } from "../features/seller/Customers";
import { useCustomerCreationRecovery } from "../features/seller/queries";
import type { SellerGateway } from "../shared/api/gateway";
import type { Business, Customer, CustomerInput } from "../shared/api/models";
import { I18nProvider } from "../shared/i18n";
import { customer, deferred, ids, mockAuth } from "./qa-fixtures";

const API = "https://customer-form-fixture.invalid/api/v1";
const business: Business = {
  id: ids.shopA,
  name: "Synthetic form fixture",
  slug: "synthetic-form-fixture",
};
const storageKey = `qadam.customer-create.v1:${encodeURIComponent(API)}:${ids.a}:${business.id}`;
const draftKey = `${business.id}:customer-form`;
const inputA: CustomerInput = {
  display_name: "Форма A — Әлия",
  note: "Synthetic first form",
  contact: "@form-a-fixture",
};
const inputB: CustomerInput = {
  display_name: "Форма B — Қанат",
  note: "Unsent second form",
  contact: "@form-b-fixture",
};
const savedA: Customer = {
  ...customer(),
  ...inputA,
  balance_minor: 0,
};

function mountForms(twoForms = false) {
  const auth = mockAuth();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const unexpected = async (): Promise<never> => {
    throw new Error("Unexpected gateway call outside customer creation");
  };
  const gateway = {
    mode: "live" as const,
    canWrite: true,
    canCreateCustomer: true,
    me: unexpected,
    customers: unexpected,
    inquiries: unexpected,
    setInquiryStatus: unexpected,
    catalog: unexpected,
    createCustomer: vi.fn<SellerGateway["createCustomer"]>(),
    customerCreationResult:
      vi.fn<NonNullable<SellerGateway["customerCreationResult"]>>(),
  } satisfies SellerGateway;
  gateway.customerCreationResult.mockResolvedValue({
    status: "not_observed",
    customer: null,
  });
  const createdA = vi.fn<(value: Customer) => void>();
  const createdB = vi.fn<(value: Customer) => void>();
  const observed: {
    recovery: ReturnType<typeof useCustomerCreationRecovery> | null;
    runtime: ReturnType<typeof useRuntime> | null;
  } = { recovery: null, runtime: null };
  function ParentObserver() {
    observed.recovery = useCustomerCreationRecovery();
    observed.runtime = useRuntime();
    return (
      <output aria-label="Parent recovery observer">
        {observed.recovery.state}
      </output>
    );
  }
  function Forms() {
    const [showA, setShowA] = useState(true);
    const [showB, setShowB] = useState(twoForms);
    return (
      <>
        <ParentObserver />
        <button onClick={() => setShowA((visible) => !visible)}>
          Toggle A
        </button>
        <button onClick={() => setShowB((visible) => !visible)}>
          Toggle B
        </button>
        {showA && (
          <section aria-label="Form A">
            <CreateCustomerForm onCreated={createdA} />
          </section>
        )}
        {showB && (
          <section aria-label="Form B">
            <CreateCustomerForm onCreated={createdB} />
          </section>
        )}
      </>
    );
  }
  function Authenticated({ children }: { children: ReactNode }) {
    const current = useAuth();
    if (current.loading || !current.session) return null;
    return (
      <RuntimeProvider key={current.scope} gateway={gateway}>
        <BusinessProvider businesses={[business]}>{children}</BusinessProvider>
      </RuntimeProvider>
    );
  }
  const view = render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <AuthProvider client={auth.client}>
          <Authenticated>
            <Forms />
          </Authenticated>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
  return { ...view, gateway, createdA, createdB, observed };
}

function fillForm(region: HTMLElement, input: CustomerInput) {
  const form = within(region);
  fireEvent.change(form.getByLabelText("Имя", { exact: true }), {
    target: { value: input.display_name },
  });
  fireEvent.change(form.getByLabelText("Заметка", { exact: true }), {
    target: { value: input.note },
  });
  fireEvent.change(
    form.getByLabelText("Контакт (необязательно)", { exact: true }),
    {
      target: { value: input.contact },
    },
  );
}
function expectForm(region: HTMLElement, input: CustomerInput) {
  const form = within(region);
  expect(form.getByLabelText("Имя", { exact: true })).toHaveValue(
    input.display_name,
  );
  expect(form.getByLabelText("Заметка", { exact: true })).toHaveValue(
    input.note,
  );
  expect(
    form.getByLabelText("Контакт (необязательно)", { exact: true }),
  ).toHaveValue(input.contact);
}

beforeEach(() => {
  vi.stubEnv("VITE_API_BASE_URL", API);
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("These component tests must not call a live service");
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("real customer forms share recovery without inheriting another form's completion", () => {
  it("unmounting the submitting form cancels its ownership even while the parent observer stays mounted", async () => {
    const qa = mountForms();
    const response = deferred<Customer>();
    // Deliberately ignore AbortSignal: the old transport can still deliver 201.
    qa.gateway.createCustomer.mockReturnValue(response.promise);
    const formA = await screen.findByRole("region", { name: "Form A" });
    fillForm(formA, inputA);
    fireEvent.click(
      within(formA).getByRole("button", {
        name: "Создать клиента",
      }),
    );
    await waitFor(() =>
      expect(qa.gateway.createCustomer).toHaveBeenCalledTimes(1),
    );
    const pending = localStorage.getItem(storageKey);
    expect(pending).not.toBeNull();
    const parent = screen.getByLabelText("Parent recovery observer");
    const runtime = qa.observed.runtime;

    fireEvent.click(screen.getByRole("button", { name: "Toggle A" }));
    expect(
      screen.queryByRole("region", { name: "Form A" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Parent recovery observer")).toBe(parent);
    expect(qa.observed.runtime).toBe(runtime);
    await waitFor(() => expect(qa.observed.recovery?.state).toBe("unknown"));
    expect(qa.gateway.createCustomer.mock.calls[0][3]?.aborted).toBe(true);

    await act(async () => {
      response.resolve(savedA);
      await response.promise;
    });
    expect(localStorage.getItem(storageKey)).toBe(pending);
    expect(qa.observed.recovery?.state).toBe("unknown");
    expect(qa.observed.recovery?.resolvedCustomer).toBeNull();
    expect(qa.createdA).not.toHaveBeenCalled();
    expect(qa.createdB).not.toHaveBeenCalled();
    expect(runtime?.drafts.get(draftKey)).toEqual(inputA);
    // A fresh form can recover only by checking the same stored intent. The old
    // success does not close it or erase its still-private in-memory fields.
    fireEvent.click(screen.getByRole("button", { name: "Toggle A" }));
    await waitFor(() => expect(qa.observed.recovery?.state).toBe("unknown"));
    expectForm(screen.getByRole("region", { name: "Form A" }), inputA);
    expect(localStorage.getItem(storageKey)).toBe(pending);
    expect(qa.gateway.createCustomer).toHaveBeenCalledTimes(1);
    expect(qa.createdA).not.toHaveBeenCalled();
  });

  it("completing form A calls only A and preserves form B's distinct fields and shared draft through B remount", async () => {
    const qa = mountForms(true);
    const response = deferred<Customer>();
    qa.gateway.createCustomer.mockReturnValue(response.promise);
    const formA = await screen.findByRole("region", { name: "Form A" });
    const formB = screen.getByRole("region", { name: "Form B" });
    fillForm(formA, inputA);
    // B is the last writer of the per-business draft, while A still has its own
    // input state. A's receipt must not clear B's later, unsent draft.
    fillForm(formB, inputB);
    expectForm(formA, inputA);
    expectForm(formB, inputB);
    expect(qa.observed.runtime?.drafts.get(draftKey)).toEqual(inputB);
    fireEvent.click(
      within(formA).getByRole("button", {
        name: "Создать клиента",
      }),
    );
    await waitFor(() =>
      expect(qa.gateway.createCustomer).toHaveBeenCalledTimes(1),
    );
    expect(qa.gateway.createCustomer.mock.calls[0][1]).toEqual(inputA);
    await act(async () => {
      response.resolve(savedA);
      await response.promise;
    });
    await waitFor(() =>
      expect(qa.createdA).toHaveBeenCalledExactlyOnceWith(savedA),
    );
    expect(qa.createdB).not.toHaveBeenCalled();
    expect(qa.observed.recovery?.resolvedCustomer).toBeNull();
    expectForm(formB, inputB);
    expect(qa.observed.runtime?.drafts.get(draftKey)).toEqual(inputB);
    expect(
      within(formB).queryByText("Клиент создан на сервере."),
    ).not.toBeInTheDocument();
    expect(localStorage.getItem(storageKey)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Toggle B" }));
    expect(
      screen.queryByRole("region", { name: "Form B" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Toggle B" }));
    expectForm(screen.getByRole("region", { name: "Form B" }), inputB);
    expect(qa.observed.runtime?.drafts.get(draftKey)).toEqual(inputB);
    expect(qa.createdA).toHaveBeenCalledTimes(1);
    expect(qa.createdB).not.toHaveBeenCalled();
    expect(qa.gateway.createCustomer).toHaveBeenCalledTimes(1);
  });
});
