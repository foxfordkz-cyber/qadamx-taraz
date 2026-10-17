import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:qadam_mobile/crm/crm_analytics.dart';
import 'package:qadam_mobile/crm/crm_daily.dart';
import 'package:qadam_mobile/crm/crm_dashboard.dart';
import 'package:qadam_mobile/crm/crm_pages.dart';
import 'package:qadam_mobile/public/public_pages.dart';
import 'package:qadam_mobile/public/venue_assets.dart';
import 'package:qadam_mobile/ui/app.dart';
import 'package:qadam_mobile/ui/qadam_shell.dart';

import 'visual_fixture.dart';

// Opt in to PNG generation/comparison so everyday unit tests remain portable
// across host graphics engines. Layout and read-only assertions always run.
const captureGallery = bool.fromEnvironment('QADAM_GALLERY');
const galleryDirectory = String.fromEnvironment(
  'QADAM_GALLERY_DIR',
  defaultValue: 'visual-040-before',
);

enum _Screen {
  venues,
  venue,
  shop,
  inquiry,
  dashboard,
  sale,
  debts,
  history,
  analytics,
  daily,
  market,
  profile,
}

Widget _screen(_Screen screen, VisualFixture f) => switch (screen) {
  _Screen.venues => PublicHome(
    runtime: f.runtime,
    kk: f.kk,
    toggleLanguage: () {},
  ),
  _Screen.venue => VenuePage(
    runtime: f.runtime,
    venue: f.venue,
    asset: f.assets['kaikarmet'],
    kk: f.kk,
  ),
  _Screen.shop => PublicShopPage(
    runtime: f.runtime,
    slug: f.slug,
    expectedId: f.business,
    venue: f.venue,
    kk: f.kk,
  ),
  _Screen.inquiry => Scaffold(
    appBar: AppBar(title: Text(f.kk ? 'Өтінім' : 'Заявка')),
    body: SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: InquiryForm(
        runtime: f.runtime,
        business: f.business,
        name: f.shop['name'] as String,
        kk: f.kk,
      ),
    ),
  ),
  _Screen.dashboard => QadamShell(
    runtime: f.runtime,
    kk: f.kk,
    section: 0,
    onSection: (_) {},
    toggleLanguage: () {},
    login: (_) async {},
    market: const SizedBox.shrink(),
  ),
  _Screen.sale => OperationForm(
    runtime: f.runtime,
    business: f.business,
    kk: f.kk,
  ),
  _Screen.debts => LedgerPage(
    runtime: f.runtime,
    business: f.business,
    kk: f.kk,
    debts: true,
  ),
  _Screen.history => LedgerPage(
    runtime: f.runtime,
    business: f.business,
    kk: f.kk,
  ),
  _Screen.analytics => AnalyticsPage(
    runtime: f.runtime,
    business: f.business,
    kk: f.kk,
  ),
  _Screen.daily => DailySummaryPage(
    runtime: f.runtime,
    business: f.business,
    kk: f.kk,
  ),
  _Screen.market => MobileApp(runtime: f.runtime),
  _Screen.profile => QadamShell(
    runtime: f.runtime,
    kk: f.kk,
    section: 2,
    onSection: (_) {},
    toggleLanguage: () {},
    login: (_) async {},
    market: const SizedBox.shrink(),
  ),
};

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late Map<String, VenueAsset> assets;
  setUpAll(() async {
    await loadVisualFonts();
    assets = await VenueAsset.load();
    // Widget tests have no WebView platform implementation. Preload its script
    // so an asset I/O future cannot be trapped inside FakeAsync before the
    // viewer reaches its legitimate unsupported-platform fallback.
    await rootBundle.loadString('assets/venues/renderer.js');
  });
  setUp(() => FlutterSecureStorage.setMockInitialValues({}));

  Future<void> settle(WidgetTester tester, VisualFixture f) async {
    // Asset I/O and image decode are real; HTTP is exclusively MockClient.
    await tester.runAsync(() async {
      await VenueAsset.load();
      final context = tester.element(find.byType(MaterialApp).first);
      await Future.wait([
        for (final asset in f.assets.values)
          precacheImage(AssetImage(asset.poster), context),
      ]);
    });
    await tester.pumpAndSettle();
  }

  Future<void> capture(WidgetTester tester, String name) async {
    expect(
      tester.takeException(),
      isNull,
      reason: 'No clipped/overflowing layout or framework failure in $name',
    );
    if (captureGallery) {
      await expectLater(
        find.byKey(visualCaptureKey),
        matchesGoldenFile('../../docs/reports/$galleryDirectory/$name.png'),
      );
    }
  }

  Future<void> run(
    WidgetTester tester,
    _Screen screen,
    double width,
    double scale,
    bool kk, {
    bool longText = false,
  }) async {
    tester.view.physicalSize = Size(width, 740);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    if (screen == _Screen.venue) {
      // No Android platform views exist in flutter_tester. Exercise the actual
      // unsupported-platform fallback instead of inventing a working WebView.
      debugDefaultTargetPlatformOverride = TargetPlatform.windows;
      addTearDown(() => debugDefaultTargetPlatformOverride = null);
    }
    final f = VisualFixture(assets, kk: kk, longText: longText);
    await tester.pumpWidget(
      visualHost(_screen(screen, f), kk: kk, scale: scale),
    );
    await settle(tester, f);
    if (screen == _Screen.dashboard) {
      final choice = find.byKey(ValueKey('business-${f.business}'));
      await tester.ensureVisible(choice);
      await tester.tap(choice);
      await settle(tester, f);
      expect(find.byType(CrmDashboard), findsOneWidget);
      final scrollable = find
          .descendant(
            of: find.byType(ListView).first,
            matching: find.byType(Scrollable),
          )
          .first;
      tester.state<ScrollableState>(scrollable).position.jumpTo(0);
      await tester.pumpAndSettle();
    }
    if (screen == _Screen.market) {
      if (kk) {
        await tester.tap(find.text('ҚАЗ').hitTestable().first);
        await settle(tester, f);
      }
      await tester.tap(find.text('Мал базар').hitTestable().last);
      await settle(tester, f);
    }
    if (screen == _Screen.shop) {
      expect(find.text(f.shop['name'] as String), findsWidgets);
    }
    if (screen == _Screen.venues) {
      expect(
        find.text(assets.values.first.data['name'] as String),
        findsWidgets,
      );
    }
    final name =
        '${screen.name}-${kk ? 'kk' : 'ru'}-${width.toInt()}-x${scale.toStringAsFixed(1)}${longText ? '-long' : ''}';
    await capture(tester, name);
    expect(f.requests.every((r) => r.method == 'GET'), isTrue);
    await tester.pumpWidget(const SizedBox.shrink());
    await f.dispose();
    debugDefaultTargetPlatformOverride = null;
  }

  // Exact 0.4.0 source with a synthetic test-only host, not Android acceptance.
  for (final screen in _Screen.values) {
    testWidgets(
      'baseline ${screen.name} RU 390 text 1.0',
      (tester) => run(tester, screen, 390, 1, false),
    );
  }
  for (final screen in [_Screen.venues, _Screen.shop, _Screen.dashboard]) {
    testWidgets(
      'baseline ${screen.name} RU 320 text 2.0',
      (tester) => run(tester, screen, 320, 2, false),
    );
    testWidgets(
      'baseline ${screen.name} KZ 320 text 2.0 long',
      (tester) => run(tester, screen, 320, 2, true, longText: true),
    );
  }
}
