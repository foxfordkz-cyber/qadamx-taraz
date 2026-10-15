import io
import wave

import av
import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from test_ai import StubProvider

from app.errors import APIError
from app.models import Draft, Operation
from app.services.audio import MAX_AUDIO_BYTES, normalize_audio


def wav_bytes(seconds=1):
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(16000)
        wav.writeframes(b"\0\0" * (16000 * seconds))
    return buffer.getvalue()


def encode(container_format, codec):
    output = io.BytesIO()
    with av.open(output, "w", format=container_format) as dest:
        stream = dest.add_stream(codec, rate=48000)
        stream.layout = "mono"
        with av.open(io.BytesIO(wav_bytes())) as source:
            for frame in source.decode(audio=0):
                for packet in stream.encode(frame):
                    dest.mux(packet)
            for packet in stream.encode(None):
                dest.mux(packet)
    return output.getvalue()


@pytest.mark.parametrize(
    "format,codec,mime",
    [
        ("webm", "libopus", "audio/webm;codecs=opus"),
        ("ogg", "libopus", "audio/ogg"),
        ("mp3", "libmp3lame", "audio/mpeg"),
        ("mp4", "aac", "audio/mp4"),
        ("flac", "flac", "audio/flac"),
    ],
)
def test_decodes_actual_containers_to_bounded_wav(format, codec, mime):
    audio = normalize_audio(encode(format, codec), mime)
    with wave.open(io.BytesIO(audio), "rb") as wav:
        assert wav.getnchannels() == 1 and wav.getframerate() == 16000
        assert 0.9 < wav.getnframes() / wav.getframerate() < 1.2


@pytest.mark.parametrize(
    "data,mime,status,code",
    [
        (b"invalid", "audio/wav", 415, "AUDIO_UNSUPPORTED"),
        (wav_bytes(), "audio/webm", 415, "AUDIO_UNSUPPORTED"),
        (wav_bytes(), "text/plain", 415, "AUDIO_UNSUPPORTED"),
        (b"", "audio/wav", 415, "AUDIO_UNSUPPORTED"),
        (b"x" * (MAX_AUDIO_BYTES + 1), "audio/wav", 413, "AUDIO_TOO_LARGE"),
        (wav_bytes(31), "audio/wav", 422, "AUDIO_TOO_LONG"),
    ],
    ids=["corrupt", "mime-mismatch", "unsupported", "empty", "oversize", "too-long"],
)
def test_rejects_invalid_audio(data, mime, status, code):
    with pytest.raises(APIError) as error:
        normalize_audio(data, mime)
    assert (error.value.status, error.value.code) == (status, code)


def test_playlist_disguised_as_audio_is_not_followed():
    with pytest.raises(APIError) as error:
        normalize_audio(b"#EXTM3U\n#EXTINF:1\nhttps://example.test/private.mp3\n", "audio/mpeg")
    assert error.value.code == "AUDIO_UNSUPPORTED"


@pytest.mark.postgres
def test_audio_route_uses_same_draft_pipeline_and_never_writes_money(ledger_api):
    api = ledger_api
    stub = api["app"].state.ai = StubProvider()
    response = api["client"].post(
        f"/api/v1/businesses/{api['business']}/drafts",
        files={"audio": ("speech.webm", encode("webm", "libopus"), "audio/webm")},
        headers=api["a"],
    )
    assert response.status_code == 200, response.text
    assert response.json()["received_minor"] == 100000
    assert stub.calls[0]["text"] is None
    assert stub.calls[0]["audio"][:4] == b"RIFF"
    with Session(api["engine"]) as session:
        assert session.scalar(select(func.count()).select_from(Draft)) == 1
        assert session.scalar(select(func.count()).select_from(Operation)) == 0


@pytest.mark.postgres
@pytest.mark.parametrize(
    "files,status",
    [
        ({"text": (None, " ")}, 422),
        ({"text": (None, "x" * 4001)}, 422),
        ({"text": (None, "a"), "locale": (None, "en")}, 422),
        ({"text": (None, "a"), "unknown": (None, "a")}, 422),
        ({"text": (None, "a"), "audio": ("x.wav", wav_bytes(), "audio/wav")}, 422),
        ({"locale": (None, "ru")}, 422),
        ({"audio": (None, "https://example.test/audio.wav")}, 415),
        ({"audio": ("x.wav", b"not audio", "audio/wav")}, 415),
        ({"audio": ("x.wav", wav_bytes(31), "audio/wav")}, 422),
        ({"audio": ("x.wav", b"x" * (MAX_AUDIO_BYTES + 1), "audio/wav")}, 413),
        ({"audio": ("x.wav", b"x" * (MAX_AUDIO_BYTES + 20000), "audio/wav")}, 413),
    ],
)
def test_input_limits_before_provider_call(ledger_api, files, status):
    api = ledger_api
    stub = api["app"].state.ai = StubProvider()
    response = api["client"].post(
        f"/api/v1/businesses/{api['business']}/drafts", files=files, headers=api["a"]
    )
    assert response.status_code == status, response.text
    assert stub.calls == []


@pytest.mark.postgres
def test_auth_before_upload_and_duplicate_fields(ledger_api):
    api = ledger_api
    stub = api["app"].state.ai = StubProvider()
    url = f"/api/v1/businesses/{api['business']}/drafts"
    assert api["client"].post(url, content=b"invalid form").status_code == 401
    assert api["client"].post(url, json={"text": "a"}, headers=api["a"]).status_code == 415
    result = api["client"].post(
        url, files=[("text", (None, "a")), ("text", (None, "b"))], headers=api["a"]
    )
    assert result.status_code == 422
    assert stub.calls == []
