import { useEffect, useRef, useState } from "react";
import { Button, Input } from "../../shared/ui";
import { useLedgerText } from "../ledger/i18n";
import { AudioCapture, type CaptureError, type CaptureState } from "./recorder";
import { validAudio } from "./audioContract";
import { useVoiceText } from "./i18n";
import "./voice.css";

export function AudioInput({
  disabled,
  onFile,
  onBusyChange,
  onReset,
}: {
  disabled: boolean;
  onFile: (file: File) => void;
  onBusyChange?: (busy: boolean) => void;
  onReset?: () => void;
}) {
  const { l } = useLedgerText(),
    { v } = useVoiceText();
  const [state, setState] = useState<CaptureState>("idle");
  const [error, setError] = useState<CaptureError | null>(null);
  const capture = useRef<AudioCapture | null>(null),
    alive = useRef(true);
  const props = useRef({ disabled, onFile, onBusyChange, onReset });
  props.current = { disabled, onFile, onBusyChange, onReset };
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      capture.current?.cancel();
    };
  }, []);
  useEffect(() => {
    if (disabled) capture.current?.cancel();
  }, [disabled]);

  function start() {
    if (
      props.current.disabled ||
      (capture.current && capture.current.state !== "idle")
    )
      return;
    setError(null);
    props.current.onReset?.();
    const attempt = new AudioCapture({
      state: (next) => {
        if (!alive.current || capture.current !== attempt) return;
        setState(next);
        props.current.onBusyChange?.(next !== "idle");
      },
      ready: (file) => {
        if (
          alive.current &&
          capture.current === attempt &&
          !props.current.disabled
        )
          props.current.onFile(file);
      },
      error: (error) => {
        if (
          alive.current &&
          capture.current === attempt &&
          !props.current.disabled
        )
          setError(error);
      },
    });
    capture.current = attempt;
    setState("requesting");
    props.current.onBusyChange?.(true);
    void attempt.start();
  }
  const active = state === "recording" || state === "paused",
    stopping = state === "stopping";
  return (
    <>
      <Input
        type="file"
        label={l("audio")}
        accept="audio/*"
        disabled={disabled || active || stopping}
        onChange={(event) => {
          capture.current?.cancel();
          setError(null);
          const file = event.target.files?.[0];
          event.target.value = ""; // Selecting the same file again is a fresh explicit action.
          if (file && validAudio(file)) props.current.onFile(file);
          else if (file) setError("invalid");
        }}
      />
      <div className="voice-actions">
        <Button
          disabled={disabled || state === "requesting" || stopping}
          variant="secondary"
          onClick={() => (active ? capture.current?.stop() : start())}
        >
          {l(active || stopping ? "stop" : "record")}
        </Button>
        {active && capture.current?.canPause && (
          <Button
            disabled={disabled}
            variant="secondary"
            onClick={() =>
              state === "paused"
                ? capture.current?.resume()
                : capture.current?.pause()
            }
          >
            {v(state === "paused" ? "resumeRecording" : "pauseRecording")}
          </Button>
        )}
        {state !== "idle" && (
          <Button
            disabled={disabled}
            variant="ghost"
            onClick={() => {
              capture.current?.cancel();
              setError(null);
            }}
          >
            {v("cancelRecording")}
          </Button>
        )}
      </div>
      {state !== "idle" && (
        <p role="status">
          {state === "recording"
            ? l("recording")
            : v(
                state === "requesting"
                  ? "requesting"
                  : state === "paused"
                    ? "paused"
                    : "stopping",
              )}
        </p>
      )}
      {error && (
        <p role="alert">
          <span>{l("micError")}</span> <span>{v(error)}</span>
        </p>
      )}
    </>
  );
}
