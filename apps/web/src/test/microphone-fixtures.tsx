/** Browser API boundary doubles only. AudioInput itself and RU/KZ stay real.
 * These tests do not prove permission UX, codecs or microphone quality on a phone.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { AudioInput } from "../features/voice/AudioInput";
import { I18nProvider } from "../shared/i18n";

export const AUDIO_LIMIT_BYTES = 8 * 1024 * 1024;
export const RECORD_BUTTON = "Записать голос";
export const STOP_BUTTON = "Остановить";
export const FILE_LABEL = "Аудиофайл (до 30 секунд, 8 МБ)";

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

export function microphoneHarness(
  supported = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"],
) {
  const tracks = [0, 1].map(() => {
    const track = new EventTarget() as EventTarget & {
      readyState: MediaStreamTrackState;
      stop: ReturnType<typeof vi.fn>;
      onended: ((event: Event) => void) | null;
    };
    track.readyState = "live";
    track.onended = null;
    track.addEventListener("ended", (event) => track.onended?.(event));
    // Track.stop() does not fire ended; device/permission loss does.
    track.stop = vi.fn(() => {
      track.readyState = "ended";
    });
    return track;
  });
  const stream = { getTracks: () => tracks } as unknown as MediaStream;
  const getUserMedia = vi.fn().mockResolvedValue(stream);
  let failConstructor = false;
  let failStart = false;
  class Recorder {
    static instances: Recorder[] = [];
    static isTypeSupported = vi.fn((mime: string) => supported.includes(mime));
    state: RecordingState = "inactive";
    ondataavailable: ((event: BlobEvent) => void) | null = null;
    onstop: ((event: Event) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    mimeType: string;
    constructor(
      public stream: MediaStream,
      options: MediaRecorderOptions,
    ) {
      if (failConstructor)
        throw new DOMException(
          "Synthetic constructor failure",
          "NotSupportedError",
        );
      this.mimeType = options.mimeType ?? "";
      Recorder.instances.push(this);
    }
    start = vi.fn(() => {
      if (failStart)
        throw new DOMException("Synthetic start failure", "NotSupportedError");
      this.state = "recording";
    });
    stop = vi.fn(() => {
      // Real stop queues dataavailable/stop events; tests deliver those separately.
      this.state = "inactive";
    });
    data(blob: Blob) {
      this.ondataavailable?.({ data: blob } as BlobEvent);
    }
    finish() {
      this.state = "inactive";
      this.onstop?.(new Event("stop"));
    }
    fail() {
      this.state = "inactive";
      this.onerror?.(new Event("error"));
    }
  }
  vi.stubGlobal("MediaRecorder", Recorder);
  vi.stubGlobal(
    "navigator",
    Object.create(navigator, {
      mediaDevices: { value: { getUserMedia }, configurable: true },
    }),
  );
  return {
    tracks,
    stream,
    getUserMedia,
    Recorder,
    failConstructor: () => {
      failConstructor = true;
    },
    failStart: () => {
      failStart = true;
    },
  };
}

export function renderMicrophone(disabled = false) {
  const onFile = vi.fn();
  const view = (nextDisabled: boolean) => (
    <I18nProvider>
      <AudioInput disabled={nextDisabled} onFile={onFile} />
    </I18nProvider>
  );
  const result = render(view(disabled));
  return {
    ...result,
    onFile,
    disabled: (next: boolean) => result.rerender(view(next)),
  };
}

export async function startMicrophone(name = RECORD_BUTTON) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
}
