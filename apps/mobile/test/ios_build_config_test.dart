import 'package:flutter_test/flutter_test.dart';

import '../tool/build_ios.dart';

void main() {
  final public = {
    'API_BASE_URL': 'https://api.example.test/api/v1',
    'SUPABASE_URL': 'https://pdjjdqgoitnkpgkbqjtp.supabase.co',
    'SUPABASE_PUBLISHABLE_KEY': 'sb_publishable_synthetic_fixture_only',
  };
  test('iOS build accepts only the complete public config', () {
    expect(() => validateIosPublicConfig(public), returnsNormally);
    expect(
      () => validateIosPublicConfig({...public, 'FRONTEND_BASE_URL': ''}),
      returnsNormally,
    );
    expect(
      () => validateIosPublicConfig({
        ...public,
        'FRONTEND_BASE_URL': 'https://web.example.test',
      }),
      returnsNormally,
    );
    for (final invalid in [
      {...public, 'PASSWORD': 'synthetic-not-a-password'},
      {...public}..remove('API_BASE_URL'),
      {...public, 'SUPABASE_PUBLISHABLE_KEY': 'sb_secret_synthetic_fixture'},
      {...public, 'SUPABASE_PUBLISHABLE_KEY': ''},
      {...public, 'SUPABASE_URL': 'https://other.example.test'},
      {...public, 'API_BASE_URL': 42},
    ]) {
      expect(() => validateIosPublicConfig(invalid), throwsFormatException);
    }
  });
  test(
    'optional frontend is a plain HTTPS origin, never a token handoff URL',
    () {
      for (final url in [
        42,
        'http://web.example.test',
        'https://user:pass@web.example.test',
        'https://web.example.test/login',
        'https://web.example.test?token=fixture',
        'https://web.example.test#access_token=fixture',
      ]) {
        expect(
          () => validateIosPublicConfig({...public, 'FRONTEND_BASE_URL': url}),
          throwsFormatException,
        );
      }
    },
  );
  test('iOS build refuses insecure, credential-bearing or wrong API URLs', () {
    for (final url in [
      'http://api.example.test/api/v1',
      'https://user:synthetic@api.example.test/api/v1',
      'https://api.example.test/api/v1?token=synthetic',
      'https://api.example.test/api/v1#fragment',
      'https://api.example.test/',
      'https://pdjjdqgoitnkpgkbqjtp.supabase.co/api/v1',
    ]) {
      expect(
        () => validateIosPublicConfig({...public, 'API_BASE_URL': url}),
        throwsFormatException,
      );
    }
  });
}
