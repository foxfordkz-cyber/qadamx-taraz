import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { useBusiness, useDraft, useRuntime } from "../../app/runtime";
import type { Customer, CustomerInput } from "../../shared/api/models";
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
import { useCreateCustomer, useCustomers } from "./queries";
import { Icon } from "../../shared/ui/Icon";

export function CreateCustomerForm({
  onCreated,
  onCancel,
}: {
  onCreated?: (customer: Customer) => void;
  onCancel?: () => void;
}) {
  const { t } = useI18n();
  const { business } = useBusiness();
  const { gateway } = useRuntime();
  const canCreate = gateway.canCreateCustomer ?? gateway.canWrite;
  const [input, setInput] = useDraft<CustomerInput>(
    `${business.id}:customer-form`,
    { display_name: "", note: "", contact: "" },
  );
  const [invalid, setInvalid] = useState(false);
  const create = useCreateCustomer();
  const noteId = useId();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!input.display_name.trim()) {
          setInvalid(true);
          return;
        }
        if (!canCreate || create.isPending) return;
        create.mutate(
          { ...input, display_name: input.display_name.trim() },
          {
            onSuccess: (customer) => {
              setInput({ display_name: "", note: "", contact: "" });
              onCreated?.(customer);
            },
          },
        );
      }}
    >
      <div className="form-stack">
        <Input
          autoFocus
          label={t("name")}
          autoComplete="name"
          maxLength={200}
          value={input.display_name}
          error={
            invalid && !input.display_name.trim()
              ? t("nameRequired")
              : undefined
          }
          onChange={(e) => setInput({ ...input, display_name: e.target.value })}
        />
        <label className="field" htmlFor={noteId}>
          <span id={`${noteId}-label`}>{t("note")}</span>
          <textarea
            id={noteId}
            rows={3}
            maxLength={2000}
            value={input.note}
            onChange={(e) => setInput({ ...input, note: e.target.value })}
            aria-labelledby={`${noteId}-label`}
            aria-describedby={`${noteId}-hint`}
          />
          <small id={`${noteId}-hint`}>{t("noteHint")}</small>
        </label>
        <Input
          label={t("contact")}
          autoComplete="off"
          maxLength={200}
          value={input.contact}
          onChange={(e) => setInput({ ...input, contact: e.target.value })}
        />
        {!canCreate && (
          <Alert>
            {t(gateway.mode === "demo" ? "demoWrites" : "contractPending")}
          </Alert>
        )}
        {create.isError && (
          <Alert tone="error">
            <ErrorMessage error={create.error} />
          </Alert>
        )}
        {create.isSuccess && (
          <Alert tone="success">{t("customerCreated")}</Alert>
        )}
        <div className="actions">
          <Button type="submit" disabled={!canCreate || create.isPending}>
            {t(create.isPending ? "saving" : "create")}
          </Button>
          {onCancel && (
            <Button variant="secondary" onClick={onCancel}>
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
        onChange={(e) => setSearch(e.target.value)}
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
                  <small className="customer-id">ID: {customer.id}</small>
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
  const [search, setSearch] = useDraft(`${business.id}:customer-search`, "");
  const [creating, setCreating] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [chosen, setChosen] = useState<Customer | null>(null);
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
      <div className="toolbar">
        <div className="search-control">
          <Input
            type="search"
            maxLength={200}
            label={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
                  <small className="customer-id">ID: {customer.id}</small>
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
          {t("chosen")}: {chosen.display_name} · {chosen.note || chosen.id}
        </p>
      )}
    </>
  );
}
