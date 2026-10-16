import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:qadam_mobile/data/livestock_api.dart';

const listingId = 'f0973730-962f-4a10-bfd9-f3edc03f62e3';
const photoId = 'bd887ad4-2e24-46da-a65d-6415aca04890';
// Copied unchanged from packages/contracts/examples.json at c447a594.
final contractFixtures = Map<String, dynamic>.from(
  jsonDecode(
        File('test/data/livestock_fixtures.json').readAsStringSync().trim(),
      )
      as Map,
);

Map<String, dynamic> fixture(String name) => Map<String, dynamic>.from(
  jsonDecode(jsonEncode(contractFixtures[name])) as Map,
);

class MemoryPendingStore implements PendingStore {
  final records = <String, PendingIntent>{};
  final photos = <String, Uint8List>{};
  bool failReceiptWrite = false;
  Future<void> Function()? beforeRead;

  @override
  Future<PendingIntent?> read(String accountId) async {
    await beforeRead?.call();
    return records[accountId];
  }

  @override
  Future<void> write(String accountId, PendingIntent intent) async {
    if (failReceiptWrite && intent.completedResponse != null) {
      throw const ApiFailure('LOCAL_STORAGE_FAILED', uncertain: true);
    }
    records[accountId] = intent;
  }

  @override
  Future<void> delete(String accountId) async => records.remove(accountId);

  @override
  Future<String> snapshotPhoto(
    String accountId,
    String key,
    String path,
  ) async {
    photos[key] = await File(path).readAsBytes();
    return 'private/$key';
  }

  @override
  Future<Uint8List> readPhoto(PendingIntent intent) async =>
      photos[intent.key]!;
}

Matcher failure(String code, {bool? uncertain}) => isA<ApiFailure>()
    .having((error) => error.code, 'code', code)
    .having((error) => error.uncertain, 'uncertain', uncertain ?? anything);

http.Response jsonResponse(Object? value) => http.Response.bytes(
  utf8.encode(jsonEncode(value)),
  200,
  headers: {'content-type': 'application/json; charset=utf-8'},
);

http.Response success([String id = listingId]) =>
    jsonResponse({...fixture('OwnerListing'), 'id': id});

void main() {
  late MemoryPendingStore store;
  late String? account;
  late LivestockApi api;

  LivestockApi create(
    Future<http.Response> Function(http.Request) handler, {
    String baseUrl = 'https://api.example.test/api/v1',
    Future<String?> Function()? token,
  }) => LivestockApi(
    baseUrl: Uri.parse(baseUrl),
    accountId: () => account,
    accessToken: token ?? () async => 'sdk-access-token',
    store: store,
    client: MockClient(handler),
  );

  setUp(() {
    store = MemoryPendingStore();
    account = 'account-a';
  });

  test('public feed is anonymous and filters are safely encoded', () async {
    api = create((request) async {
      expect(request.url.path, '/api/v1/livestock/listings');
      expect(request.url.queryParameters, {
        'locality': 'Тараз',
        'species': 'cattle',
      });
      expect(request.headers.containsKey('authorization'), isFalse);
      return http.Response('{"items":[],"next_cursor":null}', 200);
    });
    expect(
      (await api.get(
        '/livestock/listings',
        query: {'locality': 'Тараз', 'species': 'cattle'},
      ))['items'],
      isEmpty,
    );
  });

  test('public photo URL adds origin once and never a bearer', () async {
    api = create((request) async {
      expect(
        request.url.toString(),
        'https://api.example.test/api/v1/livestock/listings/$listingId/photos/$photoId',
      );
      expect(request.headers.containsKey('authorization'), isFalse);
      return http.Response.bytes(
        [255, 216, 255],
        200,
        headers: {'content-type': 'image/jpeg'},
      );
    });
    expect(
      await api.photoBytes(
        '/api/v1/livestock/listings/$listingId/photos/$photoId',
      ),
      [255, 216, 255],
    );
  });

  test('own private photo uses the shared SDK bearer', () async {
    api = create((request) async {
      expect(request.url.path, '/api/v1/livestock/me/photos/$photoId');
      expect(request.headers['authorization'], 'Bearer sdk-access-token');
      return http.Response.bytes(
        [255, 216],
        200,
        headers: {'content-type': 'image/jpeg'},
      );
    });
    await api.photoBytes('/livestock/me/photos/$photoId', authenticated: true);
  });

  test(
    'rejects foreign URLs and traversal before acquiring credentials',
    () async {
      var tokenReads = 0;
      var requests = 0;
      api = create(
        (_) async {
          requests++;
          return success();
        },
        token: () async {
          tokenReads++;
          return 'sdk-token';
        },
      );
      for (final path in [
        'https://evil.example/livestock/me/listings',
        '//evil.example/livestock/me/listings',
        '/livestock/../me',
        '/livestock/%2e%2e/me',
        '/livestock/me/listings?token=secret',
        '/other-route',
      ]) {
        await expectLater(
          api.get(path, authenticated: true),
          throwsA(failure('INVALID_API_PATH')),
        );
      }
      expect(tokenReads, 0);
      expect(requests, 0);
    },
  );

  test('network retry preserves original URL, integer body and key', () async {
    final requests = <http.Request>[];
    api = create((request) async {
      requests.add(request);
      if (requests.length == 1) throw http.ClientException('private failure');
      return success();
    });
    final body = <String, dynamic>{
      'price_per_head_minor': 10000000000,
      'photo_ids': <String>[photoId],
    };
    final first = api.mutate('POST', '/livestock/listings', body);
    body['price_per_head_minor'] = 1;
    (body['photo_ids'] as List<String>).clear();
    await expectLater(
      first,
      throwsA(failure('NETWORK_UNAVAILABLE', uncertain: true)),
    );
    final pending = await api.loadPending();
    expect(pending!.body['price_per_head_minor'], 10000000000);
    expect(pending.body['photo_ids'], [photoId]);
    final result = await api.retryPending();
    expect(result['id'], listingId);
    expect(requests[0].url, requests[1].url);
    expect(requests[0].bodyBytes, requests[1].bodyBytes);
    expect(
      requests[0].headers['idempotency-key'],
      requests[1].headers['idempotency-key'],
    );
    expect(jsonDecode(requests[1].body)['price_per_head_minor'], isA<int>());
    expect((await api.loadPending())!.completedResponse!['id'], listingId);
    await api.acknowledgePending(key: pending.key);
    expect(await api.loadPending(), isNull);
  });

  test('unknown request blocks new independent mutations', () async {
    api = create(
      (_) async =>
          http.Response('{"error":{"code":"DATABASE_UNAVAILABLE"}}', 503),
    );
    await expectLater(
      api.mutate('POST', '/livestock/listings', {'a': 1}),
      throwsA(failure('DATABASE_UNAVAILABLE', uncertain: true)),
    );
    final first = (await api.loadPending())!.key;
    await expectLater(
      api.mutate('POST', '/livestock/listings', {'a': 2}),
      throwsA(failure('PENDING_OPERATION', uncertain: true)),
    );
    expect((await api.loadPending())!.key, first);
  });

  test(
    'receipt survives process restart and does not resend before acknowledgement',
    () async {
      var requests = 0;
      api = create((_) async {
        requests++;
        return success();
      });
      await api.mutate('POST', '/livestock/listings', {'quantity': 1});
      api = create((_) async {
        requests++;
        return success();
      });
      await expectLater(
        api.mutate('POST', '/livestock/listings', {'quantity': 2}),
        throwsA(failure('PENDING_RECEIPT')),
      );
      expect((await api.retryPending())['id'], listingId);
      expect(requests, 1);
      await api.acknowledgePending();
      await api.mutate('POST', '/livestock/listings', {'quantity': 2});
      expect(requests, 2);
    },
  );

  test(
    'new explicit action receives a new UUID after acknowledged success',
    () async {
      final keys = <String>[];
      api = create((request) async {
        keys.add(request.headers['idempotency-key']!);
        return success();
      });
      await api.mutate('POST', '/livestock/listings/$listingId/actions', {
        'action': 'confirm_today',
      });
      await api.acknowledgePending();
      await api.mutate('POST', '/livestock/listings/$listingId/actions', {
        'action': 'confirm_today',
      });
      expect(keys[0], isNot(keys[1]));
    },
  );

  test(
    'receipt storage failure is uncertain and retries original key',
    () async {
      final keys = <String>[];
      store.failReceiptWrite = true;
      api = create((request) async {
        keys.add(request.headers['idempotency-key']!);
        return success();
      });
      await expectLater(
        api.mutate('POST', '/livestock/listings', {}),
        throwsA(failure('LOCAL_STORAGE_FAILED', uncertain: true)),
      );
      expect((await api.loadPending())!.completedResponse, isNull);
      store.failReceiptWrite = false;
      await api.retryPending();
      expect(keys[0], keys[1]);
    },
  );

  test('401 retains intent for SDK session recovery', () async {
    api = create(
      (_) async => http.Response('{"error":{"code":"AUTH_REQUIRED"}}', 401),
    );
    await expectLater(
      api.mutate('POST', '/livestock/listings', {}),
      throwsA(failure('AUTH_REQUIRED', uncertain: true)),
    );
    expect(await api.loadPending(), isNotNull);
  });

  test(
    'SDK exceptions are safe codes and retain pending without token logs',
    () async {
      api = create(
        (_) async => success(),
        token: () async {
          throw Exception('sensitive-sdk-token');
        },
      );
      await expectLater(
        api.mutate('POST', '/livestock/listings', {}),
        throwsA(failure('AUTH_UNAVAILABLE', uncertain: true)),
      );
      expect(await api.loadPending(), isNotNull);
      expect(
        const ApiFailure('AUTH_UNAVAILABLE').toString(),
        isNot(contains('token')),
      );
    },
  );

  test(
    'idempotency conflict preserves original intent for investigation',
    () async {
      api = create(
        (_) async =>
            http.Response('{"error":{"code":"IDEMPOTENCY_CONFLICT"}}', 409),
      );
      await expectLater(
        api.mutate('POST', '/livestock/listings', {}),
        throwsA(failure('IDEMPOTENCY_CONFLICT', uncertain: true)),
      );
      expect(await api.loadPending(), isNotNull);
    },
  );

  test(
    'definitive validation error releases intent without fabricating success',
    () async {
      api = create(
        (_) async => http.Response(
          '{"error":{"code":"INVALID_AMOUNT","message":"private details"}}',
          422,
        ),
      );
      await expectLater(
        api.mutate('POST', '/livestock/listings', {}),
        throwsA(failure('INVALID_AMOUNT', uncertain: false)),
      );
      expect(await api.loadPending(), isNull);
    },
  );

  test(
    'malformed 2xx and redirect both retain uncertain original operation',
    () async {
      for (final response in [
        http.Response('broken json', 200),
        http.Response('{"unexpected":true}', 200),
        http.Response('{"id":"$listingId"}', 200),
        http.Response('', 307, headers: {'location': 'https://evil.example/'}),
      ]) {
        store = MemoryPendingStore();
        api = create((_) async => response);
        await expectLater(
          api.mutate('POST', '/livestock/listings', {}),
          throwsA(
            isA<ApiFailure>().having((e) => e.uncertain, 'uncertain', isTrue),
          ),
        );
        expect(await api.loadPending(), isNotNull);
      }
    },
  );

  test('published contract fixtures validate as live-shaped data', () async {
    final responses = {
      '/api/v1/livestock/listings': {
        'items': [fixture('PublicListing')],
        'next_cursor': null,
      },
      '/api/v1/livestock/me/listings': {
        'items': [fixture('OwnerListing')],
        'next_cursor': null,
      },
      '/api/v1/livestock/listings/$listingId': fixture('PublicListing'),
      '/api/v1/livestock/prices': fixture('PriceStats'),
    };
    api = create((request) async => jsonResponse(responses[request.url.path]));
    for (final route in responses.keys) {
      expect(
        await api.get(route, authenticated: route.contains('/me/')),
        isNotEmpty,
      );
    }
  });

  test(
    'feed float money, missing fields and invalid stats fail at the API boundary',
    () async {
      final cases = <(String, Map<String, dynamic>)>[
        (
          '/livestock/listings',
          {
            'items': [
              {...fixture('PublicListing'), 'price_per_head_minor': 35000000.0},
            ],
            'next_cursor': null,
          },
        ),
        (
          '/livestock/listings',
          {
            'items': [fixture('PublicListing')],
          },
        ),
        ('/livestock/listings/$listingId', {'id': listingId}),
        (
          '/livestock/me/listings',
          {
            'items': [fixture('PublicListing')],
            'next_cursor': null,
          },
        ),
        (
          '/livestock/prices',
          {...fixture('PriceStats'), 'median_price_per_head_minor': 100.5},
        ),
        (
          '/livestock/prices',
          {...fixture('PriceStats'), 'status': 'available'},
        ),
      ];
      for (final (path, response) in cases) {
        api = create((_) async => jsonResponse(response));
        await expectLater(api.get(path), throwsA(failure('INVALID_RESPONSE')));
      }
    },
  );

  test('response text lengths follow backend Unicode code points', () async {
    String emoji(int count) => List.filled(count, '🐎').join();
    final listing = {
      ...fixture('PublicListing'),
      'locality': emoji(100),
      'contact': emoji(200),
      'description': emoji(2000),
    };
    api = create((_) async => jsonResponse(listing));
    expect(
      (await api.get('/livestock/listings/$listingId'))['contact'],
      emoji(200),
    );
    for (final (field, limit) in [
      ('locality', 100),
      ('contact', 200),
      ('description', 2000),
    ]) {
      api = create(
        (_) async => jsonResponse({...listing, field: emoji(limit + 1)}),
      );
      await expectLater(
        api.get('/livestock/listings/$listingId'),
        throwsA(failure('INVALID_RESPONSE')),
      );
    }
  });

  test(
    'account B cannot inspect, retry or acknowledge account A intent',
    () async {
      var requests = 0;
      api = create((_) async {
        requests++;
        throw http.ClientException('offline');
      });
      await expectLater(
        api.mutate('POST', '/livestock/listings', {}),
        throwsA(isA<ApiFailure>()),
      );
      account = 'account-b';
      api.notifyAccountChanged();
      expect(await api.loadPending(), isNull);
      await expectLater(
        api.retryPending(),
        throwsA(failure('NO_PENDING_OPERATION')),
      );
      await expectLater(
        api.acknowledgePending(),
        throwsA(failure('RECEIPT_NOT_DELIVERED')),
      );
      expect(store.records['account-a'], isNotNull);
      expect(requests, 1);
    },
  );

  test('A-B-A transition during token await prevents dispatch', () async {
    final token = Completer<String?>();
    var requests = 0;
    api = create((_) async {
      requests++;
      return success();
    }, token: () => token.future);
    final mutation = api.mutate('POST', '/livestock/listings', {});
    final asserted = expectLater(
      mutation,
      throwsA(failure('ACCOUNT_CHANGED', uncertain: true)),
    );
    await Future<void>.delayed(Duration.zero);
    account = 'account-b';
    api.notifyAccountChanged();
    account = 'account-a';
    api.notifyAccountChanged();
    token.complete('old-sdk-token');
    await asserted;
    expect(requests, 0);
    expect(store.records['account-a'], isNotNull);
  });

  test(
    'A-B-A transition while request is in flight fences response and receipt',
    () async {
      final response = Completer<http.Response>();
      final dispatched = Completer<void>();
      api = create((_) {
        dispatched.complete();
        return response.future;
      });
      final mutation = api.mutate('POST', '/livestock/listings', {});
      final asserted = expectLater(
        mutation,
        throwsA(failure('ACCOUNT_CHANGED', uncertain: true)),
      );
      await dispatched.future;
      account = 'account-b';
      api.notifyAccountChanged();
      account = 'account-a';
      api.notifyAccountChanged();
      response.complete(success());
      await asserted;
      expect(store.records['account-a']!.completedResponse, isNull);
    },
  );

  test('private GET response is fenced after logout', () async {
    final response = Completer<http.Response>();
    final dispatched = Completer<void>();
    api = create((_) {
      dispatched.complete();
      return response.future;
    });
    final request = api.get('/livestock/me/listings', authenticated: true);
    final asserted = expectLater(request, throwsA(failure('ACCOUNT_CHANGED')));
    await dispatched.future;
    account = null;
    api.notifyAccountChanged();
    response.complete(http.Response('{"items":[{"contact":"private"}]}', 200));
    await asserted;
  });

  test(
    'cannot replay original intention to a different configured server',
    () async {
      api = create((_) async => throw http.ClientException('offline'));
      await expectLater(
        api.mutate('POST', '/livestock/listings', {}),
        throwsA(isA<ApiFailure>()),
      );
      var requests = 0;
      api = create((_) async {
        requests++;
        return success();
      }, baseUrl: 'https://new-api.example.test/api/v1');
      await expectLater(
        api.retryPending(),
        throwsA(failure('PENDING_ENVIRONMENT_CHANGED')),
      );
      expect(requests, 0);
      expect(
        (await api.loadPending())!.url,
        'https://api.example.test/api/v1/livestock/listings',
      );
    },
  );

  test(
    'upload retry uses immutable file bytes, same key and multipart file field',
    () async {
      final directory = await Directory.systemTemp.createTemp(
        'qadam-photo-test-',
      );
      addTearDown(() => directory.delete(recursive: true));
      final source = File('${directory.path}/camera.jpg');
      await source.writeAsBytes([255, 216, 11, 22, 33, 255, 217]);
      final requests = <http.Request>[];
      api = create((request) async {
        requests.add(request);
        if (requests.length == 1) throw http.ClientException('offline');
        return http.Response(jsonEncode({'id': photoId}), 200);
      });
      await expectLater(
        api.uploadPhoto(source.path),
        throwsA(failure('NETWORK_UNAVAILABLE')),
      );
      final saved = (await api.loadPending())!;
      await source.writeAsBytes([9, 9, 9]);
      final result = await api.retryPending();
      expect(result['id'], photoId);
      expect(
        requests[0].headers['idempotency-key'],
        requests[1].headers['idempotency-key'],
      );
      for (final request in requests) {
        expect(
          request.headers['content-type'],
          startsWith('multipart/form-data; boundary='),
        );
        final body = latin1.decode(request.bodyBytes);
        expect(body, contains('name="file"'));
        expect(body, contains(latin1.decode([255, 216, 11, 22, 33, 255, 217])));
        expect(body, isNot(contains(source.path)));
      }
      expect(saved.filePath, isNot(source.path));
      expect(saved.kind, 'upload');
    },
  );

  test(
    'simultaneous submit cannot create another key or HTTP request',
    () async {
      final response = Completer<http.Response>();
      final dispatched = Completer<void>();
      var requests = 0;
      api = create((_) {
        requests++;
        dispatched.complete();
        return response.future;
      });
      final first = api.mutate('POST', '/livestock/listings', {});
      await dispatched.future;
      await expectLater(
        api.mutate('POST', '/livestock/listings', {}),
        throwsA(failure('REQUEST_IN_PROGRESS')),
      );
      response.complete(success());
      await first;
      expect(requests, 1);
    },
  );
}
