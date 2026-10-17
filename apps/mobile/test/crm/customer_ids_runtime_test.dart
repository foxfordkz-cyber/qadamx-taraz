import 'package:flutter_test/flutter_test.dart';
import 'package:qadam_mobile/config.dart';
import 'package:qadam_mobile/runtime.dart';

void main() {
  test('verified production URL enables ids in the actual runtime client', () {
    final runtime = MobileRuntime(
      config: const AppConfig(
        apiBaseUrl: 'https://qadamx-taraz.onrender.com/api/v1',
        release: true,
      ),
    );
    addTearDown(runtime.dispose);
    expect(runtime.crmApi!.customerIdsEnabled, isTrue);
  });

  test('canonical trailing slash still identifies the verified API', () {
    final runtime = MobileRuntime(
      config: const AppConfig(
        apiBaseUrl: 'https://qadamx-taraz.onrender.com/api/v1/',
        release: true,
      ),
    );
    addTearDown(runtime.dispose);
    expect(
      runtime.crmApi!.baseUrl.toString(),
      'https://qadamx-taraz.onrender.com/api/v1',
    );
    expect(runtime.crmApi!.customerIdsEnabled, isTrue);
  });

  for (final apiUrl in [
    'https://preview.example.test/api/v1',
    'https://qadamx-taraz.onrender.com.example.test/api/v1',
    'https://qadamx-taraz.onrender.com:8443/api/v1',
    'http://qadamx-taraz.onrender.com/api/v1',
  ]) {
    test('unverified origin remains default-off: $apiUrl', () {
      final runtime = MobileRuntime(
        config: AppConfig(apiBaseUrl: apiUrl, release: false),
      );
      addTearDown(runtime.dispose);
      expect(runtime.crmApi, isNotNull);
      expect(runtime.crmApi!.customerIdsEnabled, isFalse);
    });
  }

  test('missing config does not create or enable a CRM API', () {
    final runtime = MobileRuntime();
    addTearDown(runtime.dispose);
    expect(runtime.crmApi, isNull);
  });
}
