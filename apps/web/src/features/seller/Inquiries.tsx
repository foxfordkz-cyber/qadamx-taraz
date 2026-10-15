import { useState } from "react";
import { useBusiness, useDraft, useRuntime } from "../../app/runtime";
import type { Inquiry, InquiryStatus } from "../../shared/api/models";
import { formatDate } from "../../shared/format";
import { useI18n } from "../../shared/i18n";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ErrorMessage,
  PageHeader,
  Select,
  Spinner,
} from "../../shared/ui";
import { useInquiries, useInquiryStatus } from "./queries";
function InquiryCard({ inquiry }: { inquiry: Inquiry }) {
  const { t, locale } = useI18n();
  const { gateway } = useRuntime();
  const canUpdate = gateway.canUpdateInquiry ?? gateway.canWrite;
  const update = useInquiryStatus();
  const [chosen, setChosen] = useState<InquiryStatus>(inquiry.status);
  return (
    <Card className="inquiry-card">
      <div className="card-top">
        <Badge
          tone={
            inquiry.status === "new"
              ? "red"
              : inquiry.status === "in_progress"
                ? "green"
                : "neutral"
          }
        >
          {t(inquiry.status)}
        </Badge>
        <time dateTime={inquiry.created_at}>
          {formatDate(inquiry.created_at, locale)}
        </time>
      </div>
      <h2>{inquiry.visitor_name}</h2>
      <p className="muted break-word">
        {inquiry.contact || t("contactAbsent")}
      </p>
      <p className="message">{inquiry.message}</p>
      <div className="status-controls">
        <Select
          label={t("status")}
          value={chosen}
          onChange={(e) => {
            setChosen(e.target.value as InquiryStatus);
            update.reset();
          }}
          disabled={!canUpdate || update.isPending}
        >
          {(["new", "in_progress", "closed"] as const).map((status) => (
            <option key={status} value={status}>
              {t(status)}
            </option>
          ))}
        </Select>
        <Button
          variant="secondary"
          disabled={!canUpdate || chosen === inquiry.status || update.isPending}
          onClick={() => update.mutate({ id: inquiry.id, status: chosen })}
        >
          {t(update.isPending ? "saving" : "save")}
        </Button>
      </div>
      {update.isError && (
        <Alert tone="error">
          <ErrorMessage error={update.error} />
        </Alert>
      )}
      {update.isSuccess && (
        <Alert tone="success">{t("updatedFromServer")}</Alert>
      )}
    </Card>
  );
}
export function InquiriesPage() {
  const { t } = useI18n();
  const { business } = useBusiness();
  const { gateway } = useRuntime();
  const canUpdate = gateway.canUpdateInquiry ?? gateway.canWrite;
  const query = useInquiries();
  const [filter, setFilter] = useDraft<"all" | InquiryStatus>(
    `${business.id}:inquiry-filter`,
    "all",
  );
  const items =
    query.data?.pages
      .flatMap((page) => page.items)
      .filter((i) => i.business_id === business.id)
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)) ??
    [];
  const visible = items.filter(
    (item) => filter === "all" || item.status === filter,
  );
  return (
    <>
      <PageHeader
        title={t("inquiries")}
        subtitle={t("inquiriesSubtitle")}
        action={
          <Button
            variant="secondary"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            {t("refresh")}
          </Button>
        }
      />
      {!canUpdate && (
        <Alert>
          {t(gateway.mode === "demo" ? "demoWrites" : "contractPending")}
        </Alert>
      )}
      <div className="toolbar inquiry-filters">
        <Select
          label={t("inquiryFilter")}
          value={filter}
          onChange={(event) =>
            setFilter(event.target.value as "all" | InquiryStatus)
          }
        >
          <option value="all">{t("allInquiries")}</option>
          {(["new", "in_progress", "closed"] as const).map((status) => (
            <option key={status} value={status}>
              {t(status)}
            </option>
          ))}
        </Select>
        {filter !== "all" && (
          <Button variant="ghost" onClick={() => setFilter("all")}>
            {t("clearFilter")}
          </Button>
        )}
        {!query.isPending && !query.isError && (
          <p className="muted result-count" role="status">
            {t("shown")}: {visible.length}
          </p>
        )}
      </div>
      {query.hasNextPage && (
        <p className="muted filter-hint">{t("loadedInquiriesHint")}</p>
      )}
      {query.isPending ? (
        <Spinner />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : !items.length ? (
        <EmptyState
          title={t("inquiriesEmpty")}
          description={t("inquiriesEmptyHint")}
        />
      ) : !visible.length ? (
        <EmptyState
          title={t("noMatchingInquiries")}
          action={
            <Button variant="secondary" onClick={() => setFilter("all")}>
              {t("clearFilter")}
            </Button>
          }
        />
      ) : (
        <div className="inquiry-list">
          {visible.map((item) => (
            <InquiryCard key={`${item.id}:${item.status}`} inquiry={item} />
          ))}
        </div>
      )}
      {query.hasNextPage && (
        <Button
          variant="secondary"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {t("loadMore")}
        </Button>
      )}
    </>
  );
}
