import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:qadam_mobile/auth.dart';
import 'package:qadam_mobile/runtime.dart';

class FakeAuth implements AuthGateway {
  String? identity = 'account-A';
  bool offline = false;
  final events = StreamController<String?>.broadcast(sync: true);

  @override
  String? get accountId => identity;
  @override
  Stream<String?> get accountChanges => events.stream;
  @override
  Future<String?> accessToken() async => 'test-session-only';
  void switchTo(String? user) {
    identity = user;
    events.add(user);
  }

  @override
  Future<void> signIn(String email, String password) async {
    if (offline) throw StateError('sensitive raw server response');
    switchTo('account-B');
  }

  @override
  Future<void> signOut() async {
    if (offline) throw StateError('sensitive raw server response');
    switchTo(null);
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test(
    'restored SDK account used and refresh does not reset editor generation',
    () {
      final auth = FakeAuth();
      final runtime = MobileRuntime(auth: auth);
      expect(runtime.accountId, 'account-A');
      expect(runtime.epoch, 0);
      auth.switchTo('account-A');
      expect(runtime.epoch, 0);
      auth.switchTo('account-B');
      expect(runtime.epoch, 1);
      auth.switchTo('account-A');
      expect(runtime.epoch, 2);
      runtime.dispose();
      auth.events.close();
    },
  );

  test('logout clears account after SDK confirms; failure is safe', () async {
    final auth = FakeAuth();
    final runtime = MobileRuntime(auth: auth);
    auth.offline = true;
    await expectLater(
      runtime.signOut(),
      throwsA(
        isA<SessionFailure>().having(
          (error) => error.code,
          'code',
          'AUTH_UNAVAILABLE',
        ),
      ),
    );
    expect(runtime.accountId, 'account-A');
    auth.offline = false;
    await runtime.signOut();
    expect(runtime.accountId, isNull);
    expect(runtime.epoch, 1);
    runtime.dispose();
    await auth.events.close();
  });

  test(
    'password and raw failures never become public runtime error text',
    () async {
      final auth = FakeAuth()..offline = true;
      final runtime = MobileRuntime(auth: auth);
      try {
        await runtime.signIn(
          'test@example.test',
          'test-only-not-a-real-password',
        );
        fail('must fail');
      } on SessionFailure catch (error) {
        expect(error.toString(), 'AUTH_UNAVAILABLE');
      }
      runtime.dispose();
      await auth.events.close();
    },
  );
}
