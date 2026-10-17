import { ApiError } from "../../shared/api/client";
import {
  customerBody,
  type CustomerCreationResult,
} from "../../shared/api/bindings";
import type {
  Business,
  Customer,
  CustomerInput,
} from "../../shared/api/models";
import type { SellerGateway } from "../../shared/api/gateway";

export type CustomerIntent = { key: string; bodyHash: string };
export type RecoveryState =
  | "idle"
  | "saving"
  | "checking"
  | "unknown"
  | "rejected"
  | "complete"
  | "unavailable"
  | "storage-error"
  | "legacy-blocked"
  | "coordinator-unavailable";
export type RecoverySnapshot = {
  record: CustomerIntent | null;
  state: RecoveryState;
  error: unknown;
  bodyMismatch: boolean;
  resolvedCustomer: Customer | null;
  completionOwner: RecoveryOwner | null;
};
export type RecoveryOwner = { active: boolean; current: () => boolean };
export type RecoveryRequest = {
  gateway: SellerGateway;
  business: Business;
  onComplete: () => void;
};
type Operation = {
  owner: RecoveryOwner;
  controller: AbortController;
  deadline: number;
};

export function normalizeCustomerApi(
  apiBase: string | undefined,
): string | null {
  if (!apiBase?.trim()) return null;
  try {
    const url = new URL(apiBase.trim());
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return null;
    return url.href.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

export function customerRecoveryKey(
  apiBase: string,
  userId: string,
  businessId: string,
) {
  return `qadam.customer-create.v1:${encodeURIComponent(apiBase)}:${userId}:${businessId}`;
}

function sameIntent(a: CustomerIntent | null, b: CustomerIntent | null) {
  return (
    a === b || (!!a && !!b && a.key === b.key && a.bodyHash === b.bodyHash)
  );
}
function readIntent(key: string): CustomerIntent | null {
  const raw = window.localStorage.getItem(key);
  if (raw === null) return null;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid customer recovery marker");
  const intent = value as Record<string, unknown>;
  if (
    typeof intent.key !== "string" ||
    !/^[!-~]{1,200}$/.test(intent.key) ||
    typeof intent.bodyHash !== "string" ||
    !/^[a-f0-9]{64}$/.test(intent.bodyHash)
  )
    throw new Error("Invalid customer recovery marker");
  return { key: intent.key, bodyHash: intent.bodyHash };
}
function makeKey() {
  if (globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}
async function digest(value: string) {
  const hash = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
async function snapshotBody(input: CustomerInput) {
  // Use the actual gateway binding, including trim/defaults, before any await.
  const body = customerBody({ ...input });
  const immutableInput = Object.freeze({
    display_name: body.display_name,
    note: body.note,
    contact: body.contact ?? "",
  });
  const bodyHash = await digest(
    JSON.stringify({
      contact: body.contact ?? null,
      display_name: body.display_name,
      note: body.note,
    }),
  );
  // Published scoped v1 markers used the original binding's property order.
  // Recognize their same-body hash without replacing their key or saved hash.
  const previousHash = await digest(JSON.stringify(body));
  return { input: immutableInput, bodyHash, previousHash };
}
function completed(result: CustomerCreationResult, businessId: string) {
  if (result.status === "not_observed" && result.customer === null) return null;
  if (
    result.status !== "completed" ||
    !result.customer ||
    result.customer.business_id !== businessId
  )
    throw new ApiError(0, "INVALID_RESPONSE");
  return result.customer;
}

/** One in-memory coordinator per authenticated epoch/business/API, shared by all forms.
 * Durable markers intentionally omit epoch so GET recovery survives a new login.
 * Only Web Locks protect storage transactions across tabs; no network request holds one.
 */
export class CustomerRecoveryCoordinator {
  private snapshot: RecoverySnapshot = {
    record: null,
    state: "idle",
    error: null,
    bodyMismatch: false,
    resolvedCustomer: null,
    completionOwner: null,
  };
  private listeners = new Set<() => void>();
  private owners = new Set<RecoveryOwner>();
  private operation: Operation | null = null;
  constructor(
    private storageKey: string | null,
    private legacyKey: string | null,
  ) {
    this.refresh();
  }
  getSnapshot = () => this.snapshot;
  hasOwners = () => this.owners.size > 0;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(change: Partial<RecoverySnapshot>) {
    this.snapshot = { ...this.snapshot, ...change };
    this.listeners.forEach((listener) => listener());
  }
  attach(owner: RecoveryOwner) {
    this.owners.add(owner);
    if (this.owners.size === 1) {
      window.addEventListener("storage", this.storageChanged);
      this.refresh();
    }
  }
  detach(owner: RecoveryOwner) {
    this.owners.delete(owner);
    if (this.operation?.owner === owner) {
      this.cancel();
      this.publish({
        state: this.snapshot.record ? "unknown" : "idle",
        resolvedCustomer: null,
        completionOwner: null,
      });
    }
    if (this.snapshot.completionOwner === owner) {
      // Other forms may observe confirmation, but must never inherit the
      // detached form's customer selection or clear their own inputs.
      this.publish({ resolvedCustomer: null, completionOwner: null });
    }
    if (this.owners.size === 0) {
      window.removeEventListener("storage", this.storageChanged);
      // A subsequent mount must recover from storage, not inherit private results.
      this.publish({
        resolvedCustomer: null,
        completionOwner: null,
        error: null,
        bodyMismatch: false,
      });
    }
  }
  private storageChanged = (event: StorageEvent) => {
    if (event.storageArea && event.storageArea !== window.localStorage) return;
    if (
      event.key !== null &&
      event.key !== this.storageKey &&
      event.key !== this.legacyKey
    )
      return;
    this.cancel();
    this.refresh();
  };
  private cancel() {
    const old = this.operation;
    this.operation = null;
    old?.controller.abort();
  }
  private current(operation: Operation) {
    return (
      this.operation === operation &&
      operation.owner.active &&
      operation.owner.current() &&
      this.owners.has(operation.owner)
    );
  }
  private available() {
    if (!this.storageKey || !this.legacyKey) {
      this.publish({ state: "unavailable" });
      return false;
    }
    if (!navigator.locks?.request) {
      this.publish({ state: "coordinator-unavailable" });
      return false;
    }
    return true;
  }
  private read() {
    if (!this.storageKey || !this.legacyKey)
      throw new Error("Customer recovery scope unavailable");
    // An unscoped legacy marker has no trustworthy API origin. Never migrate it.
    if (window.localStorage.getItem(this.legacyKey) !== null) {
      this.publish({
        state: "legacy-blocked",
        resolvedCustomer: null,
        completionOwner: null,
      });
      return { blocked: true, record: this.snapshot.record };
    }
    return { blocked: false, record: readIntent(this.storageKey) };
  }
  private refresh() {
    if (!this.storageKey || !this.legacyKey) {
      this.publish({ state: "unavailable" });
      return;
    }
    try {
      const next = this.read();
      if (next.blocked) return;
      // Removing a marker is not proof of completion. A still-mounted tab keeps
      // its unresolved key until a real receipt confirms it.
      const record = next.record ?? this.snapshot.record;
      this.publish({
        record,
        state: record ? "unknown" : "idle",
        error: null,
        bodyMismatch: false,
        resolvedCustomer: null,
        completionOwner: null,
      });
    } catch (error) {
      this.publish({
        state: "storage-error",
        error,
        resolvedCustomer: null,
        completionOwner: null,
      });
    }
  }
  private start(owner: RecoveryOwner, state: "checking" | "saving") {
    if (
      !owner.active ||
      !owner.current() ||
      this.operation ||
      !this.available()
    )
      return null;
    if (["legacy-blocked", "storage-error"].includes(this.snapshot.state)) {
      this.refresh();
      if (["legacy-blocked", "storage-error"].includes(this.snapshot.state))
        return null;
    }
    const operation = {
      owner,
      controller: new AbortController(),
      deadline: Date.now() + 20_000,
    };
    this.operation = operation;
    this.publish({
      state,
      error: null,
      bodyMismatch: false,
      resolvedCustomer: null,
      completionOwner: null,
    });
    return operation;
  }
  private async locked<T>(
    operation: Operation,
    action: () => T | Promise<T>,
  ): Promise<T | undefined> {
    if (!this.storageKey || !this.current(operation)) return undefined;
    return this.request(operation, (signal) =>
      navigator.locks.request(
        this.storageKey!,
        { mode: "exclusive", signal },
        async () => {
          if (!this.current(operation) || signal.aborted) return undefined;
          return await action();
        },
      ),
    );
  }
  private async request<T>(
    operation: Operation,
    action: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    if (!this.current(operation)) throw new Error("Stale customer operation");
    const remaining = operation.deadline - Date.now();
    if (remaining <= 0) throw new ApiError(0, "CUSTOMER_TIMEOUT");
    return new Promise<T>((resolve, reject) => {
      let settled = false;
      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        operation.controller.signal.removeEventListener("abort", aborted);
        callback();
      };
      const aborted = () =>
        finish(() => reject(new Error("Stale customer operation")));
      const timer = setTimeout(() => {
        finish(() => reject(new ApiError(0, "CUSTOMER_TIMEOUT")));
        operation.controller.abort();
      }, remaining);
      operation.controller.signal.addEventListener("abort", aborted, {
        once: true,
      });
      try {
        if (!this.current(operation) || operation.controller.signal.aborted)
          throw new Error("Stale customer operation");
        // Queue native locks synchronously, before hashing or any other await.
        Promise.resolve(action(operation.controller.signal)).then(
          (value) => finish(() => resolve(value)),
          (error: unknown) => finish(() => reject(error)),
        );
      } catch (error) {
        finish(() => reject(error));
      }
    });
  }
  private async resolve(
    operation: Operation,
    intent: CustomerIntent,
    customer: Customer,
    request: RecoveryRequest,
  ) {
    if (!this.current(operation)) return;
    await this.locked(operation, () => {
      const latest = this.read();
      if (latest.blocked) return;
      if (latest.record && !sameIntent(latest.record, intent)) {
        this.publish({
          record: latest.record,
          state: "unknown",
          resolvedCustomer: null,
          completionOwner: null,
        });
        return;
      }
      if (!sameIntent(this.snapshot.record, intent)) return;
      if (latest.record) window.localStorage.removeItem(this.storageKey!);
      this.publish({
        record: null,
        state: "complete",
        error: null,
        bodyMismatch: false,
        resolvedCustomer: customer,
        completionOwner: operation.owner,
      });
      request.onComplete();
    });
  }
  private async lookup(
    operation: Operation,
    intent: CustomerIntent,
    request: RecoveryRequest,
  ) {
    if (!request.gateway.customerCreationResult)
      throw new ApiError(0, "CONTRACT_PENDING");
    const result = await this.request(operation, (signal) =>
      request.gateway.customerCreationResult!(
        request.business,
        intent.key,
        signal,
      ),
    );
    return completed(result, request.business.id);
  }
  async check(owner: RecoveryOwner, request: RecoveryRequest) {
    if (this.operation) return;
    if (!this.snapshot.record) {
      this.refresh();
      if (!this.snapshot.record) return;
    }
    const operation = this.start(owner, "checking");
    if (!operation) return;
    try {
      const intent = await this.locked(operation, () => {
        const latest = this.read();
        if (latest.blocked) return null;
        const record = latest.record ?? this.snapshot.record;
        this.publish({ record });
        return record;
      });
      if (!intent || !this.current(operation)) return;
      const customer = await this.lookup(operation, intent, request);
      if (!this.current(operation)) return;
      if (customer) await this.resolve(operation, intent, customer, request);
      else this.publish({ state: "unknown" });
    } catch (error) {
      if (this.current(operation)) this.publish({ state: "unknown", error });
    } finally {
      if (this.operation === operation) this.operation = null;
    }
  }
  async create(
    owner: RecoveryOwner,
    input: CustomerInput,
    request: RecoveryRequest,
  ) {
    if (
      request.gateway.mode !== "live" ||
      (request.gateway.canCreateCustomer ?? request.gateway.canWrite) === false
    )
      return;
    const operation = this.start(owner, "saving");
    if (!operation) return;
    let intent: CustomerIntent | null = null;
    try {
      // Snapshot the caller's mutable form before awaiting a queued lock.
      const capturedInput = { ...input };
      const claimed = await this.locked(operation, async () => {
        // Hashing is short; no HTTP runs inside the claim lock.
        const body = await snapshotBody(capturedInput);
        if (!this.current(operation) || operation.controller.signal.aborted)
          return null;
        const latest = this.read();
        if (latest.blocked) return null;
        const existing = latest.record ?? this.snapshot.record;
        if (
          existing &&
          existing.bodyHash !== body.bodyHash &&
          existing.bodyHash !== body.previousHash
        ) {
          this.publish({
            record: existing,
            state: "unknown",
            bodyMismatch: true,
          });
          return null;
        }
        const record = existing ?? {
          key: makeKey(),
          bodyHash: body.bodyHash,
        };
        window.localStorage.setItem(this.storageKey!, JSON.stringify(record));
        this.publish({ record });
        return { intent: record, body };
      });
      if (!claimed || !this.current(operation)) return;
      intent = claimed.intent;
      const { body } = claimed;
      const saved = await this.lookup(operation, intent, request);
      if (!this.current(operation)) return;
      if (saved) {
        await this.resolve(operation, intent, saved, request);
        return;
      }
      // Recheck after GET: another tab may have completed K1 and claimed K2.
      const permitted = await this.locked(operation, () => {
        const latest = this.read();
        if (latest.blocked) return false;
        if (!sameIntent(latest.record, intent)) {
          this.publish({ record: latest.record ?? intent, state: "unknown" });
          return false;
        }
        return true;
      });
      if (!permitted || !this.current(operation)) return;
      try {
        const customer = await this.request(operation, (signal) =>
          request.gateway.createCustomer(
            request.business,
            body.input,
            intent!.key,
            signal,
          ),
        );
        if (!this.current(operation)) return;
        if (customer.business_id !== request.business.id)
          throw new ApiError(0, "INVALID_RESPONSE");
        await this.resolve(operation, intent, customer, request);
      } catch (error) {
        if (!this.current(operation)) return;
        if (
          error instanceof ApiError &&
          [400, 401, 403, 404, 409, 422, 429].includes(error.status)
        ) {
          // A rejected retry does not resolve an earlier attempt in another tab.
          this.publish({ state: "rejected", error });
          return;
        }
        if (!operation.controller.signal.aborted) {
          try {
            this.publish({ state: "checking" });
            const customer = await this.lookup(operation, intent, request);
            if (!this.current(operation)) return;
            if (customer) {
              await this.resolve(operation, intent, customer, request);
              return;
            }
          } catch {
            /* Preserve the original unknown outcome and key. */
          }
        }
        if (this.current(operation)) this.publish({ state: "unknown", error });
      }
    } catch (error) {
      if (this.current(operation))
        this.publish({
          state:
            intent || this.snapshot.record
              ? "unknown"
              : error instanceof ApiError
                ? "rejected"
                : "storage-error",
          error,
        });
    } finally {
      if (this.operation === operation) this.operation = null;
    }
  }
}

const coordinators = new Map<string, CustomerRecoveryCoordinator>();
export function getCustomerRecovery(
  scope: string,
  apiBase: string | null,
  userId: string | undefined,
  businessId: string,
) {
  const key = JSON.stringify([scope, apiBase, userId, businessId]);
  let coordinator = coordinators.get(key);
  if (!coordinator) {
    coordinator = new CustomerRecoveryCoordinator(
      apiBase && userId
        ? customerRecoveryKey(apiBase, userId, businessId)
        : null,
      userId ? `qadam.customer-create.v1:${userId}:${businessId}` : null,
    );
    coordinators.set(key, coordinator);
  }
  return {
    coordinator,
    release: () => {
      // StrictMode reattaches effects synchronously. Delay eviction so a remount
      // cannot leave one live coordinator outside the registry and create another.
      queueMicrotask(() => {
        if (!coordinator.hasOwners() && coordinators.get(key) === coordinator)
          coordinators.delete(key);
      });
    },
  };
}
