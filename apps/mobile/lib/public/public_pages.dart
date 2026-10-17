import 'package:flutter/material.dart';

import '../crm/crm_models.dart';
import '../crm/crm_pending.dart';
import '../crm/crm_ui.dart' show crmCard, crmGap;
import '../data/api_failure.dart';
import '../runtime.dart';
import '../ui/common.dart' show tr, Notice, ReadError;
import '../ui/language.dart';
import '../ui/qadam_theme.dart';
import '../ui/qadam_badge.dart';
import '../ui/qadam_name.dart';
import '../ui/qadam_components.dart';
import 'inquiry_service.dart';
import 'venue_assets.dart';
import 'venue_viewer.dart';

String publicError(bool kk) => tr(
  kk,
  'Не удалось загрузить данные. Проверьте сеть и повторите.',
  'Деректер жүктелмеді. Желіні тексеріп, қайталаңыз.',
);
String categoryName(String code, bool kk) => switch (code) {
  'clothes' => tr(kk, 'Одежда', 'Киім'),
  'food' => tr(kk, 'Продукты', 'Азық-түлік'),
  'home' => tr(kk, 'Товары для дома', 'Үй тауарлары'),
  'services' => tr(kk, 'Услуги', 'Қызметтер'),
  _ => code,
};
Widget demoLabel(bool kk) =>
    QadamBadge(tr(kk, 'Учебная точка', 'Оқу нүктесі'), warning: true);

Widget poster(VenueAsset? asset, bool kk) => AspectRatio(
  aspectRatio: 2.1,
  child: asset == null
      ? const Icon(Icons.storefront, size: 48)
      : Image.asset(
          asset.poster,
          fit: BoxFit.contain,
          semanticLabel: tr(kk, 'Изображение площадки', 'Алаң суреті'),
          errorBuilder: (_, _, _) => const Icon(Icons.storefront, size: 48),
        ),
);
int? pointNumber(VenueAsset? asset, CrmJson business, String venueId) {
  if (asset == null) return null;
  for (var i = 0; i < asset.hotspots.length; i++) {
    if (asset.businessFor(asset.hotspots[i]['id'] as String, venueId, [
          business,
        ]) !=
        null) {
      return i + 1;
    }
  }
  return null;
}

/// Stable manifest order; unnumbered API entries follow in their original order.
List<CrmJson> shopsInPointOrder(
  List<CrmJson> shops,
  VenueAsset? asset,
  String venueId,
) {
  final indexed = shops.indexed.toList();
  indexed.sort((a, b) {
    final an = pointNumber(asset, a.$2, venueId);
    final bn = pointNumber(asset, b.$2, venueId);
    if (an == null && bn == null) return a.$1.compareTo(b.$1);
    if (an == null) return 1;
    if (bn == null) return -1;
    final order = an.compareTo(bn);
    return order == 0 ? a.$1.compareTo(b.$1) : order;
  });
  return indexed.map((entry) => entry.$2).toList();
}

Future<List<CrmJson>> allPublicPages(
  Future<CrmPage> Function(String?) fetch,
) async {
  final items = <CrmJson>[];
  final seen = <String>{};
  String? cursor;
  // Fail explicitly rather than silently show a truncated complete list.
  for (var page = 0; page < 100; page++) {
    final result = await fetch(cursor);
    items.addAll(result.items);
    cursor = result.next;
    if (cursor == null) return items;
    if (!seen.add(cursor)) throw const ApiFailure('INVALID_RESPONSE');
  }
  throw const ApiFailure('INVALID_RESPONSE');
}

class PublicHome extends StatefulWidget {
  const PublicHome({
    super.key,
    required this.runtime,
    required this.kk,
    required this.toggleLanguage,
    this.landing = false,
    this.onExplore,
    this.onBusiness,
    this.onMarket,
  });
  final MobileRuntime runtime;
  final bool kk, landing;
  final VoidCallback toggleLanguage;
  final VoidCallback? onExplore, onBusiness, onMarket;
  @override
  State<PublicHome> createState() => _PublicHomeState();
}

class _PublicHomeState extends State<PublicHome> {
  List<CrmJson> venues = [];
  Map<String, VenueAsset> assets = {};
  bool busy = true;
  Object? error;
  int generation = 0;
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    final run = ++generation;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final api = widget.runtime.publicApi;
      if (api == null) throw const ApiFailure('PUBLIC_UNAVAILABLE');
      final result = await allPublicPages((c) => api.venues(cursor: c));
      final models = await VenueAsset.load().catchError(
        (_) => <String, VenueAsset>{},
      );
      if (mounted && run == generation) {
        setState(() {
          venues = result;
          assets = models;
        });
      }
    } catch (e) {
      if (mounted && run == generation) setState(() => error = e);
    } finally {
      if (mounted && run == generation) setState(() => busy = false);
    }
  }

  Widget venueCard({
    required String name,
    required String subtitle,
    required Widget image,
    required VoidCallback onTap,
    bool demo = false,
    Key? key,
  }) {
    final large = MediaQuery.textScalerOf(context).scale(14) > 20;
    final details = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(name, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 4),
        Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
        if (demo) ...[
          const SizedBox(height: 6),
          QadamBadge(
            tr(qadamKk(context), 'Учебная витрина', 'Оқу сөресі'),
            warning: true,
          ),
        ],
      ],
    );
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        key: key,
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: large
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    SizedBox(height: 90, child: image),
                    const SizedBox(height: 12),
                    details,
                    const Align(
                      alignment: Alignment.centerRight,
                      child: Icon(Icons.arrow_forward, size: 20),
                    ),
                  ],
                )
              : Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: ColoredBox(
                        color: QadamTheme.paper,
                        child: SizedBox(width: 100, height: 88, child: image),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(child: details),
                    const SizedBox(width: 8),
                    const Icon(Icons.chevron_right, size: 20),
                  ],
                ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final kk = qadamKk(context);
    return Scaffold(
      appBar: AppBar(
        title: widget.landing
            ? const QadamBrand()
            : Text(tr(kk, 'Площадки', 'Алаңдар')),
        actions: [
          TextButton(
            onPressed: widget.toggleLanguage,
            child: Text(kk ? 'RU' : 'ҚАЗ'),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: load,
          child: ListView(
            key: PageStorageKey(
              widget.landing ? 'qadam-home' : 'public-venues',
            ),
            padding: const EdgeInsets.all(16),
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              if (widget.landing) ...[
                QadamWelcome(
                  kk: kk,
                  explore: widget.onExplore!,
                  business: widget.onBusiness!,
                ),
                const SizedBox(height: 24),
              ],
              Row(
                children: [
                  Expanded(
                    child: Text(
                      tr(kk, 'Площадки Тараза', 'Тараз алаңдары'),
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ),
                  if (widget.landing)
                    TextButton(
                      onPressed: widget.onExplore,
                      child: Text(tr(kk, 'Все', 'Барлығы')),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                tr(
                  kk,
                  'Выберите площадку — магазины и объявления внутри.',
                  'Алаңды таңдаңыз — дүкендер мен хабарландырулар ішінде.',
                ),
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 16),
              if (busy) const LinearProgressIndicator(),
              if (error != null) ReadError(onRetry: busy ? null : load),
              if (!busy && error == null && venues.isEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(
                    tr(
                      kk,
                      'Магазины площадок пока не добавлены.',
                      'Алаң дүкендері әлі қосылмаған.',
                    ),
                  ),
                ),
              if (error == null)
                for (final v in venues)
                  venueCard(
                    name: v['name'] as String,
                    subtitle: switch (v['slug']) {
                      'mart' => tr(
                        kk,
                        'Торговый центр · магазины',
                        'Сауда орталығы · дүкендер',
                      ),
                      'kaikarmet' => tr(
                        kk,
                        'Торговые ряды · магазины',
                        'Сауда қатарлары · дүкендер',
                      ),
                      'auyl-bereke' => tr(
                        kk,
                        'Рынок · магазины',
                        'Базар · дүкендер',
                      ),
                      _ => v['address_label'] as String,
                    },
                    image: poster(assets[v['slug']], kk),
                    demo: v['is_demo'] == true,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => VenuePage(
                          runtime: widget.runtime,
                          venue: v,
                          asset: assets[v['slug']],
                          kk: kk,
                        ),
                      ),
                    ),
                  ),
              if (widget.onMarket != null)
                venueCard(
                  key: const Key('nav-market'),
                  name: 'Мал базар',
                  subtitle: tr(
                    kk,
                    'Скот · объявления и цены',
                    'Мал · хабарландырулар мен бағалар',
                  ),
                  image: const Icon(
                    Icons.agriculture_outlined,
                    size: 42,
                    color: QadamTheme.green,
                  ),
                  onTap: widget.onMarket!,
                ),
              const SizedBox(height: 8),
              Text(
                tr(
                  kk,
                  'Схемы площадок условные. Учебные магазины отмечены отдельно.',
                  'Алаң сызбалары шартты. Оқу дүкендері бөлек белгіленген.',
                ),
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class VenuePage extends StatefulWidget {
  const VenuePage({
    super.key,
    required this.runtime,
    required this.venue,
    required this.kk,
    this.asset,
  });
  final MobileRuntime runtime;
  final CrmJson venue;
  final bool kk;
  final VenueAsset? asset;
  @override
  State<VenuePage> createState() => _VenuePageState();
}

class _VenuePageState extends State<VenuePage> {
  final query = TextEditingController();
  String category = '';
  List<CrmJson> shops = [];
  Set<String> categories = {};
  bool busy = true;
  Object? error;
  int generation = 0;
  bool get kk => qadamKk(context);
  @override
  void initState() {
    super.initState();
    load(initial: true);
  }

  @override
  void dispose() {
    query.dispose();
    super.dispose();
  }

  Future<void> load({bool initial = false}) async {
    final run = ++generation;
    final q = query.text.trim();
    final selected = category;
    setState(() {
      busy = true;
      error = null;
      shops = [];
    });
    try {
      final api = widget.runtime.publicApi!;
      final result = await allPublicPages(
        (c) => api.businesses(
          venue: widget.venue['id'] as String,
          query: q,
          category: selected,
          cursor: c,
        ),
      );
      if (mounted && run == generation) {
        setState(() {
          shops = shopsInPointOrder(
            result,
            widget.asset,
            widget.venue['id'] as String,
          );
          if (initial) {
            categories = result
                .map((b) => b['category'] as String)
                .where((c) => c.isNotEmpty)
                .toSet();
          }
        });
      }
    } catch (e) {
      if (mounted && run == generation) setState(() => error = e);
    } finally {
      if (mounted && run == generation) setState(() => busy = false);
    }
  }

  void open(CrmJson b) => Navigator.push(
    context,
    MaterialPageRoute(
      builder: (_) => PublicShopPage(
        runtime: widget.runtime,
        slug: b['slug'] as String,
        expectedId: b['id'] as String,
        venue: widget.venue,
        asset: widget.asset,
        kk: kk,
      ),
    ),
  );
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(widget.venue['name'] as String),
      actions: const [LanguageAction()],
    ),
    body: SafeArea(
      child: ListView(
        key: PageStorageKey('venue-${widget.venue['id']}'),
        padding: const EdgeInsets.all(16),
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (widget.venue['is_demo'] == true)
                QadamBadge(
                  tr(kk, 'Учебная витрина', 'Оқу сөресі'),
                  warning: true,
                ),
              QadamBadge(tr(kk, 'Схема площадки', 'Алаң сызбасы')),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            widget.venue['address_label'] as String,
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 12),
          if (widget.asset != null && !busy && error == null)
            VenueViewer(
              key: ValueKey('$generation:$category'),
              asset: widget.asset!,
              venueId: widget.venue['id'] as String,
              businesses: shops,
              kk: kk,
              onSelect: open,
            )
          else
            poster(widget.asset, kk),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerLeft,
            child: QadamBadge(
              tr(kk, 'Условная схема, не карта', 'Шартты сызба, карта емес'),
              warning: true,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            tr(kk, 'Магазины площадки', 'Алаң дүкендері'),
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 12),
          TextField(
            key: const Key('shop-search'),
            controller: query,
            onChanged: (_) => setState(() {}),
            maxLength: 200,
            textInputAction: TextInputAction.search,
            onSubmitted: (_) => load(),
            decoration: InputDecoration(
              labelText: tr(kk, 'Поиск на площадке', 'Алаңнан іздеу'),
              counterText: '',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: IconButton(
                tooltip: tr(kk, 'Найти', 'Іздеу'),
                onPressed: busy ? null : () => load(),
                icon: const Icon(Icons.arrow_forward),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              for (final c in ['', ...categories])
                ChoiceChip(
                  label: Text(
                    c.isEmpty ? tr(kk, 'Все', 'Барлығы') : categoryName(c, kk),
                  ),
                  selected: category == c,
                  onSelected: busy
                      ? null
                      : (_) {
                          category = c;
                          load();
                        },
                ),
            ],
          ),
          if (query.text.isNotEmpty || category.isNotEmpty)
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                onPressed: () {
                  query.clear();
                  category = '';
                  load(initial: true);
                },
                child: Text(tr(kk, 'Сбросить фильтры', 'Сүзгілерді тазарту')),
              ),
            ),
          const SizedBox(height: 12),
          if (busy) const LinearProgressIndicator(),
          if (error != null)
            ReadError(onRetry: () => load(initial: categories.isEmpty)),
          if (!busy && error == null && shops.isEmpty)
            Text(
              tr(
                kk,
                'Магазины не найдены. Измените фильтры.',
                'Дүкендер табылмады. Сүзгілерді өзгертіңіз.',
              ),
            ),
          for (final b in shops)
            Card(
              child: InkWell(
                borderRadius: BorderRadius.circular(20),
                onTap: () => open(b),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.primaryContainer,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          pointNumber(
                                widget.asset,
                                b,
                                widget.venue['id'] as String,
                              )?.toString() ??
                              '•',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            QadamName(
                              b['name'] as String,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            const SizedBox(height: 4),
                            Text(categoryName(b['category'] as String, kk)),
                            if (b['is_demo'] == true) ...[
                              const SizedBox(height: 8),
                              demoLabel(kk),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Icon(Icons.chevron_right),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    ),
  );
}

class PublicShopPage extends StatefulWidget {
  const PublicShopPage({
    super.key,
    required this.runtime,
    required this.slug,
    required this.kk,
    this.expectedId,
    this.venue,
    this.asset,
  });
  final MobileRuntime runtime;
  final String slug;
  final String? expectedId;
  final CrmJson? venue;
  final VenueAsset? asset;
  final bool kk;
  @override
  State<PublicShopPage> createState() => _PublicShopPageState();
}

class _PublicShopPageState extends State<PublicShopPage> {
  final inquiryAnchor = GlobalKey();
  CrmJson? shop;
  bool busy = true;
  Object? error;
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() {
      busy = true;
      error = null;
      shop = null;
    });
    try {
      final result = await widget.runtime.publicApi!.shop(
        widget.slug,
        expectedId: widget.expectedId,
      );
      if (widget.venue != null && result['venue_id'] != widget.venue!['id']) {
        throw const ApiFailure('INVALID_RESPONSE');
      }
      if (mounted) setState(() => shop = result);
    } catch (e) {
      if (mounted) setState(() => error = e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final kk = qadamKk(context);
    final b = shop;
    final point = b == null || widget.venue == null
        ? null
        : pointNumber(widget.asset, b, widget.venue!['id'] as String);
    return Scaffold(
      appBar: AppBar(
        title: Text(tr(kk, 'Магазин', 'Дүкен')),
        actions: const [LanguageAction()],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          key: PageStorageKey('shop-${widget.slug}'),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (busy) const LinearProgressIndicator(),
              if (error != null) ReadError(onRetry: load),
              if (b != null) ...[
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    QadamBadge(categoryName(b['category'] as String, kk)),
                    if (b['is_demo'] == true) demoLabel(kk),
                  ],
                ),
                const SizedBox(height: 12),
                QadamName(
                  b['name'] as String,
                  style: QadamTheme.heading(context),
                ),
                const SizedBox(height: 8),
                if (widget.venue != null)
                  Text(
                    '${widget.venue!['name']}${point == null ? '' : tr(kk, ' · Точка $point на схеме', ' · Сызбадағы $point нүкте')}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                const SizedBox(height: 12),
                Text(b['description'] as String),
                const SizedBox(height: 16),
                if (widget.runtime.inquiries != null)
                  FilledButton.icon(
                    key: const Key('shop-inquiry-action'),
                    onPressed: () {
                      final target = inquiryAnchor.currentContext;
                      if (target != null) {
                        Scrollable.ensureVisible(
                          target,
                          duration: const Duration(milliseconds: 300),
                          alignment: 0,
                        );
                      }
                    },
                    icon: const Icon(Icons.edit_outlined),
                    label: Text(tr(kk, 'Оставить заявку', 'Өтінім қалдыру')),
                  ),
                const SizedBox(height: 24),
                Text(
                  tr(kk, 'Каталог', 'Каталог'),
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 12),
                if ((b['catalog'] as List).isEmpty)
                  Text(tr(kk, 'Товаров пока нет.', 'Әзірге тауарлар жоқ.')),
                for (final raw in b['catalog'] as List)
                  Builder(
                    builder: (context) {
                      final item = crmObject(raw);
                      return Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(
                                Icons.inventory_2_outlined,
                                color: Theme.of(
                                  context,
                                ).colorScheme.onSurfaceVariant,
                                size: 28,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item['name'] as String,
                                      style: Theme.of(
                                        context,
                                      ).textTheme.titleMedium,
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      item['available'] == true
                                          ? tr(kk, 'В наличии', 'Бар')
                                          : tr(
                                              kk,
                                              'Нет в наличии',
                                              'Қолда жоқ',
                                            ),
                                      style: Theme.of(
                                        context,
                                      ).textTheme.bodySmall,
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      item['price_minor'] == null
                                          ? tr(
                                              kk,
                                              'Цена не указана',
                                              'Бағасы көрсетілмеген',
                                            )
                                          : crmMoney(
                                              item['price_minor'] as int,
                                              kk,
                                            ),
                                      style: Theme.of(
                                        context,
                                      ).textTheme.titleMedium,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                if (widget.runtime.inquiries != null)
                  Padding(
                    key: inquiryAnchor,
                    padding: const EdgeInsets.only(top: 12),
                    child: InquiryForm(
                      key: ValueKey(
                        '${b['id']}:${widget.runtime.accountId}:${widget.runtime.epoch}',
                      ),
                      runtime: widget.runtime,
                      business: b['id'] as String,
                      name: b['name'] as String,
                      kk: kk,
                    ),
                  ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class InquiryForm extends StatefulWidget {
  const InquiryForm({
    super.key,
    required this.runtime,
    required this.business,
    required this.name,
    required this.kk,
  });
  final MobileRuntime runtime;
  final String business;
  final String name;
  final bool kk;
  @override
  State<InquiryForm> createState() => _InquiryFormState();
}

class _InquiryFormState extends State<InquiryForm> {
  final form = GlobalKey<FormState>();
  final name = TextEditingController(),
      contact = TextEditingController(),
      message = TextEditingController();
  late final CrmScope scope;
  late final InquiryService service;
  CrmIntent? saved;
  bool busy = true;
  bool allowLeave = false;
  Object? error;
  bool get kk => qadamKk(context);
  bool get active => mounted && service.isCurrent(scope);
  @override
  void initState() {
    super.initState();
    scope = widget.runtime.publicScope(widget.business);
    service = widget.runtime.inquiries!;
    widget.runtime.addListener(changed);
    restore();
  }

  void changed() {
    if (mounted) setState(() {});
  }

  Future<void> restore() async {
    try {
      final result = await service.load(scope);
      if (active) {
        setState(() {
          saved = result;
          if (result != null) {
            name.text = result.body['visitor_name'] as String;
            contact.text = result.body['contact'] as String;
            message.text = result.body['message'] as String;
          }
        });
      }
    } catch (e) {
      if (active) setState(() => error = e);
    } finally {
      if (active) setState(() => busy = false);
    }
  }

  Future<void> send() async {
    if (busy || !active || (saved == null && !form.currentState!.validate())) {
      return;
    }
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final result = await service.submit(
        scope,
        newBody: saved == null
            ? inquiryBody(name.text, contact.text, message.text)
            : null,
      );
      if (active) setState(() => saved = result);
    } catch (e) {
      if (active) {
        error = e;
        await restore();
      }
    } finally {
      if (active) setState(() => busy = false);
    }
  }

  Future<void> another() async {
    if (busy || !active || saved?.receipt == null) return;
    setState(() => busy = true);
    try {
      final cleared = await service.pending.acknowledge(saved!);
      if (!cleared) throw const ApiFailure('PENDING_CHANGED');
      if (active) {
        setState(() {
          saved = null;
          error = null;
          name.clear();
          contact.clear();
          message.clear();
        });
      }
    } catch (e) {
      if (active) setState(() => error = e);
    } finally {
      if (active) setState(() => busy = false);
    }
  }

  @override
  void dispose() {
    widget.runtime.removeListener(changed);
    name.dispose();
    contact.dispose();
    message.dispose();
    super.dispose();
  }

  Widget field(
    TextEditingController controller,
    String ru,
    String kz,
    int limit, {
    int lines = 1,
  }) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Text(
        '${tr(kk, ru, kz)} *',
        style: Theme.of(context).textTheme.titleMedium,
      ),
      const SizedBox(height: 8),
      Semantics(
        label: tr(kk, ru, kz),
        child: TextFormField(
          key: Key(
            controller == contact
                ? 'inquiry-contact'
                : controller == name
                ? 'inquiry-name'
                : 'inquiry-message',
          ),
          onChanged: (_) => setState(() {}),
          autovalidateMode: AutovalidateMode.onUserInteraction,
          controller: controller,
          enabled: !busy && saved == null,
          maxLines: lines,
          decoration: InputDecoration(
            helperText: controller == contact
                ? tr(
                    kk,
                    'Телефон, email или Telegram — любой удобный контакт.',
                    'Телефон, email немесе Telegram — ыңғайлы байланыс.',
                  )
                : null,
          ),
          validator: (value) {
            final text = (value ?? '').trim();
            if (text.isEmpty) {
              return tr(kk, 'Обязательное поле', 'Міндетті өріс');
            }
            if (text.runes.length > limit) {
              return tr(
                kk,
                'Не более $limit символов',
                '$limit таңбадан аспасын',
              );
            }
            return null;
          },
        ),
      ),
    ],
  );
  @override
  Widget build(BuildContext context) {
    if (!active) {
      return Text(
        tr(
          kk,
          'Аккаунт изменился. Откройте магазин заново.',
          'Аккаунт өзгерді. Дүкенді қайта ашыңыз.',
        ),
      );
    }
    if (saved?.receipt != null) {
      return crmCard([
        Text(
          tr(kk, 'Заявка отправлена', 'Өтінім жіберілді'),
          style: Theme.of(context).textTheme.titleLarge,
        ),
        Text(widget.name),
        Text(
          tr(
            kk,
            'Ответ и наличие товара зависят от продавца.',
            'Жауап пен тауардың бар-жоғын сатушы анықтайды.',
          ),
        ),
        TextButton(
          onPressed: busy ? null : another,
          child: Text(tr(kk, 'Отправить ещё одну', 'Тағы бір өтінім жіберу')),
        ),
      ]);
    }
    return PopScope(
      canPop:
          allowLeave ||
          saved != null ||
          (name.text.isEmpty && contact.text.isEmpty && message.text.isEmpty),
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop || !mounted) return;
        if (busy) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                tr(
                  kk,
                  'Дождитесь завершения запроса.',
                  'Сұраудың аяқталуын күтіңіз.',
                ),
              ),
            ),
          );
          return;
        }
        final leave = await showDialog<bool>(
          context: context,
          builder: (dialogContext) => AlertDialog(
            title: Text(tr(kk, 'Выйти из формы?', 'Пішіннен шығасыз ба?')),
            content: Text(
              tr(
                kk,
                'Введённые данные ещё не отправлены.',
                'Енгізілген деректер әлі жіберілмеді.',
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext, false),
                child: Text(tr(kk, 'Продолжить', 'Жалғастыру')),
              ),
              TextButton(
                onPressed: () => Navigator.pop(dialogContext, true),
                child: Text(tr(kk, 'Выйти', 'Шығу')),
              ),
            ],
          ),
        );
        if (leave == true && mounted) {
          setState(() => allowLeave = true);
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) Navigator.pop(context);
          });
        }
      },
      child: crmCard([
        Text(
          tr(kk, 'Оставить заявку', 'Өтінім қалдыру'),
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 8),
        Text(
          tr(kk, 'Получатель: ${widget.name}', 'Алушы: ${widget.name}'),
          style: Theme.of(context).textTheme.titleSmall,
        ),
        const SizedBox(height: 8),
        Text(
          tr(
            kk,
            'Контакт увидит только этот магазин. Отправка — только по вашей кнопке.',
            'Байланысты тек осы дүкен көреді. Өтінім тек батырманы басқанда жіберіледі.',
          ),
        ),
        const SizedBox(height: 24),
        Form(
          key: form,
          child: Column(
            children: [
              field(name, 'Ваше имя', 'Атыңыз', 100),
              crmGap,
              field(contact, 'Как с вами связаться', 'Байланыс дерегі', 200),
              crmGap,
              field(
                message,
                'Что вы ищете?',
                'Не іздеп жүрсіз?',
                2000,
                lines: 4,
              ),
            ],
          ),
        ),
        crmGap,
        if (busy) const LinearProgressIndicator(),
        if (saved != null)
          Notice(
            text: tr(
              kk,
              'Результат ещё не подтверждён. Повтор отправит исходные данные без новой заявки.',
              'Нәтиже әлі расталмады. Қайталау бастапқы деректерді жаңа өтінімсіз жібереді.',
            ),
          ),
        if (error != null)
          Notice(
            error: true,
            text:
                error is ApiFailure &&
                    (error as ApiFailure).code == 'INQUIRY_REJECTED'
                ? tr(
                    kk,
                    'Сервер не принял заявку. Проверьте поля.',
                    'Сервер өтінімді қабылдамады. Өрістерді тексеріңіз.',
                  )
                : publicError(kk),
          ),
        const SizedBox(height: 16),
        FilledButton(
          onPressed: busy ? null : send,
          child: Text(
            saved == null
                ? tr(kk, 'Отправить заявку', 'Өтінім жіберу')
                : tr(kk, 'Повторить отправку', 'Қайта жіберу'),
          ),
        ),
      ]),
    );
  }
}
