import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/testing.dart';
import 'package:qadam_mobile/crm/crm_api.dart';
import 'package:qadam_mobile/crm/crm_pending.dart';
import 'crm_test.dart' as f;

void main() {
  final action = reversalActionFor(f.saleId);
  final body = {
    'operation_id': f.saleId,
    'sale_id': f.saleId,
    'customer_id': f.customerId,
    'sales_delta_minor': 15000,
    'receipts_delta_minor': 10000,
    'description': 'Исправление учебной записи',
  };
  test(
    'reversal retries exact route, key and description after restart',
    () async {
      final vault = f.MemoryCrmVault();
      final requests = <String>[];
      var invalid = true;
      CrmApi create() => CrmApi(
        baseUrl: f.base,
        accountId: () => f.owner,
        epoch: () => 0,
        accessToken: () async => 'synthetic-token',
        pending: CrmPending(vault),
        client: MockClient((request) async {
          expect(
            request.url.path,
            '/api/v1/businesses/${f.business}/operations/${f.saleId}/reverse',
          );
          expect(jsonDecode(request.body), {
            'description': body['description'],
          });
          requests.add(
            '${request.url}|${request.headers['Idempotency-Key']}|${request.body}',
          );
          final receipt = f.receipt();
          receipt['operation'].addAll({
            'id': '55555555-5555-4555-8555-555555555555',
            'kind': 'reversal',
            'reversal_of': f.saleId,
            'sales_delta_minor': -15000,
            'receipts_delta_minor': invalid ? -9000 : -10000,
            'description': body['description'],
          });
          receipt['sale_balance_minor'] = 0;
          receipt['customer_balance_minor'] = 0;
          return f.jsonResponse(receipt);
        }),
      );
      final first = create();
      final scope = first.scope(f.business);
      final intent = await first.begin(scope, action, body);
      await expectLater(
        first.send(scope, action, intent),
        throwsA(f.failure('INVALID_RESPONSE')),
      );
      first.close();
      final second = create();
      final restored = (await second.pending.load(scope, action))!;
      expect(restored.receipt, isNull);
      invalid = false;
      final result = await second.send(scope, action, restored);
      expect(result.receipt!['operation']['kind'], 'reversal');
      expect(requests[0], requests[1]);
      await second.send(scope, action, result);
      expect(requests.length, 2);
      // A pending sale reversal must not block reversing its dependent payment.
      const paymentId = '66666666-6666-4666-8666-666666666666';
      final paymentAction = reversalActionFor(paymentId);
      final payment = await second.begin(scope, paymentAction, {
        ...body,
        'operation_id': paymentId,
        'sales_delta_minor': 0,
      });
      expect(payment.key, isNot(intent.key));
      expect((await second.pending.load(scope, action))!.key, intent.key);
      second.close();
    },
  );
  test(
    'summary sends selected server date and rejects a mismatched day',
    () async {
      var mismatch = false;
      final api = CrmApi(
        baseUrl: f.base,
        accountId: () => f.owner,
        epoch: () => 0,
        accessToken: () async => 'synthetic-token',
        pending: CrmPending(f.MemoryCrmVault()),
        client: MockClient((request) async {
          expect(request.url.queryParameters['date'], '2026-10-16');
          return f.jsonResponse({
            'date': mismatch ? '2026-10-17' : '2026-10-16',
            'timezone': 'Asia/Almaty',
            'currency': 'KZT',
            'sales_minor': -15000,
            'receipts_minor': -10000,
            'outstanding_minor': 0,
            'new_inquiries_count': 0,
          });
        }),
      );
      final scope = api.scope(f.business);
      expect(
        (await api.summary(scope, date: '2026-10-16'))['sales_minor'],
        -15000,
      );
      mismatch = true;
      await expectLater(
        api.summary(scope, date: '2026-10-16'),
        throwsA(f.failure('INVALID_RESPONSE')),
      );
      api.close();
    },
  );
}
