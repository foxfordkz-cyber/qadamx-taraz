import { webcrypto } from "node:crypto";
import type { ReactNode } from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCustomerCreationRecovery } from "../features/seller/queries";
import { CustomerRecoveryCoordinator } from "../features/seller/customer-recovery";
import { ApiError } from "../shared/api/client";
import type { Business, Customer, CustomerInput } from "../shared/api/models";

type Lookup =
  | { status: "completed"; customer: Customer }
  | { status: "not_observed"; customer: null };

const fixtures = vi.hoisted(() => {
  const unexpected = async () => {
    throw new Error("Unexpected non-recovery gateway method");
  };
  const business: Business = {
    id: "10000000-0000-4000-8000-000000000071",
    slug: "synthetic-recovery-a",
    name: "Synthetic recovery shop A",
  };
  return {
    identity: {
      userId: "50000000-0000-4000-8000-000000000071" as string | null,
      scope: "recovery-owner-a:epoch-1",
      business,
    },
    gateway: {
      mode: "live" as const,
      canWrite: true,
      canCreateCustomer: true,
      me: unexpected,
      inquiries: unexpected,
      setInquiryStatus: unexpected,
      customers: unexpected,
      catalog: unexpected,
      createCustomer:
        vi.fn<
          (
            business: Business,
            input: CustomerInput,
            key?: string,
            signal?: AbortSignal,
          ) => Promise<Customer>
        >(),
      customerCreationResult:
        vi.fn<
          (
            business: Business,
            key: string,
            signal?: AbortSignal,
          ) => Promise<Lookup>
        >(),
    },
  };
});

vi.mock("../app/auth", () => ({
  useAuth: () => ({
    scope: fixtures.identity.scope,
    session: fixtures.identity.userId
      ? {
          user: { id: fixtures.identity.userId },
          access_token: "synthetic-token-must-never-be-persisted",
        }
      : null,
    demo: false,
    expired: false,
  }),
}));
vi.mock("../app/runtime", () => ({
  useRuntime: () => ({
    scope: fixtures.identity.scope,
    gateway: fixtures.gateway,
  }),
  useBusiness: () => ({ business: fixtures.identity.business }),
}));

const API = "https://recovery-regression.invalid/api/v1";
const OWNER_A = "50000000-0000-4000-8000-000000000071";
const OWNER_B = "50000000-0000-4000-8000-000000000072";
const SHOP_A: Business = {
  id: "10000000-0000-4000-8000-000000000071",
  slug: "synthetic-recovery-a",
  name: "Synthetic recovery shop A",
};
const SHOP_B: Business = {
  id: "10000000-0000-4000-8000-000000000072",
  slug: "synthetic-recovery-b",
  name: "Synthetic recovery shop B",
};
const INPUT: CustomerInput = {
  display_name: "Синтетикалық Әлия 𐐀",
  note: "Synthetic private customer note",
  contact: "synthetic-contact-not-a-phone",
};
const OTHER_INPUT: CustomerInput = {
  ...INPUT,
  display_name: "Synthetic second",
};
const notObserved: Lookup = { status: "not_observed", customer: null };
const customer = (business = SHOP_A, input = INPUT): Customer => ({
  id: "60000000-0000-4000-8000-000000000071",
  business_id: business.id,
  display_name: input.display_name,
  note: input.note,
  contact: input.contact,
  balance_minor: 0,
});
const storageKey = (user = OWNER_A, business = SHOP_A, api = API) =>
  `qadam.customer-create.v1:${encodeURIComponent(api)}:${user}:${business.id}`;
const legacyKey = `qadam.customer-create.v1:${OWNER_A}:${SHOP_A.id}`;
const readIntent = (key = storageKey()) => {
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as { key: string; bodyHash: string }) : null;
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function mountRecovery() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useCustomerCreationRecovery(), { wrapper });
  return { ...hook, client, invalidate };
}
function storageChanged(
  key: string | null,
  oldValue: string | null,
  newValue: string | null,
) {
  window.dispatchEvent(
    new StorageEvent("storage", {
      key,
      oldValue,
      newValue,
      storageArea: localStorage,
      url: "https://recovery-regression.invalid/other-tab",
    }),
  );
}
async function unknownAttempt(hook: ReturnType<typeof mountRecovery>) {
  fixtures.gateway.createCustomer.mockRejectedValueOnce(
    new ApiError(0, "NETWORK_ERROR"),
  );
  await act(async () => {
    await hook.result.current.create(INPUT);
  });
  expect(hook.result.current.state).toBe("unknown");
  const intent = readIntent();
  expect(intent).not.toBeNull();
  return intent!;
}

beforeEach(() => {
  fixtures.identity.userId = OWNER_A;
  fixtures.identity.scope = "recovery-owner-a:epoch-1";
  fixtures.identity.business = SHOP_A;
  fixtures.gateway.createCustomer
    .mockReset()
    .mockImplementation(async (business, input) => customer(business, input));
  fixtures.gateway.customerCreationResult
    .mockReset()
    .mockResolvedValue(notObserved);
  localStorage.clear();
  vi.stubEnv("VITE_API_BASE_URL", API);
  vi.stubGlobal("crypto", webcrypto);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("customer recovery coordinator — synthetic gateway, no server idempotency claim", () => {
  it("persists only a new random key and body hash before POST, then clears on confirmed success", async () => {
    const reply = deferred<Customer>();
    fixtures.gateway.createCustomer.mockReturnValueOnce(reply.promise);
    const hook = mountRecovery();
    let create!: Promise<void>;
    act(() => {
      create = hook.result.current.create(INPUT);
    });
    await waitFor(() =>
      expect(fixtures.gateway.createCustomer).toHaveBeenCalledTimes(1),
    );
    const intent = readIntent()!;
    expect(intent).toEqual({
      key: expect.stringMatching(/^[!-~]{1,200}$/),
      bodyHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(fixtures.gateway.createCustomer.mock.calls[0][2]).toBe(intent.key);
    const persisted = JSON.stringify({ ...localStorage });
    for (const secret of [
      INPUT.display_name,
      INPUT.note,
      INPUT.contact,
      "synthetic-token-must-never-be-persisted",
    ])
      expect(persisted).not.toContain(secret);
    expect(hook.result.current.busy).toBe(true);
    expect(hook.result.current.resolvedCustomer).toBeNull();
    await act(async () => {
      reply.resolve(customer());
      await create;
    });
    expect(hook.result.current.state).toBe("complete");
    expect(hook.result.current.resolvedCustomer).toEqual(customer());
    expect(readIntent()).toBeNull();
  });

  it("blocks a synchronous double submit before hashing or the first network response", async () => {
    const reply = deferred<Customer>();
    fixtures.gateway.createCustomer.mockReturnValue(reply.promise);
    const hook = mountRecovery();
    let attempts!: Promise<unknown>;
    act(() => {
      attempts = Promise.all([
        hook.result.current.create(INPUT),
        hook.result.current.create(INPUT),
      ]);
    });
    await waitFor(() =>
      expect(fixtures.gateway.createCustomer).toHaveBeenCalledTimes(1),
    );
    await act(async () => {
      reply.resolve(customer());
      await attempts;
    });
    expect(fixtures.gateway.createCustomer).toHaveBeenCalledTimes(1);
  });

  it("coordinates simultaneous CustomerPicker and Customers hook instances in the same scope", async () => {
    const reply = deferred<Customer>();
    fixtures.gateway.createCustomer.mockReturnValue(reply.promise);
    const picker = mountRecovery();
    const customers = mountRecovery();
    let attempts!: Promise<unknown>;
    act(() => {
      attempts = Promise.all([
        picker.result.current.create(INPUT),
        customers.result.current.create(OTHER_INPUT),
      ]);
    });
    await waitFor(() =>
      expect(fixtures.gateway.createCustomer).toHaveBeenCalledTimes(1),
    );
    const intent = readIntent();
    expect(intent).not.toBeNull();
    await act(async () => {
      reply.resolve(customer());
      await attempts;
    });
    expect(fixtures.gateway.createCustomer).toHaveBeenCalledTimes(1);
    expect(readIntent()).toBeNull();
  });

  it("shares completion status without selecting or clearing another mounted form's customer", async () => {
    const reply = deferred<Customer>();
    fixtures.gateway.createCustomer.mockReturnValueOnce(reply.promise);
    const initiatingForm = mountRecovery();
    const unrelatedForm = mountRecovery();
    let attempt!: Promise<void>;
    act(() => {
      attempt = initiatingForm.result.current.create(INPUT);
    });
    await waitFor(() =>
      expect(fixtures.gateway.createCustomer).toHaveBeenCalledTimes(1),
    );
    await act(async () => {
      await unrelatedForm.result.current.create(OTHER_INPUT);
    });
    expect(fixtures.gateway.createCustomer).toHaveBeenCalledTimes(1);
    await act(async () => {
      reply.resolve(customer());
      await attempt;
    });
    expect(initiatingForm.result.current.state).toBe("complete");
    expect(unrelatedForm.result.current.state).toBe("complete");
    expect(initiatingForm.result.current.resolvedCustomer).toEqual(customer());
    expect(unrelatedForm.result.current.resolvedCustomer).toBeNull();
    expect(readIntent()).toBeNull();
  });

  it.each(["same body", "different bodies"])(
    "separate tab coordinators claim one durable key with %s even before storage events arrive",
    async (kind) => {
      // Separate coordinator instances model independent tab memory. The shared
      // storage and exclusive locks are the only coordination in this scenario.
      const first = new CustomerRecoveryCoordinator(storageKey(), legacyKey);
      const second = new CustomerRecoveryCoordinator(storageKey(), legacyKey);
      const firstOwner = { active: true, current: () => true };
      const secondOwner = { active: true, current: () => true };
      const response = deferred<void>();
      fixtures.gateway.createCustomer.mockImplementation(
        async (business, input) => {
          await response.promise;
          return customer(business, input);
        },
      );
      const request = {
        gateway: fixtures.gateway,
        business: SHOP_A,
        onComplete: vi.fn(),
      };
      first.attach(firstOwner);
      second.attach(secondOwner);
      try {
        const attempts = Promise.all([
          first.create(firstOwner, INPUT, request),
          second.create(
            secondOwner,
            kind === "same body" ? INPUT : OTHER_INPUT,
            request,
          ),
        ]);
        await waitFor(() =>
          expect(fixtures.gateway.createCustomer).toHaveBeenCalledTimes(
            kind === "same body" ? 2 : 1,
          ),
        );
        const intent = readIntent()!;
        expect(
          new Set(
            fixtures.gateway.createCustomer.mock.calls.map((call) => call[2]),
          ),
        ).toEqual(new Set([intent.key]));
        if (kind === "different bodies") {
          await waitFor(() =>
            expect(
              [first.getSnapshot(), second.getSnapshot()].some(
                (snapshot) => snapshot.bodyMismatch,
              ),
            ).toBe(true),
          );
        }
        response.resolve();
        await attempts;
        expect(readIntent()).toBeNull();
      } finally {
        firstOwner.active = false;
        secondOwner.active = false;
        first.detach(firstOwner);
        second.detach(secondOwner);
      }
    },
  );

  it("keeps an unknown intent after not_observed and retries only the original key and exact body", async () => {
    const hook = mountRecovery();
    const intent = await unknownAttempt(hook);
    expect(fixtures.gateway.createCustomer).toHaveBeenCalledTimes(1);
    expect(hook.result.current.resolvedCustomer).toBeNull();
    expect(readIntent()).toEqual(intent);
    await act(async () => {
      await hook.result.current.create(INPUT);
    });
    const posts = fixtures.gateway.createCustomer.mock.calls;
    expect(posts).toHaveLength(2);
    expect(posts[1][2]).toBe(posts[0][2]);
    expect(posts[1][1]).toEqual(posts[0][1]);
    expect(hook.result.current.state).toBe("complete");
  });

  it("does not assign a new key or send a changed body after an unknown result", async () => {
    const hook = mountRecovery();
    const intent = await unknownAttempt(hook);
    await act(async () => {
      await hook.result.current.create(OTHER_INPUT);
    });
    expect(fixtures.gateway.createCustomer).toHaveBeenCalledTimes(1);
    expect(hook.result.current.bodyMismatch).toBe(true);
    expect(hook.result.current.state).toBe("unknown");
    expect(readIntent()).toEqual(intent);
  });

  it("recovers a simulated lost acknowledgement after commit using GET without another POST", async () => {
    let committed = false;
    fixtures.gateway.createCustomer.mockImplementationOnce(async () => {
      committed = true;
      throw new ApiError(0, "NETWORK_ERROR");
    });
    fixtures.gateway.customerCreationResult.mockImplementation(async () =>
      committed ? { status: "completed", customer: customer() } : notObserved,
    );
    const hook = mountRecovery();
    await act(async () => {
      await hook.result.current.create(INPUT);
    });
    expect(fixtures.gateway.createCustomer).toHaveBeenCalledTimes(1);
    expect(fixtures.gateway.customerCreationResult).toHaveBeenCalled();
    expect(hook.result.current.state).toBe("complete");
    expect(readIntent()).toBeNull();
  });

  it("does not bypass 409 by making a fresh key", async () => {
    fixtures.gateway.createCustomer.mockRejectedValueOnce(
      new ApiError(409, "IDEMPOTENCY_CONFLICT"),
    );
    const hook = mountRecovery();
    await act(async () => {
      await hook.result.current.create(INPUT);
    });
    const intent = readIntent();
    expect(intent).not.toBeNull();
    expect(hook.result.current.state).toBe("rejected");
    await act(async () => {
      await hook.result.current.create(OTHER_INPUT);
    });
    expect(fixtures.gateway.createCustomer).toHaveBeenCalledTimes(1);
    expect(readIntent()).toEqual(intent);
  });

  it.each([401, 404, 422])(
    "treats a confirmed initial POST %i rejection separately from unknown",
    async (status) => {
      fixtures.gateway.createCustomer.mockRejectedValueOnce(
        new ApiError(status, "SYNTHETIC_REJECTION"),
      );
      const hook = mountRecovery();
      await act(async () => {
        await hook.result.current.create(INPUT);
      });
      expect(hook.result.current.state).toBe("rejected");
      expect(hook.result.current.resolvedCustomer).toBeNull();
      const intent = readIntent();
      expect(intent).not.toBeNull();
      expect(intent?.key).toBe(
        fixtures.gateway.createCustomer.mock.calls[0][2],
      );
      await act(async () => {
        await hook.result.current.create(OTHER_INPUT);
      });
      expect(readIntent()).toEqual(intent);
      expect(fixtures.gateway.createCustomer).toHaveBeenCalledTimes(1);
    },
  );

  it.each([404, 422, 503])(
    "does not clear an earlier unknown intent when retry/lookup fails with %i",
    async (status) => {
      const hook = mountRecovery();
      const intent = await unknownAttempt(hook);
      fixtures.gateway.customerCreationResult.mockRejectedValue(
        new ApiError(status, "SYNTHETIC_LOOKUP_FAILURE"),
      );
      await act(async () => {
        await hook.result.current.check();
      });
      expect(hook.result.current.state).toBe("unknown");
      expect(readIntent()).toEqual(intent);
      expect(fixtures.gateway.createCustomer).toHaveBeenCalledTimes(1);
      expect(hook.result.current.resolvedCustomer).toBeNull();
    },
  );

  it("reload checks the saved key, and not_observed leaves it unresolved without automatically posting", async () => {
    const first = mountRecovery();
    const intent = await unknownAttempt(first);
    first.unmount();
    fixtures.gateway.customerCreationResult.mockClear();
    const reloaded = mountRecovery();
    await waitFor(() => expect(reloaded.result.current.state).toBe("unknown"));
    expect(
      fixtures.gateway.customerCreationResult.mock.calls.some(
        ([, key]) => key === intent.key,
      ),
    ).toBe(true);
    expect(fixtures.gateway.createCustomer).toHaveBeenCalledTimes(1);
    expect(readIntent()).toEqual(intent);
    await act(async () => {
      await reloaded.result.current.create(OTHER_INPUT);
    });
    expect(fixtures.gateway.createCustomer).toHaveBeenCalledTimes(1);
  });

  it("reload recovers a completed receipt and clears only that saved intent without a POST", async () => {
    const intent = {
      key: "synthetic-completed-reload",
      bodyHash: "a".repeat(64),
    };
    localStorage.setItem(storageKey(), JSON.stringify(intent));
    fixtures.gateway.customerCreationResult.mockResolvedValue({
      status: "completed",
      customer: customer(),
    });
    const hook = mountRecovery();
    await waitFor(() => expect(hook.result.current.state).toBe("complete"));
    expect(hook.result.current.resolvedCustomer).toEqual(customer());
    expect(fixtures.gateway.createCustomer).not.toHaveBeenCalled();
    expect(readIntent()).toBeNull();
  });

  it("K2 remains recoverable after late K1 success and a full hook remount", async () => {
    const firstResponse = deferred<Customer>();
    fixtures.gateway.createCustomer.mockReturnValueOnce(firstResponse.promise);
    const first = mountRecovery();
    let firstAttempt!: Promise<void>;
    act(() => {
      firstAttempt = first.result.current.create(INPUT);
    });
    await waitFor(() =>
      expect(fixtures.gateway.createCustomer).toHaveBeenCalledTimes(1),
    );
    const firstIntent = readIntent()!;
    first.unmount();

    fixtures.gateway.customerCreationResult.mockResolvedValueOnce({
      status: "completed",
      customer: customer(),
    });
    const second = mountRecovery();
    await waitFor(() => expect(second.result.current.state).toBe("complete"));
    expect(readIntent()).toBeNull();
    fixtures.gateway.createCustomer.mockRejectedValueOnce(
      new ApiError(0, "NETWORK_ERROR"),
    );
    await act(async () => {
      await second.result.current.create(OTHER_INPUT);
    });
    expect(second.result.current.state).toBe("unknown");
    const secondIntent = readIntent()!;
    expect(secondIntent).not.toBeNull();
    expect(secondIntent.key).not.toBe(firstIntent.key);
    expect(secondIntent.bodyHash).not.toBe(firstIntent.bodyHash);

    await act(async () => {
      firstResponse.resolve(customer());
      await firstAttempt;
    });
    expect(readIntent()).toEqual(secondIntent);
    await act(async () => {
      second.unmount();
      // Let the registry evict the last owner, so recovery starts from storage.
      await Promise.resolve();
    });
    fixtures.gateway.customerCreationResult.mockClear();
    const reloaded = mountRecovery();
    await waitFor(() => expect(reloaded.result.current.state).toBe("unknown"));
    expect(
      fixtures.gateway.customerCreationResult.mock.calls.length,
    ).toBeGreaterThan(0);
    expect(
      fixtures.gateway.customerCreationResult.mock.calls.every(
        ([, key]) => key === secondIntent.key,
      ),
    ).toBe(true);
    expect(fixtures.gateway.createCustomer).toHaveBeenCalledTimes(2);
    expect(readIntent()).toEqual(secondIntent);
    expect(reloaded.result.current.resolvedCustomer).toBeNull();

    const secondCustomer = {
      ...customer(SHOP_A, OTHER_INPUT),
      id: "60000000-0000-4000-8000-000000000072",
    };
    fixtures.gateway.customerCreationResult.mockResolvedValueOnce({
      status: "completed",
      customer: secondCustomer,
    });
    await act(async () => {
      await reloaded.result.current.check();
    });
    expect(reloaded.result.current.resolvedCustomer).toEqual(secondCustomer);
    expect(readIntent()).toBeNull();
    expect(fixtures.gateway.createCustomer).toHaveBeenCalledTimes(2);
  });

  it("leaves an unknown-origin legacy marker untouched and sends no GET or POST to the configured server", async () => {
    const intent = JSON.stringify({
      key: "legacy-without-origin",
      bodyHash: "b".repeat(64),
    });
    localStorage.setItem(legacyKey, intent);
    const hook = mountRecovery();
    await act(async () => {
      await hook.result.current.check();
      await hook.result.current.create(INPUT);
    });
    expect(hook.result.current.state).toBe("legacy-blocked");
    expect(localStorage.getItem(legacyKey)).toBe(intent);
    expect(localStorage.getItem(storageKey())).toBeNull();
    expect(fixtures.gateway.customerCreationResult).not.toHaveBeenCalled();
    expect(fixtures.gateway.createCustomer).not.toHaveBeenCalled();
  });

  it("does not transfer a pending receipt to a different API origin", async () => {
    const original = { key: "old-api-pending", bodyHash: "c".repeat(64) };
    const oldKey = storageKey(
      OWNER_A,
      SHOP_A,
      "https://old-server.invalid/api/v1",
    );
    localStorage.setItem(oldKey, JSON.stringify(original));
    const hook = mountRecovery();
    await act(async () => {
      await hook.result.current.check();
    });
    expect(fixtures.gateway.customerCreationResult).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(oldKey)!)).toEqual(original);
    expect(hook.result.current.resolvedCustomer).toBeNull();
  });

  it.each(["key", "bodyHash"] as const)(
    "a storage event replacing the %s prevents a late 201 from clearing another tab's intent",
    async (changedField) => {
      const reply = deferred<Customer>();
      fixtures.gateway.createCustomer.mockReturnValueOnce(reply.promise);
      const hook = mountRecovery();
      let attempt!: Promise<void>;
      act(() => {
        attempt = hook.result.current.create(INPUT);
      });
      await waitFor(() =>
        expect(fixtures.gateway.createCustomer).toHaveBeenCalledTimes(1),
      );
      const original = readIntent()!;
      const replacement = {
        ...original,
        [changedField]:
          changedField === "key" ? "another-tab-new-key" : "d".repeat(64),
      };
      const before = localStorage.getItem(storageKey());
      act(() => {
        localStorage.setItem(storageKey(), JSON.stringify(replacement));
        storageChanged(storageKey(), before, JSON.stringify(replacement));
      });
      await act(async () => {
        reply.resolve(customer());
        await attempt;
      });
      expect(readIntent()).toEqual(replacement);
      expect(hook.result.current.resolvedCustomer).toBeNull();
      expect(hook.invalidate).not.toHaveBeenCalled();
      expect(hook.result.current.record).toEqual(replacement);
    },
  );

  it("an unmounted form's late 201 neither clears its unresolved marker nor invalidates a new UI", async () => {
    const reply = deferred<Customer>();
    fixtures.gateway.createCustomer.mockReturnValueOnce(reply.promise);
    const oldForm = mountRecovery();
    let attempt!: Promise<void>;
    act(() => {
      attempt = oldForm.result.current.create(INPUT);
    });
    await waitFor(() =>
      expect(fixtures.gateway.createCustomer).toHaveBeenCalledTimes(1),
    );
    const intent = readIntent();
    oldForm.unmount();
    const newForm = mountRecovery();
    await waitFor(() => expect(newForm.result.current.state).toBe("unknown"));
    await act(async () => {
      reply.resolve(customer());
      await attempt;
    });
    expect(readIntent()).toEqual(intent);
    expect(newForm.result.current.resolvedCustomer).toBeNull();
    expect(oldForm.invalidate).not.toHaveBeenCalled();
    expect(newForm.invalidate).not.toHaveBeenCalled();
  });

  it.each(["removeItem", "clear"])(
    "an external %s is not confirmation and cannot unlock a fresh key",
    async (operation) => {
      const hook = mountRecovery();
      const intent = await unknownAttempt(hook);
      const previous = localStorage.getItem(storageKey());
      act(() => {
        if (operation === "clear") localStorage.clear();
        else localStorage.removeItem(storageKey());
        storageChanged(
          operation === "clear" ? null : storageKey(),
          previous,
          null,
        );
      });
      expect(hook.result.current.state).toBe("unknown");
      expect(hook.result.current.record).toEqual(intent);
      await act(async () => {
        await hook.result.current.create(OTHER_INPUT);
      });
      expect(fixtures.gateway.createCustomer).toHaveBeenCalledTimes(1);
      expect(hook.result.current.bodyMismatch).toBe(true);
      fixtures.gateway.createCustomer.mockRejectedValueOnce(
        new ApiError(503, "CUSTOMER_RECOVERY_PAUSED"),
      );
      await act(async () => {
        await hook.result.current.create(INPUT);
      });
      expect(fixtures.gateway.createCustomer).toHaveBeenCalledTimes(2);
      expect(fixtures.gateway.createCustomer.mock.calls[1][2]).toBe(intent.key);
      expect(readIntent()).toEqual(intent);
    },
  );

  it("rejects a malformed cross-tab marker without deleting it or sending a new request", async () => {
    const hook = mountRecovery();
    await unknownAttempt(hook);
    const previous = localStorage.getItem(storageKey());
    act(() => {
      localStorage.setItem(storageKey(), "{malformed");
      storageChanged(storageKey(), previous, "{malformed");
    });
    await act(async () => {
      await hook.result.current.create(INPUT);
    });
    expect(localStorage.getItem(storageKey())).toBe("{malformed");
    expect(fixtures.gateway.createCustomer).toHaveBeenCalledTimes(1);
    expect(hook.result.current.resolvedCustomer).toBeNull();
  });

  it("A → B → A with a new session epoch ignores the old A response and retains its recoverable marker", async () => {
    const reply = deferred<Customer>();
    fixtures.gateway.createCustomer.mockReturnValueOnce(reply.promise);
    const hook = mountRecovery();
    let attempt!: Promise<void>;
    act(() => {
      attempt = hook.result.current.create(INPUT);
    });
    await waitFor(() =>
      expect(fixtures.gateway.createCustomer).toHaveBeenCalledTimes(1),
    );
    const intent = readIntent();
    fixtures.identity.userId = OWNER_B;
    fixtures.identity.scope = "recovery-owner-b:epoch-2";
    hook.rerender();
    expect(hook.result.current.resolvedCustomer).toBeNull();
    fixtures.identity.userId = OWNER_A;
    fixtures.identity.scope = "recovery-owner-a:epoch-3";
    hook.rerender();
    await waitFor(() => expect(hook.result.current.state).toBe("unknown"));
    await act(async () => {
      reply.resolve(customer());
      await attempt;
    });
    expect(readIntent()).toEqual(intent);
    expect(hook.result.current.resolvedCustomer).toBeNull();
    expect(hook.invalidate).not.toHaveBeenCalled();
  });

  it("logout during POST hides all late data and preserves the original account's recovery marker", async () => {
    const reply = deferred<Customer>();
    fixtures.gateway.createCustomer.mockReturnValueOnce(reply.promise);
    const hook = mountRecovery();
    let attempt!: Promise<void>;
    act(() => {
      attempt = hook.result.current.create(INPUT);
    });
    await waitFor(() =>
      expect(fixtures.gateway.createCustomer).toHaveBeenCalledTimes(1),
    );
    const intent = readIntent();
    fixtures.identity.userId = null;
    fixtures.identity.scope = "anonymous:epoch-2";
    hook.rerender();
    await act(async () => {
      reply.resolve(customer());
      await attempt;
    });
    expect(readIntent()).toEqual(intent);
    expect(hook.result.current.resolvedCustomer).toBeNull();
    expect(hook.result.current.record).toBeNull();
    expect(hook.invalidate).not.toHaveBeenCalled();
  });

  it("does not start a request when the session changes while preparing its body hash", async () => {
    const digest = deferred<ArrayBuffer>();
    const hash = vi.fn(() => digest.promise);
    vi.stubGlobal("crypto", {
      subtle: { digest: hash },
      randomUUID: webcrypto.randomUUID.bind(webcrypto),
      getRandomValues: webcrypto.getRandomValues.bind(webcrypto),
    });
    const hook = mountRecovery();
    let attempt!: Promise<void>;
    act(() => {
      attempt = hook.result.current.create(INPUT);
    });
    await waitFor(() => expect(hash).toHaveBeenCalled());
    fixtures.identity.userId = OWNER_B;
    fixtures.identity.scope = "recovery-owner-b:epoch-2";
    hook.rerender();
    await act(async () => {
      digest.resolve(new Uint8Array(32).buffer);
      await attempt;
    });
    expect(fixtures.gateway.createCustomer).not.toHaveBeenCalled();
    expect(fixtures.gateway.customerCreationResult).not.toHaveBeenCalled();
    expect(readIntent()).toBeNull();
    expect(hook.result.current.resolvedCustomer).toBeNull();
  });

  it("a request queued for another tab's storage lock cannot write after logout", async () => {
    const entered = deferred<void>();
    const release = deferred<void>();
    const heldLock = navigator.locks.request(
      storageKey(),
      { mode: "exclusive" },
      async () => {
        entered.resolve();
        await release.promise;
      },
    );
    await entered.promise;
    const hook = mountRecovery();
    let attempt!: Promise<void>;
    act(() => {
      attempt = hook.result.current.create(INPUT);
    });
    fixtures.identity.userId = null;
    fixtures.identity.scope = "anonymous:epoch-2";
    hook.rerender();
    await act(async () => {
      release.resolve();
      await Promise.all([heldLock, attempt]);
    });
    expect(fixtures.gateway.createCustomer).not.toHaveBeenCalled();
    expect(fixtures.gateway.customerCreationResult).not.toHaveBeenCalled();
    expect(readIntent()).toBeNull();
  });

  it("business change isolates the form, and a foreign-business completion never becomes success", async () => {
    const reply = deferred<Customer>();
    fixtures.gateway.createCustomer.mockReturnValueOnce(reply.promise);
    const hook = mountRecovery();
    let attempt!: Promise<void>;
    act(() => {
      attempt = hook.result.current.create(INPUT);
    });
    await waitFor(() =>
      expect(fixtures.gateway.createCustomer).toHaveBeenCalledTimes(1),
    );
    const intent = readIntent();
    fixtures.identity.business = SHOP_B;
    hook.rerender();
    await act(async () => {
      reply.resolve(customer());
      await attempt;
    });
    expect(readIntent()).toEqual(intent);
    expect(hook.result.current.resolvedCustomer).toBeNull();
    expect(hook.result.current.record).toBeNull();
    fixtures.gateway.createCustomer.mockResolvedValueOnce(customer(SHOP_A));
    await act(async () => {
      await hook.result.current.create(INPUT);
    });
    expect(hook.result.current.resolvedCustomer).toBeNull();
    expect(readIntent(storageKey(OWNER_A, SHOP_B))).not.toBeNull();
  });

  it("a completed GET for another business cannot clear the current intent or select a customer", async () => {
    const intent = { key: "foreign-lookup", bodyHash: "a".repeat(64) };
    localStorage.setItem(storageKey(), JSON.stringify(intent));
    fixtures.gateway.customerCreationResult.mockResolvedValue({
      status: "completed",
      customer: customer(SHOP_B),
    });
    const hook = mountRecovery();
    await waitFor(() => expect(hook.result.current.state).toBe("unknown"));
    expect(hook.result.current.resolvedCustomer).toBeNull();
    expect(readIntent()).toEqual(intent);
    expect(fixtures.gateway.createCustomer).not.toHaveBeenCalled();
  });

  it("fails closed before POST when Web Locks are unavailable", async () => {
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: undefined,
    });
    const hook = mountRecovery();
    await act(async () => {
      await hook.result.current.create(INPUT);
    });
    expect(hook.result.current.state).toBe("coordinator-unavailable");
    expect(fixtures.gateway.createCustomer).not.toHaveBeenCalled();
    expect(readIntent()).toBeNull();
  });

  it("does not POST when the recovery marker cannot be persisted", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage denied", "SecurityError");
    });
    const hook = mountRecovery();
    await act(async () => {
      await hook.result.current.create(INPUT);
    });
    expect(fixtures.gateway.createCustomer).not.toHaveBeenCalled();
    expect(hook.result.current.resolvedCustomer).toBeNull();
    expect(hook.result.current.busy).toBe(false);
  });

  it("turns a hanging POST into unknown at the deadline without an automatic retry", async () => {
    vi.useFakeTimers();
    fixtures.gateway.createCustomer.mockImplementation(
      () => new Promise(() => {}),
    );
    const hook = mountRecovery();
    act(() => {
      void hook.result.current.create(INPUT);
    });
    await vi.waitFor(() =>
      expect(fixtures.gateway.createCustomer).toHaveBeenCalledTimes(1),
    );
    const intent = readIntent();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_001);
    });
    expect(hook.result.current.state).toBe("unknown");
    expect(hook.result.current.busy).toBe(false);
    expect(readIntent()).toEqual(intent);
    expect(fixtures.gateway.createCustomer).toHaveBeenCalledTimes(1);
    expect(hook.result.current.resolvedCustomer).toBeNull();
  });

  it("a hanging lookup stops checking at the deadline and preserves the unresolved key", async () => {
    vi.useFakeTimers();
    const intent = { key: "hanging-lookup", bodyHash: "f".repeat(64) };
    localStorage.setItem(storageKey(), JSON.stringify(intent));
    fixtures.gateway.customerCreationResult.mockImplementation(
      () => new Promise(() => {}),
    );
    const hook = mountRecovery();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_001);
    });
    expect(hook.result.current.state).toBe("unknown");
    expect(hook.result.current.busy).toBe(false);
    expect(readIntent()).toEqual(intent);
    expect(fixtures.gateway.createCustomer).not.toHaveBeenCalled();
  });
});
