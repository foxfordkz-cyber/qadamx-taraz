/** Capability simulations only; these are NOT physical iPhone acceptance. */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useState } from "react";
import { Dialog } from "../shared/ui";
import { I18nProvider } from "../shared/i18n";
import {
  microphoneHarness,
  renderMicrophone,
  startMicrophone,
  STOP_BUTTON,
} from "./microphone-fixtures";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("keeps the menu usable without native dialog methods and removes its backdrop on close", () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    "showModal",
  );
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: undefined,
  });
  function Example() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Меню</button>
        <input aria-label="Ручной ввод" />
        <Dialog title="Разделы" open={open} onClose={() => setOpen(false)}>
          <button onClick={() => setOpen(false)}>Открыть раздел</button>
        </Dialog>
      </>
    );
  }
  try {
    render(
      <I18nProvider>
        <Example />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByText("Меню"));
    expect(screen.getByRole("dialog")).toBeVisible();
    fireEvent.click(screen.getByText("Открыть раздел"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.querySelector(".dialog-fallback-backdrop")).toBeNull();
    fireEvent.change(screen.getByLabelText("Ручной ввод"), {
      target: { value: "Продажа" },
    });
    expect(screen.getByLabelText("Ручной ввод")).toHaveValue("Продажа");
  } finally {
    if (descriptor)
      Object.defineProperty(
        HTMLDialogElement.prototype,
        "showModal",
        descriptor,
      );
    else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  }
});

it("uses the emitted MP4 type for the file instead of a pre-start MIME hint", async () => {
  const boundary = microphoneHarness();
  const view = renderMicrophone();
  await startMicrophone();
  const recorder = boundary.Recorder.instances[0];
  act(() => recorder.data(new Blob(["synthetic-mp4"], { type: "audio/mp4" })));
  fireEvent.click(screen.getByRole("button", { name: STOP_BUTTON }));
  act(() => recorder.finish());
  const file = view.onFile.mock.calls[0][0] as File;
  expect(file.type).toBe("audio/mp4");
  expect(file.name).toBe("recording.m4a");
});

it("rejects unaccepted emitted types instead of relabeling bytes as WebM", async () => {
  const boundary = microphoneHarness();
  const view = renderMicrophone();
  await startMicrophone();
  act(() =>
    boundary.Recorder.instances[0].data(
      new Blob(["unsupported"], { type: "video/mp4" }),
    ),
  );
  act(() => boundary.Recorder.instances[0].finish());
  expect(view.onFile).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toBeInTheDocument();
  boundary.tracks.forEach((track) => expect(track.readyState).toBe("ended"));
});

it("can record after permission was denied and then explicitly allowed", async () => {
  const boundary = microphoneHarness(["audio/mp4"]);
  boundary.getUserMedia.mockRejectedValueOnce(
    new DOMException("Denied", "NotAllowedError"),
  );
  const view = renderMicrophone();
  await startMicrophone();
  expect(screen.getByRole("alert")).toBeInTheDocument();
  await startMicrophone();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  const recorder = boundary.Recorder.instances[0];
  act(() => recorder.data(new Blob(["synthetic-mp4"], { type: "audio/mp4" })));
  fireEvent.click(screen.getByRole("button", { name: STOP_BUTTON }));
  act(() => recorder.finish());
  expect(view.onFile).toHaveBeenCalledTimes(1);
  boundary.tracks.forEach((track) => expect(track.readyState).toBe("ended"));
});
