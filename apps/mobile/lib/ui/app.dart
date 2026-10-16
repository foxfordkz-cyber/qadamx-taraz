import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import '../data/livestock_api.dart';
import '../runtime.dart';
import 'common.dart';
import 'listing_form.dart';

class MobileApp extends StatefulWidget {
  const MobileApp({super.key, required this.runtime});
  final MobileRuntime runtime;
  @override
  State<MobileApp> createState() => _MobileAppState();
}

class _MobileAppState extends State<MobileApp> {
  bool _kk = false;
  String? _account;
  @override
  void initState() {
    super.initState();
    _account = widget.runtime.accountId;
    widget.runtime.addListener(_changed);
  }
  void _changed() {
    final next = widget.runtime.accountId;
    if (_account != next && _account != null) {
      // The durable idempotency journal is separate and remains account-scoped.
      unawaited(ListingForm.clearDraft(_account!).catchError((Object _) {}));
    }
    _account = next;
    if (mounted) setState(() {});
  }
  @override
  void dispose() { widget.runtime.removeListener(_changed); super.dispose(); }
  @override
  Widget build(BuildContext context) => MaterialApp(
    key: ValueKey(widget.runtime.epoch),
    title: 'Мал базар', debugShowCheckedModeBanner: false,
    locale: Locale(_kk ? 'kk' : 'ru'), supportedLocales: const [Locale('ru'), Locale('kk')],
    localizationsDelegates: GlobalMaterialLocalizations.delegates,
    theme: ThemeData(useMaterial3: true, brightness: Brightness.light,
      scaffoldBackgroundColor: const Color(0xfff7f7ef),
      colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff68871e)).copyWith(
        primary: const Color(0xff26371a), onPrimary: Colors.white,
        primaryContainer: const Color(0xffd5f577), onPrimaryContainer: const Color(0xff172112),
        surface: const Color(0xfffffff9), onSurface: const Color(0xff20271d)),
      appBarTheme: const AppBarTheme(backgroundColor: Color(0xfff7f7ef), surfaceTintColor: Colors.transparent),
      cardTheme: const CardThemeData(elevation: 0, color: Color(0xfffffff9),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(24)))),
      inputDecorationTheme: InputDecorationTheme(filled: true, fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 17),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xffdce0d2))),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xffdce0d2)))),
      filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(minimumSize: const Size(48, 52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)))),
      outlinedButtonTheme: OutlinedButtonThemeData(style: OutlinedButton.styleFrom(minimumSize: const Size(48, 50),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)))),
      textButtonTheme: TextButtonThemeData(style: TextButton.styleFrom(minimumSize: const Size(48, 48))),
      navigationBarTheme: const NavigationBarThemeData(backgroundColor: Color(0xfffffff9),
        indicatorColor: Color(0xffd5f577), height: 76),
    ),
    home: _Home(runtime: widget.runtime, kk: _kk, toggleLanguage: () => setState(() => _kk = !_kk)),
  );
}

class _Home extends StatefulWidget {
  const _Home({required this.runtime, required this.kk, required this.toggleLanguage});
  final MobileRuntime runtime;
  final bool kk;
  final VoidCallback toggleLanguage;
  @override
  State<_Home> createState() => _HomeState();
}

class _HomeState extends State<_Home> with WidgetsBindingObserver {
  int _tab = 0;
  int _reload = 0;
  PendingIntent? _pending;
  bool _retrying = false;
  Object? _pendingError;
  Timer? _timer;
  bool get kk => widget.kk;
  MobileRuntime get runtime => widget.runtime;
  @override
  void initState() {
    super.initState(); WidgetsBinding.instance.addObserver(this);
    _checkPending();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final account = runtime.accountId;
      if (account != null && await ListingForm.hasPickerRecovery(account) && mounted && runtime.accountId == account) {
        await _edit();
      }
    });
    // Re-fetch against server date; the device never decides available_today.
    _timer = Timer.periodic(const Duration(minutes: 1), (_) => _refresh());
  }
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) { _refresh(); _checkPending(); }
  }
  void _refresh() { if (mounted) setState(() => _reload++); }
  @override
  void dispose() { _timer?.cancel(); WidgetsBinding.instance.removeObserver(this); super.dispose(); }
  Future<void> _checkPending() async {
    if (runtime.accountId == null || runtime.api == null) return;
    final epoch = runtime.epoch;
    try {
      final pending = await runtime.api!.loadPending();
      if (mounted && runtime.epoch == epoch) setState(() => _pending = pending);
    } catch (error) {
      if (mounted && runtime.epoch == epoch) setState(() => _pendingError = error);
    }
  }
  Future<void> _login() => showLogin(context, runtime, kk);
  Future<void> _edit([Json? listing]) async {
    if (runtime.accountId == null) { await _login(); return; }
    await _checkPending();
    if (!mounted) return;
    if (_pending != null && _pending!.kind != 'upload') {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(tr(kk,
        'Сначала завершите сохранённое действие вверху экрана.', 'Алдымен экранның жоғарғы жағындағы сақталған әрекетті аяқтаңыз.'))));
      return;
    }
    final published = await Navigator.of(context).push<bool>(MaterialPageRoute<bool>(builder: (_) => ListingForm(
      runtime: runtime, kk: kk, initial: listing)));
    if (mounted) { if (published == true) setState(() => _tab = 2); _refresh(); await _checkPending(); }
  }
  Future<void> _retry() async {
    if (_pending == null || runtime.api == null) return;
    if (_pending!.kind == 'upload') { await _edit(); return; }
    final epoch = runtime.epoch;
    final api = runtime.api!;
    final pending = _pending!;
    setState(() { _retrying = true; _pendingError = null; });
    try {
      await api.retryPending();
      if (!mounted || epoch != runtime.epoch) return;
      // Fetch canonical owner state before acknowledging an old response snapshot.
      await api.get('/livestock/me/listings', authenticated: true);
      if (!mounted || epoch != runtime.epoch) return;
      await ListingForm.clearDraftFor(pending);
      await api.acknowledgePending();
      if (!mounted || epoch != runtime.epoch) return;
      setState(() { _pending = null; _tab = 2; _reload++; });
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(tr(kk,
        'Сервер подтвердил действие. Список обновлён.', 'Сервер әрекетті растады. Тізім жаңартылды.'))));
    } catch (error) {
      if (mounted && epoch == runtime.epoch) setState(() => _pendingError = error);
    } finally {
      if (mounted && epoch == runtime.epoch) { setState(() => _retrying = false); await _checkPending(); }
    }
  }
  Future<void> _detail(Json item, bool owned) async {
    await Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => _Detail(
      runtime: runtime, item: item, owned: owned, kk: kk)));
    if (mounted) { _refresh(); _checkPending(); }
  }
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Мал базар', style: TextStyle(fontWeight: FontWeight.w800)),
      actions: [TextButton(onPressed: widget.toggleLanguage,
        child: Text(kk ? 'RU' : 'ҚАЗ', semanticsLabel: kk ? 'Русский язык' : 'Қазақ тілі')),
        if (_tab == 2 && runtime.accountId != null) IconButton(tooltip: tr(kk, 'Выйти', 'Шығу'),
          onPressed: () async { try { await runtime.signOut(); } catch (_) {
            if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(tr(kk,
              'Не удалось выйти. Попробуйте ещё раз.', 'Шығу мүмкін болмады. Қайта көріңіз.'))));
          } }, icon: const Icon(Icons.logout))]),
    body: SafeArea(child: LayoutBuilder(builder: (context, constraints) => Column(children: [
      if (_pending != null || _pendingError != null) ConstrainedBox(
        constraints: BoxConstraints(maxHeight: constraints.maxHeight * .4),
        child: SingleChildScrollView(child: Column(children: [
      if (_pending != null) Padding(padding: const EdgeInsets.fromLTRB(16, 0, 16, 12), child: Notice(
        text: _pending!.completedResponse != null ? tr(kk, 'Есть подтверждённое действие. Восстановите результат.', 'Расталған әрекет бар. Нәтижені қалпына келтіріңіз.')
          : tr(kk, 'Результат прошлого действия неизвестен. Повторим тот же запрос без дубля.', 'Алдыңғы әрекеттің нәтижесі белгісіз. Сол сұрауды қайталаймыз.'),
        action: FilledButton.tonal(onPressed: _retrying ? null : _retry,
          child: Text(_retrying ? tr(kk, 'Проверяем…', 'Тексерілуде…') : _pending!.kind == 'upload'
            ? tr(kk, 'Вернуться к фото и форме', 'Фото мен формаға оралу') : tr(kk, 'Восстановить действие', 'Әрекетті қалпына келтіру'))))),
      if (_pendingError != null) Padding(padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
        child: Notice(text: safeError(_pendingError!, kk), error: true)),
      ]))),
      Expanded(child: !runtime.configured || runtime.api == null
        ? _Unavailable(kk: kk)
        : _tab == 1 ? _Statistics(api: runtime.api!, kk: kk, reload: _reload)
        : _tab == 2 && runtime.accountId == null
          ? _SignInPrompt(kk: kk, enabled: runtime.authConfigured, login: _login)
          : _Listings(key: ValueKey('$_tab-${runtime.epoch}'), api: runtime.api!, kk: kk,
              owned: _tab == 2, reload: _reload, onTap: (item) => _detail(item, _tab == 2))),
    ]))),
    floatingActionButton: runtime.configured && _tab != 1 ? FloatingActionButton.extended(
      onPressed: () => _edit(), icon: const Icon(Icons.add), label: Text(tr(kk, 'Подать объявление', 'Хабарландыру беру'))) : null,
    bottomNavigationBar: NavigationBar(selectedIndex: _tab, onDestinationSelected: (value) => setState(() => _tab = value),
      destinations: [NavigationDestination(icon: const Icon(Icons.storefront_outlined), selectedIcon: const Icon(Icons.storefront), label: tr(kk, 'Сегодня', 'Бүгін')),
        NavigationDestination(icon: const Icon(Icons.bar_chart_outlined), label: tr(kk, 'Цены', 'Бағалар')),
        NavigationDestination(icon: const Icon(Icons.person_outline), selectedIcon: const Icon(Icons.person), label: tr(kk, 'Мои', 'Менің'))]),
  );
}

class _Unavailable extends StatelessWidget {
  const _Unavailable({required this.kk});
  final bool kk;
  @override
  Widget build(BuildContext context) => SingleChildScrollView(padding: const EdgeInsets.all(24), child: Column(
    crossAxisAlignment: CrossAxisAlignment.start, children: [
      const SizedBox(height: 24), const Icon(Icons.grass, size: 64), const SizedBox(height: 24),
      Text(tr(kk, 'Рынок начинается\nс доверия.', 'Сауда сенімнен\nбасталады.'), style: const TextStyle(fontSize: 34, fontWeight: FontWeight.w800, height: 1.1)),
      const SizedBox(height: 24), Notice(text: tr(kk,
        'Подключение к серверу пока не настроено. Объявления появятся после настройки приложения командой.',
        'Серверге қосылу әлі бапталмаған. Команда қолданбаны баптағаннан кейін хабарландырулар көрсетіледі.')),
      const SizedBox(height: 24), Text(tr(kk, 'Сегодняшние предложения · Цена за голову · Связь с владельцем',
        'Бүгінгі ұсыныстар · Бір бас бағасы · Иесімен байланыс'), style: Theme.of(context).textTheme.bodyLarge),
    ]));
}

class _SignInPrompt extends StatelessWidget {
  const _SignInPrompt({required this.kk, required this.enabled, required this.login});
  final bool kk; final bool enabled; final VoidCallback login;
  @override
  Widget build(BuildContext context) => SingleChildScrollView(padding: const EdgeInsets.all(24), child: Column(
    crossAxisAlignment: CrossAxisAlignment.start, children: [const SizedBox(height: 32),
      const Icon(Icons.person_outline, size: 60), const SizedBox(height: 20),
      Text(tr(kk, 'Ваши объявления', 'Сіздің хабарландыруларыңыз'), style: Theme.of(context).textTheme.headlineMedium),
      const SizedBox(height: 16), Text(tr(kk, 'Войдите, чтобы публиковать, редактировать и подтверждать наличие.',
        'Жариялау, өңдеу және бар екенін растау үшін кіріңіз.')),
      const SizedBox(height: 24), if (enabled) FilledButton(onPressed: login, child: Text(tr(kk, 'Войти', 'Кіру')))
      else Notice(text: tr(kk, 'Вход пока не настроен командой.', 'Кіруді команда әлі баптамаған.')),
    ]));
}

class _Listings extends StatefulWidget {
  const _Listings({super.key, required this.api, required this.kk, required this.owned, required this.reload, required this.onTap});
  final LivestockApi api; final bool kk; final bool owned; final int reload; final ValueChanged<Json> onTap;
  @override
  State<_Listings> createState() => _ListingsState();
}

class _ListingsState extends State<_Listings> {
  final _locality = TextEditingController();
  String? _species;
  String? _status;
  String? _cursor;
  String _appliedLocality = '';
  List<Json> _items = [];
  bool _loading = true;
  Object? _error;
  int _request = 0;
  bool get kk => widget.kk;
  @override
  void initState() { super.initState(); _load(); }
  @override
  void didUpdateWidget(covariant _Listings oldWidget) {
    super.didUpdateWidget(oldWidget); if (oldWidget.reload != widget.reload) _load();
  }
  @override
  void dispose() { _locality.dispose(); super.dispose(); }
  Future<void> _load({bool more = false}) async {
    final request = ++_request;
    setState(() { _loading = true; _error = null; if (!more) { _items = []; _cursor = null; _appliedLocality = _locality.text.trim(); } });
    try {
      final response = await widget.api.get(widget.owned ? '/livestock/me/listings' : '/livestock/listings',
        authenticated: widget.owned, query: {'limit': '20', if (_species != null) 'species': _species!,
          if (_appliedLocality.isNotEmpty) 'locality': _appliedLocality,
          if (widget.owned && _status != null) 'status': _status!, if (more && _cursor != null) 'cursor': _cursor!});
      if (!mounted || request != _request) return;
      setState(() { final incoming = (response['items'] as List).cast<Json>();
        _items = more ? [..._items, ...incoming.where((entry) => !_items.any((existing) => existing['id'] == entry['id']))] : incoming;
        _cursor = response['next_cursor'] as String?; _loading = false; });
    } catch (error) { if (mounted && request == _request) setState(() { _error = error; _loading = false; }); }
  }
  @override
  Widget build(BuildContext context) => RefreshIndicator(onRefresh: _load, child: ListView(
    physics: const AlwaysScrollableScrollPhysics(), padding: const EdgeInsets.fromLTRB(20, 8, 20, 100), children: [
      Text(widget.owned ? tr(kk, 'Мои объявления', 'Менің хабарландыруларым') : tr(kk, 'Есть сегодня', 'Бүгін бар'),
        style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w800)),
      const SizedBox(height: 8), Text(widget.owned ? tr(kk, 'Все статусы. Наличие подтверждает владелец.', 'Барлық күйлер. Бар екенін иесі растайды.')
        : tr(kk, 'Только подтверждённые сегодня предложения', 'Бүгін расталған ұсыныстар ғана')),
      const SizedBox(height: 20), DropdownButtonFormField<String>(initialValue: _species ?? '', isExpanded: true,
        decoration: InputDecoration(labelText: tr(kk, 'Вид животного', 'Мал түрі')),
        items: [DropdownMenuItem(value: '', child: Text(tr(kk, 'Все виды', 'Барлық түрлер'))),
          ...speciesCodes.map((code) => DropdownMenuItem(value: code, child: Text(speciesName(code, kk))))],
        onChanged: (value) { setState(() => _species = value == '' ? null : value); _load(); }),
      const SizedBox(height: 12), TextField(controller: _locality, maxLength: 100, textInputAction: TextInputAction.search,
        onSubmitted: (_) => _load(), decoration: InputDecoration(labelText: tr(kk, 'Город или село', 'Қала немесе ауыл'), counterText: '',
          suffixIcon: IconButton(tooltip: tr(kk, 'Применить фильтр', 'Сүзгіні қолдану'), onPressed: _load, icon: const Icon(Icons.search)))),
      if (widget.owned) Padding(padding: const EdgeInsets.only(top: 12), child: DropdownButtonFormField<String>(
        initialValue: _status ?? '', isExpanded: true, decoration: InputDecoration(labelText: tr(kk, 'Статус', 'Күйі')),
        items: [DropdownMenuItem(value: '', child: Text(tr(kk, 'Все статусы', 'Барлық күйлер'))),
          DropdownMenuItem(value: 'active', child: Text(tr(kk, 'Активные', 'Белсенді'))),
          DropdownMenuItem(value: 'sold', child: Text(tr(kk, 'Продано', 'Сатылды'))),
          DropdownMenuItem(value: 'withdrawn', child: Text(tr(kk, 'Снято', 'Алып тасталды')))],
        onChanged: (value) { setState(() => _status = value == '' ? null : value); _load(); })),
      const SizedBox(height: 20),
      if (_error != null) Notice(error: true, text: safeError(_error!, kk),
        action: OutlinedButton.icon(onPressed: () => _load(more: _items.isNotEmpty), icon: const Icon(Icons.refresh), label: Text(tr(kk, 'Повторить', 'Қайталау')))),
      if (!_loading && _error == null && _items.isEmpty) Notice(icon: Icons.grass, text: widget.owned
        ? tr(kk, 'Пока нет объявлений по этим фильтрам.', 'Бұл сүзгілер бойынша хабарландыру жоқ.')
        : tr(kk, 'Сегодня здесь пока нет предложений. Попробуйте другой вид или место.', 'Бүгін мұнда ұсыныстар жоқ. Басқа түрді не орынды таңдаңыз.')),
      ..._items.map((item) => ListingCard(listing: item, api: widget.api, kk: kk, owned: widget.owned, onTap: () => widget.onTap(item))),
      if (_loading) const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator())),
      if (_cursor != null && !_loading) OutlinedButton(onPressed: () => _load(more: true), child: Text(tr(kk, 'Показать ещё', 'Тағы көрсету'))),
    ]));
}

class _Statistics extends StatefulWidget {
  const _Statistics({required this.api, required this.kk, required this.reload});
  final LivestockApi api; final bool kk; final int reload;
  @override
  State<_Statistics> createState() => _StatisticsState();
}

class _StatisticsState extends State<_Statistics> {
  final _locality = TextEditingController();
  String _species = 'cattle';
  Json? _result;
  Object? _error;
  bool _loading = false;
  int _request = 0;
  bool get kk => widget.kk;
  @override
  void didUpdateWidget(covariant _Statistics oldWidget) {
    super.didUpdateWidget(oldWidget); if (oldWidget.reload != widget.reload && _result != null) _load();
  }
  @override
  void dispose() { _locality.dispose(); super.dispose(); }
  Future<void> _load() async {
    if (_locality.text.trim().isEmpty) return;
    final request = ++_request;
    setState(() { _loading = true; _error = null; _result = null; });
    try {
      final result = await widget.api.get('/livestock/prices', query: {'species': _species, 'locality': _locality.text.trim()});
      if (mounted && request == _request) setState(() { _result = result; _loading = false; });
    } catch (error) { if (mounted && request == _request) setState(() { _error = error; _loading = false; }); }
  }
  @override
  Widget build(BuildContext context) => ListView(padding: const EdgeInsets.all(20), children: [
    Text(tr(kk, 'Цены предложений', 'Ұсыныс бағалары'), style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w800)),
    const SizedBox(height: 12), Text(tr(kk, 'Медиана за одну голову по сегодняшним объявлениям. Это не цена сделки.',
      'Бүгінгі хабарландырулардағы бір бас бағасының медианасы. Бұл мәміле бағасы емес.')),
    const SizedBox(height: 24), DropdownButtonFormField<String>(initialValue: _species, isExpanded: true,
      decoration: InputDecoration(labelText: tr(kk, 'Вид животного', 'Мал түрі')),
      items: speciesCodes.map((code) => DropdownMenuItem(value: code, child: Text(speciesName(code, kk)))).toList(),
      onChanged: (value) => setState(() { _species = value!; _result = null; _request++; _loading = false; })),
    const SizedBox(height: 12), TextField(controller: _locality, maxLength: 100, textInputAction: TextInputAction.search,
      onChanged: (_) => setState(() { _result = null; _request++; _loading = false; }), onSubmitted: (_) => _load(),
      decoration: InputDecoration(labelText: tr(kk, 'Город или село', 'Қала немесе ауыл'))),
    const SizedBox(height: 12), FilledButton(onPressed: _loading || _locality.text.trim().isEmpty ? null : _load,
      child: Text(tr(kk, 'Посмотреть цены', 'Бағаларды көру'))),
    const SizedBox(height: 24), if (_loading) const Center(child: CircularProgressIndicator()),
    if (_error != null) Notice(error: true, text: safeError(_error!, kk)),
    if (_result != null) Card(child: Padding(padding: const EdgeInsets.all(24), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('${speciesName(_result!['species'] as String, kk)} · ${_result!['locality']}', style: Theme.of(context).textTheme.titleMedium),
      const SizedBox(height: 20), if (_result!['status'] == 'insufficient_data') Text(tr(kk, 'Пока мало данных', 'Деректер әлі аз'),
        style: Theme.of(context).textTheme.headlineSmall)
      else Text(money(_result!['median_price_per_head_minor'] as int), style: const TextStyle(fontSize: 34, fontWeight: FontWeight.w800)),
      const SizedBox(height: 12), Text('${tr(kk, 'Объявлений', 'Хабарландыру')}: ${_result!['sample_count']}'),
      const SizedBox(height: 8), Text('${_result!['period_from']} — ${_result!['period_to']}\n${_result!['timezone']}'),
      if (_result!['status'] == 'insufficient_data') Padding(padding: const EdgeInsets.only(top: 16), child: Text(tr(kk,
        'Для медианы нужно не меньше 5 неучебных объявлений.', 'Медиана үшін кемінде 5 оқу емес хабарландыру қажет.'))),
    ]))),
    const SizedBox(height: 20), Notice(text: tr(kk, 'Учебные объявления не участвуют в статистике. Размер лота не увеличивает число наблюдений.',
      'Оқу хабарландырулары статистикаға кірмейді. Мал саны бақылау санын арттырмайды.')),
  ]);
}

class _Detail extends StatefulWidget {
  const _Detail({required this.runtime, required this.item, required this.owned, required this.kk});
  final MobileRuntime runtime; final Json item; final bool owned; final bool kk;
  @override
  State<_Detail> createState() => _DetailState();
}

class _DetailState extends State<_Detail> with WidgetsBindingObserver {
  Json? _item;
  Object? _error;
  bool _busy = false;
  Timer? _timer;
  int _request = 0;
  bool get kk => widget.kk;
  LivestockApi get api => widget.runtime.api!;
  @override
  void initState() { super.initState(); WidgetsBinding.instance.addObserver(this); _load();
    _timer = Timer.periodic(const Duration(minutes: 1), (_) { if (!_busy) _load(); }); }
  @override
  void dispose() { _timer?.cancel(); WidgetsBinding.instance.removeObserver(this); super.dispose(); }
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) { if (state == AppLifecycleState.resumed && !_busy) _load(); }
  Future<void> _load() async {
    final request = ++_request;
    setState(() { _error = null; _item = null; });
    try {
      Json? result;
      if (!widget.owned) { result = await api.get('/livestock/listings/${widget.item['id']}'); }
      else {
        // The contract deliberately has no private GET-by-id route.
        String? cursor;
        do {
          final page = await api.get('/livestock/me/listings', authenticated: true,
            query: {'limit': '100', if (cursor != null) 'cursor': cursor});
          for (final item in (page['items'] as List).cast<Json>()) {
            if (item['id'] == widget.item['id']) { result = item; break; }
          }
          cursor = page['next_cursor'] as String?;
        } while (result == null && cursor != null && mounted && request == _request);
      }
      if (!mounted || request != _request) return;
      setState(() { _item = result; if (result == null) _error = ApiFailure('NOT_FOUND'); });
    } catch (error) { if (mounted && request == _request) setState(() => _error = error); }
  }
  Future<void> _action(String action) async {
    if (_busy || _item == null) return;
    final id = _item!['id'] as String;
    final epoch = widget.runtime.epoch;
    setState(() => _busy = true);
    final labels = action == 'sell' ? [tr(kk, 'Отметить проданным?', 'Сатылды деп белгілеу керек пе?'),
      tr(kk, 'Объявление исчезнет из общей ленты. Вернуть его в активные нельзя. Продажа в денежном журнале не создаётся.', 'Хабарландыру жалпы тізімнен жоғалады. Оны қайта белсенді етуге болмайды. Ақша журналында сату жазбасы жасалмайды.')]
      : action == 'withdraw' ? [tr(kk, 'Снять объявление?', 'Хабарландыруды алып тастау керек пе?'),
        tr(kk, 'Оно останется в «Моих», но больше не будет публиковаться.', 'Ол «Менің» бөлімінде қалады, бірақ енді жарияланбайды.')]
      : [tr(kk, 'Животные есть сегодня?', 'Мал бүгін бар ма?'), tr(kk, 'Подтвердите актуальность предложения на сегодня.', 'Ұсыныстың бүгін өзекті екенін растаңыз.')];
    final confirm = await showDialog<bool>(context: context, builder: (context) => AlertDialog(title: Text(labels[0]), content: Text(labels[1]),
      actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: Text(tr(kk, 'Отмена', 'Бас тарту'))),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(tr(kk, 'Подтвердить', 'Растау')))]));
    if (!mounted || epoch != widget.runtime.epoch) return;
    if (confirm != true) { setState(() => _busy = false); return; }
    setState(() { _busy = true; _error = null; });
    try {
      final result = await api.mutate('POST', '/livestock/listings/$id/actions', {'action': action});
      if (!mounted || epoch != widget.runtime.epoch) return;
      setState(() => _item = result);
      await api.acknowledgePending();
      if (!mounted || epoch != widget.runtime.epoch) return;
      await _load();
    } catch (error) { if (mounted && epoch == widget.runtime.epoch) setState(() => _error = error); }
    finally { if (mounted && epoch == widget.runtime.epoch) setState(() => _busy = false); }
  }
  @override
  Widget build(BuildContext context) {
    final item = _item;
    final photos = (item?['photos'] as List? ?? []).cast<Json>();
    return Scaffold(appBar: AppBar(title: Text(tr(kk, 'Объявление', 'Хабарландыру'))), body: SafeArea(child: ListView(padding: const EdgeInsets.all(20), children: [
      if (_error != null) Notice(error: true, text: safeError(_error!, kk), action: OutlinedButton(onPressed: _load, child: Text(tr(kk, 'Обновить', 'Жаңарту')))),
      if (item == null && _error == null) const Padding(padding: EdgeInsets.all(40), child: Center(child: CircularProgressIndicator())),
      if (item != null) ...[
        if (item['is_demo'] == true) Padding(padding: const EdgeInsets.only(bottom: 16), child: Notice(text: tr(kk,
          'Учебное объявление. Не реальное рыночное предложение.', 'Оқу хабарландыруы. Нақты нарықтық ұсыныс емес.'))),
        ...photos.map((photo) => Padding(padding: const EdgeInsets.only(bottom: 12), child: ClipRRect(borderRadius: BorderRadius.circular(22), child:
          ApiPhoto(api: api, path: widget.owned ? '/livestock/me/photos/${photo['id']}' : photo['url'] as String,
            private: widget.owned, kk: kk, height: 260)))),
        Text(speciesName(item['species'] as String, kk), style: Theme.of(context).textTheme.headlineMedium),
        const SizedBox(height: 16), Text(money(item['price_per_head_minor'] as int), style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w800)),
        Text(tr(kk, 'Цена за одну голову', 'Бір бас бағасы')), const SizedBox(height: 24),
        _detailRow(Icons.place_outlined, '${item['locality']}'),
        _detailRow(Icons.pets_outlined, '${item['quantity']} ${tr(kk, 'голов', 'бас')}'),
        if (item['age_months'] != null) _detailRow(Icons.calendar_month_outlined, '${item['age_months']} ${tr(kk, 'мес.', 'ай')}'),
        if (item['sex'] != null) _detailRow(Icons.info_outline, switch (item['sex']) {
          'male' => tr(kk, 'Самец', 'Еркек'), 'female' => tr(kk, 'Самка', 'Ұрғашы'), _ => tr(kk, 'Пол не указан', 'Жынысы көрсетілмеген')}),
        _detailRow(Icons.event_available_outlined, '${tr(kk, 'Подтверждено', 'Расталған')}: ${item['confirmed_on']}'),
        if (widget.owned) _detailRow(Icons.circle_outlined, statusText(item, kk)),
        if ((item['description'] as String? ?? '').isNotEmpty) Padding(padding: const EdgeInsets.symmetric(vertical: 20), child: Text(item['description'] as String, style: const TextStyle(fontSize: 17, height: 1.5))),
        Card(child: Padding(padding: const EdgeInsets.all(20), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(tr(kk, 'Контакт владельца', 'Иесінің байланысы'), style: Theme.of(context).textTheme.titleMedium), const SizedBox(height: 8), SelectableText(item['contact'] as String)]))),
        if (widget.owned) ...[const SizedBox(height: 20),
          OutlinedButton.icon(onPressed: _busy ? null : () async {
            await Navigator.of(context).push(MaterialPageRoute<bool>(builder: (_) => ListingForm(runtime: widget.runtime, kk: kk, initial: item)));
            if (mounted) _load();
          }, icon: const Icon(Icons.edit_outlined), label: Text(tr(kk, 'Редактировать', 'Өңдеу'))),
          if (item['status'] == 'active') ...[const SizedBox(height: 10),
            FilledButton.icon(onPressed: _busy ? null : () => _action('confirm_today'), icon: const Icon(Icons.check), label: Text(tr(kk, 'Есть сегодня', 'Бүгін бар'))),
            const SizedBox(height: 10), OutlinedButton(onPressed: _busy ? null : () => _action('sell'), child: Text(tr(kk, 'Продано', 'Сатылды'))),
            TextButton(onPressed: _busy ? null : () => _action('withdraw'), child: Text(tr(kk, 'Снять объявление', 'Хабарландыруды алып тастау')))],
          if (_busy) const Center(child: CircularProgressIndicator()),
          const SizedBox(height: 12), Text(tr(kk, 'Если ответ потерялся, вернитесь в список и восстановите сохранённое действие.', 'Жауап жоғалса, тізімге оралып, сақталған әрекетті қалпына келтіріңіз.')),
        ],
      ],
    ])));
  }
  Widget _detailRow(IconData icon, String text) => Padding(padding: const EdgeInsets.symmetric(vertical: 7), child: Row(children: [Icon(icon, size: 20), const SizedBox(width: 12), Expanded(child: Text(text))]));
}

Future<void> showLogin(BuildContext context, MobileRuntime runtime, bool kk) async {
  if (!runtime.authConfigured) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(tr(kk, 'Вход пока не настроен командой.', 'Кіруді команда әлі баптамаған.')))); return;
  }
  await Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => _Login(runtime: runtime, kk: kk)));
}

class _Login extends StatefulWidget {
  const _Login({required this.runtime, required this.kk});
  final MobileRuntime runtime; final bool kk;
  @override
  State<_Login> createState() => _LoginState();
}
class _LoginState extends State<_Login> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _form = GlobalKey<FormState>();
  bool _busy = false;
  bool _hidden = true;
  bool _failed = false;
  bool get kk => widget.kk;
  @override
  void dispose() { _password.clear(); _password.dispose(); _email.dispose(); super.dispose(); }
  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() { _busy = true; _failed = false; });
    try { await widget.runtime.signIn(_email.text.trim(), _password.text);
      if (mounted) Navigator.of(context).pop();
    } catch (_) { if (mounted) setState(() { _failed = true; _busy = false; }); }
  }
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: Text(tr(kk, 'Вход', 'Кіру'))), body: SafeArea(child:
    Form(key: _form, child: ListView(padding: const EdgeInsets.all(24), children: [const SizedBox(height: 24),
      Text(tr(kk, 'С возвращением', 'Қош келдіңіз'), style: Theme.of(context).textTheme.headlineLarge),
      const SizedBox(height: 12), Text(tr(kk, 'Используйте общий аккаунт Qadam.', 'Ортақ Qadam аккаунтын пайдаланыңыз.')),
      const SizedBox(height: 28), TextFormField(controller: _email, keyboardType: TextInputType.emailAddress, autocorrect: false,
        textInputAction: TextInputAction.next, decoration: const InputDecoration(labelText: 'Email'),
        validator: (value) => value == null || !value.contains('@') ? tr(kk, 'Введите email', 'Email енгізіңіз') : null),
      const SizedBox(height: 16), TextFormField(controller: _password, obscureText: _hidden, autocorrect: false, enableSuggestions: false,
        textInputAction: TextInputAction.done, onFieldSubmitted: (_) { if (!_busy) _submit(); },
        decoration: InputDecoration(labelText: tr(kk, 'Пароль', 'Құпиясөз'), suffixIcon: IconButton(
          tooltip: tr(kk, 'Показать или скрыть пароль', 'Құпиясөзді көрсету немесе жасыру'), onPressed: () => setState(() => _hidden = !_hidden), icon: Icon(_hidden ? Icons.visibility_outlined : Icons.visibility_off_outlined))),
        validator: (value) => value == null || value.isEmpty ? tr(kk, 'Введите пароль', 'Құпиясөз енгізіңіз') : null),
      const SizedBox(height: 24), if (_failed) Padding(padding: const EdgeInsets.only(bottom: 16), child: Notice(error: true, text: tr(kk,
        'Не удалось войти. Проверьте email, пароль и соединение.', 'Кіру мүмкін болмады. Email, құпиясөз және байланысты тексеріңіз.'))),
      FilledButton(onPressed: _busy ? null : _submit, child: Text(_busy ? tr(kk, 'Входим…', 'Кіруде…') : tr(kk, 'Войти', 'Кіру'))),
    ]))));
}
