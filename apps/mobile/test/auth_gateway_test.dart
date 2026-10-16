import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:qadam_mobile/auth.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const _ownerA = '10000000-0000-4000-8000-000000000001';
const _ownerB = '10000000-0000-4000-8000-000000000002';

/// Synthetic SDK-shaped session fixtures. These are not valid credentials and
/// never leave the injected HTTP client. No shared Supabase login is performed.
Map<String, dynamic> _session(
  String owner, {
  bool expired = false,
  int serial = 0,
}) {
  final expires =
      DateTime.now().millisecondsSinceEpoch ~/ 1000 + (expired ? -3600 : 3600);
  String encode(Object value) =>
      base64Url.encode(utf8.encode(jsonEncode(value))).replaceAll('=', '');
  final token =
      '${encode({'alg': 'HS256', 'typ': 'JWT'})}.'
      '${encode({'sub': owner, 'exp': expires, 'serial': serial})}.synthetic-test-signature';
  return {
    'access_token': token,
    'refresh_token': 'test-refresh-$owner-$serial',
    'token_type': 'bearer',
    'expires_in': expired ? -3600 : 3600,
    'expires_at': expires,
    'user': {
      'id': owner,
      'aud': 'authenticated',
      'role': 'authenticated',
      'email': 'synthetic@example.test',
      'app_metadata': <String, dynamic>{},
      'user_metadata': <String, dynamic>{},
      'created_at': '2026-01-01T00:00:00Z',
    },
  };
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late SupabaseClient client;
  late SupabaseAuthGateway gateway;

  Future<void> start(
    Future<http.Response> Function(http.Request) handler,
  ) async {
    client = SupabaseClient(
      'https://synthetic.example.test',
      'sb_publishable_synthetic_unit_test_only',
      authOptions: const AuthClientOptions(autoRefreshToken: false),
      httpClient: MockClient(handler),
    );
    await client.auth.setInitialSession(
      jsonEncode(_session(_ownerA, expired: true)),
    );
    gateway = SupabaseAuthGateway(client);
  }

  tearDown(() async {
    gateway.close();
    await client.dispose();
  });

  test(
    'SDK refresh is coalesced for concurrent calls of one account',
    () async {
      final dispatched = Completer<void>();
      final response = Completer<http.Response>();
      var requestCount = 0;
      await start((request) {
        expect(request.url.path, '/auth/v1/token');
        expect(request.url.queryParameters['grant_type'], 'refresh_token');
        requestCount++;
        if (!dispatched.isCompleted) dispatched.complete();
        return response.future;
      });
      final first = gateway.accessToken();
      final second = gateway.accessToken();
      await dispatched.future;
      final refreshed = _session(_ownerA, serial: 1);
      response.complete(http.Response(jsonEncode(refreshed), 200));
      expect(await first, refreshed['access_token']);
      expect(await second, refreshed['access_token']);
      expect(requestCount, 1);
    },
  );

  test(
    'expired A refresh cannot be delivered after account B is restored',
    () async {
      final dispatched = Completer<void>();
      final response = Completer<http.Response>();
      await start((_) {
        if (!dispatched.isCompleted) dispatched.complete();
        return response.future;
      });
      // Some SDK versions reject an obsolete refresh themselves. Both a null
      // result and that rejection are safe; returning A's token is not.
      final old = gateway.accessToken().catchError((Object _) => null);
      await dispatched.future;
      final freshB = _session(_ownerB, serial: 2);
      await client.auth.setInitialSession(jsonEncode(freshB));
      await Future<void>.delayed(Duration.zero);
      expect(gateway.accountId, _ownerB);
      expect(await gateway.accessToken(), freshB['access_token']);
      response.complete(
        http.Response(jsonEncode(_session(_ownerA, serial: 3)), 200),
      );
      expect(await old, isNull);
    },
  );

  test(
    'A-B-A transition invalidates A refresh from the old session epoch',
    () async {
      final dispatched = Completer<void>();
      final response = Completer<http.Response>();
      await start((_) {
        if (!dispatched.isCompleted) dispatched.complete();
        return response.future;
      });
      final old = gateway.accessToken().catchError((Object _) => null);
      await dispatched.future;
      await client.auth.setInitialSession(
        jsonEncode(_session(_ownerB, serial: 2)),
      );
      await Future<void>.delayed(Duration.zero);
      final newA = _session(_ownerA, serial: 3);
      await client.auth.setInitialSession(jsonEncode(newA));
      await Future<void>.delayed(Duration.zero);
      expect(await gateway.accessToken(), newA['access_token']);
      response.complete(
        http.Response(jsonEncode(_session(_ownerA, serial: 4)), 200),
      );
      expect(await old, isNull);
    },
  );

  test(
    'expired B never receives A token from a refresh already in flight',
    () async {
      final dispatchedA = Completer<void>();
      final responseA = Completer<http.Response>();
      final freshB = _session(_ownerB, serial: 4);
      await start((request) {
        final body = jsonDecode(request.body) as Map;
        if ((body['refresh_token'] as String).contains(_ownerA)) {
          if (!dispatchedA.isCompleted) dispatchedA.complete();
          return responseA.future;
        }
        return Future.value(http.Response(jsonEncode(freshB), 200));
      });
      final old = gateway.accessToken().catchError((Object _) => null);
      await dispatchedA.future;
      await client.auth.setInitialSession(
        jsonEncode(_session(_ownerB, expired: true, serial: 2)),
      );
      await Future<void>.delayed(Duration.zero);
      final tokenForB = gateway.accessToken().catchError((Object _) => null);
      responseA.complete(
        http.Response(jsonEncode(_session(_ownerA, serial: 3)), 200),
      );
      expect(await old, isNull);
      expect(await tokenForB, anyOf(isNull, freshB['access_token']));
    },
  );
}
