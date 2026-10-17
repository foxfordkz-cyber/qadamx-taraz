"""Read-only public acceptance. No auth, mutations, audio, or customer data."""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

BASE = 'https://qadamx-taraz.onrender.com/api/v1'
ASSETS = Path(__file__).resolve().parents[1] / 'assets' / 'venues'


def get(url):
    with urlopen(Request(url, headers={'Accept': 'application/json'}), timeout=60) as r:
        assert r.status == 200
        return json.load(r)


def pages(path, params=None):
    values, seen = [], set()
    query = dict(params or {}, limit=100)
    for _ in range(100):
        result = get(BASE + path + '?' + urlencode(query))
        values.extend(result['items'])
        cursor = result['next_cursor']
        if cursor is None:
            return values
        assert cursor not in seen
        seen.add(cursor)
        query['cursor'] = cursor
    raise AssertionError('Pagination exceeded limit')


def main():
    report = {'checked_at_utc': datetime.now(timezone.utc).isoformat(), 'api_url': BASE,
              'method': 'anonymous GET only', 'physical_android': 'not performed'}
    assert get(BASE + '/health')['status'] == 'ok'
    report['health'] = 200
    report['openapi_version'] = get(BASE.replace('/api/v1', '/openapi.json'))['info']['version']
    provenance = json.loads((ASSETS / 'asset-provenance.json').read_text(encoding='utf-8'))
    for name, expected in provenance['files'].items():
        assert hashlib.sha256((ASSETS / name).read_bytes()).hexdigest() == expected
    report['unchanged_asset_hashes'] = len(provenance['files'])
    manifest = json.loads((ASSETS / 'venue-assets.json').read_text(encoding='utf-8'))
    venues = pages('/venues')
    results = []
    for asset in manifest['venues']:
        venue = next(v for v in venues if v['slug'] == asset['slug'])
        shops = pages('/businesses', {'venue_id': venue['id']})
        for marker in asset['hotspots']:
            shop = next(s for s in shops if s['id'] == marker['business_id'] and s['slug'] == marker['business_slug'])
            detail = get(BASE + '/businesses/' + shop['slug'])
            assert detail['id'] == marker['business_id'] and detail['venue_id'] == venue['id']
            assert all(c['business_id'] == detail['id'] for c in detail['catalog'])
        # Exercise actual filters, not just route availability.
        sample = shops[0]
        filtered = pages('/businesses', {'venue_id': venue['id'], 'q': sample['name'], 'category': sample['category']})
        assert any(s['id'] == sample['id'] for s in filtered)
        assert all(s['category'] == sample['category'] and s['venue_id'] == venue['id'] for s in filtered)
        results.append({'venue': asset['slug'], 'matched_hotspots': len(asset['hotspots']), 'filter': 'pass'})
    report['venues'] = results
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Print only type, never HTTP bodies or arbitrary exception details.
        raise SystemExit('READ_ONLY_CHECK_FAILED: ' + type(error).__name__) from None
