import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:qadam_mobile/business_access.dart';
import 'package:qadam_mobile/data/account_api.dart';
import 'package:qadam_mobile/data/api_failure.dart';

import 'support/shell_fixture.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test(
    'GET /me uses bearer, refuses redirects, parses canonical memberships',
    () async {
      final f = ShellFixture(
        me: (request) async {
          expect(request.method, 'GET');
          expect(request.url.toString(), 'https://api.example.test/api/v1/me');
          expect(
            request.headers['Authorization'],
            'Bearer synthetic-session-a',
          );
          expect(request.followRedirects, isFalse);
          return jsonResponse({
            'id': 'a',
            'businesses': [point(pointA, 'Учебная точка A')],
          });
        },
      );
      addTearDown(f.dispose);
      final result = await f.accountApi.memberships();
      expect(result.single.id, pointA);
      expect(result.single.name, 'Учебная точка A');
    },
  );
  test(
    'empty membership is valid; wrong owner and malformed membership fail closed',
    () async {
      for (final body in [
        {'id': 'a', 'businesses': []},
        {'id': 'b', 'businesses': []},
        {
          'id': 'a',
          'businesses': [point('bad-id', 'Invalid')],
        },
        {
          'id': 'a',
          'businesses': [point(pointA, 'A'), point(pointA, 'Duplicate')],
        },
        {
          'id': 'a',
          'businesses': [
            {...point(pointA, 'A'), 'role': 'admin'},
          ],
        },
        {'id': 'a', 'memberships': []},
      ]) {
        final f = ShellFixture(me: (_) async => jsonResponse(body));
        if (body['id'] == 'a' &&
            body['businesses'] is List &&
            (body['businesses'] as List).isEmpty) {
          expect(await f.accountApi.memberships(), isEmpty);
        } else {
          await expectLater(
            f.accountApi.memberships(),
            throwsA(isA<ApiFailure>()),
          );
        }
        f.dispose();
      }
    },
  );
  test(
    'auth change while SDK refresh awaits never sends the captured token',
    () async {
      final token = Completer<String?>();
      var owner = 'a';
      var epoch = 0;
      var requests = 0;
      final api = AccountApi(
        baseUrl: Uri.parse('https://api.example.test/api/v1'),
        accountId: () => owner,
        epoch: () => epoch,
        accessToken: () => token.future,
        client: MockClient((_) async {
          requests++;
          return jsonResponse({});
        }),
      );
      addTearDown(api.close);
      final pending = api.memberships();
      final check = expectLater(
        pending,
        throwsA(
          isA<ApiFailure>().having((e) => e.code, 'code', 'ACCOUNT_CHANGED'),
        ),
      );
      owner = 'b';
      epoch++;
      token.complete('synthetic-token');
      await check;
      expect(requests, 0);
    },
  );
  test(
    'A -> B -> A late response cannot repopulate points or selection',
    () async {
      final late = Completer<http.Response>();
      var count = 0;
      late ShellFixture f;
      f = ShellFixture(
        me: (_) async {
          count++;
          if (count == 1) {
            return jsonResponse({
              'id': 'a',
              'businesses': [point(pointA, 'Old A')],
            });
          }
          if (count == 2) return late.future;
          return jsonResponse({'id': f.auth.account, 'businesses': []});
        },
      );
      final access = BusinessAccess(f.runtime);
      addTearDown(() {
        access.dispose();
        f.dispose();
      });
      await Future<void>.delayed(Duration.zero);
      access.select(pointA);
      expect(access.selectedId, pointA);
      final pending = access.refresh();
      await Future<void>.delayed(Duration.zero);
      f.auth.change('b');
      expect(access.businesses, isEmpty);
      expect(access.selectedId, isNull);
      await Future<void>.delayed(Duration.zero);
      f.auth.change('a');
      await Future<void>.delayed(Duration.zero);
      late.complete(
        jsonResponse({
          'id': 'a',
          'businesses': [point(pointA, 'Stale A')],
        }),
      );
      await pending;
      expect(access.businesses, isEmpty);
      expect(access.selectedId, isNull);
      expect(access.error, isNull);
    },
  );
  test(
    'refresh removes revoked selected membership and keeps failures distinct from empty',
    () async {
      var body = jsonResponse({
        'id': 'a',
        'businesses': [point(pointA, 'A'), point(pointB, 'B')],
      });
      final f = ShellFixture(me: (_) async => body);
      final access = BusinessAccess(f.runtime);
      addTearDown(() {
        access.dispose();
        f.dispose();
      });
      await Future<void>.delayed(Duration.zero);
      access.select(pointA);
      access.select('untrusted-id');
      expect(access.selectedId, pointA);
      await access.refresh();
      expect(access.selectedId, pointA);
      body = jsonResponse({
        'id': 'a',
        'businesses': [point(pointB, 'B')],
      });
      await access.refresh();
      expect(access.selectedId, isNull);
      body = jsonResponse({'error': 'synthetic private details'}, 500);
      await access.refresh();
      expect(access.businesses, isEmpty);
      expect(access.error, isA<ApiFailure>());
      expect(access.error.toString(), isNot(contains('private details')));
    },
  );
}
