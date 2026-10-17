import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:qadam_mobile/crm/crm_api.dart';
import 'package:qadam_mobile/crm/crm_models.dart';
import 'package:qadam_mobile/crm/crm_pending.dart';
import 'package:qadam_mobile/data/api_failure.dart';

const business = '11111111-1111-4111-8111-111111111111';
const customerId = '22222222-2222-4222-8222-222222222222';
const saleId = '33333333-3333-4333-8333-333333333333';
const owner = '44444444-4444-4444-8444-444444444444';
final base = Uri.parse('https://api.example.test/api/v1');
const customerBody = {
  'display_name': 'Учебный клиент',
  'contact': null,
  'note': '',
};
CrmJson customer() => {
  'id': customerId,
  'business_id': business,
  ...customerBody,
  'balance_minor': 0,
};
CrmJson receipt() => {
  'operation': {
    'id': saleId,
    'business_id': business,
    'customer_id': customerId,
    'sale_id': saleId,
    'kind': 'sale',
    'sales_delta_minor': 15000,
    'receipts_delta_minor': 10000,
    'reversal_of': null,
    'description': 'Fixture',
    'created_at': '2026-10-17T05:00:00Z',
    'created_by': owner,
  },
  'sale_balance_minor': 5000,
  'customer_balance_minor': 5000,
  'created_at': '2026-10-17T05:00:00Z',
};
http.Response jsonResponse(Object value, [int status = 200]) =>
    http.Response.bytes(utf8.encode(jsonEncode(value)), status);
Matcher failure(String code) =>
    isA<ApiFailure>().having((e) => e.code, 'code', code);

class MemoryCrmVault implements CrmVault {
  final values = <String, String>{};
  bool fail = false;
  @override
  Future<String?> read(String key) async {
    if (fail) throw StateError('no storage');
    return values[key];
  }

  @override
  Future<void> write(String key, String value) async {
    if (fail) throw StateError('no storage');
    values[key] = value;
  }

  @override
  Future<void> remove(String key) async => values.remove(key);
}

void main() {
  late MemoryCrmVault vault;
  late CrmPending pending;
  late String? account;
  late int epoch;
  CrmApi api(Future<http.Response> Function(http.Request) handler) => CrmApi(
    baseUrl: base,
    accountId: () => account,
    epoch: () => epoch,
    accessToken: () async => 'synthetic-token',
    pending: pending,
    client: MockClient(handler),
  );
  setUp(() {
    vault = MemoryCrmVault();
    pending = CrmPending(vault);
    account = owner;
    epoch = 0;
  });
  test(
    'receipt for different payment is not accepted; repayment has zero sales delta',
    () async {
      final client = api((_) async => jsonResponse(receipt()));
      final scope = client.scope(business);
      final intent = await client.begin(scope, operationAction, {
        'kind': 'sale',
        'description': 'Fixture',
        'customer_id': customerId,
        'total_minor': 15000,
        'received_minor': 15000,
      });
      await expectLater(
        client.send(scope, operationAction, intent),
        throwsA(failure('INVALID_RESPONSE')),
      );
      expect((await pending.load(scope, operationAction))!.receipt, isNull);
      final other = api((r) async {
        final response = receipt();
        response['operation']['kind'] = 'repayment';
        response['operation']['sales_delta_minor'] = 0;
        response['operation']['receipts_delta_minor'] = 5000;
        response['sale_balance_minor'] = 0;
        response['customer_balance_minor'] = 0;
        return jsonResponse(response);
      });
      final anotherScope = other.scope(customerId);
      // Validate repayment request independently; response business scope stays enforced.
      other.validateBody(operationAction, {
        'kind': 'repayment',
        'sale_id': saleId,
        'amount_minor': 5000,
        'description': 'Fixture',
      });
      expect(anotherScope.business, customerId);
      client.close();
      other.close();
    },
  );
  test(
    'catalog uses the published public slug route and keeps null prices',
    () async {
      final client = api((r) async {
        expect(r.url.path, '/api/v1/businesses/fixture-shop');
        expect(r.headers.containsKey('Authorization'), isFalse);
        return jsonResponse({
          'id': business,
          'slug': 'fixture-shop',
          'name': 'Fixture',
          'is_demo': true,
          'catalog': [
            {
              'id': saleId,
              'business_id': business,
              'name': 'Fixture item',
              'price_minor': null,
              'available': true,
              'is_demo': true,
            },
          ],
        });
      });
      final result = await client.catalog(
        client.scope(business),
        'fixture-shop',
      );
      expect(result['catalog'][0]['price_minor'], isNull);
      client.close();
    },
  );
  test(
    'inquiry update uses existing PATCH and only published statuses',
    () async {
      var calls = 0;
      final client = api((r) async {
        calls++;
        expect(r.method, 'PATCH');
        expect(r.url.path, '/api/v1/businesses/$business/inquiries/$saleId');
        expect(jsonDecode(r.body), {'status': 'closed'});
        return jsonResponse({
          'id': saleId,
          'business_id': business,
          'created_at': '2026-10-17T05:00:00Z',
          'visitor_name': 'Fixture',
          'contact': 'synthetic',
          'message': 'Fixture inquiry',
          'status': 'closed',
        });
      });
      final scope = client.scope(business);
      await expectLater(
        client.updateInquiry(scope, saleId, 'paid'),
        throwsA(failure('VALIDATION_ERROR')),
      );
      expect(calls, 0);
      final result = await client.updateInquiry(scope, saleId, 'closed');
      expect(result['status'], 'closed');
      expect(calls, 1);
      client.close();
    },
  );

  test(
    'ambiguous customer POST survives restart; not_observed preserves exact key/body/url',
    () async {
      final requests = <http.Request>[];
      final client = api((r) async {
        requests.add(r);
        if (requests.length == 1) throw TimeoutException('synthetic outage');
        if (r.method == 'GET') {
          return jsonResponse({'status': 'not_observed', 'customer': null});
        }
        return jsonResponse(customer(), 201);
      });
      final scope = client.scope(business);
      final original = await client.begin(scope, customerAction, customerBody);
      await expectLater(
        client.send(scope, customerAction, original),
        throwsA(failure('CRM_UNAVAILABLE')),
      );
      final restored = (await CrmPending(
        vault,
      ).load(CrmScope(base.toString(), owner, business, 99), customerAction))!;
      final unknown = await client.recoverCustomer(scope, restored);
      expect(unknown.key, original.key);
      expect(unknown.receipt, isNull);
      await expectLater(
        client.begin(scope, customerAction, customerBody),
        throwsA(failure('PENDING_EXISTS')),
      );
      final completed = await client.send(scope, customerAction, unknown);
      expect(completed.receipt!['id'], customerId);
      expect(requests[0].url, requests[2].url);
      expect(requests[0].body, requests[2].body);
      expect(requests.map((r) => r.headers['Idempotency-Key']).toSet(), {
        original.key,
      });
      expect(
        requests[1].url.path,
        '/api/v1/businesses/$business/customer-creation-result',
      );
      expect(await pending.acknowledge(completed), isTrue);
      expect(await pending.load(scope, customerAction), isNull);
      client.close();
    },
  );
  test(
    'late K1 acknowledgement and completion never clear or replace K2',
    () async {
      final scope = CrmScope(base.toString(), owner, business, 0);
      final k1 = await pending.begin(scope, customerAction, customerBody);
      final done = await pending.complete(k1, customer());
      expect(await pending.acknowledge(done), isTrue);
      final k2 = await pending.begin(scope, customerAction, {
        ...customerBody,
        'display_name': 'Second',
      });
      expect(k1.key, isNot(k2.key));
      expect(await pending.acknowledge(done), isFalse);
      await expectLater(
        pending.complete(k1, customer()),
        throwsA(failure('PENDING_CHANGED')),
      );
      expect((await pending.load(scope, customerAction))!.key, k2.key);
    },
  );
  test(
    'scope isolates account, API, business and action, but supports restart epoch',
    () async {
      final scope = CrmScope(base.toString(), owner, business, 0);
      await pending.begin(scope, customerAction, customerBody);
      for (final other in [
        CrmScope(base.toString(), 'b', business, 0),
        CrmScope('https://other.test/api/v1', owner, business, 0),
        CrmScope(base.toString(), owner, customerId, 0),
      ]) {
        expect(await pending.load(other, customerAction), isNull);
      }
      expect(await pending.load(scope, operationAction), isNull);
      expect(
        await pending.load(
          CrmScope(base.toString(), owner, business, 7),
          customerAction,
        ),
        isNotNull,
      );
    },
  );
  test(
    'A to B to A prevents delayed write response mutating durable pending',
    () async {
      final response = Completer<http.Response>();
      final started = Completer<void>();
      final client = api((_) {
        started.complete();
        return response.future;
      });
      final scope = client.scope(business);
      final intent = await client.begin(scope, customerAction, customerBody);
      final task = client.send(scope, customerAction, intent);
      final assertion = expectLater(task, throwsA(failure('ACCOUNT_CHANGED')));
      await started.future;
      account = 'b';
      epoch++;
      account = owner;
      epoch++;
      response.complete(jsonResponse(customer(), 201));
      await assertion;
      expect((await pending.load(scope, customerAction))!.receipt, isNull);
      client.close();
    },
  );
  test(
    'storage failure prevents dispatch and response with wrong business is retained as unresolved',
    () async {
      var calls = 0;
      final client = api((_) async {
        calls++;
        return jsonResponse({...customer(), 'business_id': customerId}, 201);
      });
      final scope = client.scope(business);
      vault.fail = true;
      await expectLater(
        client.begin(scope, customerAction, customerBody),
        throwsA(failure('PENDING_UNAVAILABLE')),
      );
      expect(calls, 0);
      vault.fail = false;
      final intent = await client.begin(scope, customerAction, customerBody);
      await expectLater(
        client.send(scope, customerAction, intent),
        throwsA(failure('INVALID_RESPONSE')),
      );
      expect((await pending.load(scope, customerAction))!.receipt, isNull);
    },
  );
  test(
    'manual operation validates money and retry never fabricates a sale or changes body',
    () async {
      var calls = 0;
      final requests = <http.Request>[];
      final client = api((r) async {
        requests.add(r);
        if (++calls == 1) throw TimeoutException('outage');
        return jsonResponse(receipt());
      });
      final body = <String, dynamic>{
        'kind': 'sale',
        'description': 'Fixture',
        'customer_id': customerId,
        'total_minor': 15000,
        'received_minor': 10000,
      };
      for (final bad in [
        {...body, 'total_minor': 150.0},
        {...body, 'received_minor': null},
        {...body, 'customer_id': null},
        {...body, 'received_minor': 15001},
        {...body, 'created_by': owner},
      ]) {
        expect(
          () => client.validateBody(operationAction, bad),
          throwsA(failure('VALIDATION_ERROR')),
        );
      }
      final scope = client.scope(business);
      final intent = await client.begin(scope, operationAction, body);
      body['total_minor'] = 99999;
      await expectLater(
        client.send(scope, operationAction, intent),
        throwsA(failure('CRM_UNAVAILABLE')),
      );
      final completed = await client.send(scope, operationAction, intent);
      expect(requests[0].body, requests[1].body);
      expect(jsonDecode(requests[1].body)['total_minor'], 15000);
      expect(
        requests[0].headers['Idempotency-Key'],
        requests[1].headers['Idempotency-Key'],
      );
      expect(completed.receipt!['sale_balance_minor'], 5000);
    },
  );
  test(
    'integer money, null and negative receipts display without misleading zeros',
    () {
      expect(crmAmount('1 250,05'), 125005);
      expect(crmAmount('0'), isNull);
      expect(crmAmount('0', allowZero: true), 0);
      expect(crmAmount(''), isNull);
      expect(crmAmount('1.001'), isNull);
      expect(crmMoney(null, false), 'Нет данных');
      expect(crmMoney(-50, false), '−0,50 ₸');
      validateSummary({
        'currency': 'KZT',
        'timezone': 'Asia/Almaty',
        'date': '2026-10-17',
        'sales_minor': 0,
        'receipts_minor': -50,
        'outstanding_minor': 0,
        'new_inquiries_count': 0,
      });
    },
  );
}
