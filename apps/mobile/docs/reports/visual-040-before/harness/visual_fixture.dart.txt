import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:qadam_mobile/crm/crm_api.dart';
import 'package:qadam_mobile/crm/crm_models.dart';
import 'package:qadam_mobile/crm/crm_pending.dart';
import 'package:qadam_mobile/data/account_api.dart';
import 'package:qadam_mobile/data/livestock_api.dart';
import 'package:qadam_mobile/public/public_api.dart';
import 'package:qadam_mobile/public/venue_assets.dart';
import 'package:qadam_mobile/runtime.dart';
import 'package:qadam_mobile/ui/qadam_theme.dart';

import '../support/shell_fixture.dart';

/// Entirely synthetic HTTP fixtures. No network, real account or write exists.
/// Accepted asset IDs only join the synthetic rows to the shipped manifest.
class VisualFixture {
  VisualFixture(this.assets, {this.kk = false, this.longText = false}) {
    final asset = assets['kaikarmet']!;
    final hotspot = asset.hotspots[1];
    business = hotspot['business_id'] as String;
    slug = hotspot['business_slug'] as String;
    venue = venues.firstWhere((v) => v['slug'] == 'kaikarmet');
    shop = {
      'id': business,
      'venue_id': venue['id'],
      'slug': slug,
      'name': longText
          ? (kk
                ? 'Кайкарметтің отбасылық азық-түлік дүкені — оқу үлгісі'
                : 'Семейный магазин продуктов Кайкармета — учебный пример')
          : (kk ? 'Демо Кайкармет · Азық-түлік' : 'Демо Кайкармет · Продукты'),
      'category': 'food',
      'description': kk
          ? 'Күнделікті қажет тауарлар. Бұл — интерфейсті тексеруге арналған оқу мысалы.'
          : 'Товары на каждый день. Это учебный пример для проверки интерфейса.',
      'is_demo': true,
    };
    publicApi = PublicApi(base, client: MockClient(publicResponse));
    crm = CrmApi(
      baseUrl: base,
      accountId: () => auth.accountId,
      epoch: () => runtime.epoch,
      accessToken: auth.accessToken,
      pending: CrmPending(_VisualVault()),
      client: MockClient(crmResponse),
    );
    final account = AccountApi(
      baseUrl: base,
      accountId: () => auth.accountId,
      epoch: () => runtime.epoch,
      accessToken: auth.accessToken,
      client: MockClient((r) async {
        record(r);
        return jsonResponse({
          'id': owner,
          'businesses': [
            {
              'id': business,
              'name': shop['name'],
              'slug': slug,
              'role': 'owner',
            },
          ],
        });
      }),
    );
    final livestock = LivestockApi(
      baseUrl: base,
      accountId: () => auth.accountId,
      accessToken: auth.accessToken,
      store: EmptyPendingStore(),
      client: MockClient((r) async {
        record(r);
        return jsonResponse({'items': [], 'next_cursor': null});
      }),
    );
    runtime = MobileRuntime(
      auth: auth,
      api: livestock,
      accountApi: account,
      crmApi: crm,
      publicApi: publicApi,
    );
  }

  static final base = Uri.parse('https://visual.example.test/api/v1');
  static const owner = '44444444-4444-4444-8444-444444444444';
  static const customerId = '22222222-2222-4222-8222-222222222222';
  static const saleId = '33333333-3333-4333-8333-333333333333';
  final Map<String, VenueAsset> assets;
  final bool kk, longText;
  final auth = ShellAuth(owner);
  late final String business, slug;
  late final CrmJson venue, shop;
  late final PublicApi publicApi;
  late final CrmApi crm;
  late final MobileRuntime runtime;
  final requests = <http.Request>[];
  bool failReads = false, empty = false;
  Completer<void>? readGate;

  List<CrmJson> get venues => [
    for (final (i, entry) in assets.entries.indexed)
      {
        'id': '55555555-5555-4555-8555-55555555555${i + 1}',
        'slug': entry.key,
        'name': entry.value.data['name'],
        'address_label': kk
            ? 'Оқу алаңы, мекенжай расталмаған'
            : 'Учебная площадка, адрес не подтверждён',
        'geometry_status': entry.value.data['geometry_status'],
        'is_demo': true,
      },
  ];

  List<CrmJson> get catalog => [
    {
      'id': '66666666-6666-4666-8666-666666666661',
      'business_id': business,
      'name': kk ? 'Шай · оқу тауары' : 'Чай · учебный товар',
      'price_minor': 145000,
      'available': true,
      'is_demo': true,
    },
    {
      'id': '66666666-6666-4666-8666-666666666662',
      'business_id': business,
      'name': kk ? 'Сыйлық жинағы' : 'Подарочный набор',
      'price_minor': null,
      'available': false,
      'is_demo': true,
    },
  ];

  void record(http.Request request) {
    requests.add(request);
    if (request.method != 'GET') {
      throw StateError('Visual tests prohibit all writes, including AI.');
    }
  }

  Future<http.Response> publicResponse(http.Request request) async {
    record(request);
    await readGate?.future;
    if (failReads) return jsonResponse({}, 503);
    final path = request.url.path;
    if (path.endsWith('/venues')) {
      return jsonResponse({'items': empty ? [] : venues, 'next_cursor': null});
    }
    if (path.endsWith('/businesses')) {
      final q = request.url.queryParameters['q'] ?? '';
      final category = request.url.queryParameters['category'];
      final visible =
          !empty &&
          (category == null || category == 'food') &&
          (shop['name'] as String).toLowerCase().contains(q.toLowerCase());
      return jsonResponse({
        'items': visible ? [shop] : [],
        'next_cursor': null,
      });
    }
    if (path.endsWith('/$slug')) {
      return jsonResponse({...shop, 'catalog': empty ? [] : catalog});
    }
    throw StateError('Unexpected visual public route: $path');
  }

  Future<http.Response> crmResponse(http.Request request) async {
    record(request);
    if (failReads) return jsonResponse({}, 503);
    final path = request.url.path;
    if (path.endsWith('/summary')) {
      return jsonResponse({
        'date': request.url.queryParameters['date'] ?? '2026-10-17',
        'currency': 'KZT',
        'timezone': 'Asia/Almaty',
        'sales_minor': empty ? 0 : (longText ? 99999999999 : 48250000),
        'receipts_minor': empty ? 0 : 39100000,
        'outstanding_minor': empty ? 0 : 12750000,
        'new_inquiries_count': empty ? 0 : 4,
      });
    }
    if (path.endsWith('/analytics')) {
      return jsonResponse(
        analytics(int.parse(request.url.queryParameters['days']!)),
      );
    }
    if (path.endsWith('/customers')) {
      return jsonResponse({
        'items': empty
            ? []
            : [
                {
                  'id': customerId,
                  'business_id': business,
                  'display_name': kk ? 'Оқу клиенті' : 'Учебный клиент',
                  'contact': 'customer@example.test',
                  'note': '',
                  'balance_minor': 750000,
                },
              ],
        'next_cursor': null,
      });
    }
    if (path.endsWith('/operations')) {
      final debt = request.url.queryParameters['outstanding_only'] == 'true';
      return jsonResponse({
        'items': empty
            ? []
            : [
                if (debt)
                  {
                    'id': saleId,
                    'customer_id': customerId,
                    'total_minor': 1250000,
                    'received_minor': 500000,
                    'balance_minor': 750000,
                    'description': kk ? 'Оқу тауарлары' : 'Учебные товары',
                    'created_at': '2026-10-17T05:20:00Z',
                  }
                else
                  {
                    'id': saleId,
                    'business_id': business,
                    'customer_id': customerId,
                    'sale_id': saleId,
                    'kind': 'sale',
                    'sales_delta_minor': 1250000,
                    'receipts_delta_minor': 500000,
                    'reversal_of': null,
                    'description': kk ? 'Оқу тауарлары' : 'Учебные товары',
                    'created_at': '2026-10-17T05:20:00Z',
                    'created_by': owner,
                  },
              ],
        'next_cursor': null,
      });
    }
    if (path.endsWith('/inquiries')) {
      return jsonResponse({'items': [], 'next_cursor': null});
    }
    if (path.endsWith('/$slug')) {
      return jsonResponse({...shop, 'catalog': catalog});
    }
    throw StateError('Unexpected visual CRM route: $path');
  }

  CrmJson analytics(int days) {
    final end = DateTime.utc(2026, 10, 17);
    final start = end.subtract(Duration(days: days - 1));
    final daily = <CrmJson>[];
    var total = 0, received = 0, count = 0;
    for (var i = 0; i < days; i++) {
      final sales = empty ? 0 : (i % 4 + 1) * 2100000;
      final receipts = empty ? 0 : (i == 2 ? -750000 : sales - 250000);
      final salesCount = empty ? 0 : i % 4 + 1;
      total += sales;
      received += receipts;
      count += salesCount;
      daily.add({
        'date': start.add(Duration(days: i)).toIso8601String().substring(0, 10),
        'sales_minor': sales,
        'receipts_minor': receipts,
        'sales_count': salesCount,
        'is_partial': i == days - 1,
      });
    }
    return {
      'business_id': business,
      'days': days,
      'timezone': 'Asia/Almaty',
      'currency': 'KZT',
      'today_incomplete': true,
      'as_of': '2026-10-17T10:00:00Z',
      'period_from': start.toIso8601String().substring(0, 10),
      'period_to': '2026-10-17',
      'cards': {
        'sales_minor': total,
        'receipts_minor': received,
        'sales_count': count,
        'average_ticket_minor': count == 0 ? null : total ~/ count,
        'outstanding_minor': empty ? 0 : 12750000,
        'debtors_count': empty ? 0 : 7,
      },
      'daily': daily,
      'hourly': [
        for (var h = 0; h < 24; h++)
          {'hour': h, 'sales_count': h == 12 ? count : 0},
      ],
    };
  }

  Future<void> dispose() async {
    runtime.dispose();
    await auth.events.close();
  }
}

class _VisualVault implements CrmVault {
  final values = <String, String>{};
  @override
  Future<String?> read(String key) async => values[key];
  @override
  Future<void> write(String key, String value) async => values[key] = value;
  @override
  Future<void> remove(String key) async => values.remove(key);
}

const visualCaptureKey = Key('synthetic-flutter-visual-capture');

Future<void> loadVisualFonts() async {
  await (FontLoader(
    'MaterialIcons',
  )..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'))).load();
  const directory = String.fromEnvironment('QADAM_BASELINE_FONT_DIR');
  if (directory.isEmpty) throw StateError('Pass QADAM_BASELINE_FONT_DIR pointing to Flutter SDK material_fonts.');
  final roboto = FontLoader('Roboto');
  for (final name in ['roboto-thin.ttf', 'roboto-light.ttf', 'roboto-regular.ttf', 'roboto-medium.ttf', 'roboto-bold.ttf', 'roboto-black.ttf']) {
    roboto.addFont(
      File(
        '$directory/$name',
      ).readAsBytes().then(ByteData.sublistView),
    );
  }
  await roboto.load();
  const symbolFont = String.fromEnvironment('QADAM_BASELINE_SYMBOL_FONT');
  if (symbolFont.isEmpty) throw StateError('Pass QADAM_BASELINE_SYMBOL_FONT for host system-symbol fallback.');
  await (FontLoader('BaselineSystemSymbols')
    ..addFont(File(symbolFont).readAsBytes().then(ByteData.sublistView))).load();
}

// Host-only emulation of Android system symbol fallback. Original 0.4.0 source
// theme is unchanged: only font fallback is supplied, preserving all its styles.
ThemeData baselineHostTheme() {
  final base = QadamTheme.light;
  TextStyle? fallback(TextStyle? style) => style?.copyWith(
    fontFamily: 'Roboto', fontFamilyFallback: const ['BaselineSystemSymbols']);
  final t = base.textTheme;
  return base.copyWith(textTheme: t.copyWith(
    displayLarge: fallback(t.displayLarge), displayMedium: fallback(t.displayMedium), displaySmall: fallback(t.displaySmall),
    headlineLarge: fallback(t.headlineLarge), headlineMedium: fallback(t.headlineMedium), headlineSmall: fallback(t.headlineSmall),
    titleLarge: fallback(t.titleLarge), titleMedium: fallback(t.titleMedium), titleSmall: fallback(t.titleSmall),
    bodyLarge: fallback(t.bodyLarge), bodyMedium: fallback(t.bodyMedium), bodySmall: fallback(t.bodySmall),
    labelLarge: fallback(t.labelLarge), labelMedium: fallback(t.labelMedium), labelSmall: fallback(t.labelSmall),
  ));
}

Widget visualHost(Widget screen, {required bool kk, required double scale}) =>
    RepaintBoundary(
      key: visualCaptureKey,
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        locale: Locale(kk ? 'kk' : 'ru'),
        supportedLocales: const [Locale('ru'), Locale('kk')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        theme: baselineHostTheme(),
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: TextScaler.linear(scale)),
          child: Column(
            children: [
              Material(
                color: const Color(0xffe1eef1),
                child: SizedBox(
                  width: double.infinity,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    child: Text(
                      kk
                          ? 'КӨРІНІС ТЕСТІ · СИНТЕТИКАЛЫҚ ДЕРЕКТЕР'
                          : 'ВИЗУАЛЬНЫЙ ТЕСТ · СИНТЕТИЧЕСКИЕ ДАННЫЕ',
                      style: const TextStyle(
                        fontSize: 10,
                        color: Color(0xff172a26),
                      ),
                    ),
                  ),
                ),
              ),
              Expanded(child: child!),
            ],
          ),
        ),
        home: screen,
      ),
    );
