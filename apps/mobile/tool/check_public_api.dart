// Explicit, read-only live probe. No credentials, mutations or mock fallback.
import 'dart:convert';
import 'dart:io';

import 'package:qadam_mobile/data/response_validation.dart';

Future<void> main(List<String> args) async {
  if (args.length != 2) {
    stderr.writeln(
      'Usage: dart run tool/check_public_api.dart <public-config.json> <report.json>',
    );
    exitCode = 2;
    return;
  }
  final config = jsonDecode(await File(args[0]).readAsString()) as Map;
  const allowed = {'API_BASE_URL', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY'};
  if (config.length != 3 || !config.keys.every(allowed.contains)) {
    throw StateError('Only the three public configuration fields are allowed.');
  }
  final base = Uri.parse(config['API_BASE_URL'] as String);
  if (base.scheme != 'https' ||
      base.userInfo.isNotEmpty ||
      base.hasQuery ||
      base.hasFragment ||
      base.path != '/api/v1') {
    throw StateError('Use the agreed HTTPS API base ending in /api/v1.');
  }
  final client = HttpClient()..connectionTimeout = const Duration(seconds: 25);
  final checks = <Map<String, Object?>>[];
  final report = <String, Object?>{
    'checked_at_utc': DateTime.now().toUtc().toIso8601String(),
    'api_base_url': base.toString(),
    'execution': 'Dart HTTP from developer computer; not Android',
    'server_process_commit': 'unconfirmed',
    'authenticated_checks': 'not_run',
    'device_checks': 'not_run',
    'checks': checks,
  };
  Future<(HttpClientResponse, List<int>)> get(
    String path, {
    Map<String, String>? query,
    int expected = 200,
  }) async {
    final uri = base.replace(path: path, queryParameters: query);
    final request = await client
        .getUrl(uri)
        .timeout(const Duration(seconds: 25));
    request.followRedirects = false;
    final response = await request.close().timeout(const Duration(seconds: 25));
    final bytes = await response
        .fold<List<int>>(<int>[], (a, b) => a..addAll(b))
        .timeout(const Duration(seconds: 25));
    checks.add({
      'path': path,
      'query': query,
      'status': response.statusCode,
      'expected': expected,
    });
    if (response.statusCode != expected) {
      throw StateError('Unexpected HTTP status.');
    }
    return (response, bytes);
  }

  Future<Map<String, dynamic>> jsonGet(
    String path, {
    Map<String, String>? query,
  }) async {
    final (_, bytes) = await get(path, query: query);
    final value = jsonDecode(utf8.decode(bytes)) as Map<String, dynamic>;
    if (path.contains('/livestock/')) {
      validateLivestockResponse('GET', path, value);
    }
    return value;
  }

  try {
    final health = await jsonGet('/api/v1/health');
    if (health['status'] != 'ok') throw StateError('Health is not OK.');
    final spec = await jsonGet('/openapi.json');
    report['api_version'] = (spec['info'] as Map)['version'];
    if (report['api_version'] != '0.6.1') {
      throw StateError('Review changed API version.');
    }
    final feed = await jsonGet('/api/v1/livestock/listings');
    final items = (feed['items'] as List).cast<Map<String, dynamic>>();
    report['public_count_on_first_page'] = items.length;
    report['demo_count_on_first_page'] = items
        .where((v) => v['is_demo'] == true)
        .length;
    if (items.isNotEmpty) {
      final item = items.first;
      await jsonGet('/api/v1/livestock/listings/${item['id']}');
      final query = <String, String>{
        'species': item['species'] as String,
        'locality': item['locality'] as String,
        if (item['market'] != null) 'market': item['market'] as String,
      };
      final filtered = await jsonGet(
        '/api/v1/livestock/listings',
        query: query,
      );
      if (!(filtered['items'] as List).any((v) => v['id'] == item['id'])) {
        throw StateError(
          'The selected listing is missing from its market filter.',
        );
      }
      final absent = await jsonGet(
        '/api/v1/livestock/listings',
        query: {
          ...query,
          'market':
              '__mobile_readonly_no_match_${DateTime.now().microsecondsSinceEpoch}',
        },
      );
      if ((absent['items'] as List).isNotEmpty) {
        throw StateError('Market filter mismatch.');
      }
      final prices = await jsonGet('/api/v1/livestock/prices', query: query);
      report['prices'] = {
        for (final key in [
          'market',
          'period_from',
          'period_to',
          'sample_count',
          'min_price_per_head_minor',
          'median_price_per_head_minor',
          'status',
        ])
          key: prices[key],
      };
      if (prices['sample_count'] == 0 &&
          prices['min_price_per_head_minor'] != null) {
        throw StateError('Empty minimum must be null.');
      }
      final photos = item['photos'] as List;
      if (photos.isNotEmpty) {
        final photo = photos.first as Map;
        final (response, bytes) = await get(photo['url'] as String);
        if (response.headers.contentType?.mimeType != 'image/jpeg' ||
            bytes.isEmpty) {
          throw StateError('Invalid public photo.');
        }
        report['public_photo_bytes'] = bytes.length;
        await get('/api/v1/livestock/me/photos/${photo['id']}', expected: 401);
      }
    }
    await get('/api/v1/livestock/me/listings', expected: 401);
    report['result'] = 'pass';
  } catch (error) {
    report['result'] = 'fail';
    // Do not serialize response bodies, auth values or arbitrary exception text.
    report['failure_type'] = error.runtimeType.toString();
    exitCode = 1;
  } finally {
    client.close(force: true);
    await File(
      args[1],
    ).writeAsString(const JsonEncoder.withIndent('  ').convert(report));
    stdout.writeln(
      'Public live probe: ${report['result']}; ${checks.length} HTTP checks.',
    );
  }
}
