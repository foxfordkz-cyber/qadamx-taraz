import {
  AUDIO_MIMES,
  MAX_AUDIO_BYTES,
  MAX_AUDIO_MS,
  validAudio,
} from "./audioContract";

export type CaptureState =
  | "requesting"
  | "recording"
  | "paused"
  | "stopping"
  | "idle";
export type CaptureError =
  | "permission"
  | "device"
  | "unsupported"
  | "interrupted"
  | "invalid";

/** One capture owns only its own tracks, handlers and timers. Cancel is terminal. */
export class AudioCapture {
  state: CaptureState = "requesting";
  private closed = false;
  private released = false;
  private stream?: MediaStream;
  private recorder?: MediaRecorder;
  private timer?: ReturnType<typeof setTimeout>;
  private stopTimer?: ReturnType<typeof setTimeout>;
  private chunks: Blob[] = [];
  private size = 0;
  private elapsed = 0;
  private started = 0;
  private ended = () => this.fail("interrupted");

  constructor(
    private callbacks: {
      state: (state: CaptureState) => void;
      ready: (file: File) => void;
      error: (error: CaptureError) => void;
    },
  ) {}

  get canPause() {
    return (
      typeof this.recorder?.pause === "function" &&
      typeof this.recorder?.resume === "function"
    );
  }

  private change(state: CaptureState) {
    this.state = state;
    this.callbacks.state(state);
  }

  async start() {
    try {
      if (
        typeof MediaRecorder === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      )
        throw new DOMException("Unavailable", "NotSupportedError");
      const mime =
        typeof MediaRecorder.isTypeSupported === "function"
          ? [
              "audio/webm;codecs=opus",
              "audio/mp4",
              "audio/ogg;codecs=opus",
            ].find((m) => MediaRecorder.isTypeSupported(m))
          : undefined;
      if (typeof MediaRecorder.isTypeSupported === "function" && !mime)
        throw new DOMException("Unsupported", "NotSupportedError");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (this.closed) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.stream = stream;
      const recorder = new MediaRecorder(
        stream,
        mime ? { mimeType: mime } : {},
      );
      this.recorder = recorder;
      const actualMime = recorder.mimeType || mime || "";
      if (!AUDIO_MIMES.has(actualMime.split(";", 1)[0].toLowerCase()))
        throw new DOMException("Unsupported", "NotSupportedError");
      stream
        .getTracks()
        .forEach((track) => track.addEventListener?.("ended", this.ended));
      recorder.ondataavailable = (event) => {
        if (this.closed || !event.data.size) return;
        this.size += event.data.size;
        // Retain no oversized payload; reject on Stop, keeping that action available.
        if (this.size <= MAX_AUDIO_BYTES) this.chunks.push(event.data);
        else this.chunks = [];
      };
      recorder.onerror = () => this.fail("interrupted");
      recorder.onstop = () => {
        if (this.closed) return;
        if (this.state !== "stopping") {
          this.fail("interrupted");
          return;
        }
        const extension = actualMime.includes("mp4")
          ? "m4a"
          : actualMime.includes("ogg")
            ? "ogg"
            : "webm";
        const file = new File(this.chunks, `recording.${extension}`, {
          type: actualMime,
        });
        const valid = this.size <= MAX_AUDIO_BYTES && validAudio(file);
        this.close();
        this.change("idle");
        if (valid) this.callbacks.ready(file);
        else this.callbacks.error("invalid");
      };
      recorder.start();
      this.started = Date.now();
      this.change("recording");
      this.armTimer();
    } catch (error) {
      if (this.closed) return;
      const name = error instanceof DOMException ? error.name : "";
      this.fail(
        name === "NotAllowedError" || name === "SecurityError"
          ? "permission"
          : name === "NotFoundError"
            ? "device"
            : name === "NotSupportedError"
              ? "unsupported"
              : "interrupted",
      );
    }
  }

  private armTimer() {
    clearTimeout(this.timer);
    this.timer = setTimeout(
      () => this.stop(),
      Math.max(0, MAX_AUDIO_MS - this.elapsed),
    );
  }

  pause() {
    if (this.closed || this.state !== "recording" || !this.canPause) return;
    try {
      this.recorder!.pause();
      this.elapsed += Date.now() - this.started;
      clearTimeout(this.timer);
      this.change("paused");
    } catch {
      this.fail("interrupted");
    }
  }

  resume() {
    if (this.closed || this.state !== "paused" || !this.canPause) return;
    try {
      this.recorder!.resume();
      this.started = Date.now();
      this.change("recording");
      this.armTimer();
    } catch {
      this.fail("interrupted");
    }
  }

  stop() {
    if (this.closed || (this.state !== "recording" && this.state !== "paused"))
      return;
    this.change("stopping");
    clearTimeout(this.timer);
    // Missing final callback must not leave the input busy indefinitely.
    this.stopTimer = setTimeout(() => this.fail("interrupted"), 5000);
    try {
      this.recorder!.stop();
      this.releaseTracks();
    } catch {
      this.fail("interrupted");
    }
  }

  cancel() {
    if (this.closed) return;
    this.close();
    this.change("idle");
  }

  private releaseTracks() {
    if (this.released) return;
    this.released = true;
    this.stream?.getTracks().forEach((track) => {
      track.removeEventListener?.("ended", this.ended);
      track.stop();
    });
  }

  private close() {
    this.closed = true;
    clearTimeout(this.timer);
    clearTimeout(this.stopTimer);
    const recorder = this.recorder;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      if (recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          /* Tracks still released. */
        }
      }
    }
    this.releaseTracks();
    this.chunks = [];
  }

  private fail(error: CaptureError) {
    if (this.closed) return;
    this.close();
    this.change("idle");
    this.callbacks.error(error);
  }
}
