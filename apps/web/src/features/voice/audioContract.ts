// API 0.6.1: docs/team5/02_ARCHITECTURE_API.md and apps/api/app/services/audio.py.
// Server decoding remains authoritative for actual format and duration.
export const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
export const MAX_AUDIO_MS = 30_000;
export const AI_REQUEST_TIMEOUT_MS = 30_000; // Server AI deadline is 25 seconds.
export const AUDIO_MIMES = new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/opus",
  "audio/webm",
  "audio/mp4",
  "audio/m4a",
  "audio/flac",
]);
export function validAudio(file: Blob) {
  return (
    file.size > 0 &&
    file.size <= MAX_AUDIO_BYTES &&
    AUDIO_MIMES.has(file.type.split(";", 1)[0].trim().toLowerCase())
  );
}
