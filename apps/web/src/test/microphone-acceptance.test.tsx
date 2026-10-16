import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AUDIO_LIMIT_BYTES,
  FILE_LABEL,
  RECORD_BUTTON,
  STOP_BUTTON,
  deferred,
  microphoneHarness,
  renderMicrophone,
  startMicrophone,
} from "./microphone-fixtures";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("microphone acceptance: real AudioInput with synthetic browser boundaries", () => {
  it("does not ask permission or emit a file before an explicit user action", () => {
    const boundary = microphoneHarness();
    const view = renderMicrophone();
    expect(boundary.getUserMedia).not.toHaveBeenCalled();
    expect(boundary.Recorder.instances).toHaveLength(0);
    expect(view.onFile).not.toHaveBeenCalled();
    expect(screen.getByLabelText(FILE_LABEL)).toBeEnabled();
    expect(screen.getByLabelText(FILE_LABEL)).toHaveAttribute(
      "accept",
      "audio/*",
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("keeps recording and file selection disabled while the parent is busy", () => {
    const boundary = microphoneHarness();
    const view = renderMicrophone(true);
    expect(screen.getByRole("button", { name: RECORD_BUTTON })).toBeDisabled();
    expect(screen.getByLabelText(FILE_LABEL)).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: RECORD_BUTTON }));
    expect(boundary.getUserMedia).not.toHaveBeenCalled();
    expect(view.onFile).not.toHaveBeenCalled();
  });

  it.each([
    [
      ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"],
      "audio/webm;codecs=opus",
      "recording.webm",
    ],
    [["audio/mp4", "audio/ogg;codecs=opus"], "audio/mp4", "recording.m4a"],
    [["audio/ogg;codecs=opus"], "audio/ogg;codecs=opus", "recording.ogg"],
  ] as const)(
    "selects the first supported MIME among %j and emits only the stopped recording",
    async (supported, mime, filename) => {
      const boundary = microphoneHarness([...supported]);
      const view = renderMicrophone();
      await startMicrophone();
      expect(boundary.getUserMedia).toHaveBeenCalledExactlyOnceWith({
        audio: true,
      });
      const recorder = boundary.Recorder.instances[0];
      expect(recorder.stream).toBe(boundary.stream);
      expect(recorder.mimeType).toBe(mime);
      expect(screen.getByRole("status")).toHaveTextContent(
        "Идёт запись, максимум 30 секунд",
      );
      expect(screen.getByLabelText(FILE_LABEL)).toBeDisabled();
      expect(view.onFile).not.toHaveBeenCalled();
      act(() => {
        recorder.data(new Blob([]));
        recorder.data(new Blob(["synthetic-audio"], { type: mime }));
      });
      expect(view.onFile).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: STOP_BUTTON }));
      expect(recorder.stop).toHaveBeenCalledTimes(1);
      boundary.tracks.forEach((track) =>
        expect(track.stop).toHaveBeenCalledTimes(1),
      );
      expect(view.onFile).not.toHaveBeenCalled();
      act(() => recorder.finish());
      expect(view.onFile).toHaveBeenCalledTimes(1);
      const file = view.onFile.mock.calls[0][0] as File;
      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe(filename);
      expect(file.type).toBe(mime);
      expect(file.size).toBe(new Blob(["synthetic-audio"]).size);
      expect(screen.getByLabelText(FILE_LABEL)).toBeEnabled();
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    },
  );

  it("falls back to file input when no recorder MIME is supported", async () => {
    const boundary = microphoneHarness([]);
    const view = renderMicrophone();
    await startMicrophone();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Используйте текст или файл",
    );
    expect(screen.getByLabelText(FILE_LABEL)).toBeEnabled();
    expect(boundary.getUserMedia).not.toHaveBeenCalled();
    expect(view.onFile).not.toHaveBeenCalled();
  });

  it("falls back without a permission request when MediaRecorder is absent", async () => {
    const boundary = microphoneHarness();
    vi.stubGlobal("MediaRecorder", undefined);
    const view = renderMicrophone();
    await startMicrophone();
    expect(screen.getByRole("alert")).toHaveTextContent("Микрофон недоступен");
    expect(screen.getByLabelText(FILE_LABEL)).toBeEnabled();
    expect(boundary.getUserMedia).not.toHaveBeenCalled();
    expect(view.onFile).not.toHaveBeenCalled();
  });

  it("falls back when mediaDevices is unavailable, as in an unsupported/insecure context", async () => {
    microphoneHarness();
    vi.stubGlobal(
      "navigator",
      Object.create(navigator, { mediaDevices: { value: undefined } }),
    );
    const view = renderMicrophone();
    await startMicrophone();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Используйте текст или файл",
    );
    expect(screen.getByLabelText(FILE_LABEL)).toBeEnabled();
    expect(view.onFile).not.toHaveBeenCalled();
  });

  it.each(["NotAllowedError", "NotFoundError", "NotReadableError"])(
    "keeps file fallback after permission/device failure %s",
    async (name) => {
      const boundary = microphoneHarness();
      boundary.getUserMedia.mockRejectedValue(
        new DOMException("Synthetic device failure", name),
      );
      const view = renderMicrophone();
      await startMicrophone();
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Микрофон недоступен",
      );
      expect(screen.getByLabelText(FILE_LABEL)).toBeEnabled();
      expect(boundary.Recorder.instances).toHaveLength(0);
      expect(view.onFile).not.toHaveBeenCalled();
    },
  );

  it("does not request permission twice while the first permission prompt is pending", async () => {
    const boundary = microphoneHarness();
    const pending = deferred<MediaStream>();
    boundary.getUserMedia.mockReturnValue(pending.promise);
    renderMicrophone();
    await startMicrophone();
    await startMicrophone();
    expect(boundary.getUserMedia).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve(boundary.stream));
    expect(boundary.Recorder.instances).toHaveLength(1);
  });

  it("releases a late permission stream after unmount without starting or emitting", async () => {
    const boundary = microphoneHarness();
    const pending = deferred<MediaStream>();
    boundary.getUserMedia.mockReturnValue(pending.promise);
    const view = renderMicrophone();
    await startMicrophone();
    view.unmount();
    await act(async () => pending.resolve(boundary.stream));
    boundary.tracks.forEach((track) =>
      expect(track.stop).toHaveBeenCalledTimes(1),
    );
    expect(boundary.Recorder.instances).toHaveLength(0);
    expect(view.onFile).not.toHaveBeenCalled();
  });

  it("stops at 30 seconds and releases tracks without emitting before the stop event", async () => {
    vi.useFakeTimers();
    const boundary = microphoneHarness();
    const view = renderMicrophone();
    await startMicrophone();
    const recorder = boundary.Recorder.instances[0];
    act(() => recorder.data(new Blob(["synthetic-audio"])));
    act(() => vi.advanceTimersByTime(29_999));
    expect(recorder.stop).not.toHaveBeenCalled();
    expect(view.onFile).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(recorder.stop).toHaveBeenCalledTimes(1);
    boundary.tracks.forEach((track) =>
      expect(track.stop).toHaveBeenCalledTimes(1),
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(view.onFile).not.toHaveBeenCalled();
    act(() => recorder.finish());
    expect(view.onFile).toHaveBeenCalledTimes(1);
  });

  it("cancels the duration timer after an explicit stop", async () => {
    vi.useFakeTimers();
    const boundary = microphoneHarness();
    renderMicrophone();
    await startMicrophone();
    fireEvent.click(screen.getByRole("button", { name: STOP_BUTTON }));
    act(() => vi.advanceTimersByTime(60_000));
    expect(boundary.Recorder.instances[0].stop).toHaveBeenCalledTimes(1);
    boundary.tracks.forEach((track) =>
      expect(track.stop).toHaveBeenCalledTimes(1),
    );
  });

  it("cleans up active recorder, tracks and timer on unmount and suppresses late callbacks", async () => {
    vi.useFakeTimers();
    const boundary = microphoneHarness();
    const view = renderMicrophone();
    await startMicrophone();
    const recorder = boundary.Recorder.instances[0];
    act(() => recorder.data(new Blob(["synthetic-audio"])));
    view.unmount();
    expect(recorder.stop).toHaveBeenCalledTimes(1);
    boundary.tracks.forEach((track) =>
      expect(track.stop).toHaveBeenCalledTimes(1),
    );
    act(() => vi.advanceTimersByTime(60_000));
    boundary.tracks.forEach((track) =>
      expect(track.stop).toHaveBeenCalledTimes(1),
    );
    act(() => recorder.finish());
    expect(view.onFile).not.toHaveBeenCalled();
  });

  it.each([AUDIO_LIMIT_BYTES - 1, AUDIO_LIMIT_BYTES])(
    "accepts an uploaded audio file of %i bytes without starting capture",
    (size) => {
      const boundary = microphoneHarness();
      const view = renderMicrophone();
      const file = new File([new ArrayBuffer(size)], "synthetic.ogg", {
        type: "audio/ogg",
      });
      fireEvent.change(screen.getByLabelText(FILE_LABEL), {
        target: { files: [file] },
      });
      expect(view.onFile).toHaveBeenCalledTimes(1);
      expect(view.onFile.mock.calls[0][0]).toBe(file);
      expect(boundary.getUserMedia).not.toHaveBeenCalled();
    },
  );

  it("rejects an uploaded audio file one byte above 8 MiB without a callback", () => {
    microphoneHarness();
    const view = renderMicrophone();
    const file = new File(
      [new ArrayBuffer(AUDIO_LIMIT_BYTES + 1)],
      "synthetic.ogg",
      { type: "audio/ogg" },
    );
    fireEvent.change(screen.getByLabelText(FILE_LABEL), {
      target: { files: [file] },
    });
    expect(view.onFile).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it.each(["constructor", "start"] as const)(
    "releases the granted stream if recorder %s fails",
    async (failure) => {
      const boundary = microphoneHarness();
      if (failure === "constructor") boundary.failConstructor();
      else boundary.failStart();
      const view = renderMicrophone();
      await startMicrophone();
      boundary.tracks.forEach((track) =>
        expect(track.stop).toHaveBeenCalledTimes(1),
      );
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByLabelText(FILE_LABEL)).toBeEnabled();
      expect(view.onFile).not.toHaveBeenCalled();
    },
  );

  it("keeps the permission-error fallback readable in Kazakh", async () => {
    localStorage.setItem("qadam.locale", "kk");
    const boundary = microphoneHarness();
    boundary.getUserMedia.mockRejectedValue(
      new DOMException("Synthetic denial", "NotAllowedError"),
    );
    const view = renderMicrophone();
    await startMicrophone("Дауыс жазу");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Микрофон қолжетімсіз. Мәтін не файл енгізіңіз.",
    );
    expect(
      screen.getByLabelText("Аудиофайл (30 секунд, 8 МБ дейін)"),
    ).toBeEnabled();
    expect(view.onFile).not.toHaveBeenCalled();
  });
});
