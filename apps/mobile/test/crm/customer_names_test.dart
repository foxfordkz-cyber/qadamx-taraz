import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:qadam_mobile/crm/crm_api.dart';
import 'package:qadam_mobile/crm/crm_models.dart';
import 'package:qadam_mobile/crm/crm_pending.dart';
import 'package:qadam_mobile/crm/customer_names.dart';
import 'package:qadam_mobile/data/api_failure.dart';

import 'crm_test.dart' show MemoryCrmVault;

const _business = '11111111-1111-4111-8111-111111111111';
const _otherBusiness = '99999999-9999-4999-8999-999999999999';
const _owner = '44444444-4444-4444-8444-444444444444';
final _base = Uri.parse('https://api.example.test/api/v1');
String _id(int value) =>
    '22222222-2222-4222-8222-${value.toRadixString(16).padLeft(12, '0')}';
CrmJson _customer(String id, {String business = _business}) => {
  'id': id,
  'business_id': business,
  'display_name': 'Учебный клиент',
  'note': '',
  'contact': null,
  'balance_minor': 123456,
};
http.Response _response(Object value, [int status = 200]) =>
    http.Response.bytes(utf8.encode(jsonEncode(value)), status);
http.Response _page(Iterable<String> ids, {String? next}) =>
    _response({'items': ids.map(_customer).toList(), 'next_cursor': next});
Matcher _failure(String code) =>
    isA<ApiFailure>().having((e) => e.code, 'code', code);

void main() {
  late String? account;
  late int epoch;
  CrmApi api(
    Future<http.Response> Function(http.Request) handler, {
    bool enabled = true,
    Uri? base,
  }) => CrmApi(
    baseUrl: base ?? _base,
    accountId: () => account,
    epoch: () => epoch,
    accessToken: () async => 'synthetic-token',
    pending: CrmPending(MemoryCrmVault()),
    client: MockClient(handler),
    customerIdsEnabled: enabled,
  );
  setUp(() {
    account = _owner;
    epoch = 1;
  });

  test(
    'production default gate blocks ids; an empty set never requests',
    () async {
      var calls = 0;
      final client = CrmApi(
        baseUrl: _base,
        accountId: () => account,
        epoch: () => epoch,
        accessToken: () async => 'synthetic-token',
        pending: CrmPending(MemoryCrmVault()),
        client: MockClient((_) async {
          calls++;
          return _page([]);
        }),
      );
      final scope = client.scope(_business);
      expect((await client.customersByIds(scope, [])).items, isEmpty);
      await expectLater(
        client.customersByIds(scope, [_id(1)]),
        throwsA(_failure('CUSTOMER_IDS_UNAVAILABLE')),
      );
      expect(calls, 0);
      client.close();
    },
  );

  test(
    'repeated ids only; UUID case deduplicates, balances stay server values',
    () async {
      final first = _id(10);
      final second = _id(11);
      final client = api((r) async {
        expect(r.method, 'GET');
        expect(r.url.path, '/api/v1/businesses/$_business/customers');
        expect(r.url.queryParametersAll, {
          'ids': [first, second],
        });
        expect(r.headers['Authorization'], 'Bearer synthetic-token');
        expect(r.body, isEmpty);
        return _page([first]); // Foreign/missing second ID is silently omitted.
      });
      final page = await client.customersByIds(client.scope(_business), [
        first.toUpperCase(),
        first,
        second,
      ]);
      expect(page.next, isNull);
      expect(page.items.single['id'], first);
      expect(page.items.single['balance_minor'], 123456);
      client.close();
    },
  );

  test(
    '100 limit is checked before dedup; invalid ids do not reach HTTP',
    () async {
      var calls = 0;
      final client = api((r) async {
        calls++;
        return _page(r.url.queryParametersAll['ids']!);
      });
      final scope = client.scope(_business);
      await expectLater(
        client.customersByIds(scope, List.filled(101, _id(1))),
        throwsA(_failure('VALIDATION_ERROR')),
      );
      await expectLater(
        client.customersByIds(scope, ['']),
        throwsA(_failure('VALIDATION_ERROR')),
      );
      await expectLater(
        client.customersByIds(scope, ['not-a-uuid']),
        throwsA(_failure('VALIDATION_ERROR')),
      );
      expect(calls, 0);
      expect(
        (await client.customersByIds(scope, List.filled(100, _id(1)))).items,
        hasLength(1),
      );
      client.close();
    },
  );

  for (final kind in ['unrequested', 'cursor', 'missing cursor', 'duplicate']) {
    test('rejects $kind response without a first-page fallback', () async {
      var calls = 0;
      final client = api((r) async {
        calls++;
        final id = r.url.queryParameters['ids']!;
        return switch (kind) {
          'unrequested' => _page([_id(999)]),
          'cursor' => _page([id], next: _id(999)),
          'missing cursor' => _response({
            'items': [_customer(id)],
          }),
          _ => _page([id, id]),
        };
      });
      await expectLater(
        client.customersByIds(client.scope(_business), [_id(1)]),
        throwsA(_failure('CUSTOMER_IDS_UNAVAILABLE')),
      );
      expect(calls, 1);
      client.close();
    });
  }

  test('foreign-business row fails the existing ownership validator', () async {
    final client = api(
      (_) async => _response({
        'items': [_customer(_id(1), business: _otherBusiness)],
        'next_cursor': null,
      }),
    );
    await expectLater(
      client.customersByIds(client.scope(_business), [_id(1)]),
      throwsA(_failure('INVALID_RESPONSE')),
    );
    client.close();
  });

  test(
    'all loaded operation pages batch 205 ids, cache only resolved ids',
    () async {
      final groups = <List<String>>[];
      final client = api((r) async {
        expect(r.url.queryParameters.keys, ['ids']);
        final group = r.url.queryParametersAll['ids']!;
        groups.add(group);
        return _page(group.where((id) => id != _id(3)));
      });
      final names = CustomerNames(
        api: client,
        scope: client.scope(_business),
        isActive: () => true,
      );
      final ids = List.generate(205, (i) => _id(i + 1));
      final first = await names.load([...ids, ids.first]);
      expect(groups.map((g) => g.length), [100, 100, 5]);
      expect(first.customers.length, 204);
      expect(first.missing, {_id(3)});
      final next = await names.load([...ids, _id(206)]);
      expect(groups.last, [_id(206)]);
      expect(groups.length, 4);
      expect(next.customers.length, 205);
      expect(next.customers[_id(1)]!['balance_minor'], 123456);
      expect(
        () => next.customers[_id(1)]!['balance_minor'] = 0,
        throwsUnsupportedError,
      );
      await names.load(ids, refresh: true);
      expect(groups.length, 7);
      names.dispose();
      client.close();
    },
  );

  test(
    'a late previous selection cannot replace the newer name snapshot',
    () async {
      final held = Completer<http.Response>();
      var calls = 0;
      final client = api((r) async {
        calls++;
        if (calls == 1) return held.future;
        return _page(r.url.queryParametersAll['ids']!);
      });
      final names = CustomerNames(
        api: client,
        scope: client.scope(_business),
        isActive: () => true,
      );
      final old = names.load([_id(1)]);
      final oldRejected = expectLater(
        old,
        throwsA(_failure('ACCOUNT_CHANGED')),
      );
      await Future<void>.delayed(Duration.zero);
      final latest = await names.load([_id(2)]);
      expect(latest.customers.keys, [_id(2)]);
      held.complete(_page([_id(1)]));
      await oldRejected;
      final cached = await names.load([_id(2)]);
      expect(cached.customers.keys, [_id(2)]);
      expect(calls, 2);
      names.dispose();
      client.close();
    },
  );

  for (final change in ['account', 'epoch', 'point', 'dispose']) {
    test('late response after $change is rejected and never cached', () async {
      final held = Completer<http.Response>();
      var active = true;
      final client = api((_) => held.future);
      final names = CustomerNames(
        api: client,
        scope: client.scope(_business),
        isActive: () => active,
      );
      final future = names.load([_id(1)]);
      final rejected = expectLater(
        future,
        throwsA(_failure('ACCOUNT_CHANGED')),
      );
      await Future<void>.delayed(Duration.zero);
      switch (change) {
        case 'account':
          account = '55555555-5555-4555-8555-555555555555';
        case 'epoch':
          epoch++;
        case 'point':
          active = false;
        case 'dispose':
          names.dispose();
      }
      held.complete(_page([_id(1)]));
      await rejected;
      names.dispose();
      client.close();
    });
  }

  test(
    'API origin and business instances never share customer names',
    () async {
      var firstCalls = 0;
      var secondCalls = 0;
      final first = api((r) async {
        firstCalls++;
        return _page(r.url.queryParametersAll['ids']!);
      });
      final second = api((r) async {
        secondCalls++;
        return _response({
          'items': [_customer(_id(1), business: _otherBusiness)],
          'next_cursor': null,
        });
      }, base: Uri.parse('https://another.example.test/api/v1'));
      final a = CustomerNames(
        api: first,
        scope: first.scope(_business),
        isActive: () => true,
      );
      final b = CustomerNames(
        api: second,
        scope: second.scope(_otherBusiness),
        isActive: () => true,
      );
      await a.load([_id(1)]);
      final result = await b.load([_id(1)]);
      expect(result.customers[_id(1)]!['business_id'], _otherBusiness);
      expect(firstCalls, 1);
      expect(secondCalls, 1);
      await expectLater(
        second.customersByIds(first.scope(_business), [_id(1)]),
        throwsA(_failure('ACCOUNT_CHANGED')),
      );
      a.dispose();
      b.dispose();
      first.close();
      second.close();
    },
  );

  test('a failed later batch does not commit a partial cache', () async {
    var calls = 0;
    final client = api((r) async {
      calls++;
      if (calls == 2) return _response({}, 503);
      return _page(r.url.queryParametersAll['ids']!);
    });
    final names = CustomerNames(
      api: client,
      scope: client.scope(_business),
      isActive: () => true,
    );
    final ids = List.generate(101, (i) => _id(i + 1));
    await expectLater(names.load(ids), throwsA(_failure('CRM_UNAVAILABLE')));
    final retry = await names.load(ids);
    expect(calls, 4);
    expect(retry.customers.length, 101);
    names.dispose();
    client.close();
  });
}
