import 'package:flutter_test/flutter_test.dart';
import 'package:qadam_mobile/public/public_pages.dart';
import 'package:qadam_mobile/public/venue_assets.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test(
    'all nine manifest points order correctly; unknown entries stay stable',
    () async {
      final assets = await VenueAsset.load();
      var count = 0;
      for (final asset in assets.values) {
        final shops = [
          for (final h in asset.hotspots)
            <String, dynamic>{
              'id': h['business_id'],
              'slug': h['business_slug'],
              'venue_id': 'venue',
            },
        ];
        final unknown = <String, dynamic>{
          'id': 'unknown',
          'slug': 'unknown',
          'venue_id': 'venue',
        };
        final mismatch = <String, dynamic>{...shops.first, 'slug': 'wrong'};
        final input = [unknown, ...shops.reversed, mismatch];
        final ordered = shopsInPointOrder(input, asset, 'venue');
        expect(ordered, [...shops, unknown, mismatch]);
        expect(input.first, unknown); // Original API response is not mutated.
        expect(shopsInPointOrder(input, null, 'venue'), input);
        count += shops.length;
      }
      expect(count, 9);
    },
  );
}
