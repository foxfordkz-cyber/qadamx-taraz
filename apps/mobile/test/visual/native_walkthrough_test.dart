import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:qadam_mobile/crm/crm_dashboard.dart';
import 'package:qadam_mobile/public/public_pages.dart';
import 'package:qadam_mobile/public/venue_assets.dart';
import 'package:qadam_mobile/ui/app.dart';

import 'visual_fixture.dart';

/// Opt-in, local-only native widget walkthrough. No platform-device claims.
/// Produces PNG milestones and timings; the root agent can encode them to video.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('synthetic native navigation walkthrough', (tester) async {
    FlutterSecureStorage.setMockInitialValues({});
    await tester.runAsync(loadVisualFonts);
    final assets = await tester.runAsync(VenueAsset.load);
    final f = VisualFixture(assets!);
    tester.view.physicalSize = const Size(390, 740);
    tester.view.devicePixelRatio = 1;
    // flutter_tester cannot host a device WebView. Show its real fallback.
    debugDefaultTargetPlatformOverride = TargetPlatform.windows;
    final frames = <Map<String, Object>>[];
    final output = Directory(
      Platform.environment['QADAM_WALKTHROUGH_DIR'] ??
          '../../../mobile-parity-output/walkthrough050',
    ).absolute;

    Future<void> settle() async {
      await tester.runAsync(() async {
        await VenueAsset.load();
        final context = tester.element(find.byType(MaterialApp).first);
        await Future.wait([
          for (final asset in assets.values)
            precacheImage(AssetImage(asset.poster), context),
        ]);
      });
      await tester.pumpAndSettle();
    }

    Future<void> reveal(Finder target) async {
      if (target.evaluate().isNotEmpty) {
        await tester.ensureVisible(target);
        await settle();
        return;
      }
      await tester.scrollUntilVisible(
        target,
        180,
        scrollable: find
            .descendant(
              of: find.byType(ListView).last,
              matching: find.byType(Scrollable),
            )
            .first,
        maxScrolls: 40,
      );
      await settle();
    }

    Future<void> frame(String label) async {
      await settle();
      expect(tester.takeException(), isNull);
      final boundary = tester.renderObject<RenderRepaintBoundary>(
        find.byKey(visualCaptureKey),
      );
      final name = '${frames.length.toString().padLeft(3, '0')}-$label.png';
      await tester.runAsync(() async {
        final image = await boundary.toImage(pixelRatio: 1);
        try {
          final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
          await output.create(recursive: true);
          await File(
            '${output.path}/$name',
          ).writeAsBytes(bytes!.buffer.asUint8List());
        } finally {
          image.dispose();
        }
      });
      frames.add({'file': name, 'duration_seconds': 3, 'milestone': label});
    }

    try {
      await tester.pumpWidget(
        visualHost(MobileApp(runtime: f.runtime), kk: false, scale: 1),
      );
      await frame('venues');
      final venue = find
          .ancestor(of: find.text('Кайкармет'), matching: find.byType(InkWell))
          .first;
      await reveal(venue);
      await tester.tap(venue);
      await settle();
      expect(find.byType(VenuePage), findsOneWidget);
      await frame('venue-image-fallback');
      final shop = find
          .ancestor(
            of: find.text(f.shop['name'] as String),
            matching: find.byType(InkWell),
          )
          .first;
      await reveal(shop);
      await frame('venue-shop-list');
      await tester.tap(shop);
      await settle();
      expect(find.byType(PublicShopPage), findsOneWidget);
      await frame('native-shop-catalog');
      final inquiry = find
          .ancestor(
            of: find.text('Оставить заявку').first,
            matching: find.byWidgetPredicate(
              (widget) => widget is FilledButton,
            ),
          )
          .first;
      await reveal(inquiry);
      await tester.tap(inquiry);
      await frame('inquiry-no-submission');
      await tester.tap(find.byType(BackButton));
      await settle();
      expect(find.byType(VenuePage), findsOneWidget);
      await frame('venue-return-preserves-list');
      await tester.tap(find.byType(BackButton));
      await settle();
      await tester.tap(find.byKey(const Key('nav-business')));
      await settle();
      await frame('business-selection');
      final point = find.byKey(ValueKey('business-${f.business}'));
      await reveal(point);
      await tester.tap(point);
      await settle();
      expect(find.byType(CrmDashboard), findsOneWidget);
      final businessScroll = find
          .descendant(
            of: find.byType(ListView).first,
            matching: find.byType(Scrollable),
          )
          .first;
      tester.state<ScrollableState>(businessScroll).position.jumpTo(0);
      await frame('seller-dashboard');
      final history = find.text('История');
      await reveal(history);
      await tester.tap(history);
      await frame('operation-history-readonly');
      await tester.tap(find.byType(BackButton));
      await settle();
      final analytics = find.text('Аналитика');
      await reveal(analytics);
      await tester.tap(analytics);
      await frame('analytics');
      final daily = find.byKey(const Key('analytics-daily-chart'));
      await reveal(daily);
      await frame('analytics-daily');
      await tester.tap(find.byType(BackButton));
      await settle();
      await tester.tap(find.byKey(const Key('nav-profile')));
      await frame('profile');
      expect(f.requests.every((r) => r.method == 'GET'), isTrue);
      await tester.runAsync(() async {
        await File('${output.path}/manifest.json').writeAsString(
          const JsonEncoder.withIndent('  ').convert({
            'kind': 'actual_flutter_widget_navigation_with_synthetic_http',
            'not_android_device_or_emulator_recording': true,
            'source_sha': const String.fromEnvironment(
              'QADAM_SOURCE_SHA',
              defaultValue: 'working-tree',
            ),
            'logical_width': 390,
            'logical_height': 740,
            'text_scale': 1.0,
            'network_writes': 0,
            'real_auth': false,
            'webview': 'unsupported-platform image fallback',
            'frames': frames,
          }),
        );
      });
    } finally {
      await tester.pumpWidget(const SizedBox.shrink());
      await f.dispose();
      debugDefaultTargetPlatformOverride = null;
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    }
  }, skip: !const bool.fromEnvironment('QADAM_WALKTHROUGH'));
}
