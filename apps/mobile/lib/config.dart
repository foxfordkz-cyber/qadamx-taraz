import 'dart:convert';

import 'package:flutter/foundation.dart';

/// Only these three public values belong in an APK. No credentials or server keys.
class AppConfig {
  const AppConfig({
    this.apiBaseUrl = '',
    this.supabaseUrl = sharedSupabaseUrl,
    this.supabasePublishableKey = '',
    this.release = kReleaseMode,
  });

  factory AppConfig.fromEnvironment() => const AppConfig(
    apiBaseUrl: String.fromEnvironment('API_BASE_URL'),
    supabaseUrl: String.fromEnvironment(
      'SUPABASE_URL',
      defaultValue: sharedSupabaseUrl,
    ),
    supabasePublishableKey: String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY'),
  );

  static const sharedSupabaseUrl = 'https://pdjjdqgoitnkpgkbqjtp.supabase.co';
  final String apiBaseUrl;
  final String supabaseUrl;
  final String supabasePublishableKey;
  final bool release;

  Uri? get apiUri {
    final uri = Uri.tryParse(apiBaseUrl.trim());
    if (uri == null ||
        !uri.hasAuthority ||
        uri.host.isEmpty ||
        uri.userInfo.isNotEmpty ||
        uri.hasQuery ||
        uri.hasFragment ||
        !['http', 'https'].contains(uri.scheme) ||
        (release && uri.scheme != 'https') ||
        uri.path.replaceFirst(RegExp(r'/$'), '') != '/api/v1' ||
        uri.host == Uri.parse(sharedSupabaseUrl).host) {
      return null;
    }
    return uri.replace(path: '/api/v1');
  }

  bool get authConfigured =>
      supabaseUrl == sharedSupabaseUrl && isPublicKey(supabasePublishableKey);

  String? get errorCode {
    if (apiBaseUrl.trim().isEmpty) return 'API_NOT_CONFIGURED';
    if (apiUri == null) return 'INVALID_API_CONFIG';
    if (supabaseUrl != sharedSupabaseUrl) return 'INVALID_AUTH_CONFIG';
    if (supabasePublishableKey.isNotEmpty && !authConfigured) {
      return 'INVALID_AUTH_CONFIG';
    }
    return null;
  }

  static bool isPublicKey(String key) {
    if (RegExp(r'^sb_publishable_[A-Za-z0-9_-]{16,}$').hasMatch(key)) {
      return true;
    }
    // Legacy anon JWTs are public configuration too. This is a configuration
    // guard, not JWT authentication; the SDK/server verify actual sessions.
    try {
      final parts = key.split('.');
      if (parts.length != 3) return false;
      final payload = jsonDecode(
        utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))),
      );
      return payload is Map &&
          payload['role'] == 'anon' &&
          payload['ref'] == 'pdjjdqgoitnkpgkbqjtp';
    } catch (_) {
      return false;
    }
  }
}
