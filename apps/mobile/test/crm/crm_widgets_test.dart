import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/testing.dart';
import 'package:qadam_mobile/crm/crm_api.dart';
import 'package:qadam_mobile/crm/crm_dashboard.dart';
import 'package:qadam_mobile/crm/crm_pages.dart';
import 'package:qadam_mobile/crm/crm_pending.dart';
import 'package:qadam_mobile/runtime.dart';
import 'package:qadam_mobile/ui/qadam_theme.dart';

import '../support/shell_fixture.dart' show ShellAuth;
import 'crm_test.dart' as fixture;

void main() {
  testWidgets(
    'sale requires entered payment; preview never writes; only confirmation sends',
    (tester) async {
      final auth = ShellAuth(fixture.owner);
      late MobileRuntime runtime;
      var posts = 0;
      final api = CrmApi(
        baseUrl: fixture.base,
        accountId: () => auth.accountId,
        epoch: () => runtime.epoch,
        accessToken: auth.accessToken,
        pending: CrmPending(fixture.MemoryCrmVault()),
        client: MockClient((r) async {
          posts++;
          return fixture.jsonResponse(fixture.receipt());
        }),
      );
      runtime = MobileRuntime(auth: auth, crmApi: api);
      await tester.pumpWidget(
        MaterialApp(
          theme: QadamTheme.light,
          home: OperationForm(
            runtime: runtime,
            business: fixture.business,
            kk: false,
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('operation-total')), '150');
      await tester.ensureVisible(find.byKey(const Key('crm-preview')));
      await tester.tap(find.byKey(const Key('crm-preview')));
      await tester.pumpAndSettle();
      expect(posts, 0);
      expect(find.byKey(const Key('crm-error')), findsOneWidget);
      await tester.ensureVisible(find.byKey(const Key('operation-paid')));
      await tester.enterText(find.byKey(const Key('operation-paid')), '150');
      await tester.ensureVisible(find.byKey(const Key('crm-preview')));
      await tester.tap(find.byKey(const Key('crm-preview')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('crm-confirm')), findsOneWidget);
      expect(posts, 0);
      await tester.tap(find.byKey(const Key('crm-confirm')));
      await tester.pumpAndSettle();
      expect(posts, 1);
      expect(find.byKey(const Key('crm-confirmed')), findsOneWidget);
      auth.change('another-owner');
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('crm-confirmed')), findsNothing);
      await tester.pumpWidget(const SizedBox.shrink());
      runtime.dispose();
      await auth.events.close();
    },
  );
  testWidgets('failed summary is not zero revenue; RU/KZ fit a small screen', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 568);
    tester.view.devicePixelRatio = 1;
    tester.platformDispatcher.textScaleFactorTestValue = 1.3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
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
    for (final kk in [false, true]) {
      await tester.pumpWidget(
        MaterialApp(
          theme: QadamTheme.light,
          home: Scaffold(
            body: SingleChildScrollView(
              child: CrmDashboard(
                key: ValueKey(kk),
                runtime: runtime,
                business: fixture.business,
                kk: kk,
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.textContaining('0 ₸'), findsNothing);
      expect(tester.takeException(), isNull);
    }
    await tester.pumpWidget(const SizedBox.shrink());
    runtime.dispose();
    await auth.events.close();
  });
}
