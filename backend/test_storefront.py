import json
import struct
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from backend.app import create_app
from backend.db import transaction


@pytest.fixture
def server(tmp_path):
    app = create_app(tmp_path/'store.sqlite3', ai_key='')
    with TestClient(app) as client:
        yield client, app


def register(client, name='seller'):
    response = client.post('/api/v1/auth/register', json={'email':name+'@example.test','password':'Strong-pass-2026','business_name':'Test shop'})
    assert response.status_code == 201
    return response.json()


def body():
    return {'client_request_id':str(uuid4()),'visitor_name':'Test visitor','contact':'visitor@example.test','message':'Is this item available?'}


def publish(client, user):
    venue = client.get('/api/v1/venues').json()['items'][0]
    data = {'venue_id':venue['id'],'name':'My public shop','category':'food','description':'A teaching shop for API acceptance.','published':True}
    response = client.post(f"/api/v1/businesses/{user['business_id']}/storefront",json=data)
    assert response.status_code == 200, response.text
    return response.json(), data


def test_public_projection_and_filters(server):
    client, _ = server
    venues = client.get('/api/v1/venues').json()['items']
    assert [v['slug'] for v in venues] == ['mart','kaikarmet','auyl-bereke']
    shops = client.get('/api/v1/businesses').json()['items']
    assert len(shops) == 9
    for shop in shops:
        assert set(shop) == {'id','venue_id','slug','name','category','description','is_demo','catalog_items','accepts_inquiries','inquiry_mode'}
        assert shop['is_demo'] and shop['inquiry_mode'] == 'training'
        assert client.get('/api/v1/businesses/'+shop['slug']).json() == shop
        assert all(i['available'] is None for i in shop['catalog_items'])
    items = client.get('/api/v1/businesses', params={'venue_id':venues[0]['id'],'category':'food','q':'mArT'}).json()['items']
    assert len(items) == 1 and items[0]['slug'] == 'mart-demo-food'
    assert not client.get('/api/v1/businesses?q=notfound').json()['items']
    assert client.get('/api/v1/businesses?limit=2').json()['next_cursor'] == 2
    assert client.get('/api/v1/businesses/not-a-shop').status_code == 404


def test_submission_replay_conflict_and_no_public_contact(server):
    client, app = server
    shop = client.get('/api/v1/businesses').json()['items'][0]
    route = f"/api/v1/businesses/{shop['id']}/inquiries"
    payload = body()
    first = client.post(route,json=payload)
    assert first.status_code == 201
    assert set(first.json()) == {'id','number','status'}
    assert client.post(route,json=payload).json() == first.json()
    assert client.post(route,json={**payload,'message':'Changed'}).status_code == 409
    assert client.get(route).status_code == 401
    assert 'visitor@example.test' not in client.get('/api/v1/businesses/'+shop['slug']).text
    with transaction(app.state.db_path) as db:
        assert db.execute('SELECT COUNT(*) FROM inquiries').fetchone()[0] == 1
        assert db.execute('SELECT contact FROM inquiries').fetchone()[0] == payload['contact']


@pytest.mark.parametrize('field,value', [('visitor_name',' '),('visitor_name','x'*101),('message',''),('message','x'*2001),('contact','x'*201),('contact','not a contact'),('contact','123'),('contact','x@y'),('client_request_id','bad')])
def test_inquiry_validation(server, field, value):
    client, _ = server
    shop = client.get('/api/v1/businesses').json()['items'][0]
    response = client.post(f"/api/v1/businesses/{shop['id']}/inquiries",json={**body(),field:value})
    assert response.status_code == 422


def test_owner_inbox_persists_and_other_account_cannot_read_or_update(server):
    client, app = server
    owner = register(client)
    shop, _ = publish(client, owner)
    base = f"/api/v1/businesses/{owner['business_id']}"
    with TestClient(app) as visitor:
        saved = visitor.post(base+'/inquiries',json=body()).json()
        assert visitor.get(base+'/inquiries').status_code == 401
    assert client.get(base+'/inquiries').json()['items'][0]['id'] == saved['id']
    assert client.get(base+'/summary?date='+__import__('datetime').date.today().isoformat()).json()['new_inquiries_count'] == 1
    assert client.patch(base+'/inquiries/'+saved['id'],json={'status':'in_progress'}).status_code == 200
    assert client.get(base+'/summary?date='+__import__('datetime').date.today().isoformat()).json()['new_inquiries_count'] == 0
    client.post('/api/v1/auth/logout')
    other = register(client,'other')
    assert client.get(base+'/inquiries').status_code == 404
    assert client.patch(base+'/inquiries/'+saved['id'],json={'status':'closed'}).status_code == 404
    assert client.patch(f"/api/v1/businesses/{other['business_id']}/inquiries/"+saved['id'],json={'status':'closed'}).status_code == 404
    assert client.get(f"/api/v1/businesses/{other['business_id']}/inquiries").json()['items'] == []
    # Recreate the server against the same file, then log in again.
    with TestClient(create_app(app.state.db_path, ai_key='')) as restarted:
        assert restarted.post('/api/v1/auth/login',json={'email':'seller@example.test','password':'Strong-pass-2026'}).status_code == 200
        items = restarted.get(base+'/inquiries').json()['items']
        assert items[0]['id'] == saved['id'] and items[0]['status'] == 'in_progress'
        assert items[0]['contact'] == 'visitor@example.test'
        assert restarted.get('/api/v1/businesses/'+shop['slug']).status_code == 200


def test_unpublish_hides_shop_and_preserves_existing_inquiry_replay(server):
    client, _ = server
    user = register(client); shop, data = publish(client,user)
    base = f"/api/v1/businesses/{user['business_id']}"
    payload = body(); saved = client.post(base+'/inquiries',json=payload).json()
    assert client.post(base+'/storefront',json={**data,'published':False}).status_code == 200
    assert client.get('/api/v1/businesses/'+shop['slug']).status_code == 404
    assert client.post(base+'/inquiries',json=body()).status_code == 404
    assert client.post(base+'/inquiries',json=payload).json() == saved
    assert len(client.get(base+'/inquiries').json()['items']) == 1


def test_public_inquiry_rate_limit_and_cross_origin(server):
    client, _ = server
    shop = client.get('/api/v1/businesses').json()['items'][0]
    route = f"/api/v1/businesses/{shop['id']}/inquiries"
    assert client.post(route,json=body(),headers={'origin':'https://not-qadam.example'}).status_code == 403
    for _ in range(20):
        assert client.post(route,json=body()).status_code == 201
    assert client.post(route,json=body()).status_code == 429


def test_delivered_assets_and_hotspots_match_api(server):
    client, _ = server
    root = Path(__file__).resolve().parents[1]/'public'
    manifest = json.loads((root/'venue-assets.json').read_text(encoding='utf8'))
    shops = client.get('/api/v1/businesses').json()['items']
    for asset in manifest['venues']:
        raw = (root/asset['model_url'].lstrip('/')).read_bytes()
        assert len(raw) <= 1_500_000
        magic,version,total = struct.unpack_from('<4sII',raw)
        assert magic == b'glTF' and version == 2 and total == len(raw)
        length = struct.unpack_from('<I',raw,12)[0]
        gltf = json.loads(raw[20:20+length]); triangles = 0
        assert not gltf.get('images') and not gltf.get('extensionsRequired')
        assert all('uri' not in b for b in gltf['buffers'])
        for node in gltf['nodes']:
            if 'mesh' in node:
                for primitive in gltf['meshes'][node['mesh']]['primitives']:
                    triangles += gltf['accessors'][primitive.get('indices',primitive['attributes']['POSITION'])]['count']//3
        assert triangles <= 30000
        for hotspot in asset['hotspots']:
            assert any(s['id'] == hotspot['business_id'] and s['slug'] == hotspot['business_slug'] for s in shops)
