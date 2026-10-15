// Recorder lifecycle adapted from PR #7: stop tracks/timer on unmount and cap at 30s.
import { useEffect, useRef, useState } from "react";
import { Button, Input } from "../../shared/ui";
import { useLedgerText } from "../ledger/i18n";
export function AudioInput({
  disabled,
  onFile,
}: {
  disabled: boolean;
  onFile: (file: File) => void;
}) {
  const { l } = useLedgerText(),
    [recording, setRecording] = useState(false),
    [error, setError] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    alive = useRef(true),
    lock = useRef(false);
  function stop() {
    if (timer.current) clearTimeout(timer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
    stream.current?.getTracks().forEach((t) => t.stop());
    setRecording(false);
  }
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
      if (recorder.current) {
        recorder.current.onstop = null;
        if (recorder.current.state === "recording") recorder.current.stop();
      }
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  async function start() {
    if (lock.current) return;
    lock.current = true;
    setError(false);
    try {
      const mime = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((m) => MediaRecorder.isTypeSupported(m));
      if (!mime) throw Error();
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current) {
        s.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = s;
      const r = new MediaRecorder(s, { mimeType: mime });
      recorder.current = r;
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      r.onstop = () => {
        if (alive.current)
          onFile(
            new File(
              chunks,
              `recording.${mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm"}`,
              { type: mime },
            ),
          );
      };
      r.start();
      setRecording(true);
      timer.current = setTimeout(stop, 30000);
    } catch {
      setError(true);
      stream.current?.getTracks().forEach((t) => t.stop());
    } finally {
      lock.current = false;
    }
  }
  return (
    <>
      <Input
        type="file"
        label={l("audio")}
        accept="audio/*"
        disabled={disabled || recording}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && f.size <= 8 * 1024 * 1024) onFile(f);
          else setError(true);
        }}
      />
      <Button
        disabled={disabled}
        variant="secondary"
        onClick={() => (recording ? stop() : void start())}
      >
        {l(recording ? "stop" : "record")}
      </Button>
      {recording && <p role="status">{l("recording")}</p>}
      {error && <p role="alert">{l("micError")}</p>}
    </>
  );
}
