import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:qadam_mobile/crm/crm_api.dart';
import 'package:qadam_mobile/crm/crm_models.dart';
import 'package:qadam_mobile/crm/crm_pages.dart';
import 'package:qadam_mobile/crm/crm_pending.dart';
import 'package:qadam_mobile/runtime.dart';
import 'package:qadam_mobile/ui/qadam_theme.dart';

import '../support/shell_fixture.dart' show ShellAuth;
import 'crm_test.dart' as f;

String id(int n) => '66666666-6666-4666-8666-${n.toString().padLeft(12, '0')}';
CrmJson operation(int n, {bool customer = false}) => {
  'id': id(n),
  'business_id': f.business,
  'customer_id': customer ? id(1000 + n) : null,
  'sale_id': id(n),
  'kind': 'sale',
  'sales_delta_minor': 15000,
  'receipts_delta_minor': 10000,
  'reversal_of': null,
  'description': 'Учебная операция $n',
  'created_at': '2026-10-17T05:00:00Z',
};
CrmJson customer(String id) => {
  'id': id,
  'business_id': f.business,
  'display_name': 'Учебный клиент ${id.substring(id.length - 4)}',
  'contact': null,
  'note': '',
  'balance_minor': 5000,
};
http.Response page(List<CrmJson> items, {String? next}) =>
    f.jsonResponse({'items': items, 'next_cursor': next});

class LedgerFixture {
  LedgerFixture(
    Future<http.Response> Function(http.Request) handler, {
    bool idsEnabled = false,
  }) {
    api = CrmApi(
      baseUrl: f.base,
      accountId: () => auth.accountId,
      epoch: () => runtime.epoch,
      accessToken: auth.accessToken,
      pending: CrmPending(f.MemoryCrmVault()),
      client: MockClient(handler),
      customerIdsEnabled: idsEnabled,
    );
    runtime = MobileRuntime(auth: auth, crmApi: api);
  }
  final auth = ShellAuth(f.owner);
  late final CrmApi api;
  late final MobileRuntime runtime;
  Widget app({bool kk = false}) => MaterialApp(
    locale: Locale(kk ? 'kk' : 'ru'),
    supportedLocales: const [Locale('ru'), Locale('kk')],
    localizationsDelegates: GlobalMaterialLocalizations.delegates,
    theme: QadamTheme.light,
    home: LedgerPage(runtime: runtime, business: f.business, kk: kk),
  );
  Future<void> dispose(WidgetTester tester) async {
    await tester.pumpWidget(const SizedBox.shrink());
    runtime.dispose();
    await auth.events.close();
  }
}

void main() {
  testWidgets('initial pending, error and successful empty are distinct', (
    tester,
  ) async {
    final held = Completer<http.Response>();
    var calls = 0;
    final fixture = LedgerFixture((_) async {
      calls++;
      return calls == 1 ? held.future : page([]);
    });
    await tester.pumpWidget(fixture.app());
    await tester.pump();
    expect(find.byKey(const Key('ledger-loading')), findsOneWidget);
    expect(find.byKey(const Key('ledger-empty')), findsNothing);
    held.complete(f.jsonResponse({}, 503));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('ledger-error')), findsOneWidget);
    expect(find.byKey(const Key('ledger-empty')), findsNothing);
    await tester.tap(find.byKey(const Key('ledger-retry')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('ledger-empty')), findsOneWidget);
    expect(find.byKey(const Key('ledger-error')), findsNothing);
    expect(calls, 2);
    await fixture.dispose(tester);
  });

  testWidgets('denied access after refresh removes cached private rows', (
    tester,
  ) async {
    var calls = 0;
    final fixture = LedgerFixture((_) async {
      calls++;
      return calls == 1
          ? page([operation(1)])
          : f.jsonResponse({
              'error': {'code': 'NOT_FOUND'},
            }, 404);
    });
    await tester.pumpWidget(fixture.app());
    await tester.pumpAndSettle();
    expect(find.text('Учебная операция 1'), findsOneWidget);
    await tester.tap(find.text('Обновить'));
    await tester.pumpAndSettle();
    expect(find.text('Учебная операция 1'), findsNothing);
    expect(find.byKey(const Key('ledger-error')), findsOneWidget);
    expect(find.byKey(const Key('ledger-empty')), findsNothing);
    await fixture.dispose(tester);
  });

  testWidgets(
    'next-page retry keeps rows and original cursor; double tap is single flight',
    (tester) async {
      tester.view.physicalSize = const Size(412, 1400);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final held = Completer<http.Response>();
      final cursors = <String?>[];
      final fixture = LedgerFixture((r) async {
        cursors.add(r.url.queryParameters['cursor']);
        if (cursors.length == 1) return page([operation(1)], next: id(99));
        if (cursors.length == 2) return held.future;
        return page([operation(2)]);
      });
      await tester.pumpWidget(fixture.app());
      await tester.pumpAndSettle();
      final more = find.byKey(const Key('ledger-more'));
      await tester.ensureVisible(more);
      await tester.tap(more);
      await tester.tap(
        more,
      ); // Before a rebuild, the method also fences reentry.
      await tester.pump();
      expect(cursors, [null, id(99)]);
      expect(find.text('Учебная операция 1'), findsOneWidget);
      held.complete(f.jsonResponse({}, 503));
      await tester.pumpAndSettle();
      expect(find.text('Учебная операция 1'), findsOneWidget);
      expect(find.byKey(const Key('ledger-error')), findsOneWidget);
      await tester.tap(find.byKey(const Key('ledger-retry')));
      await tester.pumpAndSettle();
      expect(cursors, [null, id(99), id(99)]);
      expect(find.text('Учебная операция 1'), findsOneWidget);
      expect(find.text('Учебная операция 2'), findsOneWidget);
      expect(find.byKey(const Key('ledger-more')), findsNothing);
      await fixture.dispose(tester);
    },
  );

  testWidgets(
    'enabled ids capability failure keeps money and never requests legacy list',
    (tester) async {
      final nameQueries = <Map<String, List<String>>>[];
      final fixture = LedgerFixture((r) async {
        if (r.url.path.endsWith('/operations')) {
          return page([operation(1, customer: true)]);
        }
        nameQueries.add(r.url.queryParametersAll);
        return page([customer(id(9999))]); // A legacy server ignored ids.
      }, idsEnabled: true);
      await tester.pumpWidget(fixture.app());
      await tester.pumpAndSettle();
      expect(nameQueries, [
        {
          'ids': [id(1001)],
        },
      ]);
      expect(find.byKey(const Key('ledger-names-status')), findsOneWidget);
      expect(find.text('Учебная операция 1'), findsOneWidget);
      expect(find.text('Учебный клиент 9999'), findsNothing);
      expect(find.text(crmMoney(15000, false)), findsOneWidget);
      expect(find.text(crmMoney(10000, false)), findsOneWidget);
      await fixture.dispose(tester);
    },
  );

  testWidgets('enabled ids resolves customers across operation pages', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(412, 1600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final nameGroups = <List<String>>[];
    final fixture = LedgerFixture((r) async {
      if (r.url.path.endsWith('/operations')) {
        return r.url.queryParameters['cursor'] == null
            ? page([operation(1, customer: true)], next: id(99))
            : page([operation(2, customer: true)]);
      }
      final group = r.url.queryParametersAll['ids']!;
      nameGroups.add(group);
      return page(group.map(customer).toList());
    }, idsEnabled: true);
    await tester.pumpWidget(fixture.app());
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('ledger-more')));
    await tester.pumpAndSettle();
    expect(nameGroups, [
      [id(1001)],
      [id(1002)],
    ]);
    expect(find.text('Учебный клиент 1001'), findsOneWidget);
    expect(find.text('Учебный клиент 1002'), findsOneWidget);
    await fixture.dispose(tester);
  });

  testWidgets(
    'legacy bounded lookup reports limitation without hiding the ledger',
    (tester) async {
      var names = 0;
      final fixture = LedgerFixture((r) async {
        if (r.url.path.endsWith('/operations')) {
          return page([operation(1, customer: true)]);
        }
        expect(r.url.queryParameters.containsKey('ids'), isFalse);
        names++;
        return page([customer(id(2000 + names))], next: id(3000 + names));
      });
      await tester.pumpWidget(fixture.app());
      await tester.pumpAndSettle();
      expect(names, 10);
      expect(find.byKey(const Key('ledger-names-status')), findsOneWidget);
      expect(find.text('Имя пока не найдено'), findsOneWidget);
      expect(find.text('Учебная операция 1'), findsOneWidget);
      expect(find.text(crmMoney(15000, false)), findsOneWidget);
      await fixture.dispose(tester);
    },
  );

  testWidgets(
    'late names from account A do not appear after account B signs in',
    (tester) async {
      final held = Completer<http.Response>();
      final fixture = LedgerFixture((r) async {
        if (r.url.path.endsWith('/operations')) {
          return page([operation(1, customer: true)]);
        }
        return held.future;
      }, idsEnabled: true);
      await tester.pumpWidget(fixture.app());
      await tester.pumpAndSettle();
      expect(find.text('Загружаем имя клиента…'), findsOneWidget);
      fixture.auth.change('different-synthetic-owner');
      held.complete(page([customer(id(1001))]));
      await tester.pumpAndSettle();
      expect(find.text('Учебный клиент 1001'), findsNothing);
      expect(find.text('Учебная операция 1'), findsNothing);
      expect(find.textContaining('Аккаунт изменился'), findsOneWidget);
      await fixture.dispose(tester);
    },
  );

  for (final kk in [false, true]) {
    testWidgets(
      'history fits 320dp font2 including negative reversal, kk=$kk',
      (tester) async {
        tester.view.physicalSize = const Size(320, 568);
        tester.view.devicePixelRatio = 1;
        tester.platformDispatcher.textScaleFactorTestValue = 2;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
        final value = operation(1)
          ..['kind'] = 'reversal'
          ..['sales_delta_minor'] = -15000
          ..['receipts_delta_minor'] = -10000;
        final fixture = LedgerFixture((_) async => page([value]));
        await tester.pumpWidget(fixture.app(kk: kk));
        await tester.pumpAndSettle();
        await tester.scrollUntilVisible(find.text(crmMoney(-10000, kk)), 180);
        expect(find.text(crmMoney(-10000, kk)), findsOneWidget);
        expect(tester.takeException(), isNull);
        await fixture.dispose(tester);
      },
    );
  }
}
