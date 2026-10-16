import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:qadam_mobile/config.dart';

void main() {
  test('unconfigured APK has no synthetic server or listings', () {
    const config = AppConfig();
    expect(config.apiUri, isNull);
    expect(config.authConfigured, isFalse);
    expect(config.errorCode, 'API_NOT_CONFIGURED');
  });

  test('requires exact API prefix and disallows credentials/queries', () {
    for (final url in [
      'https://api.example.test',
      'https://user:password@api.example.test/api/v1',
      'https://api.example.test/api/v1?token=forbidden',
      'https://api.example.test/api/v1#fragment',
      '${AppConfig.sharedSupabaseUrl}/api/v1',
      'file:///api/v1',
    ]) {
      expect(AppConfig(apiBaseUrl: url).apiUri, isNull);
    }
    expect(
      const AppConfig(apiBaseUrl: 'https://api.example.test/api/v1/').apiUri,
      Uri.parse('https://api.example.test/api/v1'),
    );
  });

  test('release rejects cleartext; debug permits approved LAN configuration', () {
    const url = 'http://192.0.2.1:8000/api/v1';
    expect(const AppConfig(apiBaseUrl: url, release: true).apiUri, isNull);
    expect(const AppConfig(apiBaseUrl: url, release: false).apiUri, isNotNull);
  });

  test('rejects server keys and wrong Supabase project', () {
    String jwt(String role, String ref) =>
        'header.${base64Url.encode(utf8.encode(jsonEncode({'role': role, 'ref': ref})))}.signature';
    expect(AppConfig.isPublicKey('sb_secret_never_an_app_key'), isFalse);
    expect(
      AppConfig.isPublicKey(jwt('service_role', 'pdjjdqgoitnkpgkbqjtp')),
      isFalse,
    );
    expect(AppConfig.isPublicKey(jwt('anon', 'another-project')), isFalse);
    expect(
      AppConfig.isPublicKey(jwt('anon', 'pdjjdqgoitnkpgkbqjtp')),
      isTrue,
    );
    expect(AppConfig.isPublicKey('sb_publishable_test_public_key_1234'), isTrue);
    expect(
      const AppConfig(
        supabaseUrl: 'https://another-project.supabase.co',
        supabasePublishableKey: 'sb_publishable_test_public_key_1234',
      ).authConfigured,
      isFalse,
    );
  });
}
