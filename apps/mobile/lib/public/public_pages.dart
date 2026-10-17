import 'package:flutter/material.dart';

import '../crm/crm_models.dart';
import '../crm/crm_pending.dart';
import '../crm/crm_ui.dart' show crmCard, crmGap;
import '../data/api_failure.dart';
import '../runtime.dart';
import '../ui/common.dart' show tr;
import 'inquiry_service.dart';
import 'venue_assets.dart';

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
Widget demoLabel(bool kk) => Text(
  tr(kk, 'Учебные данные', 'Оқу деректері'),
  style: const TextStyle(fontWeight: FontWeight.w600),
);
Widget poster(VenueAsset? asset, bool kk) => asset == null
    ? const SizedBox(height: 70, child: Icon(Icons.storefront, size: 48))
    : Image.asset(
        asset.poster,
        height: 170,
        fit: BoxFit.contain,
        semanticLabel: tr(kk, 'Изображение площадки', 'Алаң суреті'),
        errorBuilder: (_, _, _) =>
            const SizedBox(height: 70, child: Icon(Icons.storefront, size: 48)),
      );

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
  });
  final MobileRuntime runtime;
  final bool kk;
  final VoidCallback toggleLanguage;
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
      if (mounted && run == generation)
        setState(() {
          venues = result;
          assets = models;
        });
    } catch (e) {
      if (mounted && run == generation) setState(() => error = e);
    } finally {
      if (mounted && run == generation) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final kk = widget.kk;
    return Scaffold(
      appBar: AppBar(
        title: Text(tr(kk, 'Площадки', 'Алаңдар')),
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
            padding: const EdgeInsets.all(16),
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              Text(
                tr(
                  kk,
                  'Найдите магазин и оставьте заявку',
                  'Дүкенді тауып, өтінім қалдырыңыз',
                ),
                style: Theme.of(context).textTheme.titleLarge,
              ),
              crmGap,
              if (busy) const LinearProgressIndicator(),
              if (error != null) ...[
                Text(publicError(kk)),
                OutlinedButton(
                  onPressed: busy ? null : load,
                  child: Text(tr(kk, 'Повторить', 'Қайталау')),
                ),
              ],
              if (!busy && error == null && venues.isEmpty)
                Text(tr(kk, 'Площадок пока нет.', 'Әзірге алаңдар жоқ.')),
              if (error == null)
                for (final v in venues)
                  crmCard([
                    poster(assets[v['slug']], kk),
                    Text(
                      v['name'] as String,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    if (v['is_demo'] == true) demoLabel(kk),
                    Text(v['address_label'] as String),
                    crmGap,
                    FilledButton(
                      onPressed: () => Navigator.push(
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
                      child: Text(
                        tr(kk, 'Магазины площадки', 'Алаң дүкендері'),
                      ),
                    ),
                  ]),
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
  bool get kk => widget.kk;
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
      if (mounted && run == generation)
        setState(() {
          shops = result;
          if (initial)
            categories = result
                .map((b) => b['category'] as String)
                .where((c) => c.isNotEmpty)
                .toSet();
        });
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
        kk: kk,
      ),
    ),
  );
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(widget.venue['name'] as String)),
    body: SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          poster(widget.asset, kk),
          Text(
            tr(
              kk,
              'Модель по референсам, размеры оценочные. Учебные точки не задают точный маршрут к продавцу.',
              'Үлгі дереккөздер бойынша, өлшемдері болжамды. Оқу нүктелері сатушыға нақты жол көрсетпейді.',
            ),
          ),
          if (widget.venue['is_demo'] == true) demoLabel(kk),
          crmGap,
          TextField(
            key: const Key('shop-search'),
            controller: query,
            maxLength: 200,
            textInputAction: TextInputAction.search,
            onSubmitted: (_) => load(),
            decoration: InputDecoration(
              labelText: tr(kk, 'Поиск магазина', 'Дүкенді іздеу'),
            ),
          ),
          DropdownButtonFormField<String>(
            initialValue: category,
            isExpanded: true,
            decoration: InputDecoration(
              labelText: tr(kk, 'Категория', 'Санат'),
            ),
            items: [
              DropdownMenuItem(
                value: '',
                child: Text(tr(kk, 'Все категории', 'Барлық санаттар')),
              ),
              for (final c in categories)
                DropdownMenuItem(value: c, child: Text(categoryName(c, kk))),
            ],
            onChanged: (v) {
              category = v ?? '';
              load();
            },
          ),
          FilledButton(
            onPressed: busy ? null : () => load(),
            child: Text(tr(kk, 'Найти', 'Іздеу')),
          ),
          TextButton(
            onPressed: () {
              query.clear();
              setState(() => category = '');
              load(initial: true);
            },
            child: Text(tr(kk, 'Сбросить фильтры', 'Сүзгілерді тазарту')),
          ),
          if (busy) const LinearProgressIndicator(),
          if (error != null) ...[
            Text(publicError(kk)),
            OutlinedButton(
              onPressed: () => load(initial: categories.isEmpty),
              child: Text(tr(kk, 'Повторить', 'Қайталау')),
            ),
          ],
          if (!busy && error == null && shops.isEmpty)
            Text(
              tr(
                kk,
                'Магазины не найдены. Измените фильтры.',
                'Дүкендер табылмады. Сүзгілерді өзгертіңіз.',
              ),
            ),
          for (final b in shops)
            crmCard([
              Text(
                b['name'] as String,
                style: Theme.of(context).textTheme.titleLarge,
              ),
              Text(categoryName(b['category'] as String, kk)),
              if (b['is_demo'] == true) demoLabel(kk),
              Text(b['description'] as String),
              FilledButton(
                onPressed: () => open(b),
                child: Text(tr(kk, 'Открыть магазин', 'Дүкенді ашу')),
              ),
            ]),
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
  });
  final MobileRuntime runtime;
  final String slug;
  final String? expectedId;
  final CrmJson? venue;
  final bool kk;
  @override
  State<PublicShopPage> createState() => _PublicShopPageState();
}

class _PublicShopPageState extends State<PublicShopPage> {
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
      if (widget.venue != null && result['venue_id'] != widget.venue!['id'])
        throw const ApiFailure('INVALID_RESPONSE');
      if (mounted) setState(() => shop = result);
    } catch (e) {
      if (mounted) setState(() => error = e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final kk = widget.kk;
    final b = shop;
    return Scaffold(
      appBar: AppBar(
        title: Text(b?['name'] as String? ?? tr(kk, 'Магазин', 'Дүкен')),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (busy) const LinearProgressIndicator(),
            if (error != null) ...[
              Text(publicError(kk)),
              OutlinedButton(
                onPressed: load,
                child: Text(tr(kk, 'Повторить', 'Қайталау')),
              ),
            ],
            if (b != null) ...[
              Text(
                b['name'] as String,
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              if (widget.venue != null) Text(widget.venue!['name'] as String),
              Text(categoryName(b['category'] as String, kk)),
              if (b['is_demo'] == true) demoLabel(kk),
              Text(b['description'] as String),
              crmGap,
              Text(
                tr(
                  kk,
                  'Контакты магазина не опубликованы. Вы можете оставить заявку.',
                  'Дүкеннің байланыс деректері жарияланбаған. Өтінім қалдыра аласыз.',
                ),
              ),
              crmGap,
              Text(
                tr(kk, 'Каталог', 'Каталог'),
                style: Theme.of(context).textTheme.titleLarge,
              ),
              if ((b['catalog'] as List).isEmpty)
                Text(tr(kk, 'Товаров пока нет.', 'Әзірге тауарлар жоқ.')),
              for (final raw in b['catalog'] as List)
                Builder(
                  builder: (context) {
                    final item = crmObject(raw);
                    return crmCard([
                      // Current API has no product photo: do not invent a product image.
                      Text(
                        item['name'] as String,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      Text(
                        item['available'] == true
                            ? tr(kk, 'В наличии', 'Бар')
                            : tr(kk, 'Нет в наличии', 'Қолда жоқ'),
                      ),
                      Text(
                        item['price_minor'] == null
                            ? tr(kk, 'Цена не указана', 'Бағасы көрсетілмеген')
                            : crmMoney(item['price_minor'] as int, kk),
                      ),
                      if (item['is_demo'] == true) demoLabel(kk),
                    ]);
                  },
                ),
              if (widget.runtime.inquiries != null)
                InquiryForm(
                  key: ValueKey(
                    '${b['id']}:${widget.runtime.accountId}:${widget.runtime.epoch}',
                  ),
                  runtime: widget.runtime,
                  business: b['id'] as String,
                  name: b['name'] as String,
                  kk: kk,
                ),
            ],
          ],
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
  Object? error;
  bool get kk => widget.kk;
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
      if (active)
        setState(() {
          saved = result;
          if (result != null) {
            name.text = result.body['visitor_name'] as String;
            contact.text = result.body['contact'] as String;
            message.text = result.body['message'] as String;
          }
        });
    } catch (e) {
      if (active) setState(() => error = e);
    } finally {
      if (active) setState(() => busy = false);
    }
  }

  Future<void> send() async {
    if (busy || !active || (saved == null && !form.currentState!.validate()))
      return;
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
      if (active)
        setState(() {
          saved = null;
          error = null;
          name.clear();
          contact.clear();
          message.clear();
        });
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
  }) => TextFormField(
    controller: controller,
    enabled: !busy && saved == null,
    maxLines: lines,
    decoration: InputDecoration(labelText: tr(kk, ru, kz)),
    validator: (value) {
      final text = (value ?? '').trim();
      if (text.isEmpty) return tr(kk, 'Обязательное поле', 'Міндетті өріс');
      if (text.runes.length > limit)
        return tr(kk, 'Не более $limit символов', '$limit таңбадан аспасын');
      return null;
    },
  );
  @override
  Widget build(BuildContext context) {
    if (!active)
      return Text(
        tr(
          kk,
          'Аккаунт изменился. Откройте магазин заново.',
          'Аккаунт өзгерді. Дүкенді қайта ашыңыз.',
        ),
      );
    if (saved?.receipt != null)
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
    return crmCard([
      Text(
        tr(kk, 'Оставить заявку', 'Өтінім қалдыру'),
        style: Theme.of(context).textTheme.titleLarge,
      ),
      Text(widget.name),
      Text(
        tr(
          kk,
          'Контакт увидит только магазин. Незавершённая заявка защищённо сохраняется на этом устройстве для повтора.',
          'Байланысты тек дүкен көреді. Аяқталмаған өтінім қайталау үшін осы құрылғыда қорғалып сақталады.',
        ),
      ),
      Form(
        key: form,
        child: Column(
          children: [
            field(name, 'Ваше имя', 'Атыңыз', 100),
            crmGap,
            field(
              contact,
              'Телефон, email или другой контакт',
              'Телефон, email немесе басқа байланыс',
              200,
            ),
            crmGap,
            field(message, 'Что вы ищете?', 'Не іздеп жүрсіз?', 2000, lines: 4),
          ],
        ),
      ),
      crmGap,
      if (busy) const LinearProgressIndicator(),
      if (saved != null)
        Text(
          tr(
            kk,
            'Результат ещё не подтверждён. Повтор отправит исходные данные без новой заявки.',
            'Нәтиже әлі расталмады. Қайталау бастапқы деректерді жаңа өтінімсіз жібереді.',
          ),
        ),
      if (error != null)
        Text(
          error is ApiFailure &&
                  (error as ApiFailure).code == 'INQUIRY_REJECTED'
              ? tr(
                  kk,
                  'Сервер не принял заявку. Проверьте поля.',
                  'Сервер өтінімді қабылдамады. Өрістерді тексеріңіз.',
                )
              : publicError(kk),
        ),
      FilledButton(
        onPressed: busy ? null : send,
        child: Text(
          saved == null
              ? tr(kk, 'Отправить заявку', 'Өтінім жіберу')
              : tr(kk, 'Повторить отправку', 'Қайта жіберу'),
        ),
      ),
    ]);
  }
}
