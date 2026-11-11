import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ApiError } from "../shared/api/client";
import { I18nProvider } from "../shared/i18n";
import { AnalysisError } from "../features/voice/AnalysisError";
import { restoreVoiceMemory } from "../features/voice/draftMemory";

afterEach(() => {
  cleanup();
  localStorage.clear();
});
it.each([
  ["ru", undefined, "Точная причина не подтверждена"],
  ["kk", undefined, "Нақты себеп расталмаған"],
  ["ru", "QUOTA_EXHAUSTED", "Провайдер подтвердил"],
  ["kk", "QUOTA_EXHAUSTED", "Провайдер қолжетімді квотаның"],
  ["ru", "RATE_LIMITED", "Провайдер ограничил частоту"],
  ["kk", "RATE_LIMITED", "Провайдер сұраулардың жиілігін"],
])(
  "distinguishes evidenced limit reason in %s: %s",
  (locale, reason, expected) => {
    localStorage.setItem("qadam.locale", locale!);
    const error = new ApiError(503, "AI_QUOTA_EXCEEDED", {
      fields: reason ? { provider_reason: [reason] } : undefined,
    });
    render(
      <I18nProvider>
        <AnalysisError error={error} />
      </I18nProvider>,
    );
    expect(screen.getByText(new RegExp(expected!))).toBeVisible();
  },
);

it("never restores expired input or input from another session/shop", () => {
  const store = new Map<string, unknown>([
    ["A:shop:voice-input:new", { text: "private", expiresAt: Date.now() - 1 }],
  ]);
  expect(restoreVoiceMemory(store, "B:shop:voice-input:new")).toBeUndefined();
  expect(restoreVoiceMemory(store, "A:shop:voice-input:new")).toBeUndefined();
  expect(store.size).toBe(0);
});
