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
