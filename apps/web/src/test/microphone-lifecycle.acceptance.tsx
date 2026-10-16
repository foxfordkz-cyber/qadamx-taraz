/** Ordinary acceptance tests, deliberately red against unchanged combined.
 * Run: npx vitest run --config vitest.microphone.config.ts
 * Not a default *.test.tsx file: this gate is separate from baseline results.
 * No production implementation or test-only behavior is supplied here.
 */
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FILE_LABEL,
  RECORD_BUTTON,
  STOP_BUTTON,
  deferred,
  microphoneHarness,
  renderMicrophone,
  startMicrophone,
} from "./microphone-fixtures";

const cancel = () => screen.getByRole("button", { name: "Отменить запись" });
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("participant #4 capture lifecycle acceptance — no skips or expected failures", () => {
  it("VP-01: cancelling a pending permission releases its eventual stream without starting", async () => {
    const boundary = microphoneHarness();
    const permission = deferred<MediaStream>();
    boundary.getUserMedia.mockReturnValue(permission.promise);
    const view = renderMicrophone();
    await startMicrophone();
    expect(boundary.getUserMedia).toHaveBeenCalledTimes(1);
    fireEvent.click(cancel());
    await act(async () => permission.resolve(boundary.stream));
    expect(boundary.Recorder.instances).toHaveLength(0);
    boundary.tracks.forEach((track) => expect(track.stop).toHaveBeenCalled());
    expect(view.onFile).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: RECORD_BUTTON })).toBeEnabled();
  });

  it("VP-02: cancel releases all tracks/timer and ignores already queued data/stop", async () => {
    vi.useFakeTimers();
    const boundary = microphoneHarness();
    const view = renderMicrophone();
    await startMicrophone();
    const recorder = boundary.Recorder.instances[0];
    expect(recorder.state).toBe("recording");
    const lateData = recorder.ondataavailable;
    const lateStop = recorder.onstop;
    fireEvent.click(cancel());
    expect(recorder.stop).toHaveBeenCalledTimes(1);
    boundary.tracks.forEach((track) => expect(track.readyState).toBe("ended"));
    act(() => {
      lateData?.({ data: new Blob(["cancelled"]) } as BlobEvent);
      lateStop?.(new Event("stop"));
      vi.advanceTimersByTime(60_000);
    });
    expect(view.onFile).not.toHaveBeenCalled();
    expect(recorder.stop).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText(FILE_LABEL)).toBeEnabled();
  });

  it("VP-03: Stop then Cancel before asynchronous onstop discards the clip", async () => {
    const boundary = microphoneHarness();
    const view = renderMicrophone();
    await startMicrophone();
    const recorder = boundary.Recorder.instances[0];
    const lateStop = recorder.onstop;
    act(() => recorder.data(new Blob(["stopping"])));
    fireEvent.click(screen.getByRole("button", { name: STOP_BUTTON }));
    expect(recorder.state).toBe("inactive");
    expect(view.onFile).not.toHaveBeenCalled();
    fireEvent.click(cancel());
    act(() => lateStop?.(new Event("stop")));
    expect(view.onFile).not.toHaveBeenCalled();
    boundary.tracks.forEach((track) => expect(track.readyState).toBe("ended"));
  });

  it("VP-04: an old callback cannot publish over a newer recording generation", async () => {
    const boundary = microphoneHarness();
    const view = renderMicrophone();
    await startMicrophone();
    const first = boundary.Recorder.instances[0];
    const lateStop = first.onstop;
    act(() => first.data(new Blob(["first"])));
    fireEvent.click(screen.getByRole("button", { name: STOP_BUTTON }));
    expect(view.onFile).not.toHaveBeenCalled();
    // Cancel the pending stop when available. The current broken UI already
    // exposes Record before onstop, so its genuine stale-event race is tested too.
    const discard = screen.queryByRole("button", { name: "Отменить запись" });
    if (discard) fireEvent.click(discard);
    // A fresh stream for the next capture, not the stopped previous stream.
    const nextTracks = [{ stop: vi.fn() }];
    boundary.getUserMedia.mockResolvedValue({ getTracks: () => nextTracks });
    const again =
      screen.queryByRole("button", { name: "Записать заново" }) ??
      screen.getByRole("button", { name: RECORD_BUTTON });
    await act(async () => fireEvent.click(again));
    expect(boundary.Recorder.instances).toHaveLength(2);
    const second = boundary.Recorder.instances[1];
    act(() => lateStop?.(new Event("stop")));
    expect(view.onFile).not.toHaveBeenCalled();
    expect(second.state).toBe("recording");
    expect(nextTracks[0].stop).not.toHaveBeenCalled();
  });

  it("VP-05: double Stop cannot start another recording while stop is pending", async () => {
    const boundary = microphoneHarness();
    renderMicrophone();
    await startMicrophone();
    const stop = screen.getByRole("button", { name: STOP_BUTTON });
    fireEvent.click(stop);
    await act(async () => {
      fireEvent.click(stop);
    });
    expect(boundary.getUserMedia).toHaveBeenCalledTimes(1);
    expect(boundary.Recorder.instances[0].stop).toHaveBeenCalledTimes(1);
  });

  it("VP-06: device/permission loss releases remaining tracks and never publishes a partial clip", async () => {
    vi.useFakeTimers();
    const boundary = microphoneHarness();
    const view = renderMicrophone();
    await startMicrophone();
    const recorder = boundary.Recorder.instances[0];
    act(() => {
      recorder.data(new Blob(["partial"]));
      boundary.tracks[0].readyState = "ended";
      boundary.tracks[0].dispatchEvent(new Event("ended"));
    });
    expect(boundary.tracks[1].stop).toHaveBeenCalled();
    act(() => {
      recorder.finish();
      vi.advanceTimersByTime(60_000);
    });
    expect(view.onFile).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeVisible();
  });

  it("VP-07: error followed by final data/stop cannot publish failed audio", async () => {
    const boundary = microphoneHarness();
    const view = renderMicrophone();
    await startMicrophone();
    const recorder = boundary.Recorder.instances[0];
    act(() => {
      recorder.fail();
      recorder.data(new Blob(["failed"]));
      recorder.finish();
    });
    expect(view.onFile).not.toHaveBeenCalled();
    boundary.tracks.forEach((track) => expect(track.readyState).toBe("ended"));
  });

  it("VP-08: choosing a fallback file invalidates a pending permission attempt", async () => {
    const boundary = microphoneHarness();
    const permission = deferred<MediaStream>();
    boundary.getUserMedia.mockReturnValue(permission.promise);
    const view = renderMicrophone();
    await startMicrophone();
    // If the owner disables file fallback while requesting, cancel first.
    if ((screen.getByLabelText(FILE_LABEL) as HTMLInputElement).disabled)
      fireEvent.click(cancel());
    const file = new File(["chosen"], "chosen.ogg", { type: "audio/ogg" });
    fireEvent.change(screen.getByLabelText(FILE_LABEL), {
      target: { files: [file] },
    });
    expect(view.onFile).toHaveBeenCalledExactlyOnceWith(file);
    await act(async () => permission.resolve(boundary.stream));
    expect(boundary.Recorder.instances).toHaveLength(0);
    expect(view.onFile).toHaveBeenCalledTimes(1);
    boundary.tracks.forEach((track) => expect(track.readyState).toBe("ended"));
  });
});
