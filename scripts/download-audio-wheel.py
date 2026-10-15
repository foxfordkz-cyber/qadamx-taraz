"""Recover this Windows development dependency from official PyPI with hash verification."""
import concurrent.futures
import hashlib
import json
import time
import sys
import urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'.wheel-cache'
DEST.mkdir(exist_ok=True)
selection=sys.argv[1] if len(sys.argv)>1 else 'av'
packages={'av':('av/16.1.0','av-16.1.0-cp310-cp310-win_amd64.whl'), 'pydantic-core':('pydantic-core/2.50.1','pydantic_core-2.50.1-cp310-cp310-win_amd64.whl'), 'pip':('pip/25.3','pip-25.3-py3-none-any.whl')}
packages['cryptography']=('cryptography/50.0.2','cryptography-50.0.2-cp39-abi3-win_amd64.whl')
packages['google-genai']=('google-genai/2.31.0','google_genai-2.31.0-py3-none-any.whl')
project,NAME=packages[selection]
with urllib.request.urlopen(f'https://pypi.org/pypi/{project}/json',timeout=120) as response:
    package=json.load(response)
item=next(x for x in package['urls'] if x['filename']==NAME)
assert item['url'].startswith('https://files.pythonhosted.org/')
target=DEST/NAME
size=item['size']
count=12
chunk=(size+count-1)//count

def fetch(index):
    start=index*chunk
    end=min(size-1,start+chunk-1)
    part=DEST/(NAME+f'.part{index}')
    if part.exists() and part.stat().st_size==end-start+1:return part
    for attempt in range(4):
        try:
            request=urllib.request.Request(item['url'],headers={'Range':f'bytes={start}-{end}'})
            with urllib.request.urlopen(request,timeout=20) as response:
                if response.status!=206:raise RuntimeError('Server did not honor range request')
                content=response.read(end-start+2)
            if len(content)!=end-start+1:raise RuntimeError('Incomplete range')
            part.write_bytes(content)
            print(f'{selection}: part {index+1}/{count}',flush=True)
            return part
        except Exception:
            if attempt==3:raise
            time.sleep(1)

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    parts=list(pool.map(fetch,range(count)))
sha=hashlib.sha256()
with target.open('wb') as output:
    for part in parts:
        content=part.read_bytes();sha.update(content);output.write(content)
if sha.hexdigest()!=item['digests']['sha256']:
    raise RuntimeError('Wheel checksum mismatch; do not install')
print(f'Verified SHA256: {NAME}',flush=True)
