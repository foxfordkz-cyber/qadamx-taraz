import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/testing.dart';
import 'package:qadam_mobile/crm/crm_analytics.dart';
import 'package:qadam_mobile/crm/crm_api.dart';
import 'package:qadam_mobile/crm/crm_charts.dart';
import 'package:qadam_mobile/crm/crm_dashboard.dart';
import 'package:qadam_mobile/crm/crm_models.dart';
import 'package:qadam_mobile/crm/crm_pending.dart';
import 'package:qadam_mobile/crm/crm_visual_components.dart';
import 'package:qadam_mobile/runtime.dart';
import 'package:qadam_mobile/ui/qadam_theme.dart';

import '../support/shell_fixture.dart' show ShellAuth;
import 'crm_test.dart' as fixture;

// Synthetic UI data, no real financial operations or account credentials.
CrmJson emptyAnalytics() => {
  'business_id': fixture.business,
  'days': 7,
  'timezone': 'Asia/Almaty',
  'currency': 'KZT',
  'today_incomplete': true,
  'as_of': '2026-10-17T10:00:00Z',
  'period_from': '2026-10-11',
  'period_to': '2026-10-17',
  'cards': {
    'sales_minor': 0,
    'receipts_minor': -5000,
    'sales_count': 0,
    'average_ticket_minor': null,
    'outstanding_minor': 0,
    'debtors_count': 0,
  },
  'daily': List.generate(
    7,
    (i) => {
      'date': '2026-10-${11 + i}',
      'sales_minor': 0,
      'receipts_minor': i == 0 ? -5000 : 0,
      'sales_count': 0,
      'is_partial': i == 6,
    },
  ),
  'hourly': List.generate(24, (i) => {'hour': i, 'sales_count': 0}),
};

Widget app(Widget child, {String language = 'ru'}) => MaterialApp(
  theme: QadamTheme.light,
  locale: Locale(language),
  supportedLocales: const [Locale('ru'), Locale('kk')],
  localizationsDelegates: const [
    GlobalMaterialLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
  ],
  home: child,
);

void main() {
  testWidgets('metrics grow at 2x, and use two columns at regular width', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    for (final scale in [1.0, 2.0]) {
      tester.platformDispatcher.textScaleFactorTestValue = scale;
      await tester.pumpWidget(
        app(
          Scaffold(
            body: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: CrmResponsiveGrid(
                children: const [
                  CrmMetric(
                    key: Key('first'),
                    label: 'Продажи за день',
                    value: '999 999 999 ₸',
                  ),
                  CrmMetric(
                    key: Key('second'),
                    label: 'Общий долг',
                    value: '888 888 888 ₸',
                    caption: 'За все даты',
                  ),
                ],
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      final first = tester.getTopLeft(find.byKey(const Key('first')));
      final second = tester.getTopLeft(find.byKey(const Key('second')));
      if (scale == 1) {
        expect(second.dy, first.dy);
        expect(second.dx, greaterThan(first.dx));
      } else {
        expect(second.dx, first.dx);
        expect(second.dy, greaterThan(first.dy));
      }
      expect(tester.takeException(), isNull);
    }
  });

  testWidgets(
    'daily chart keeps negative receipts, accessible data and selection at 2x',
    (tester) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      tester.platformDispatcher.textScaleFactorTestValue = 2;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      for (final language in ['ru', 'kk']) {
        await tester.pumpWidget(
          app(
            Scaffold(
              body: SingleChildScrollView(
                child: CrmDailyChart(
                  key: ValueKey(language),
                  days: (emptyAnalytics()['daily'] as List).cast<CrmJson>(),
                ),
              ),
            ),
            language: language,
          ),
        );
        await tester.pumpAndSettle();
        expect(find.byKey(const Key('analytics-daily-chart')), findsOneWidget);
        final previous = find.byTooltip(
          language == 'ru' ? 'Предыдущее значение' : 'Алдыңғы мән',
        );
        for (var i = 0; i < 6; i++) {
          await tester.ensureVisible(previous);
          await tester.tap(previous);
          await tester.pumpAndSettle();
        }
        expect(find.textContaining('−50 ₸'), findsOneWidget);
        final table = find.byKey(const Key('analytics-daily-table'));
        await tester.ensureVisible(table);
        await tester.tap(table);
        await tester.pumpAndSettle();
        expect(find.textContaining('−50 ₸'), findsNWidgets(2));
        expect(tester.takeException(), isNull);
      }
    },
  );

  testWidgets(
    'analytics uses live locale, null average and native charts without writes',
    (tester) async {
      final auth = ShellAuth(fixture.owner);
      late MobileRuntime runtime;
      final methods = <String>[];
      final api = CrmApi(
        baseUrl: fixture.base,
        accountId: () => auth.accountId,
        epoch: () => runtime.epoch,
        accessToken: auth.accessToken,
        pending: CrmPending(fixture.MemoryCrmVault()),
        client: MockClient((request) async {
          methods.add(request.method);
          return fixture.jsonResponse(emptyAnalytics());
        }),
      );
      runtime = MobileRuntime(auth: auth, crmApi: api);
      final page = AnalyticsPage(
        runtime: runtime,
        business: fixture.business,
        kk: false,
      );
      await tester.pumpWidget(app(page));
      await tester.pumpAndSettle();
      expect(find.text('Нет данных'), findsOneWidget);
      expect(find.text('−50 ₸'), findsOneWidget);
      await tester.pumpWidget(app(page, language: 'kk'));
      await tester.pumpAndSettle();
      expect(find.text('Деректер жоқ'), findsOneWidget);
      expect(find.text('Нет данных'), findsNothing);
      expect(methods, ['GET']);
      await tester.scrollUntilVisible(
        find.byKey(const Key('analytics-daily-chart')),
        250,
      );
      expect(find.byType(CrmDailyChart), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      runtime.dispose();
      await auth.events.close();
    },
  );

  testWidgets(
    'dashboard has primary entry and grouped actions, failed read has no fake zero',
    (tester) async {
      final auth = ShellAuth(fixture.owner);
      late MobileRuntime runtime;
      final api = CrmApi(
        baseUrl: fixture.base,
        accountId: () => auth.accountId,
        epoch: () => runtime.epoch,
        accessToken: auth.accessToken,
        pending: CrmPending(fixture.MemoryCrmVault()),
        client: MockClient((_) async => fixture.jsonResponse({}, 503)),
      );
      runtime = MobileRuntime(auth: auth, crmApi: api);
      await tester.pumpWidget(
        app(
          Scaffold(
            body: SingleChildScrollView(
              child: CrmDashboard(
                runtime: runtime,
                business: fixture.business,
                kk: false,
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('crm-new-entry')), findsOneWidget);
      expect(find.byType(CrmMetric), findsNothing);
      expect(find.byType(CrmActionTile), findsNWidgets(6));
      expect(find.text('Не удалось загрузить данные'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      runtime.dispose();
      await auth.events.close();
    },
  );
}
