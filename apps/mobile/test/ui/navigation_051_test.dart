import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:qadam_mobile/public/venue_assets.dart';
import 'package:qadam_mobile/ui/app.dart';

import '../support/shell_fixture.dart';

Future<void> settle(WidgetTester tester) async {
  await tester.pump();
  await tester.runAsync(VenueAsset.load);
  await tester.pumpAndSettle();
}

Future<void> reveal(WidgetTester tester, Finder target) async {
  await tester.scrollUntilVisible(
    target,
    140,
    scrollable: find
        .descendant(
          of: find.byType(ListView).first,
          matching: find.byType(Scrollable),
        )
        .first,
  );
  await tester.ensureVisible(target);
  await tester.pumpAndSettle();
}

void main() {
  setUp(() {
    FlutterSecureStorage.setMockInitialValues({});
    rootBundle.evict('assets/venues/venue-assets.json');
  });

  testWidgets(
    'livestock is a venue, system Back returns to venues, profile opens owned feed',
    (tester) async {
      final f = ShellFixture(
        me: (_) async => jsonResponse({'id': 'a', 'businesses': []}),
      );
      await tester.pumpWidget(MobileApp(runtime: f.runtime));
      await settle(tester);
      expect(find.byKey(const Key('home-explore')), findsOneWidget);
      final nav = tester.widget<NavigationBar>(find.byType(NavigationBar));
      expect(
        nav.destinations.cast<NavigationDestination>().map((d) => d.label),
        ['Главная', 'Площадки', 'Кабинет', 'Профиль'],
      );
      await tester.tap(find.byKey(const Key('home-explore')));
      await settle(tester);
      await reveal(tester, find.byKey(const Key('nav-market')));
      await tester.tap(find.byKey(const Key('nav-market')));
      await settle(tester);
      expect(find.text('Подать объявление'), findsOneWidget);
      await tester.binding.handlePopRoute();
      await settle(tester);
      expect(find.text('Площадки Тараза'), findsOneWidget);
      expect(find.text('Подать объявление'), findsNothing);
      await tester.tap(find.byKey(const Key('nav-profile')));
      await settle(tester);
      await reveal(tester, find.byKey(const Key('profile-listings')));
      await tester.tap(find.byKey(const Key('profile-listings')));
      await settle(tester);
      expect(
        tester
            .widget<SegmentedButton<int>>(find.byType(SegmentedButton<int>))
            .selected,
        {2},
      );
      expect(
        f.livestockRequests.any(
          (r) => r.url.path.endsWith('/livestock/me/listings'),
        ),
        isTrue,
      );
      expect(f.livestockRequests.every((r) => r.method == 'GET'), isTrue);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      f.dispose();
    },
  );

  for (final scale in [1.0, 1.3, 2.0]) {
    testWidgets(
      'home and useful profile fit 320dp at text scale $scale, RU/KZ stay in sync',
      (tester) async {
        tester.view.physicalSize = const Size(320, 640);
        tester.view.devicePixelRatio = 1;
        tester.platformDispatcher.textScaleFactorTestValue = scale;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
        final f = ShellFixture(
          owner: null,
          me: (_) async => throw StateError('no anonymous /me'),
        );
        await tester.pumpWidget(MobileApp(runtime: f.runtime));
        await settle(tester);
        expect(tester.takeException(), isNull);
        await tester.tap(find.byKey(const Key('nav-profile')));
        await settle(tester);
        expect(find.text('Добро пожаловать'), findsOneWidget);
        await reveal(tester, find.text('Қазақша'));
        await tester.tap(find.text('Қазақша'));
        await settle(tester);
        expect(find.text('Қолданба тілі'), findsOneWidget);
        await reveal(tester, find.byKey(const Key('profile-help')));
        await tester.tap(find.byKey(const Key('profile-help')));
        await settle(tester);
        expect(find.text('Qadam қолдану жолы'), findsOneWidget);
        await tester.binding.handlePopRoute();
        await settle(tester);
        await tester.tap(find.byKey(const Key('nav-home')));
        await settle(tester);
        expect(find.text('Тараз базарынан\nдүкен табыңыз'), findsOneWidget);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
        f.dispose();
      },
    );
  }
}
