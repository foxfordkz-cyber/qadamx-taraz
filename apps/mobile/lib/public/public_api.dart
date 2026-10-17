import 'dart:convert';

import 'package:http/http.dart' as http;

import '../crm/crm_models.dart';
import '../data/api_failure.dart';

/// Public API has no bearer token, cookies or private session dependency.
class PublicApi {
  PublicApi(
    this.baseUrl, {
    http.Client? client,
    this.timeout = const Duration(seconds: 20),
  }) : client = client ?? http.Client();
  final Uri baseUrl;
  final http.Client client;
  final Duration timeout;

  Future<CrmJson> request(
    String path, {
    Map<String, String>? query,
    CrmJson? body,
  }) async {
    final request = http.Request(
      body == null ? 'GET' : 'POST',
      baseUrl.replace(
        path: '${baseUrl.path.replaceAll(RegExp(r'/$'), '')}/$path',
        queryParameters: query,
      ),
    );
    request.followRedirects = false;
    if (body != null) {
      request.headers['Content-Type'] = 'application/json';
      request.body = jsonEncode(body);
    }
    try {
      final response = await client
          .send(request)
          .then(http.Response.fromStream)
          .timeout(timeout);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw ApiFailure(
          'PUBLIC_UNAVAILABLE',
          statusCode: response.statusCode,
          uncertain: body != null,
        );
      }
      return crmObject(jsonDecode(utf8.decode(response.bodyBytes)));
    } on ApiFailure {
      rethrow;
    } catch (_) {
      throw ApiFailure('PUBLIC_UNAVAILABLE', uncertain: body != null);
    }
  }

  Future<CrmPage> venues({String? cursor}) async => CrmPage.parse(
    await request('venues', query: {'limit': '100', 'cursor': ?cursor}),
    validateVenue,
  );
  Future<CrmPage> businesses({
    String? venue,
    String query = '',
    String category = '',
    String? cursor,
  }) async {
    if ((venue != null && !crmUuid.hasMatch(venue)) ||
        query.runes.length > 200 ||
        category.runes.length > 100) {
      throw const ApiFailure('VALIDATION_ERROR');
    }
    return CrmPage.parse(
      await request(
        'businesses',
        query: {
          'limit': '100',
          'venue_id': ?venue,
          'q': query,
          'category': category,
          'cursor': ?cursor,
        },
      ),
      (b) {
        validatePublicBusiness(b);
        if (venue != null && b['venue_id'] != venue) {
          throw const ApiFailure('INVALID_RESPONSE');
        }
      },
    );
  }

  Future<CrmJson> shop(String slug, {String? expectedId}) async {
    if (!RegExp(r'^[a-zA-Z0-9][a-zA-Z0-9_-]*$').hasMatch(slug)) {
      throw const ApiFailure('VALIDATION_ERROR');
    }
    final b = await request('businesses/${Uri.encodeComponent(slug)}');
    validatePublicBusiness(b);
    if (b['slug'] != slug ||
        (expectedId != null && b['id'] != expectedId) ||
        b['catalog'] is! List) {
      throw const ApiFailure('INVALID_RESPONSE');
    }
    for (final raw in b['catalog'] as List) {
      final item = crmObject(raw);
      crmId(item, 'id');
      crmBusiness(item, b['id'] as String);
      publicName(item, 'name');
      if (item['available'] is! bool || item['is_demo'] is! bool) {
        throw const ApiFailure('INVALID_RESPONSE');
      }
      if (item['price_minor'] != null &&
          crmInt(item, 'price_minor', nonnegative: true) > 10000000000) {
        throw const ApiFailure('INVALID_RESPONSE');
      }
    }
    return b;
  }

  void close() => client.close();
}

String publicName(CrmJson object, String key) {
  final value = crmString(object, key).trim();
  if (value.isEmpty || crmUuid.hasMatch(value)) {
    throw const ApiFailure('INVALID_RESPONSE');
  }
  return value;
}

void validateVenue(CrmJson v) {
  crmId(v, 'id');
  publicName(v, 'name');
  publicName(v, 'slug');
  crmString(v, 'address_label');
  crmString(v, 'geometry_status');
  if (v['is_demo'] is! bool) throw const ApiFailure('INVALID_RESPONSE');
}

void validatePublicBusiness(CrmJson b) {
  crmId(b, 'id');
  crmId(b, 'venue_id');
  publicName(b, 'name');
  publicName(b, 'slug');
  crmString(b, 'description');
  crmString(b, 'category');
  if (b['is_demo'] is! bool) throw const ApiFailure('INVALID_RESPONSE');
}
