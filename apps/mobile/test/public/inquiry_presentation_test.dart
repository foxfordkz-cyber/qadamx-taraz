import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:qadam_mobile/public/public_pages.dart';
import 'package:qadam_mobile/ui/common.dart';
import 'package:qadam_mobile/ui/qadam_theme.dart';
import '../support/shell_fixture.dart';

void main() {
  testWidgets(
    'inquiry failure retains input and repeats the original request',
    (tester) async {
      FlutterSecureStorage.setMockInitialValues({});
      final requests = <String>[];
      final f = ShellFixture(
        owner: null,
        me: (_) async => throw StateError('private'),
        public: (request) async {
          requests.add(request.body);
          return jsonResponse({
            'error': {'code': 'UNAVAILABLE'},
          }, 503);
        },
      );
      await tester.pumpWidget(
        MaterialApp(
          theme: QadamTheme.light,
          home: Scaffold(
            body: SingleChildScrollView(
              child: InquiryForm(
                runtime: f.runtime,
                business: pointA,
                name: 'Учебный магазин',
                kk: false,
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Получатель: Учебный магазин'), findsOneWidget);
      expect(find.text('Ваше имя *'), findsOneWidget);
      for (final entry in {
        'inquiry-name': 'Учебное имя',
        'inquiry-contact': '@fixture',
        'inquiry-message': 'Учебный вопрос',
      }.entries) {
        await tester.enterText(find.byKey(Key(entry.key)), entry.value);
      }
      await tester.ensureVisible(find.text('Отправить заявку'));
      await tester.tap(find.text('Отправить заявку'));
      await tester.pumpAndSettle();
      expect(find.byIcon(Icons.error_outline), findsOneWidget);
      expect(find.byType(Notice), findsNWidgets(2));
      expect(
        tester
            .widget<TextFormField>(find.byKey(const Key('inquiry-contact')))
            .controller!
            .text,
        '@fixture',
      );
      await tester.ensureVisible(find.text('Повторить отправку'));
      await tester.tap(find.text('Повторить отправку'));
      await tester.pumpAndSettle();
      expect(requests, hasLength(2));
      expect(requests[1], requests[0]);
      expect(find.text('Заявка отправлена'), findsNothing);
      await tester.pumpWidget(const SizedBox());
      f.dispose();
    },
  );
}
