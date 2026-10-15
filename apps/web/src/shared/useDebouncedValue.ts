import { useEffect, useState } from "react";

/** Cancel the previous timer on every keystroke and when the owner unmounts. */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return settled;
}
