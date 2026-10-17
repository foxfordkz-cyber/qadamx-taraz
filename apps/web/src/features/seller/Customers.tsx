import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useBusiness, useDraft, useRuntime } from "../../app/runtime";
import type { Customer, CustomerInput } from "../../shared/api/models";
import { customerInputErrors } from "../../shared/api/bindings";
import { ApiError } from "../../shared/api/client";
import { LanguageSwitch, useI18n } from "../../shared/i18n";
import { formatKZT } from "../../shared/format";
import {
  Alert,
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  ErrorMessage,
  Input,
  PageHeader,
  Spinner,
} from "../../shared/ui";
import { useCustomerCreationRecovery, useCustomers } from "./queries";
import { Icon } from "../../shared/ui/Icon";

function UnknownResultError({ error }: { error: unknown }) {
  const { t } = useI18n();
  if (
    error instanceof ApiError &&
    ["CUSTOMER_TIMEOUT", "NETWORK_ERROR"].includes(error.code)
  )
    return (
      <p>
        {t(
          error.code === "CUSTOMER_TIMEOUT"
            ? "customerRecoveryTimeout"
            : "customerRecoveryTransport",
        )}
      </p>
    );
  return <ErrorMessage error={error} />;
}

export function CreateCustomerForm({
  onCreated,
  onCancel,
}: {
  onCreated?: (customer: Customer) => void;
  onCancel?: () => void;
}) {
  const { t } = useI18n();
  const { business } = useBusiness();
  const { gateway, drafts } = useRuntime();
  const canCreate = gateway.canCreateCustomer ?? gateway.canWrite;
  const recovery = useCustomerCreationRecovery();
  const draftKey = `${business.id}:customer-form`;
  const [input, setInput] = useDraft<CustomerInput>(draftKey, {
    display_name: "",
    note: "",
    contact: "",
  });
  const [invalid, setInvalid] = useState(false);
  const errors = invalid ? customerInputErrors(input) : {};
  const lastHandledCustomer = useRef(recovery.resolvedCustomer?.id ?? null);
  const noteId = useId();
  useEffect(() => {
    const customer = recovery.resolvedCustomer;
    if (!customer || customer.id === lastHandledCustomer.current) return;
    lastHandledCustomer.current = customer.id;
    setInvalid(false);
    // Another open form can hold a different draft in the same business.
    // Completing this form must not discard that form's unsent fields.
    if (drafts.get(draftKey) === input)
      setInput({ display_name: "", note: "", contact: "" });
    onCreated?.(customer);
  }, [draftKey, drafts, input, onCreated, recovery.resolvedCustomer, setInput]);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setInvalid(true);
        if (Object.keys(customerInputErrors(input)).length) return;
        if (!canCreate || recovery.busy) return;
        void recovery.create(input);
      }}
    >
      <div className="form-stack">
        <Input
          autoFocus
          label={t("name")}
          autoComplete="name"
          // HTML counts UTF-16 units; bindings enforce 200 Unicode code points.
          maxLength={400}
          value={input.display_name}
          error={
            errors.display_name === "required"
              ? t("nameRequired")
              : errors.display_name
                ? t("customerNameTooLong")
                : undefined
          }
          disabled={recovery.busy}
          onChange={(e) => setInput({ ...input, display_name: e.target.value })}
        />
        <label className="field" htmlFor={noteId}>
          <span id={`${noteId}-label`}>{t("note")}</span>
          <textarea
            id={noteId}
            rows={3}
            maxLength={4000}
            value={input.note}
            disabled={recovery.busy}
            onChange={(e) => setInput({ ...input, note: e.target.value })}
            aria-labelledby={`${noteId}-label`}
            aria-invalid={!!errors.note}
            aria-describedby={`${noteId}-hint${errors.note ? ` ${noteId}-error` : ""}`}
          />
          <small id={`${noteId}-hint`}>{t("noteHint")}</small>
          {errors.note && (
            <small id={`${noteId}-error`} className="field-error" role="alert">
              {t("customerNoteTooLong")}
            </small>
          )}
        </label>
        <Input
          label={t("contact")}
          autoComplete="off"
          maxLength={400}
          value={input.contact}
          disabled={recovery.busy}
          error={errors.contact ? t("customerContactTooLong") : undefined}
          onChange={(e) => setInput({ ...input, contact: e.target.value })}
        />
        {Object.keys(errors).length > 0 && (
          <p className="field-error" role="alert">
            {t("validationError")}
          </p>
        )}
        {!canCreate && (
          <Alert>
            {t(gateway.mode === "demo" ? "demoWrites" : "contractPending")}
          </Alert>
        )}
        {recovery.state === "checking" && recovery.record && (
          <Alert>{t("customerRecoveryChecking")}</Alert>
        )}
        {recovery.state === "unknown" && recovery.record && (
          <Alert tone="error">
            <p>{t("customerRecoveryUnknown")}</p>
            {recovery.bodyMismatch && (
              <p>{t("customerRecoveryBodyMismatch")}</p>
            )}
            {recovery.error !== null && (
              <UnknownResultError error={recovery.error} />
            )}
          </Alert>
        )}
        {recovery.state === "unavailable" && gateway.mode === "live" && (
          <Alert tone="error">
            <p>{t("customerRecoveryUnavailable")}</p>
            {recovery.error !== null && <ErrorMessage error={recovery.error} />}
          </Alert>
        )}
        {recovery.state === "saving" && (
          <Alert>{t("customerRecoverySaving")}</Alert>
        )}
        {recovery.state === "rejected" && (
          <Alert tone="error">
            <p>{t("customerRecoveryRejected")}</p>
            {recovery.error !== null && <ErrorMessage error={recovery.error} />}
          </Alert>
        )}
        {recovery.state === "legacy-blocked" && (
          <Alert tone="error">{t("customerRecoveryLegacy")}</Alert>
        )}
        {recovery.state === "coordinator-unavailable" && (
          <Alert tone="error">{t("customerRecoveryCoordinator")}</Alert>
        )}
        {recovery.state === "storage-error" && (
          <Alert tone="error">{t("customerRecoveryStorageError")}</Alert>
        )}
        {recovery.state === "idle" && recovery.error !== null && (
          <Alert tone="error">
            {recovery.error !== null && <ErrorMessage error={recovery.error} />}
          </Alert>
        )}
        {recovery.state === "complete" && recovery.resolvedCustomer && (
          <Alert tone="success">
            <p>{t("customerCreated")}</p>
            {recovery.error !== null && (
              <p>{t("customerRecoveryStorageError")}</p>
            )}
          </Alert>
        )}
        {recovery.record && (
          <Button
            variant="secondary"
            disabled={recovery.busy}
            onClick={() => void recovery.check()}
          >
            {t("customerRecoveryCheck")}
          </Button>
        )}
        <div className="actions">
          <Button
            type="submit"
            disabled={
              !canCreate ||
              recovery.busy ||
              [
                "storage-error",
                "legacy-blocked",
                "coordinator-unavailable",
                "unavailable",
              ].includes(recovery.state)
            }
          >
            {recovery.busy
              ? t("saving")
              : t(recovery.record ? "customerRecoveryRetry" : "create")}
          </Button>
          {onCancel && (
            <Button
              variant="secondary"
              disabled={recovery.busy}
              onClick={onCancel}
            >
              {t("cancel")}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
export function CustomerPicker({
  value,
  onChange,
}: {
  value: Customer | null;
  onChange: (customer: Customer) => void;
}) {
  const { t, locale } = useI18n();
  const { business } = useBusiness();
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const customers = useCustomers(search);
  const items =
    customers.data?.pages
      .flatMap((page) => page.items)
      .filter((c) => c.business_id === business.id) ?? [];
  return (
    <div className="form-stack">
      <Input
        label={t("search")}
        type="search"
        value={search}
        onChange={(e) =>
          setSearch(Array.from(e.target.value).slice(0, 200).join(""))
        }
      />
      {search && (
        <Button variant="ghost" onClick={() => setSearch("")}>
          {t("clearSearch")}
        </Button>
      )}
      {customers.isSearchPending ? (
        <p role="status">{t("searching")}</p>
      ) : customers.isPending ? (
        <Spinner />
      ) : customers.isError ? (
        <ErrorState
          error={customers.error}
          retry={() => void customers.refetch()}
        />
      ) : (
        <>
          {items.length === 0 && <EmptyState title={t("noCustomers")} />}
          <div className="picker-list">
            {items.map((customer) => (
              <Button
                key={customer.id}
                variant="secondary"
                aria-pressed={value?.id === customer.id}
                onClick={() => onChange(customer)}
              >
                <span>
                  {customer.display_name}
                  <small>{customer.note || t("noNote")}</small>
                  {customer.balance_minor !== undefined && (
                    <small>
                      {t("outstanding")}:{" "}
                      {formatKZT(customer.balance_minor, locale)}
                    </small>
                  )}
                  {customer.contact && <small>{customer.contact}</small>}
                </span>
                {value?.id === customer.id && (
                  <Badge tone="green">{t("chosen")}</Badge>
                )}
              </Button>
            ))}
          </div>
          {customers.hasNextPage && (
            <Button
              variant="secondary"
              disabled={customers.isFetchingNextPage}
              onClick={() => void customers.fetchNextPage()}
            >
              {t("loadMore")}
            </Button>
          )}
        </>
      )}
      <Button variant="ghost" onClick={() => setCreating((v) => !v)}>
        {t("createCustomer")}
      </Button>
      {creating && (
        <CreateCustomerForm
          onCreated={(customer) => {
            onChange(customer);
            setCreating(false);
          }}
          onCancel={() => setCreating(false)}
        />
      )}
    </div>
  );
}
export function CustomersPage() {
  const { t, locale } = useI18n();
  const { business } = useBusiness();
  const { gateway } = useRuntime();
  const [search, setSearch] = useDraft(`${business.id}:customer-search`, "");
  const [creating, setCreating] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [chosen, setChosen] = useState<Customer | null>(null);
  const recovery = useCustomerCreationRecovery();
  const customers = useCustomers(search);
  const items =
    customers.data?.pages
      .flatMap((page) => page.items)
      .filter((c) => c.business_id === business.id) ?? [];
  return (
    <>
      <PageHeader
        title={t("customers")}
        subtitle={t("customersSubtitle")}
        action={
          <Button onClick={() => setCreating(true)}>
            + {t("createCustomer")}
          </Button>
        }
      />
      {recovery.state === "checking" && recovery.record && (
        <Alert>{t("customerRecoveryChecking")}</Alert>
      )}
      {recovery.state === "unknown" && recovery.record && (
        <Alert tone="error">
          <p>{t("customerRecoveryUnknown")}</p>
          {recovery.error !== null && (
            <UnknownResultError error={recovery.error} />
          )}
          <Button
            variant="secondary"
            disabled={recovery.busy}
            onClick={() => void recovery.check()}
          >
            {t("customerRecoveryCheck")}
          </Button>
        </Alert>
      )}
      {recovery.state === "unavailable" && gateway.mode === "live" && (
        <Alert tone="error">
          <p>{t("customerRecoveryUnavailable")}</p>
          {recovery.error !== null && <ErrorMessage error={recovery.error} />}
        </Alert>
      )}
      {recovery.state === "saving" && (
        <Alert>{t("customerRecoverySaving")}</Alert>
      )}
      {recovery.state === "rejected" && (
        <Alert tone="error">
          <p>{t("customerRecoveryRejected")}</p>
          {recovery.error !== null && <ErrorMessage error={recovery.error} />}
        </Alert>
      )}
      {recovery.state === "legacy-blocked" && (
        <Alert tone="error">{t("customerRecoveryLegacy")}</Alert>
      )}
      {recovery.state === "coordinator-unavailable" && (
        <Alert tone="error">{t("customerRecoveryCoordinator")}</Alert>
      )}
      {recovery.state === "storage-error" && (
        <Alert tone="error">{t("customerRecoveryStorageError")}</Alert>
      )}
      {recovery.state === "complete" && (
        <Alert tone="success">
          <p>{t("customerCreated")}</p>
          {recovery.error !== null && (
            <p>{t("customerRecoveryStorageError")}</p>
          )}
        </Alert>
      )}
      {recovery.state === "rejected" && recovery.record && (
        <Button
          variant="secondary"
          disabled={recovery.busy}
          onClick={() => void recovery.check()}
        >
          {t("customerRecoveryCheck")}
        </Button>
      )}
      <div className="toolbar">
        <div className="search-control">
          <Input
            type="search"
            maxLength={400}
            label={t("search")}
            value={search}
            onChange={(e) =>
              setSearch(Array.from(e.target.value).slice(0, 200).join(""))
            }
          />
          <Icon name="search" />
        </div>
        {search && (
          <Button variant="ghost" onClick={() => setSearch("")}>
            {t("clearSearch")}
          </Button>
        )}
        <Button variant="secondary" onClick={() => setPickerOpen(true)}>
          {t("chooseCustomer")}
        </Button>
      </div>
      {!customers.isPending &&
        !customers.isError &&
        !customers.isSearchPending && (
          <div className="list-summary">
            <span>
              {t("shown")}: {items.length}
            </span>
            {customers.isFetching && <span role="status">{t("updating")}</span>}
          </div>
        )}
      {customers.isSearchPending ? (
        <p role="status">{t("searching")}</p>
      ) : customers.isPending ? (
        <Spinner />
      ) : customers.isError ? (
        <ErrorState
          error={customers.error}
          retry={() => void customers.refetch()}
        />
      ) : !items.length ? (
        <EmptyState
          title={t("noCustomers")}
          description={t("noCustomersHint")}
          action={
            <Button variant="secondary" onClick={() => setCreating(true)}>
              {t("createCustomer")}
            </Button>
          }
        />
      ) : (
        <div className="customer-list" role="list" aria-label={t("customers")}>
          <div className="customer-list-heading" aria-hidden="true">
            <span>{t("customerColumn")}</span>
            <span>{t("contactColumn")}</span>
            <span>{t("outstanding")}</span>
            <span />
          </div>
          {items.map((customer) => (
            <Card key={customer.id} className="customer-row" role="listitem">
              <div className="customer-identity">
                <span className="avatar" aria-hidden="true">
                  {customer.display_name.slice(0, 1)}
                </span>
                <div>
                  <h2>{customer.display_name}</h2>
                  <p>{customer.note || t("noNote")}</p>
                </div>
              </div>
              <p className="muted break-word customer-contact">
                {customer.contact || t("contactAbsent")}
              </p>
              <p className="customer-balance">
                <span className="mobile-only muted">{t("outstanding")}: </span>
                {customer.balance_minor === undefined ? (
                  <span className="muted">—</span>
                ) : (
                  <strong>{formatKZT(customer.balance_minor, locale)}</strong>
                )}
              </p>
              <Link
                className="text-link"
                to={`/seller/debts?customer_id=${encodeURIComponent(customer.id)}`}
              >
                {t("customerDebts")} →
              </Link>
            </Card>
          ))}
        </div>
      )}
      {!customers.isSearchPending && customers.hasNextPage && (
        <Button
          variant="secondary"
          disabled={customers.isFetchingNextPage}
          onClick={() => void customers.fetchNextPage()}
        >
          {t("loadMore")}
        </Button>
      )}
      <Dialog
        title={t("createCustomer")}
        open={creating}
        onClose={() => setCreating(false)}
      >
        <LanguageSwitch />
        <CreateCustomerForm
          onCreated={() => setCreating(false)}
          onCancel={() => setCreating(false)}
        />
      </Dialog>
      <Dialog
        title={t("chooseCustomer")}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
      >
        <p className="muted">{t("pickerHint")}</p>
        <CustomerPicker
          value={chosen}
          onChange={(customer) => {
            setChosen(customer);
            setPickerOpen(false);
          }}
        />
      </Dialog>
      {chosen && (
        <p role="status">
          {t("chosen")}:{" "}
          {[chosen.display_name, chosen.note || chosen.contact]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
    </>
  );
}
