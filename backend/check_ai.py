"""Run a real Gemini check with synthetic text; never print credentials."""
import asyncio
import argparse
import os
from pathlib import Path

from dotenv import load_dotenv

from .ai import AIUnavailable, extract, normalize_audio


async def main(audio_path=None):
    load_dotenv(Path(__file__).with_name('.env'))
    try:
        result = await extract(
            os.getenv('AI_API_KEY', ''),
            os.getenv('AI_MODEL', 'gemini-3.5-flash-lite'),
            fallback_model=os.getenv('AI_FALLBACK_MODEL', 'gemini-3.8-flash'),
            text=None if audio_path else 'Асқарға 3000 теңгеге тауар саттым, 1000 теңгесін төледі',
            audio=normalize_audio(Path(audio_path).read_bytes()) if audio_path else None,
        )
        if (result.kind, result.total_minor, result.received_minor) != ('sale', 300000, 100000):
            print('FAIL: AI response did not match the sample transaction. No records were saved.')
            return 1
        print(f'OK: live Gemini, {"audio" if audio_path else "Kazakh text"} -> sale, total 3000 KZT, received 1000 KZT.')
        print('No records were saved.')
        return 0
    except AIUnavailable as exc:
        print(f'{exc.code}: {exc}')
    except asyncio.TimeoutError:
        print('AI_TIMEOUT: Gemini did not respond within 25 seconds.')
    except Exception as exc:
        print(f'AI check failed ({type(exc).__name__}). No records were saved.')
    return 1


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--audio',help='Optional synthetic recording: sale 3000 KZT, received 1000 KZT.')
    args=parser.parse_args()
    raise SystemExit(asyncio.run(main(args.audio)))
