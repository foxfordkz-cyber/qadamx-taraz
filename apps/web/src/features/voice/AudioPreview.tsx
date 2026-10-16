import { useEffect, useRef, useState } from "react";
import { Button } from "../../shared/ui";
import { useVoiceText } from "./i18n";

export function AudioPreview({
  file,
  disabled,
  onDelete,
}: {
  file: File;
  disabled: boolean;
  onDelete: () => void;
}) {
  const { v } = useVoiceText();
  const player = useRef<HTMLAudioElement>(null);
  const generation = useRef(0);
  const [url, setUrl] = useState(""),
    [playing, setPlaying] = useState(false),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    generation.current += 1;
    setFailed(false);
    setPlaying(false);
    const audio = player.current;
    const url = URL.createObjectURL(file);
    setUrl(url);
    return () => {
      generation.current += 1;
      audio?.pause();
      audio?.removeAttribute("src");
      URL.revokeObjectURL(url);
    };
  }, [file]);
  useEffect(() => {
    if (disabled) player.current?.pause();
  }, [disabled]);
  async function play() {
    const audio = player.current;
    if (!audio) return;
    const attempt = generation.current;
    setFailed(false);
    if (audio.ended) audio.currentTime = 0;
    try {
      await audio.play();
    } catch {
      if (generation.current === attempt) setFailed(true);
    }
  }
  return (
    <div className="voice-preview">
      <p>{file.name}</p>
      <audio
        ref={player}
        src={url || undefined}
        controls
        preload="metadata"
        aria-label={v("play")}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => setFailed(true)}
      />
      <div className="voice-actions">
        <Button
          disabled={disabled}
          variant="secondary"
          onClick={() => void play()}
        >
          {v("play")}
        </Button>
        <Button
          disabled={disabled || !playing}
          variant="secondary"
          onClick={() => player.current?.pause()}
        >
          {v("pausePlayback")}
        </Button>
        <Button disabled={disabled} variant="ghost" onClick={onDelete}>
          {v("delete")}
        </Button>
      </div>
      {failed && <p role="alert">{v("playError")}</p>}
    </div>
  );
}
