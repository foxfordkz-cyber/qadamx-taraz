"""Bounded in-memory decoding. Never use filenames, URLs, uploads or persistent audio storage."""

import io
import wave

import av

from app.errors import APIError

MAX_AUDIO_BYTES = 8 * 1024 * 1024
MAX_SECONDS = 30
FORMATS = {
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/ogg": "ogg",
    "audio/opus": "ogg",
    "audio/webm": "matroska,webm",
    "audio/mp4": "mov,mp4,m4a,3gp,3g2,mj2",
    "audio/m4a": "mov,mp4,m4a,3gp,3g2,mj2",
    "audio/flac": "flac",
}


def normalize_audio(data: bytes, content_type: str) -> bytes:
    if len(data) > MAX_AUDIO_BYTES:
        raise APIError(413, "AUDIO_TOO_LARGE", "Audio must be at most 8 MiB")
    mime = content_type.split(";", 1)[0].strip().lower()
    if mime not in FORMATS or not data:
        raise APIError(415, "AUDIO_UNSUPPORTED", "Unsupported audio; use text or manual input")
    try:
        # Select only an allowlisted demuxer; do not autodetect playlists or external references.
        with av.open(
            io.BytesIO(data),
            format=FORMATS[mime].split(",")[0],
            options={"protocol_whitelist": "pipe"},
        ) as container:
            if (
                not set(container.format.name.split(",")) & set(FORMATS[mime].split(","))
                or len(container.streams) != 1
            ):
                raise ValueError("Container mismatch")
            stream = container.streams[0]
            if stream.type != "audio":
                raise ValueError("Audio only")
            resampler = av.AudioResampler(format="s16", layout="mono", rate=16000)
            samples = 0.0
            first_time = None
            pcm = bytearray()
            for index, frame in enumerate(container.decode(stream)):
                if (
                    not 8000 <= frame.sample_rate <= 192000
                    or len(frame.layout.channels) > 2
                    or index > 10000
                ):
                    raise ValueError("Unsupported audio parameters")
                samples += frame.samples / frame.sample_rate
                if frame.time is not None:
                    first_time = frame.time if first_time is None else first_time
                    span = frame.time - first_time + frame.samples / frame.sample_rate
                else:
                    span = samples
                if max(samples, span) > MAX_SECONDS + 0.001:
                    raise APIError(422, "AUDIO_TOO_LONG", "Audio must be at most 30 seconds")
                for converted in resampler.resample(frame):
                    pcm.extend(bytes(converted.planes[0])[: converted.samples * 2])
            for converted in resampler.resample(None):
                pcm.extend(bytes(converted.planes[0])[: converted.samples * 2])
            if not pcm:
                raise ValueError("Empty audio")
    except APIError:
        raise
    except (av.FFmpegError, ValueError, EOFError, OverflowError):
        raise APIError(
            415, "AUDIO_UNSUPPORTED", "Invalid audio; use text or manual input"
        ) from None
    output = io.BytesIO()
    with wave.open(output, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(16000)
        wav.writeframes(pcm)
    return output.getvalue()
