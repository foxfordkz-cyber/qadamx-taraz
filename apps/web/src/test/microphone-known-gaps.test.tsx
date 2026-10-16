/** Expected failures against combined 58d4eb4. Each assertion states required safe
 * behavior, not acceptance of the current defect. Vitest fails on an unexpected
 * pass, so the owner must remove .fails when the production fix is approved.
 * Set QADAM_MIC_STRICT_KNOWN_GAPS=1 for a diagnostic run with five real failures.
 * These are browser-boundary simulations, not physical-device acceptance.
 */
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AUDIO_LIMIT_BYTES,
  STOP_BUTTON,
  deferred,
  microphoneHarness,
  renderMicrophone,
  startMicrophone,
} from "./microphone-fixtures";

const knownGap =
  process.env.QADAM_MIC_STRICT_KNOWN_GAPS === "1" ? it : it.fails;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("known microphone gaps — EXPECTED FAILURES, participant #4 implementation pending", () => {
  knownGap(
    "MIC-01: must not start a late permission stream after the parent becomes disabled",
    async () => {
      const boundary = microphoneHarness();
      const pending = deferred<MediaStream>();
      boundary.getUserMedia.mockReturnValue(pending.promise);
      const view = renderMicrophone();
      await startMicrophone();
      expect(boundary.getUserMedia).toHaveBeenCalledTimes(1);
      view.disabled(true);
      await act(async () => pending.resolve(boundary.stream));
      expect(boundary.Recorder.instances).toHaveLength(0);
      boundary.tracks.forEach((track) =>
        expect(track.stop).toHaveBeenCalledTimes(1),
      );
      expect(view.onFile).not.toHaveBeenCalled();
    },
  );

  knownGap(
    "MIC-02: becoming disabled during capture must release tracks and discard the clip",
    async () => {
      vi.useFakeTimers();
      const boundary = microphoneHarness();
      const view = renderMicrophone();
      await startMicrophone();
      const recorder = boundary.Recorder.instances[0];
      act(() => recorder.data(new Blob(["synthetic-audio"])));
      view.disabled(true);
      boundary.tracks.forEach((track) =>
        expect(track.stop).toHaveBeenCalledTimes(1),
      );
      act(() => recorder.finish());
      act(() => vi.advanceTimersByTime(60_000));
      boundary.tracks.forEach((track) =>
        expect(track.stop).toHaveBeenCalledTimes(1),
      );
      expect(view.onFile).not.toHaveBeenCalled();
    },
  );

  knownGap(
    "MIC-05a: must reject a recorded clip larger than 8 MiB before onFile",
    async () => {
      const boundary = microphoneHarness();
      const view = renderMicrophone();
      await startMicrophone();
      const recorder = boundary.Recorder.instances[0];
      act(() =>
        recorder.data(new Blob([new ArrayBuffer(AUDIO_LIMIT_BYTES + 1)])),
      );
      fireEvent.click(screen.getByRole("button", { name: STOP_BUTTON }));
      act(() => recorder.finish());
      expect(view.onFile).not.toHaveBeenCalled();
    },
  );

  knownGap(
    "MIC-05b: must not forward an empty recording as an audio file",
    async () => {
      const boundary = microphoneHarness();
      const view = renderMicrophone();
      await startMicrophone();
      const recorder = boundary.Recorder.instances[0];
      act(() => recorder.data(new Blob([])));
      fireEvent.click(screen.getByRole("button", { name: STOP_BUTTON }));
      act(() => recorder.finish());
      expect(view.onFile).not.toHaveBeenCalled();
    },
  );

  knownGap(
    "MIC-04: recorder error must release microphone tracks and duration timer",
    async () => {
      vi.useFakeTimers();
      const boundary = microphoneHarness();
      const view = renderMicrophone();
      await startMicrophone();
      const recorder = boundary.Recorder.instances[0];
      act(() => recorder.fail());
      boundary.tracks.forEach((track) =>
        expect(track.stop).toHaveBeenCalledTimes(1),
      );
      act(() => vi.advanceTimersByTime(60_000));
      boundary.tracks.forEach((track) =>
        expect(track.stop).toHaveBeenCalledTimes(1),
      );
      expect(screen.queryByText(/Идёт запись/)).not.toBeInTheDocument();
      expect(view.onFile).not.toHaveBeenCalled();
    },
  );
});
