"""Live AI and ledger smoke using an isolated, automatically removed test database."""
import argparse
from datetime import datetime
from pathlib import Path
from tempfile import TemporaryDirectory
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient

from .app import create_app


def checked(response, status=200):
    if response.status_code != status:
        code=response.json().get('error',{}).get('code','UNKNOWN')
        raise RuntimeError(f'HTTP {response.status_code}: {code}')
    return response.json()


def main(audio_path=None):
    with TemporaryDirectory(prefix='qadam-ai-check-') as folder:
        with TestClient(create_app(Path(folder)/'test.sqlite3')) as client:
            user=checked(client.post('/api/v1/auth/register',json={
                'email':'ai-smoke@example.test','password':'Synthetic-only-2026','business_name':'AI check',
            }),201)
            base='/api/v1/businesses/'+user['business_id']
            customer=checked(client.post(base+'/customers',json={'display_name':'Асқар'}),201)
            if audio_path:
                response=client.post(base+'/drafts',files={'audio':('sample.wav',Path(audio_path).read_bytes(),'audio/wav')})
            else:
                response=client.post(base+'/drafts',data={'text':'Асқарға 3000 теңгеге тауар саттым, 1000 теңгесін төледі'})
            draft=checked(response)
            assert (draft['kind'],draft['total_minor'],draft['received_minor'])==('sale',300000,100000)
            assert checked(client.get(base+'/operations'))['items']==[]
            body={'kind':'sale','draft_id':draft['id'],'customer_id':customer['id'],'total_minor':300000,'received_minor':100000}
            sale=checked(client.post(base+'/operations',json=body,headers={'Idempotency-Key':'synthetic-sale'}))
            replay=checked(client.post(base+'/operations',json=body,headers={'Idempotency-Key':'synthetic-sale'}))
            assert sale==replay
            checked(client.post(base+'/operations',json={
                'kind':'repayment','sale_id':sale['operation']['id'],'amount_minor':50000,
            },headers={'Idempotency-Key':'synthetic-payment'}))
            summary=checked(client.get(base+'/summary',params={'date':datetime.now(ZoneInfo('Asia/Almaty')).date().isoformat()}))
            assert (summary['sales_minor'],summary['receipts_minor'],summary['outstanding_minor'])==(300000,150000,150000)
            assert len(checked(client.get(base+'/operations'))['items'])==2
            print('OK: live AI -> draft -> confirmed sale -> idempotent replay -> repayment -> correct summary.')
    print('Temporary test database removed. Your accounts and ledger were not changed.')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--audio',help='Synthetic WAV: sale 3000 KZT, received 1000 KZT.')
    args=parser.parse_args()
    try:
        main(args.audio)
    except Exception as exc:
        print(f'FAIL: {exc}' if isinstance(exc,RuntimeError) else f'FAIL: {type(exc).__name__}')
        raise SystemExit(1)
