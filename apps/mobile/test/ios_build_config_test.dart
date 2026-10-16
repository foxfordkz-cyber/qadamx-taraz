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
