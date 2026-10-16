"""SDK transport tests use synthetic provider responses, never an external API key."""
import asyncio
import json

import httpx
import pytest
from google import genai
from google.genai import types

from backend import ai


def test_real_sdk_serializes_text_and_schema_without_network(monkeypatch):
    calls=[]
    payload={'transcript':'Асқарға 3000 теңгеге саттым, 1000 төледі','kind':'sale','customer_query':'Асқар','description':'Тауар','total_minor':300000,'received_minor':100000,'amount_minor':None,'missing_fields':[],'questions':[]}
    async def transport(request):
        calls.append(request)
        return httpx.Response(200,json={'candidates':[{'content':{'role':'model','parts':[{'text':json.dumps(payload)}]},'finishReason':'STOP'}]})
    factory=genai.Client
    def test_client(**kwargs):
        return factory(api_key='test-key-not-real',http_options=types.HttpOptions(
            base_url='https://gemini.test',api_version='v1beta',
            async_client_args={'transport':httpx.MockTransport(transport)},
        ))
    monkeypatch.setattr(ai.genai,'Client',test_client)
    result=asyncio.run(ai.extract('test-key-not-real','gemini-3.8-flash',text='Асқарға 3000 теңгеге саттым, 1000 төледі'))
    assert result.total_minor==300000 and result.received_minor==100000
    assert len(calls)==1
    body=json.loads(calls[0].content)
    assert 'systemInstruction' in body
    assert 'generationConfig' in body
    assert 'responseSchema' not in body['generationConfig']
    assert body['generationConfig']['responseJsonSchema']['additionalProperties'] is False
    assert body['contents'][0]['parts'][0]['text'].startswith('Асқарға')


def test_missing_key_does_not_create_provider_client(monkeypatch):
    def forbidden(**kwargs):
        pytest.fail('Provider must not be called without a key')
    monkeypatch.setattr(ai.genai,'Client',forbidden)
    with pytest.raises(ai.AIUnavailable):
        asyncio.run(ai.extract('','gemini-3.8-flash',text='test'))


def install_transport(monkeypatch, transport):
    factory = genai.Client
    def client(**kwargs):
        return factory(api_key='test-secret', http_options=types.HttpOptions(
            base_url='https://gemini.test', api_version='v1beta',
            retry_options=types.HttpRetryOptions(attempts=1),
            async_client_args={'transport': httpx.MockTransport(transport)},
        ))
    monkeypatch.setattr(ai.genai, 'Client', client)


def test_overloaded_model_falls_back_with_same_audio(monkeypatch):
    calls = []
    async def transport(request):
        calls.append(request)
        if len(calls) == 1:
            return httpx.Response(503, json={'error': {'code': 503, 'status': 'UNAVAILABLE', 'message': 'busy'}})
        return httpx.Response(200, json={'candidates': [{'content': {'parts': [{'text': json.dumps({
            'transcript': 'test', 'kind': 'sale', 'total_minor': 300000, 'received_minor': 100000,
        })}]}, 'finishReason': 'STOP'}]})
    install_transport(monkeypatch, transport)
    result = asyncio.run(ai.extract('test-secret', 'primary', audio=b'RIFF-test', fallback_model='backup'))
    assert result.total_minor == 300000
    assert len(calls) == 2
    assert '/primary:' in str(calls[0].url) and '/backup:' in str(calls[1].url)
    assert json.loads(calls[0].content)['contents'] == json.loads(calls[1].content)['contents']


@pytest.mark.parametrize('status,code', [(403, 'AI_AUTH_ERROR'), (429, 'AI_QUOTA_EXCEEDED')])
def test_auth_and_quota_do_not_retry_or_leak_provider_text(monkeypatch, status, code):
    calls = []
    async def transport(request):
        calls.append(request)
        return httpx.Response(status, json={'error': {'code': status, 'message': 'test-secret private details'}})
    install_transport(monkeypatch, transport)
    with pytest.raises(ai.AIUnavailable) as error:
        asyncio.run(ai.extract('test-secret', 'primary', text='test', fallback_model='backup'))
    assert error.value.code == code
    assert 'test-secret' not in str(error.value)
    assert len(calls) == 1


def test_network_error_is_actionable(monkeypatch):
    async def transport(request):
        raise httpx.ConnectError('private network details', request=request)
    install_transport(monkeypatch, transport)
    with pytest.raises(ai.AIUnavailable) as error:
        asyncio.run(ai.extract('test-secret', 'primary', text='test'))
    assert error.value.code == 'AI_CONNECTION_ERROR'
    assert 'private network' not in str(error.value)


def provider_response(payload=None, finish='STOP'):
    return httpx.Response(200, json={'candidates': [{'content': {'parts': [{'text': payload or json.dumps({
        'transcript': 'invented transcript', 'kind': 'sale', 'total_minor': 300000, 'received_minor': 100000,
    })}]}, 'finishReason': finish}]})


@pytest.mark.parametrize('failure', ['invalid_json', 'truncated', 'timeout', 'network', 'busy'])
def test_transient_failure_recovers_with_authoritative_text(monkeypatch, failure):
    calls=[]
    async def transport(request):
        calls.append(request)
        if len(calls)==1:
            if failure=='invalid_json': return provider_response('{bad json')
            if failure=='truncated': return provider_response(finish='MAX_TOKENS')
            if failure=='timeout': raise httpx.ReadTimeout('timed out', request=request)
            if failure=='network': raise httpx.ConnectError('offline', request=request)
            return httpx.Response(503,json={'error':{'code':503,'message':'busy'}})
        return provider_response()
    install_transport(monkeypatch,transport)
    result=asyncio.run(ai.extract('key','primary',text='original text',fallback_model='backup'))
    assert result.transcript=='original text'
    assert result.received_minor==100000
    assert len(calls)==2


def test_invalid_responses_stop_after_one_reparse(monkeypatch):
    calls=[]
    async def transport(request):
        calls.append(request)
        return provider_response(finish='MAX_TOKENS')
    install_transport(monkeypatch,transport)
    with pytest.raises(ai.AIUnavailable) as error:
        asyncio.run(ai.extract('key','primary',text='test',fallback_model='backup'))
    assert error.value.code=='AI_INVALID_RESPONSE'
    assert len(calls)==2


def test_both_busy_models_get_only_one_final_attempt(monkeypatch):
    calls=[]
    async def transport(request):
        calls.append(request)
        return httpx.Response(503,json={'error':{'code':503,'message':'private'}})
    install_transport(monkeypatch,transport)
    with pytest.raises(ai.AIUnavailable):
        asyncio.run(ai.extract('key','primary',text='test',fallback_model='backup'))
    assert len(calls)==3


def test_conflicting_ai_payment_requires_clarification(monkeypatch):
    async def transport(request):
        return provider_response(json.dumps({'kind':'sale','transcript':'test','total_minor':100,'received_minor':200}))
    install_transport(monkeypatch,transport)
    result=asyncio.run(ai.extract('key','primary',text='test'))
    assert result.received_minor is None
    assert 'received_minor' in result.missing_fields
