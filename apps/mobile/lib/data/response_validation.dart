import 'api_failure.dart';
import 'money.dart';

final _uuidPattern = RegExp(
  r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
);
const _species = ['cattle', 'sheep', 'goat', 'horse', 'camel'];

bool _uuid(Object? value) => value is String && _uuidPattern.hasMatch(value);
bool _int(Object? value, int min, int max) =>
    value is int && value >= min && value <= max;
bool _text(Object? value, int min, int max) =>
    value is String && value.runes.length >= min && value.runes.length <= max;
// Optional fields retain compatibility with receipts saved before API 0.6.1.
bool _market(Map<String, dynamic> value) =>
    value['market'] == null ||
    (_text(value['market'], 1, 100) &&
        (value['market'] as String).trim().isNotEmpty);
bool _date(Object? value) {
  if (value is! String || !RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(value)) {
    return false;
  }
  final parsed = DateTime.tryParse(value);
  return parsed != null && parsed.toIso8601String().startsWith(value);
}

bool _timestamp(Object? value) =>
    value is String &&
    RegExp(
      r'^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|\+00:00)$',
    ).hasMatch(value) &&
    _date(value.substring(0, 10)) &&
    DateTime.tryParse(value) != null;

bool _photo(Object? value) {
  if (value is! Map || !_uuid(value['id']) || value['url'] is! String) {
    return false;
  }
  final url = value['url'] as String;
  return RegExp(
    r'^/api/v1/livestock/listings/[0-9a-fA-F-]{36}/photos/[0-9a-fA-F-]{36}$',
  ).hasMatch(url);
}

bool _listing(Map<String, dynamic> value, {required bool owner}) {
  final photos = value['photos'];
  final base =
      _uuid(value['id']) &&
      _species.contains(value['species']) &&
      _int(value['quantity'], 1, 10000) &&
      _int(value['price_per_head_minor'], 1, maxPriceMinor) &&
      _text(value['locality'], 1, 100) &&
      _market(value) &&
      value.containsKey('age_months') &&
      (value['age_months'] == null || _int(value['age_months'], 0, 600)) &&
      value.containsKey('sex') &&
      const [null, 'male', 'female', 'unknown'].contains(value['sex']) &&
      value.containsKey('description') &&
      (value['description'] == null || _text(value['description'], 0, 2000)) &&
      _text(value['contact'], 1, 200) &&
      value['currency'] == 'KZT' &&
      photos is List &&
      photos.length <= 3 &&
      photos.every(_photo) &&
      photos.map((photo) => (photo as Map)['id']).toSet().length ==
          photos.length &&
      _date(value['confirmed_on']) &&
      value['is_demo'] is bool;
  if (!base) return false;
  return !owner ||
      const ['active', 'sold', 'withdrawn'].contains(value['status']) &&
          value['available_today'] is bool &&
          _timestamp(value['created_at']) &&
          _timestamp(value['updated_at']);
}

bool _page(Map<String, dynamic> value, {required bool owner}) {
  final items = value['items'];
  return items is List &&
      items.length <= 100 &&
      value.containsKey('next_cursor') &&
      (value['next_cursor'] == null || _uuid(value['next_cursor'])) &&
      items.every(
        (item) => item is Map<String, dynamic> && _listing(item, owner: owner),
      );
}

bool _stats(Map<String, dynamic> value) {
  final count = value['sample_count'];
  final median = value['median_price_per_head_minor'];
  final common =
      _species.contains(value['species']) &&
      _text(value['locality'], 1, 100) &&
      _market(value) &&
      (value['min_price_per_head_minor'] == null ||
          _int(value['min_price_per_head_minor'], 1, maxPriceMinor)) &&
      _date(value['period_from']) &&
      _date(value['period_to']) &&
      value['timezone'] == 'Asia/Almaty' &&
      value['currency'] == 'KZT' &&
      value['unit'] == 'head' &&
      value['source'] == 'asking_prices' &&
      count is int &&
      count >= 0 &&
      value.containsKey('median_price_per_head_minor');
  if (!common) return false;
  return switch (value['status']) {
    'insufficient_data' => median == null && count < 5,
    'available' => _int(median, 1, maxPriceMinor) && count >= 5,
    _ => false,
  };
}

/// Reject malformed API data at the boundary instead of letting a dynamic cast
/// in a screen crash or treating an incomplete 2xx as a confirmed publication.
void validateLivestockResponse(
  String method,
  String path,
  Map<String, dynamic> value,
) {
  final route = path.startsWith('/api/v1/') ? path.substring(7) : path;
  final bool valid;
  if (method == 'GET') {
    valid = switch (route) {
      '/livestock/listings' => _page(value, owner: false),
      '/livestock/me/listings' => _page(value, owner: true),
      '/livestock/prices' => _stats(value),
      _ =>
        RegExp(r'^/livestock/listings/[0-9a-fA-F-]{36}$').hasMatch(route) &&
            _listing(value, owner: false),
    };
  } else if (method == 'POST' && route == '/livestock/photos') {
    valid = _uuid(value['id']);
  } else {
    valid = _listing(value, owner: true);
  }
  if (!valid) throw const ApiFailure('INVALID_RESPONSE', uncertain: true);
}
