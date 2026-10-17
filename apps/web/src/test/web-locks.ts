/** Test-only Web Locks model: exclusive callbacks sharing a name run in order. */
export function installTestWebLocks() {
  const previous = Object.getOwnPropertyDescriptor(navigator, "locks");
  const tails = new Map<string, Promise<void>>();
  const manager = {
    request<T>(
      name: string,
      options: LockOptions,
      callback: (lock: Lock) => T | PromiseLike<T>,
    ): Promise<T> {
      if (options.mode && options.mode !== "exclusive") {
        return Promise.reject(
          new Error("This test models exclusive locks only"),
        );
      }
      const previousTask = tails.get(name) ?? Promise.resolve();
      const task = previousTask.then(() =>
        callback({ name, mode: "exclusive" }),
      );
      const tail = task.then(
        () => {},
        () => {},
      );
      tails.set(name, tail);
      void tail.then(() => {
        if (tails.get(name) === tail) tails.delete(name);
      });
      return task;
    },
  };
  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: manager,
  });
  return () => {
    if (previous) Object.defineProperty(navigator, "locks", previous);
    else Reflect.deleteProperty(navigator, "locks");
  };
}
