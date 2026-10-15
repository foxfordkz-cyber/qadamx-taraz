import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "../shared/useDebouncedValue";

afterEach(() => vi.useRealTimers());
describe("customer search debounce", () => {
  it("settles only the last input after 250 ms", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value),
      { initialProps: { value: "" } },
    );
    rerender({ value: "Ә" });
    act(() => vi.advanceTimersByTime(200));
    rerender({ value: "Әсел" });
    act(() => vi.advanceTimersByTime(249));
    expect(result.current).toBe("");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe("Әсел");
  });
  it("cancels pending work on unmount", () => {
    vi.useFakeTimers();
    const { rerender, unmount } = renderHook(
      ({ value }) => useDebouncedValue(value),
      { initialProps: { value: "" } },
    );
    rerender({ value: "new query" });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
