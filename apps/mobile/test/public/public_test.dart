import 'dart:async';
import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:qadam_mobile/crm/crm_models.dart';
import 'package:qadam_mobile/crm/crm_pending.dart';
import 'package:qadam_mobile/data/api_failure.dart';
import 'package:qadam_mobile/public/inquiry_service.dart';
import 'package:qadam_mobile/public/public_api.dart';
import 'package:qadam_mobile/public/venue_assets.dart';

const business = 'ad6203bc-7320-5b36-982b-135504c5af68';
const venue = '20000000-0000-4000-8000-000000000001';
const receipt = {
  'id': '30000000-0000-4000-8000-000000000001',
  'created_at': '2026-10-17T10:00:00Z',
};
final origin = Uri.parse('https://example.test/api/v1');
final scope = CrmScope(origin.toString(), 'guest', business, 1);
final body = inquiryBody(
  'Учебный посетитель',
  'учебный Telegram',
  'Тест без записи в API',
);

class Vault implements CrmVault {
  final data = <String, String>{};
  @override
  Future<String?> read(String key) async => data[key];
  @override
  Future<void> write(String key, String value) async {
    data[key] = value;
  }

  @override
  Future<void> remove(String key) async {
    data.remove(key);
  }
}

void main() {
  test(
    'public transport has no token, preserves filters and blocks redirects',
    () async {
      final api = PublicApi(
        origin,
        client: MockClient((r) async {
          expect(r.headers.containsKey('authorization'), false);
          expect(r.followRedirects, false);
          expect(r.url.queryParameters['q'], 'Учебный');
          expect(r.url.queryParameters['venue_id'], venue);
          return http.Response(
            jsonEncode({'items': [], 'next_cursor': null}),
            200,
          );
        }),
      );
      expect(
        (await api.businesses(venue: venue, query: 'Учебный')).items,
        isEmpty,
      );
    },
  );
  test('inquiry validates trim, free contact and Unicode code points', () {
    expect(
      inquiryBody('  Имя  ', '  telegram  ', '  Текст  ')['contact'],
      'telegram',
    );
    expect(inquiryBody('🙂' * 100, 'a', 'b')['visitor_name'], '🙂' * 100);
    expect(() => inquiryBody('🙂' * 101, 'a', 'b'), throwsA(isA<ApiFailure>()));
    expect(() => inquiryBody('a', ' ', 'b'), throwsA(isA<ApiFailure>()));
  });
  test(
    'unknown -> 422 -> restart -> replay retains original ID/body',
    () async {
      final vault = Vault();
      final pending = CrmPending(vault);
      final requests = <String>[];
      var attempt = 0;
      final api = PublicApi(
        origin,
        client: MockClient((r) async {
          requests.add(r.body);
          attempt++;
          return http.Response(
            jsonEncode(attempt < 3 ? {} : receipt),
            attempt == 1
                ? 503
                : attempt == 2
                ? 422
                : 201,
          );
        }),
      );
      final first = InquiryService(api, pending, (_) => true);
      await expectLater(
        first.submit(scope, newBody: body),
        throwsA(isA<ApiFailure>()),
      );
      await expectLater(first.submit(scope), throwsA(isA<ApiFailure>()));
      final restarted = InquiryService(api, CrmPending(vault), (_) => true);
      expect((await restarted.load(scope))!.body, body);
      expect((await restarted.submit(scope)).receipt, receipt);
      expect(requests.toSet().length, 1);
      expect(vault.data.values.join(), isNot(contains('Bearer')));
    },
  );
  test(
    'initial definitive rejection permits correction with a new ID',
    () async {
      var attempt = 0;
      final keys = <Object?>[];
      final pending = CrmPending(Vault());
      final api = PublicApi(
        origin,
        client: MockClient((r) async {
          keys.add(jsonDecode(r.body)['client_request_id']);
          return http.Response(
            jsonEncode(++attempt == 1 ? {} : receipt),
            attempt == 1 ? 422 : 201,
          );
        }),
      );
      final service = InquiryService(api, pending, (_) => true);
      await expectLater(
        service.submit(scope, newBody: body),
        throwsA(isA<ApiFailure>()),
      );
      expect(await service.load(scope), isNull);
      await service.submit(
        scope,
        newBody: inquiryBody('Имя', 'email', 'Исправлено'),
      );
      expect(keys.toSet().length, 2);
    },
  );
  test('double submit serializes and returns one confirmed receipt', () async {
    var calls = 0;
    final result = Completer<http.Response>();
    final api = PublicApi(
      origin,
      client: MockClient((_) {
        calls++;
        return result.future;
      }),
    );
    final service = InquiryService(api, CrmPending(Vault()), (_) => true);
    final a = service.submit(scope, newBody: body);
    final b = service.submit(scope, newBody: body);
    await Future<void>.delayed(const Duration(milliseconds: 30));
    result.complete(http.Response(jsonEncode(receipt), 201));
    expect((await a).key, (await b).key);
    expect(calls, 1);
  });
  test('malformed success stays unknown and does not clear pending', () async {
    final api = PublicApi(
      origin,
      client: MockClient(
        (_) async => http.Response('{"id":"not-a-receipt"}', 200),
      ),
    );
    final service = InquiryService(api, CrmPending(Vault()), (_) => true);
    await expectLater(
      service.submit(scope, newBody: body),
      throwsA(isA<ApiFailure>()),
    );
    expect((await service.load(scope))!.receipt, isNull);
  });
  test(
    'late response after account change cannot confirm a different session',
    () async {
      var current = true;
      final response = Completer<http.Response>();
      final pending = CrmPending(Vault());
      final api = PublicApi(origin, client: MockClient((_) => response.future));
      final service = InquiryService(api, pending, (_) => current);
      final send = service.submit(scope, newBody: body);
      final assertion = expectLater(send, throwsA(isA<ApiFailure>()));
      await Future<void>.delayed(const Duration(milliseconds: 30));
      current = false;
      response.complete(http.Response(jsonEncode(receipt), 201));
      await assertion;
      expect((await pending.load(scope, inquiryAction))!.receipt, isNull);
      expect(
        await pending.load(
          CrmScope(origin.toString(), 'B', business, 2),
          inquiryAction,
        ),
        isNull,
      );
      expect(
        await pending.load(
          CrmScope('https://other.test/api/v1', 'guest', business, 1),
          inquiryAction,
        ),
        isNull,
      );
    },
  );
  test('hotspot requires both IDs, slug and venue to match API', () {
    final asset = VenueAsset({
      'slug': 'mart',
      'camera_position': [0, 10, 20],
      'camera_target': [0, 0, 0],
      'bounds_min': [-10, 0, -10],
      'bounds_max': [10, 10, 10],
      'hotspots': [
        {
          'id': 'marker',
          'business_id': business,
          'business_slug': 'shop',
          'position': [0, 1, 0],
        },
      ],
    });
    final b = {'id': business, 'slug': 'shop', 'venue_id': venue};
    expect(asset.businessFor('marker', venue, [b]), b);
    expect(
      asset.businessFor('marker', venue, [
        {...b, 'slug': 'other'},
      ]),
      isNull,
    );
    expect(asset.businessFor('marker', 'wrong', [b]), isNull);
  });
  test('internal UUID cannot become a public display name', () {
    expect(
      () => publicName({'name': business}, 'name'),
      throwsA(isA<ApiFailure>()),
    );
  });
}
