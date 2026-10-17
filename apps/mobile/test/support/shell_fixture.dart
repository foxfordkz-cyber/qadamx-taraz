import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:qadam_mobile/auth.dart';
import 'package:qadam_mobile/config.dart';
import 'package:qadam_mobile/data/account_api.dart';
import 'package:qadam_mobile/data/livestock_api.dart';
import 'package:qadam_mobile/runtime.dart';
import 'package:qadam_mobile/public/public_api.dart';

// Synthetic fixtures; no real accounts, tokens or business data.
const pointA = '11111111-1111-4111-8111-111111111111';
const pointB = '22222222-2222-4222-8222-222222222222';
Map<String, Object> point(String id, String name) => {
  'id': id,
  'name': name,
  'slug': 'fixture-$id',
  'role': 'owner',
};
http.Response jsonResponse(Object body, [int status = 200]) =>
    http.Response.bytes(
      utf8.encode(jsonEncode(body)),
      status,
      headers: {'content-type': 'application/json'},
    );

class ShellAuth implements AuthGateway {
  ShellAuth(this.account);
  String? account;
  final events = StreamController<String?>.broadcast(sync: true);
  void change(String? value) {
    account = value;
    events.add(value);
  }

  @override
  String? get accountId => account;
  @override
  Stream<String?> get accountChanges => events.stream;
  @override
  Future<String?> accessToken() async => 'synthetic-session-$account';
  @override
  Future<void> signIn(String email, String password) async => change(email);
  @override
  Future<void> signOut() async => change(null);
}

class EmptyPendingStore implements PendingStore {
  @override
  Future<PendingIntent?> read(String accountId) async => null;
  @override
  Future<void> delete(String accountId) async {}
  @override
  Future<void> write(String accountId, PendingIntent intent) async =>
      throw UnimplementedError();
  @override
  Future<String> snapshotPhoto(
    String accountId,
    String key,
    String sourcePath,
  ) async => throw UnimplementedError();
  @override
  Future<Uint8List> readPhoto(PendingIntent intent) async =>
      throw UnimplementedError();
}

class ShellFixture {
  ShellFixture({
    String? owner = 'a',
    String frontend = 'https://web.example.test',
    required Future<http.Response> Function(http.Request) me,
    Future<http.Response> Function(http.Request)? public,
  }) {
    auth = ShellAuth(owner);
    accountApi = AccountApi(
      baseUrl: Uri.parse('https://api.example.test/api/v1'),
      accountId: () => auth.account,
      epoch: () => runtime.epoch,
      accessToken: auth.accessToken,
      client: MockClient(me),
    );
    final livestock = LivestockApi(
      baseUrl: Uri.parse('https://api.example.test/api/v1'),
      accountId: () => auth.account,
      accessToken: auth.accessToken,
      store: EmptyPendingStore(),
      client: MockClient((request) async {
        livestockRequests.add(request);
        return jsonResponse({'items': [], 'next_cursor': null});
      }),
    );
    runtime = MobileRuntime(
      config: AppConfig(frontendBaseUrl: frontend),
      auth: auth,
      api: livestock,
      accountApi: accountApi,
      publicApi: PublicApi(
        Uri.parse('https://api.example.test/api/v1'),
        client: MockClient(
          public ??
              (_) async => jsonResponse({'items': [], 'next_cursor': null}),
        ),
      ),
    );
  }
  late final ShellAuth auth;
  late final AccountApi accountApi;
  late final MobileRuntime runtime;
  final livestockRequests = <http.Request>[];
  void dispose() {
    runtime.dispose();
    unawaited(auth.events.close());
  }
}
