import { useState } from "react";
import { useBusiness, useRuntime } from "../../app/runtime";
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
  PageHeader,
  Select,
  Spinner,
  errorKey,
} from "../../shared/ui";
import { useInquiries, useInquiryStatus } from "./queries";
function InquiryCard({ inquiry }: { inquiry: Inquiry }) {
  const { t, locale } = useI18n();
  const { gateway } = useRuntime();
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
          disabled={!gateway.canWrite || update.isPending}
        >
          {(["new", "in_progress", "closed"] as const).map((status) => (
            <option key={status} value={status}>
              {t(status)}
            </option>
          ))}
        </Select>
        <Button
          variant="secondary"
          disabled={
            !gateway.canWrite || chosen === inquiry.status || update.isPending
          }
          onClick={() => update.mutate({ id: inquiry.id, status: chosen })}
        >
          {t(update.isPending ? "saving" : "save")}
        </Button>
      </div>
      {update.isError && (
        <Alert tone="error">{t(errorKey(update.error))}</Alert>
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
  const query = useInquiries();
  const items =
    query.data?.pages
      .flatMap((page) => page.items)
      .filter((i) => i.business_id === business.id)
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)) ??
    [];
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
      {!gateway.canWrite && (
        <Alert>
          {t(gateway.mode === "demo" ? "demoWrites" : "contractPending")}
        </Alert>
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
      ) : (
        <div className="inquiry-list">
          {items.map((item) => (
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
