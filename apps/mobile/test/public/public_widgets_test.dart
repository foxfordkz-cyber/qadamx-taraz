import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:qadam_mobile/ui/app.dart';
import 'package:qadam_mobile/public/public_pages.dart';
import 'package:qadam_mobile/public/venue_assets.dart';
import '../support/shell_fixture.dart';

void main() {
  setUp(() {
    FlutterSecureStorage.setMockInitialValues({});
    rootBundle.evict('assets/venues/venue-assets.json');
  });
  for (final kk in [false, true]) {
    testWidgets(
      'native anonymous venue -> shop -> inquiry, 320px font2 keyboard, kk=$kk',
      (tester) async {
        tester.view.physicalSize = const Size(320, 640);
        tester.view.devicePixelRatio = 1;
        tester.platformDispatcher.textScaleFactorTestValue = 2;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
        const venueId = '33333333-3333-4333-8333-333333333333';
        final venue = {
          'id': venueId,
          'slug': 'fixture-venue',
          'name': 'Учебная площадка',
          'address_label': 'Условная площадка',
          'geometry_status': 'conceptual',
          'is_demo': true,
        };
        final shop = {
          'id': pointA,
          'venue_id': venueId,
          'slug': 'fixture-shop',
          'name': 'Учебный магазин',
          'category': 'clothes',
          'description': 'Учебное описание',
          'is_demo': true,
        };
        var mutations = 0;
        final opened = <Uri>[];
        final f = ShellFixture(
          owner: null,
          me: (_) async => throw StateError('No private call'),
          public: (request) async {
            expect(request.headers.containsKey('authorization'), isFalse);
            if (request.method != 'GET') {
              mutations++;
              throw StateError('No implicit submission');
            }
            if (request.url.path.endsWith('/venues')) {
              return jsonResponse({
                'items': [venue],
                'next_cursor': null,
              });
            }
            if (request.url.path.endsWith('/businesses')) {
              return jsonResponse({
                'items': [shop],
                'next_cursor': null,
              });
            }
            return jsonResponse({
              ...shop,
              'catalog': [
                {
                  'id': pointB,
                  'business_id': pointA,
                  'name': 'Учебный товар',
                  'price_minor': null,
                  'available': true,
                  'is_demo': true,
                },
              ],
            });
          },
        );
        Future<void> settle() async {
          await tester.runAsync(() => VenueAsset.load());
          await tester.pumpAndSettle();
        }

        Future<void> reveal(Finder finder) async {
          await tester.scrollUntilVisible(
            finder,
            200,
            scrollable: find
                .descendant(
                  of: find.byType(ListView).last,
                  matching: find.byType(Scrollable),
                )
                .first,
            maxScrolls: 50,
          );
          await settle();
        }

        await tester.pumpWidget(
          MobileApp(
            runtime: f.runtime,
            browserLauncher: (url) async {
              opened.add(url);
              return true;
            },
          ),
        );
        await settle();
        if (kk) {
          await tester.tap(find.text('ҚАЗ'));
          await settle();
        }
        final venueButton = find.text(
          kk ? 'Алаң дүкендері' : 'Магазины площадки',
        );
        await reveal(venueButton);
        await tester.tap(venueButton);
        await settle();
        expect(find.byType(VenuePage), findsOneWidget);
        final shopButton = find.text(kk ? 'Дүкенді ашу' : 'Открыть магазин');
        await reveal(shopButton);
        await tester.tap(shopButton);
        await settle();
        expect(find.byType(PublicShopPage), findsOneWidget);
        final price = find.text(
          kk ? 'Бағасы көрсетілмеген' : 'Цена не указана',
        );
        await reveal(price);
        expect(price, findsOneWidget);
        final input = find.widgetWithText(
          TextFormField,
          kk ? 'Не іздеп жүрсіз?' : 'Что вы ищете?',
        );
        await reveal(input);
        await tester.enterText(input, 'Учебный вопрос');
        tester.view.viewInsets = const FakeViewPadding(bottom: 250);
        await tester.pump();
        final submit = find.text(kk ? 'Өтінім жіберу' : 'Отправить заявку');
        await reveal(submit);
        expect(submit.hitTestable(), findsOneWidget);
        expect(mutations, 0);
        expect(opened, isEmpty);
        expect(tester.takeException(), isNull);
        tester.view.resetViewInsets();
        await tester.pump();
        await tester.tap(find.byType(BackButton));
        await settle();
        expect(find.byType(VenuePage), findsOneWidget);
        await tester.pumpWidget(const SizedBox());
        f.dispose();
      },
    );
  }
}
