import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:qadam_mobile/auth.dart';
import 'package:qadam_mobile/data/livestock_api.dart';
import 'package:qadam_mobile/runtime.dart';
import 'package:qadam_mobile/ui/app.dart';
import 'package:qadam_mobile/ui/listing_form.dart';

// Synthetic transport fixtures only. These tests do not claim live acceptance.
class _Auth implements AuthGateway {
  String? account = 'test-account-a';
  final events = StreamController<String?>.broadcast(sync: true);
  @override
  String? get accountId => account;
  @override
  Stream<String?> get accountChanges => events.stream;
  @override
  Future<String?> accessToken() async => 'fixture-session';
  @override
  Future<void> signIn(String email, String password) async {
    account = 'test-account-a';
    events.add(account);
  }

  @override
  Future<void> signOut() async {
    account = null;
    events.add(null);
  }
}

class _MemoryStore implements PendingStore {
  final values = <String, PendingIntent>{};
  @override
  Future<PendingIntent?> read(String accountId) async => values[accountId];
  @override
  Future<void> write(String accountId, PendingIntent intent) async {
    values[accountId] = intent;
  }

  @override
  Future<void> delete(String accountId) async {
    values.remove(accountId);
  }

  @override
  Future<String> snapshotPhoto(
    String accountId,
    String key,
    String sourcePath,
  ) async => throw UnimplementedError();
  @override
  Future<Uint8List> readPhoto(PendingIntent intent) async =>
      throw UnimplementedError();
}

http.Response _jsonResponse(String body, int status) => http.Response.bytes(
  utf8.encode(body),
  status,
  headers: const {'content-type': 'application/json; charset=utf-8'},
);

Finder pageScroll() => find
    .descendant(
      of: find.byType(ListView).last,
      matching: find.byType(Scrollable),
    )
    .first;

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() => FlutterSecureStorage.setMockInitialValues({}));
  tearDown(() async {
    await ListingForm.clearDraft('test-account-a');
    await ListingForm.clearDraft('test-account-b');
  });

  testWidgets('unconfigured app is honest, localized and fits a 320px screen', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 568);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final runtime = MobileRuntime();
    await tester.pumpWidget(MobileApp(runtime: runtime));
    await tester.pumpAndSettle();
    expect(
      find.textContaining('Подключение к серверу пока не настроено'),
      findsOneWidget,
    );
    expect(find.text('350 000 ₸'), findsNothing);
    await tester.tap(find.text('ҚАЗ'));
    await tester.pumpAndSettle();
    expect(
      find.textContaining('Серверге қосылу әлі бапталмаған'),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
    runtime.dispose();
  });

  testWidgets(
    'public network failure is safe and retryable without fake listings',
    (tester) async {
      var calls = 0;
      final api = LivestockApi(
        baseUrl: Uri.parse('https://api.example.test/api/v1'),
        accountId: () => null,
        accessToken: () async => null,
        store: _MemoryStore(),
        client: MockClient((request) async {
          calls++;
          if (calls == 1) {
            throw http.ClientException('private transport detail');
          }
          return _jsonResponse(
            jsonEncode({'items': [], 'next_cursor': null}),
            200,
          );
        }),
      );
      final runtime = MobileRuntime(api: api);
      await tester.pumpWidget(MobileApp(runtime: runtime));
      await tester.pumpAndSettle();
      expect(find.textContaining('Проверьте соединение'), findsOneWidget);
      expect(find.textContaining('private transport detail'), findsNothing);
      await tester.tap(find.text('Повторить'));
      await tester.pumpAndSettle();
      expect(
        find.textContaining('Сегодня здесь пока нет предложений'),
        findsOneWidget,
      );
      expect(calls, 2);
      await tester.pumpWidget(const SizedBox());
      runtime.dispose();
      api.close();
    },
  );

  testWidgets(
    'fixture feed and card fit small screen with large text and maximum price',
    (tester) async {
      tester.view.physicalSize = const Size(320, 600);
      tester.view.devicePixelRatio = 1;
      tester.platformDispatcher.textScaleFactorTestValue = 1.3;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      final fixtures =
          jsonDecode(
                File('test/data/livestock_fixtures.json').readAsStringSync(),
              )
              as Map<String, dynamic>;
      final listing =
          Map<String, dynamic>.from(fixtures['PublicListing'] as Map)
            ..['price_per_head_minor'] = 10000000000
            ..['locality'] =
                'Тараз, учебное длинное название населённого пункта';
      final api = LivestockApi(
        baseUrl: Uri.parse('https://api.example.test/api/v1'),
        accountId: () => null,
        accessToken: () async => null,
        store: _MemoryStore(),
        client: MockClient(
          (request) async => _jsonResponse(
            jsonEncode(
              request.url.path.endsWith('/listings')
                  ? {
                      'items': [listing],
                      'next_cursor': null,
                    }
                  : listing,
            ),
            200,
          ),
        ),
      );
      final runtime = MobileRuntime(api: api);
      await tester.pumpWidget(MobileApp(runtime: runtime));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('100 000 000 ₸'),
        150,
        scrollable: pageScroll(),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      await tester.tap(find.text('100 000 000 ₸'));
      await tester.pumpAndSettle();
      expect(find.text('Объявление'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.text('Цена за одну голову'),
        150,
        scrollable: pageScroll(),
      );
      await tester.pumpAndSettle();
      expect(find.text('Цена за одну голову'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      runtime.dispose();
      api.close();
    },
  );

  testWidgets(
    'preview never posts; unknown publish keeps draft; explicit recovery replays original intent then opens My',
    (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final fixtures =
          jsonDecode(
                File('test/data/livestock_fixtures.json').readAsStringSync(),
              )
              as Map<String, dynamic>;
      final owner = Map<String, dynamic>.from(fixtures['OwnerListing'] as Map);
      owner['price_per_head_minor'] = 35000001;
      owner['contact'] = '@synthetic_fixture';
      final requests = <http.Request>[];
      final store = _MemoryStore();
      final auth = _Auth();
      var published = false;
      final api = LivestockApi(
        baseUrl: Uri.parse('https://api.example.test/api/v1'),
        accountId: () => auth.account,
        accessToken: auth.accessToken,
        store: store,
        client: MockClient((request) async {
          if (request.method == 'POST') {
            requests.add(request);
            if (requests.length == 1) {
              throw http.ClientException('simulated lost response');
            }
            published = true;
            return _jsonResponse(jsonEncode(owner), 201);
          }
          return _jsonResponse(
            jsonEncode({
              'items': published ? [owner] : [],
              'next_cursor': null,
            }),
            200,
          );
        }),
      );
      final runtime = MobileRuntime(auth: auth, api: api);
      await tester.pumpWidget(MobileApp(runtime: runtime));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Подать объявление'));
      await tester.pumpAndSettle();

      Finder field(String label) => find.widgetWithText(TextFormField, label);
      Future<void> fill(String label, String text) async {
        final target = field(label);
        await tester.scrollUntilVisible(target, 250, scrollable: pageScroll());
        await tester.pumpAndSettle();
        await tester.enterText(target, text);
        await tester.pump();
      }

      await fill('Количество голов', '2');
      await fill('Цена за голову, ₸', '350000,01');
      await fill('Город или село', 'Тараз');
      await fill('Рынок', '  Учебный   базар A  ');
      await fill('Телефон или другой контакт', '@synthetic_fixture');
      tester.testTextInput.hide();
      await tester.scrollUntilVisible(
        find.byType(CheckboxListTile),
        200,
        scrollable: pageScroll(),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byType(CheckboxListTile));
      await tester.scrollUntilVisible(
        find.text('Предпросмотр'),
        200,
        scrollable: pageScroll(),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Предпросмотр'));
      await tester.pumpAndSettle();
      expect(requests, isEmpty);
      expect(find.text('350 000,01 ₸'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.text('Опубликовать'),
        200,
        scrollable: pageScroll(),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Опубликовать'));
      await tester.pumpAndSettle();
      expect(requests.length, 1);
      expect(store.values['test-account-a'], isNotNull);
      final saved = await ListingForm.readDraft('test-account-a');
      expect(saved, contains('@synthetic_fixture'));
      expect(saved, contains('Учебный'));
      expect(find.text('Объявление опубликовано'), findsNothing);
      await tester.scrollUntilVisible(
        find.text('Восстановить результат'),
        -200,
        scrollable: pageScroll(),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Восстановить результат'));
      await tester.pumpAndSettle();
      expect(requests.length, 2);
      expect(requests[0].url, requests[1].url);
      expect(requests[0].body, requests[1].body);
      expect(
        requests[0].headers['Idempotency-Key'],
        requests[1].headers['Idempotency-Key'],
      );
      expect(
        (jsonDecode(requests[0].body) as Map)['price_per_head_minor'],
        35000001,
      );
      expect(
        (jsonDecode(requests[0].body) as Map)['market'],
        'Учебный базар A',
      );
      expect(store.values['test-account-a'], isNull);
      expect(await ListingForm.readDraft('test-account-a'), isNull);
      expect(find.text('Объявление опубликовано'), findsOneWidget);
      await tester.tap(find.text('Мои объявления'));
      await tester.pumpAndSettle();
      expect(find.text('Мои объявления'), findsOneWidget);
      expect(find.text('Учебное объявление'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      runtime.dispose();
      api.close();
      await auth.events.close();
    },
  );

  testWidgets(
    'account change disposes private editor and clears ordinary draft',
    (tester) async {
      final auth = _Auth();
      final api = LivestockApi(
        baseUrl: Uri.parse('https://api.example.test/api/v1'),
        accountId: () => auth.account,
        accessToken: auth.accessToken,
        store: _MemoryStore(),
        client: MockClient(
          (request) async =>
              _jsonResponse('{"items":[],"next_cursor":null}', 200),
        ),
      );
      final runtime = MobileRuntime(auth: auth, api: api);
      await ListingForm.writeDraft(
        'test-account-a',
        jsonEncode({
          'species': 'cattle',
          'contact': 'private-a',
          'quantity_text': '1',
        }),
        () => true,
      );
      await tester.pumpWidget(MobileApp(runtime: runtime));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Подать объявление'));
      await tester.pumpAndSettle();
      expect(find.byType(ListingForm), findsOneWidget);
      auth.account = 'test-account-b';
      auth.events.add(auth.account);
      await tester.pumpAndSettle();
      expect(find.byType(ListingForm), findsNothing);
      expect(await ListingForm.readDraft('test-account-a'), isNull);
      expect(find.text('private-a'), findsNothing);
      await tester.pumpWidget(const SizedBox());
      runtime.dispose();
      api.close();
      await auth.events.close();
    },
  );

  testWidgets('definitive rejection after uncertain retry unlocks saved form', (
    tester,
  ) async {
    final fixtures =
        jsonDecode(File('test/data/livestock_fixtures.json').readAsStringSync())
            as Map<String, dynamic>;
    final body = Map<String, dynamic>.from(fixtures['ListingWrite'] as Map);
    final auth = _Auth();
    final store = _MemoryStore();
    store.values[auth.account!] = PendingIntent(
      accountId: auth.account!,
      key: '80000000-0000-4000-8000-000000000099',
      method: 'POST',
      path: '/livestock/listings',
      url: 'https://api.example.test/api/v1/livestock/listings',
      body: body,
    );
    var calls = 0;
    final api = LivestockApi(
      baseUrl: Uri.parse('https://api.example.test/api/v1'),
      accountId: () => auth.account,
      accessToken: auth.accessToken,
      store: store,
      client: MockClient((request) async {
        calls++;
        return _jsonResponse(
          jsonEncode({
            'error': {
              'code': calls == 1 ? 'DATABASE_UNAVAILABLE' : 'VALIDATION_ERROR',
              'message': 'not user-visible',
              'fields': {},
            },
            'request_id': '70000000-0000-4000-8000-000000000001',
          }),
          calls == 1 ? 503 : 422,
        );
      }),
    );
    final runtime = MobileRuntime(auth: auth, api: api);
    await tester.pumpWidget(
      MaterialApp(home: ListingForm(runtime: runtime, kk: false)),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Восстановить результат'));
    await tester.pumpAndSettle();
    expect(store.values[auth.account!], isNotNull);
    await tester.tap(find.text('Восстановить результат'));
    await tester.pumpAndSettle();
    expect(store.values[auth.account!], isNull);
    expect(find.text('Восстановить результат'), findsNothing);
    final price = find.widgetWithText(TextFormField, 'Цена за голову, ₸');
    await tester.scrollUntilVisible(price, 200, scrollable: pageScroll());
    await tester.pumpAndSettle();
    expect(tester.widget<TextFormField>(price).enabled, isTrue);
    expect((await ListingForm.readDraft(auth.account!)), contains('350000'));
    await tester.pumpWidget(const SizedBox());
    runtime.dispose();
    api.close();
    await auth.events.close();
  });

  testWidgets('preview validates required fields that scrolled out of view', (
    tester,
  ) async {
    final auth = _Auth();
    var writes = 0;
    final api = LivestockApi(
      baseUrl: Uri.parse('https://api.example.test/api/v1'),
      accountId: () => auth.account,
      accessToken: auth.accessToken,
      store: _MemoryStore(),
      client: MockClient((request) async {
        if (request.method != 'GET') writes++;
        return _jsonResponse('{"items":[],"next_cursor":null}', 200);
      }),
    );
    final runtime = MobileRuntime(auth: auth, api: api);
    await tester.pumpWidget(
      MaterialApp(home: ListingForm(runtime: runtime, kk: false)),
    );
    await tester.pumpAndSettle();
    final contact = find.widgetWithText(
      TextFormField,
      'Телефон или другой контакт',
    );
    await tester.scrollUntilVisible(contact, 250, scrollable: pageScroll());
    await tester.pumpAndSettle();
    await tester.enterText(contact, '@synthetic');
    tester.testTextInput.hide();
    await tester.scrollUntilVisible(
      find.byType(CheckboxListTile),
      200,
      scrollable: pageScroll(),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byType(CheckboxListTile));
    await tester.scrollUntilVisible(
      find.text('Предпросмотр'),
      200,
      scrollable: pageScroll(),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Предпросмотр'));
    await tester.pumpAndSettle();
    expect(find.text('Опубликовать'), findsNothing);
    expect(find.textContaining('Введите цену за голову'), findsOneWidget);
    expect(writes, 0);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
    runtime.dispose();
    api.close();
    await auth.events.close();
  });

  testWidgets('pending status action cannot enter or complete an editor', (
    tester,
  ) async {
    final fixtures =
        jsonDecode(File('test/data/livestock_fixtures.json').readAsStringSync())
            as Map<String, dynamic>;
    final owner = Map<String, dynamic>.from(fixtures['OwnerListing'] as Map);
    final auth = _Auth();
    final store = _MemoryStore();
    store.values[auth.account!] = PendingIntent(
      accountId: auth.account!,
      key: '80000000-0000-4000-8000-000000000077',
      method: 'POST',
      path: '/livestock/listings/${owner['id']}/actions',
      url:
          'https://api.example.test/api/v1/livestock/listings/${owner['id']}/actions',
      body: {'action': 'sell'},
    );
    var writes = 0;
    final api = LivestockApi(
      baseUrl: Uri.parse('https://api.example.test/api/v1'),
      accountId: () => auth.account,
      accessToken: auth.accessToken,
      store: store,
      client: MockClient((request) async {
        if (request.method != 'GET') writes++;
        return _jsonResponse(
          jsonEncode({
            'items': request.url.path.contains('/me/') ? [owner] : [],
            'next_cursor': null,
          }),
          200,
        );
      }),
    );
    final runtime = MobileRuntime(auth: auth, api: api);
    await ListingForm.writeDraft(
      auth.account!,
      jsonEncode({
        'species': 'cattle',
        'quantity_text': '1',
        'price_text': '123',
        'locality': 'Тараз',
        'contact': 'private-unsent',
      }),
      () => true,
    );
    await tester.pumpWidget(MobileApp(runtime: runtime));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Мои'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('350 000 ₸'),
      150,
      scrollable: pageScroll(),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('350 000 ₸'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('Редактировать'),
      180,
      scrollable: pageScroll(),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Редактировать'));
    await tester.pumpAndSettle();
    expect(find.byType(ListingForm), findsNothing);
    expect(writes, 0);
    expect(store.values[auth.account!], isNotNull);
    expect(
      await ListingForm.readDraft(auth.account!),
      contains('private-unsent'),
    );
    // Defense in depth: even an editor opened independently cannot replay sell.
    await tester.pumpWidget(
      MaterialApp(home: ListingForm(runtime: runtime, kk: false)),
    );
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('Восстановить результат'),
      -150,
      scrollable: pageScroll(),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Восстановить результат'));
    await tester.pumpAndSettle();
    expect(writes, 0);
    expect(find.text('Объявление опубликовано'), findsNothing);
    expect(find.text('Изменения сохранены'), findsNothing);
    expect(store.values[auth.account!], isNotNull);
    expect(
      await ListingForm.readDraft(auth.account!),
      contains('private-unsent'),
    );
    await tester.pumpWidget(const SizedBox());
    runtime.dispose();
    api.close();
    await auth.events.close();
  });

  testWidgets(
    'form remains scrollable with 320px width, large text and keyboard',
    (tester) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      tester.platformDispatcher.textScaleFactorTestValue = 1.3;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetViewInsets);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      final auth = _Auth();
      final api = LivestockApi(
        baseUrl: Uri.parse('https://api.example.test/api/v1'),
        accountId: () => auth.account,
        accessToken: auth.accessToken,
        store: _MemoryStore(),
        client: MockClient(
          (request) async =>
              _jsonResponse('{"items":[],"next_cursor":null}', 200),
        ),
      );
      final runtime = MobileRuntime(auth: auth, api: api);
      await tester.pumpWidget(MobileApp(runtime: runtime));
      await tester.pumpAndSettle();
      await tester.tap(find.text('ҚАЗ'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Хабарландыру беру'));
      await tester.pumpAndSettle();
      final contact = find.widgetWithText(
        TextFormField,
        'Телефон немесе басқа байланыс',
      );
      await tester.scrollUntilVisible(contact, 200, scrollable: pageScroll());
      await tester.pumpAndSettle();
      await tester.enterText(contact, '@synthetic');
      tester.view.viewInsets = const FakeViewPadding(bottom: 250);
      await tester.pumpAndSettle();
      await tester.ensureVisible(contact);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(find.text('@synthetic'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
      runtime.dispose();
      api.close();
      await auth.events.close();
    },
  );

  for (final (count, minimum, supported, expected) in [
    (0, null, true, 'Нет данных'),
    (1, 12345, true, 'От 123,45 ₸'),
    (5, 2000000, true, 'От 20 000 ₸'),
    (4, null, false, 'Минимум не поддерживается сервером'),
  ]) {
    testWidgets('statistics minimum count=$count supported=$supported', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final fixtures =
          jsonDecode(
                File('test/data/livestock_fixtures.json').readAsStringSync(),
              )
              as Map;
      final requests = <http.Request>[];
      final api = LivestockApi(
        baseUrl: Uri.parse('https://api.example.test/api/v1'),
        accountId: () => null,
        accessToken: () async => null,
        store: _MemoryStore(),
        client: MockClient((request) async {
          if (request.url.path.endsWith('/prices')) {
            requests.add(request);
            return _jsonResponse(
              jsonEncode({
                ...Map<String, dynamic>.from(fixtures['PriceStats'] as Map),
                'market': 'Учебный базар A',
                'sample_count': count,
                if (supported) 'min_price_per_head_minor': minimum,
                'median_price_per_head_minor': count >= 5 ? 2500000 : null,
                'status': count >= 5 ? 'available' : 'insufficient_data',
              }),
              200,
            );
          }
          return _jsonResponse('{"items":[],"next_cursor":null}', 200);
        }),
      );
      final runtime = MobileRuntime(api: api);
      await tester.pumpWidget(MobileApp(runtime: runtime));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Цены'));
      await tester.pumpAndSettle();
      final locality = find.widgetWithText(TextField, 'Город или село');
      await tester.scrollUntilVisible(locality, 160, scrollable: pageScroll());
      await tester.pumpAndSettle();
      await tester.enterText(locality, 'Тараз');
      final market = find.widgetWithText(TextField, 'Рынок (все, если пусто)');
      await tester.scrollUntilVisible(market, 160, scrollable: pageScroll());
      await tester.pumpAndSettle();
      await tester.enterText(market, ' Учебный  базар A ');
      tester.testTextInput.hide();
      await tester.scrollUntilVisible(
        find.text('Посмотреть цены'),
        160,
        scrollable: pageScroll(),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Посмотреть цены'));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('minimum-price')),
        160,
        scrollable: pageScroll(),
      );
      await tester.pumpAndSettle();
      expect(
        tester.widget<Text>(find.byKey(const ValueKey('minimum-price'))).data,
        expected,
      );
      expect(requests.single.url.queryParameters, {
        'species': 'cattle',
        'locality': 'Тараз',
        'market': 'Учебный базар A',
      });
      if (count < 5) {
        await tester.scrollUntilVisible(
          find.text('Пока мало данных'),
          160,
          scrollable: pageScroll(),
        );
        await tester.pumpAndSettle();
        expect(find.text('Пока мало данных'), findsOneWidget);
      }
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      runtime.dispose();
      api.close();
    });
  }

  for (final owned in [false, true]) {
    testWidgets('market filter owns cursor and resets pages owned=$owned', (
      tester,
    ) async {
      final fixtures =
          jsonDecode(
                File('test/data/livestock_fixtures.json').readAsStringSync(),
              )
              as Map;
      final item = {
        ...Map<String, dynamic>.from(
          fixtures[owned ? 'OwnerListing' : 'PublicListing'] as Map,
        ),
        'market': 'Учебный A',
      };
      final requests = <http.Request>[];
      final auth = _Auth();
      final api = LivestockApi(
        baseUrl: Uri.parse('https://api.example.test/api/v1'),
        accountId: () => auth.account,
        accessToken: auth.accessToken,
        store: _MemoryStore(),
        client: MockClient((request) async {
          requests.add(request);
          final matches = request.url.queryParameters['market'] == 'Учебный A';
          return _jsonResponse(
            jsonEncode({
              'items': matches ? [item] : [],
              'next_cursor':
                  matches && !request.url.queryParameters.containsKey('cursor')
                  ? item['id']
                  : null,
            }),
            200,
          );
        }),
      );
      final runtime = MobileRuntime(auth: auth, api: api);
      await tester.pumpWidget(MobileApp(runtime: runtime));
      await tester.pumpAndSettle();
      if (owned) {
        await tester.tap(find.text('Мои'));
        await tester.pumpAndSettle();
      }
      final locality = find.widgetWithText(TextField, 'Город или село');
      final market = find.widgetWithText(TextField, 'Рынок (все, если пусто)');
      await tester.enterText(locality, 'Тараз');
      await tester.enterText(market, 'Учебный A');
      tester.testTextInput.hide();
      await tester.tap(find.byTooltip('Применить фильтр рынка'));
      await tester.pumpAndSettle();
      expect(requests.last.url.queryParameters['cursor'], isNull);
      await tester.enterText(
        market,
        'Учебный B',
      ); // Unsubmitted text must not alter pagination.
      tester.testTextInput.hide();
      await tester.scrollUntilVisible(
        find.text('Показать ещё'),
        200,
        scrollable: pageScroll(),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Показать ещё'));
      await tester.pumpAndSettle();
      expect(requests.last.url.queryParameters['market'], 'Учебный A');
      expect(requests.last.url.queryParameters['cursor'], item['id']);
      await tester.scrollUntilVisible(
        find.byTooltip('Применить фильтр рынка'),
        -200,
        scrollable: pageScroll(),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Применить фильтр рынка'));
      await tester.pumpAndSettle();
      expect(requests.last.url.queryParameters['market'], 'Учебный B');
      expect(requests.last.url.queryParameters['locality'], 'Тараз');
      expect(requests.last.url.queryParameters.containsKey('cursor'), isFalse);
      expect(
        requests.last.url.path,
        owned ? '/api/v1/livestock/me/listings' : '/api/v1/livestock/listings',
      );
      expect(find.text('Учебный A'), findsNothing);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      runtime.dispose();
      api.close();
      await auth.events.close();
    });
  }
}
