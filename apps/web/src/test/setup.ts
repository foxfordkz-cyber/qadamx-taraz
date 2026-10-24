import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { installTestWebLocks } from "./web-locks";
let restoreLocks: (() => void) | undefined;
beforeEach(() => {
  restoreLocks = installTestWebLocks();
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
  restoreLocks?.();
});
Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute("open");
};
