import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useBusiness, useRuntime } from "../../app/runtime";
import { Button, Dialog, Input, Select } from "../../shared/ui";
import { CustomerPicker } from "../seller/Customers";
import type { Customer } from "../../shared/api/models";
import { toMinor } from "./data";
import { validDateRange } from "./reportData";
import { useBusinessText } from "./businessText";
import "./business.css";

export function BusinessFilters({ debts = false }: { debts?: boolean }) {
  const { scope } = useRuntime();
  const { business } = useBusiness();
  const [params] = useSearchParams();
  const { b } = useBusinessText();
  const [open, setOpen] = useState(false);
  return (
    <details
      className="business-filters"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>
        {b("filters")}
        {params.size > 0 ? " · ●" : ""}
      </summary>
      {open && (
        <FilterForm key={`${scope}:${business.id}:${params}`} debts={debts} />
      )}
    </details>
  );
}
function FilterForm({ debts }: { debts: boolean }) {
  const { b } = useBusinessText();
  const [params, setParams] = useSearchParams();
  const [from, setFrom] = useState(
    params.get("date_from") ?? params.get("date") ?? "",
  );
  const [to, setTo] = useState(
    params.get("date_to") ?? params.get("date") ?? "",
  );
  const [min, setMin] = useState(
    params.has("min_amount_minor")
      ? String(Number(params.get("min_amount_minor")) / 100)
      : "",
  );
  const [max, setMax] = useState(
    params.has("max_amount_minor")
      ? String(Number(params.get("max_amount_minor")) / 100)
      : "",
  );
  const [kind, setKind] = useState(params.get("kind") ?? "");
  const [status, setStatus] = useState(params.get("payment_status") ?? "");
  const [age, setAge] = useState(params.get("age_bucket") ?? "");
  const [customerId, setCustomerId] = useState(params.get("customer_id") ?? "");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [picker, setPicker] = useState(false);
  const [invalid, setInvalid] = useState(false);
  return (
    <form
      className="business-filter-form"
      onSubmit={(e) => {
        e.preventDefault();
        const minimum = min ? toMinor(min) : null,
          maximum = max ? toMinor(max) : null;
        if (
          ((from || to) && !validDateRange(from, to)) ||
          (min && minimum === null) ||
          (max && maximum === null) ||
          (minimum !== null && maximum !== null && minimum > maximum)
        ) {
          setInvalid(true);
          return;
        }
        const next = new URLSearchParams();
        for (const [key, value] of [
          ["date_from", from],
          ["date_to", to],
          ["kind", kind],
          ["payment_status", status],
          ["age_bucket", age],
          ["customer_id", customerId],
        ])
          if (value) next.set(key!, value);
        if (minimum !== null) next.set("min_amount_minor", String(minimum));
        if (maximum !== null) next.set("max_amount_minor", String(maximum));
        setParams(next);
        setInvalid(false);
      }}
    >
      <div className="business-filter-grid">
        <Input
          type="date"
          label={b("from")}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <Input
          type="date"
          label={b("to")}
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        <Input
          inputMode="decimal"
          label={b("min")}
          value={min}
          onChange={(e) => setMin(e.target.value)}
        />
        <Input
          inputMode="decimal"
          label={b("max")}
          value={max}
          onChange={(e) => setMax(e.target.value)}
        />
        {!debts && (
          <Select
            label={b("kind")}
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="">{b("all")}</option>
            {(["sale", "repayment", "reversal"] as const).map((key) => (
              <option key={key} value={key}>
                {b(key)}
              </option>
            ))}
          </Select>
        )}
        <Select
          label={b("status")}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">{b("all")}</option>
          {(debts
            ? (["unpaid", "partial"] as const)
            : (["unpaid", "partial", "paid", "cancelled"] as const)
          ).map((key) => (
            <option key={key} value={key}>
              {b(key)}
            </option>
          ))}
        </Select>
        {debts && (
          <Select
            label={b("age")}
            value={age}
            onChange={(e) => setAge(e.target.value)}
          >
            <option value="">{b("all")}</option>
            {(["0_7", "8_30", "31_plus"] as const).map((key) => (
              <option key={key} value={key}>
                {b(key)}
              </option>
            ))}
          </Select>
        )}
      </div>
      <p>{b("amountHint")}</p>
      <div className="actions">
        <Button variant="secondary" onClick={() => setPicker(true)}>
          {b("choose")}
          {customer ? `: ${customer.display_name}` : customerId ? " · ✓" : ""}
        </Button>
        {customerId && (
          <Button
            variant="ghost"
            onClick={() => {
              setCustomerId("");
              setCustomer(null);
            }}
          >
            {b("customer")}: {b("clear")}
          </Button>
        )}
        <Button type="submit">{b("apply")}</Button>
        <Button variant="ghost" onClick={() => setParams({})}>
          {b("clear")}
        </Button>
      </div>
      {invalid && <p role="alert">{b("badFilters")}</p>}
      <Dialog
        title={b("choose")}
        open={picker}
        onClose={() => setPicker(false)}
      >
        <CustomerPicker
          value={customer}
          onChange={(value) => {
            setCustomer(value);
            setCustomerId(value.id);
            setPicker(false);
          }}
        />
      </Dialog>
    </form>
  );
}
