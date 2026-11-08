// Bounds both transport and SDK promises (including promises that ignore abort).
// No retry and no credential/response logging.
export function withinDeadline<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  milliseconds: number,
  timeoutError: () => Error,
  parent?: AbortSignal | null,
): Promise<T> {
  const controller = new AbortController();
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const finish = (done: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      parent?.removeEventListener("abort", cancel);
      done();
    };
    const cancel = () =>
      finish(() => {
        controller.abort(parent?.reason);
        reject(parent?.reason ?? new DOMException("Aborted", "AbortError"));
      });
    const timer = setTimeout(
      () =>
        finish(() => {
          controller.abort();
          reject(timeoutError());
        }),
      milliseconds,
    );
    parent?.addEventListener("abort", cancel, { once: true });
    if (parent?.aborted) {
      cancel();
      return;
    }
    try {
      operation(controller.signal).then(
        (value) => finish(() => resolve(value)),
        (error) => finish(() => reject(error)),
      );
    } catch (error) {
      finish(() => reject(error));
    }
  });
}
