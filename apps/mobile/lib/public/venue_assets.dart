import 'dart:convert';
import 'package:flutter/services.dart';
import '../crm/crm_models.dart';
import '../data/api_failure.dart';

class VenueAsset {
  VenueAsset(this.data) {
    if (!const ['mart', 'kaikarmet', 'auyl-bereke'].contains(data['slug']))
      throw const ApiFailure('INVALID_RESPONSE');
    for (final name in [
      'camera_position',
      'camera_target',
      'bounds_min',
      'bounds_max',
    ]) {
      final vector = data[name];
      if (vector is! List ||
          vector.length != 3 ||
          vector.any((n) => n is! num || !n.isFinite)) {
        throw const ApiFailure('INVALID_RESPONSE');
      }
    }
    if (data['hotspots'] is! List) throw const ApiFailure('INVALID_RESPONSE');
    final ids = <String>{};
    for (final h in hotspots) {
      crmId(h, 'business_id');
      crmString(h, 'business_slug');
      if (!ids.add(crmString(h, 'id')))
        throw const ApiFailure('INVALID_RESPONSE');
      final p = h['position'];
      if (p is! List || p.length != 3 || p.any((n) => n is! num || !n.isFinite))
        throw const ApiFailure('INVALID_RESPONSE');
    }
  }
  final CrmJson data;
  String get slug => data['slug'] as String;
  String get poster => 'assets/venues/previews/$slug.webp';
  String get model => 'assets/venues/models/$slug.glb';
  List<CrmJson> get hotspots =>
      (data['hotspots'] as List).map(crmObject).toList();
  CrmJson? businessFor(
    String hotspotId,
    String venueId,
    List<CrmJson> businesses,
  ) {
    for (final h in hotspots) {
      if (h['id'] != hotspotId) continue;
      for (final b in businesses) {
        if (b['venue_id'] == venueId &&
            b['id'] == h['business_id'] &&
            b['slug'] == h['business_slug'])
          return b;
      }
    }
    return null;
  }

  static Future<Map<String, VenueAsset>> load() async {
    final manifest = crmObject(
      jsonDecode(
        await rootBundle.loadString('assets/venues/venue-assets.json'),
      ),
    );
    if (manifest['schema_version'] != 1 || manifest['venues'] is! List)
      throw const ApiFailure('INVALID_RESPONSE');
    final items = (manifest['venues'] as List).map(
      (v) => VenueAsset(crmObject(v)),
    );
    return {for (final asset in items) asset.slug: asset};
  }
}
