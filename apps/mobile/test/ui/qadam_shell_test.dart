import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:qadam_mobile/frontend_links.dart';
import 'package:qadam_mobile/ui/app.dart';

import '../support/shell_fixture.dart';

void main() {
  setUp(() => FlutterSecureStorage.setMockInitialValues({}));
  Future<void> finish(WidgetTester tester, ShellFixture f) async {
    await tester.pumpWidget(const SizedBox.shrink());
    f.dispose();
  }

  testWidgets(
    'no membership still permits native livestock and a separate browser cabinet',
    (tester) async {
      final opened = <Uri>[];
      final f = ShellFixture(
        me: (_) async => jsonResponse({'id': 'a', 'businesses': []}),
      );
      await tester.pumpWidget(
        MobileApp(
          runtime: f.runtime,
          browserLauncher: (url) async {
            opened.add(url);
            return true;
          },
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Сегодня'), findsOneWidget);
      await tester.tap(find.byKey(const Key('nav-business')));
      await tester.pumpAndSettle();
      expect(find.text('Нет подключённых торговых точек'), findsOneWidget);
      final seller = find.byKey(const Key('open-seller'));
      await tester.ensureVisible(seller);
      await tester.tap(seller);
      await tester.pumpAndSettle();
      expect(opened.single.toString(), 'https://web.example.test/seller');
      expect(opened.single.hasQuery, false);
      expect(opened.single.hasFragment, false);
      await tester.tap(find.byKey(const Key('nav-market')));
      await tester.pumpAndSettle();
      expect(find.text('Подать объявление'), findsOneWidget);
      await tester.tap(find.text('Мои'));
      await tester.pumpAndSettle();
      expect(
        f.livestockRequests.any(
          (r) => r.url.path.endsWith('/livestock/me/listings'),
        ),
        isTrue,
      );
      expect(tester.takeException(), isNull);
      await finish(tester, f);
    },
  );
  testWidgets(
    'selected point is cleared on logout and different account login',
    (tester) async {
      late ShellFixture f;
      f = ShellFixture(
        me: (_) async => jsonResponse({
          'id': f.auth.account,
          'businesses': f.auth.account == 'a'
              ? [point(pointA, 'Учебная A'), point(pointB, 'Учебная B')]
              : [],
        }),
      );
      await tester.pumpWidget(MobileApp(runtime: f.runtime));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('nav-business')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('business-$pointB')));
      await tester.pumpAndSettle();
      expect(find.text('Активная точка: Учебная B'), findsOneWidget);
      await tester.tap(find.byKey(const Key('nav-profile')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Выйти из приложения'));
      await tester.pumpAndSettle();
      expect(find.text('Вы не вошли в аккаунт'), findsOneWidget);
      f.auth.change('b');
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('nav-business')));
      await tester.pumpAndSettle();
      expect(find.text('Нет подключённых торговых точек'), findsOneWidget);
      expect(find.textContaining('Учебная'), findsNothing);
      await finish(tester, f);
    },
  );
  testWidgets(
    'missing browser config and HTTP failure do not become fake memberships',
    (tester) async {
      final f = ShellFixture(
        frontend: '',
        me: (_) async => jsonResponse({}, 503),
      );
      await tester.pumpWidget(MobileApp(runtime: f.runtime));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('nav-business')));
      await tester.pumpAndSettle();
      expect(
        find.textContaining('Не удалось загрузить торговые точки'),
        findsOneWidget,
      );
      expect(find.text('Нет подключённых торговых точек'), findsNothing);
      expect(
        tester
            .widget<FilledButton>(find.byKey(const Key('open-seller')))
            .onPressed,
        isNull,
      );
      await tester.tap(find.byKey(const Key('nav-market')));
      await tester.pumpAndSettle();
      expect(find.text('Подать объявление'), findsOneWidget);
      await finish(tester, f);
    },
  );
  testWidgets(
    'small screen RU/KZ, browser launch failure and public showcase',
    (tester) async {
      tester.view.physicalSize = const Size(320, 568);
      tester.view.devicePixelRatio = 1;
      tester.platformDispatcher.textScaleFactorTestValue = 1.3;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      final opened = <Uri>[];
      final f = ShellFixture(
        owner: null,
        me: (_) async => throw StateError('Anonymous must not request /me'),
      );
      await tester.pumpWidget(
        MobileApp(
          runtime: f.runtime,
          browserLauncher: (url) async {
            opened.add(url);
            return false;
          },
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('nav-business')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('ҚАЗ'));
      await tester.pumpAndSettle();
      expect(find.text('Сіздің сауда нүктелеріңіз'), findsOneWidget);
      final showcase = find.byKey(const Key('open-showcase'));
      await tester.scrollUntilVisible(
        showcase,
        180,
        scrollable: find
            .descendant(
              of: find.byType(ListView),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      await tester.pumpAndSettle();
      await tester.tap(showcase);
      await tester.pumpAndSettle();
      expect(opened.single.toString(), 'https://web.example.test/');
      expect(find.text('Браузер ашылмады. Қайта көріңіз.'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await finish(tester, f);
    },
  );
  test('frontend links accept only an HTTPS origin, with no auth transfer', () {
    for (final input in [
      '',
      'http://web.example.test',
      'https://user:pass@web.example.test',
      'https://web.example.test/login',
      'https://web.example.test?token=fixture',
      'https://web.example.test#access_token=fixture',
      'javascript:alert(1)',
      'file:///tmp',
    ]) {
      expect(frontendUrl(input, FrontendPage.seller), isNull);
    }
    expect(
      frontendUrl('https://web.example.test/', FrontendPage.seller)?.toString(),
      'https://web.example.test/seller',
    );
  });
}
