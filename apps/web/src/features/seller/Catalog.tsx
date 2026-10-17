import { useBusiness, useDraft } from "../../app/runtime";
import { formatKZT } from "../../shared/format";
import { useI18n } from "../../shared/i18n";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Input,
  Select,
  Spinner,
} from "../../shared/ui";
import { Icon } from "../../shared/ui/Icon";
import { useCatalog } from "./queries";
export function CatalogPage() {
  const { t, locale } = useI18n();
  const { business } = useBusiness();
  const query = useCatalog();
  const [search, setSearch] = useDraft(`${business.id}:catalog-search`, "");
  const [availability, setAvailability] = useDraft<
    "all" | "available" | "unavailable"
  >(`${business.id}:catalog-availability`, "all");
  const items =
    query.data?.items.filter((item) => item.business_id === business.id) ?? [];
  const visible = items.filter(
    (item) =>
      item.name
        .normalize("NFC")
        .toLocaleLowerCase()
        .includes(search.trim().normalize("NFC").toLocaleLowerCase()) &&
      (availability === "all" ||
        item.available === (availability === "available")),
  );
  const reset = () => {
    setSearch("");
    setAvailability("all");
  };
  return (
    <>
      <PageHeader title={t("catalog")} subtitle={t("catalogSubtitle")} />
      <div className="toolbar catalog-filters">
        <div className="search-control">
          <Input
            label={t("catalogSearch")}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Icon name="search" />
        </div>
        <Select
          label={t("availabilityFilter")}
          value={availability}
          onChange={(event) =>
            setAvailability(event.target.value as typeof availability)
          }
        >
          <option value="all">{t("allProducts")}</option>
          <option value="available">{t("available")}</option>
          <option value="unavailable">{t("unavailable")}</option>
        </Select>
        {(search || availability !== "all") && visible.length > 0 && (
          <Button variant="ghost" onClick={reset}>
            {t("resetFilters")}
          </Button>
        )}
      </div>
      {!query.isPending && !query.isError && (
        <div className="list-summary" role="status">
          <span>
            {t("shown")}: {visible.length}
          </span>
          <span>{t("catalogReadOnly")}</span>
        </div>
      )}
      {query.data?.next_cursor && (
        <p className="muted filter-hint">{t("catalogLoadedHint")}</p>
      )}
      {query.isPending ? (
        <Spinner />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : !items.length ? (
        <EmptyState title={t("empty")} />
      ) : !visible.length ? (
        <EmptyState
          title={t("noMatchingProducts")}
          description={t("noMatchingProductsHint")}
          action={
            <Button variant="secondary" onClick={reset}>
              {t("resetFilters")}
            </Button>
          }
        />
      ) : (
        <div className="card-grid catalog-grid">
          {visible.map((item) => (
            <Card key={item.id} className="product-card">
              <div className="product-visual" aria-hidden="true">
                <Icon name="catalog" />
                <span>QADAM</span>
              </div>
              <div className="card-top">
                {item.is_demo && <Badge>{t("demo")}</Badge>}
                <Badge tone={item.available ? "green" : "neutral"}>
                  {t(item.available ? "available" : "unavailable")}
                </Badge>
              </div>
              <h2>{item.name}</h2>
              <p
                className={`price${item.price_minor === null ? " price--missing" : ""}`}
              >
                {item.price_minor === null
                  ? t("noPrice")
                  : formatKZT(item.price_minor, locale)}
              </p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
