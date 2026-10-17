import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'api_failure.dart';

class BusinessMembership {
  const BusinessMembership({
    required this.id,
    required this.slug,
    required this.name,
    required this.role,
  });
  final String id;
  final String slug;
  final String name;
  final String role;
}

/// Read-only /me contract, pinned to API 0.6.1. Membership is descriptive;
/// authorization of every business request remains the server's responsibility.
class AccountApi {
  AccountApi({
    required Uri baseUrl,
    required String? Function() accountId,
    required int Function() epoch,
    required Future<String?> Function() accessToken,
    http.Client? client,
    this.timeout = const Duration(seconds: 25),
  }) : _url = baseUrl.replace(path: '/api/v1/me'),
       _accountId = accountId,
       _epoch = epoch,
       _accessToken = accessToken,
       _client = client ?? http.Client() {
    if (!['http', 'https'].contains(baseUrl.scheme) ||
        baseUrl.host.isEmpty ||
        baseUrl.userInfo.isNotEmpty ||
        baseUrl.hasQuery ||
        baseUrl.hasFragment ||
        !['/api/v1', '/api/v1/'].contains(baseUrl.path)) {
      throw const ApiFailure('INVALID_API_URL');
    }
  }
  final Uri _url;
  final String? Function() _accountId;
  final int Function() _epoch;
  final Future<String?> Function() _accessToken;
  final http.Client _client;
  final Duration timeout;

  Future<List<BusinessMembership>> memberships() async {
    final owner = _accountId();
    final generation = _epoch();
    if (owner == null) throw const ApiFailure('AUTH_REQUIRED');
    void checkOwner() {
      if (_accountId() != owner || _epoch() != generation) {
        throw const ApiFailure('ACCOUNT_CHANGED');
      }
    }

    try {
      final token = await _accessToken().timeout(timeout);
      checkOwner();
      if (token == null || token.isEmpty) {
        throw const ApiFailure('AUTH_REQUIRED');
      }
      final request = http.Request('GET', _url)
        ..followRedirects = false
        ..headers.addAll({
          'Authorization': 'Bearer $token',
          'Accept': 'application/json',
        });
      final response = await _client
          .send(request)
          .then(http.Response.fromStream)
          .timeout(timeout);
      checkOwner();
      if (response.statusCode != 200) {
        throw ApiFailure(
          response.statusCode == 401 ? 'AUTH_REQUIRED' : 'ACCOUNT_UNAVAILABLE',
          statusCode: response.statusCode,
        );
      }
      final data = jsonDecode(utf8.decode(response.bodyBytes));
      if (data is! Map || data['id'] != owner || data['businesses'] is! List) {
        throw const ApiFailure('INVALID_RESPONSE');
      }
      final ids = <String>{};
      final result = <BusinessMembership>[];
      for (final item in data['businesses'] as List) {
        if (item is! Map ||
            item['id'] is! String ||
            !RegExp(
              r'^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$',
            ).hasMatch(item['id'] as String) ||
            !ids.add(item['id'] as String) ||
            item['slug'] is! String ||
            (item['slug'] as String).isEmpty ||
            item['name'] is! String ||
            (item['name'] as String).trim().isEmpty ||
            (item.containsKey('role') && item['role'] != 'owner')) {
          throw const ApiFailure('INVALID_RESPONSE');
        }
        result.add(
          BusinessMembership(
            id: item['id'] as String,
            slug: item['slug'] as String,
            name: item['name'] as String,
            role: item['role'] as String? ?? 'owner',
          ),
        );
      }
      return List.unmodifiable(result);
    } on ApiFailure {
      rethrow;
    } on FormatException {
      checkOwner();
      throw const ApiFailure('INVALID_RESPONSE');
    } catch (_) {
      checkOwner();
      throw const ApiFailure('ACCOUNT_UNAVAILABLE');
    }
  }

  void close() => _client.close();
}
