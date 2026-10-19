import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import '../data/livestock_api.dart';
import '../runtime.dart';
import '../frontend_links.dart';
import 'qadam_shell.dart';
import 'qadam_theme.dart';
import 'language.dart';
import 'common.dart';
import 'listing_form.dart';

class MobileApp extends StatefulWidget {
  const MobileApp({
    super.key,
    required this.runtime,
    this.browserLauncher = openSystemBrowser,
  });
  final BrowserLauncher browserLauncher;
  final MobileRuntime runtime;
  @override
  State<MobileApp> createState() => _MobileAppState();
}

class _MobileAppState extends State<MobileApp> {
  bool _kk = false;
  int _section = 4; // Home and all four venues are public.
  int _marketTab = 0;
  int _marketRequest = 0;
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
  void dispose() {
    widget.runtime.removeListener(_changed);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => MaterialApp(
    key: ValueKey(widget.runtime.epoch),
    title: 'Qadam',
    debugShowCheckedModeBanner: false,
    locale: Locale(_kk ? 'kk' : 'ru'),
    supportedLocales: const [Locale('ru'), Locale('kk')],
    localizationsDelegates: GlobalMaterialLocalizations.delegates,
    theme: QadamTheme.light,
    builder: (context, child) => QadamLanguage(
      kk: _kk,
      toggle: () => setState(() => _kk = !_kk),
      child: child!,
    ),
    home: QadamShell(
      runtime: widget.runtime,
      kk: _kk,
      section: _section,
      onSection: (value) => setState(() => _section = value),
      toggleLanguage: () => setState(() => _kk = !_kk),
      login: (context) => showLogin(context, widget.runtime, _kk),
      browserLauncher: widget.browserLauncher,
      onMarket: (tab) => setState(() {
        _marketTab = tab;
        _marketRequest++;
        _section = 1;
      }),
      market: _Home(
        onBack: () => setState(() => _section = 3),
        requestedTab: _marketTab,
        request: _marketRequest,
        runtime: widget.runtime,
        kk: _kk,
        toggleLanguage: () => setState(() => _kk = !_kk),
      ),
    ),
  );
}

class _Home extends StatefulWidget {
  const _Home({
    required this.onBack,
    required this.requestedTab,
    required this.request,
    required this.runtime,
    required this.kk,
    required this.toggleLanguage,
  });
  final MobileRuntime runtime;
  final bool kk;
  final VoidCallback toggleLanguage;
  @override
  State<_Home> createState() => _HomeState();
  final VoidCallback onBack;
  final int requestedTab, request;
}

class _HomeState extends State<_Home> with WidgetsBindingObserver {
  int _tab = 0;
  @override
  void didUpdateWidget(_Home oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.request != widget.request) _tab = widget.requestedTab;
  }

  int _reload = 0;
  PendingIntent? _pending;
  bool _retrying = false;
  bool _openingEditor = false;
  bool _openingDetail = false;
  Object? _pendingError;
  Timer? _timer;
  bool get kk => qadamKk(context);
  MobileRuntime get runtime => widget.runtime;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _checkPending();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final account = runtime.accountId;
      if (account != null &&
          await ListingForm.hasPickerRecovery(account) &&
          mounted &&
          runtime.accountId == account) {
        await _edit();
      }
    });
    // Re-fetch against server date; the device never decides available_today.
    _timer = Timer.periodic(const Duration(minutes: 1), (_) => _refresh());
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _refresh();
      _checkPending();
    }
  }

  void _refresh() {
    if (mounted) setState(() => _reload++);
  }

  @override
  void dispose() {
    _timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  Future<void> _checkPending() async {
    if (runtime.accountId == null || runtime.api == null) return;
    final epoch = runtime.epoch;
    try {
      final pending = await runtime.api!.loadPending();
      if (mounted && runtime.epoch == epoch) setState(() => _pending = pending);
    } catch (error) {
      if (mounted && runtime.epoch == epoch) {
        setState(() => _pendingError = error);
      }
    }
  }

  Future<void> _login() => showLogin(context, runtime, kk);
  Future<void> _edit([Json? listing]) async {
    if (_openingEditor) return;
    _openingEditor = true;
    try {
      if (runtime.accountId == null) {
        await _login();
        return;
      }
      await _checkPending();
      if (!mounted) return;
      if (_pending != null && _pending!.kind != 'upload') {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              tr(
                kk,
                'Сначала завершите сохранённое действие вверху экрана.',
                'Алдымен экранның жоғарғы жағындағы сақталған әрекетті аяқтаңыз.',
              ),
            ),
          ),
        );
        return;
      }
      final published = await Navigator.of(context).push<bool>(
        MaterialPageRoute<bool>(
          builder: (_) =>
              ListingForm(runtime: runtime, kk: kk, initial: listing),
        ),
      );
      if (mounted) {
        if (published == true) setState(() => _tab = 2);
        _refresh();
        await _checkPending();
      }
    } finally {
      _openingEditor = false;
    }
  }

  Future<void> _retry() async {
    if (_retrying || _pending == null || runtime.api == null) return;
    if (_pending!.kind == 'upload') {
      await _edit();
      return;
    }
    final epoch = runtime.epoch;
    final api = runtime.api!;
    final pending = _pending!;
    setState(() {
      _retrying = true;
      _pendingError = null;
    });
    try {
      await api.retryPending();
      if (!mounted || epoch != runtime.epoch) return;
      // Fetch canonical owner state before acknowledging an old response snapshot.
      await api.get('/livestock/me/listings', authenticated: true);
      if (!mounted || epoch != runtime.epoch) return;
      await ListingForm.clearDraftFor(pending);
      if (!mounted || epoch != runtime.epoch) return;
      await api.acknowledgePending();
      if (!mounted || epoch != runtime.epoch) return;
      setState(() {
        _pending = null;
        _tab = 2;
        _reload++;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            tr(
              kk,
              'Сервер подтвердил действие. Список обновлён.',
              'Сервер әрекетті растады. Тізім жаңартылды.',
            ),
          ),
        ),
      );
    } catch (error) {
      if (mounted && epoch == runtime.epoch) {
        setState(() => _pendingError = error);
      }
    } finally {
      if (mounted && epoch == runtime.epoch) {
        setState(() => _retrying = false);
        await _checkPending();
      }
    }
  }

  Future<void> _detail(Json item, bool owned) async {
    if (_openingDetail) return;
    _openingDetail = true;
    try {
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) =>
              _Detail(runtime: runtime, item: item, owned: owned, kk: kk),
        ),
      );
      if (mounted) {
        _refresh();
        _checkPending();
      }
    } finally {
      _openingDetail = false;
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      leading: BackButton(onPressed: widget.onBack),
      title: const Text('Мал базар', style: QadamTheme.appTitle),
      actions: [
        TextButton(
          onPressed: widget.toggleLanguage,
          child: Text(
            kk ? 'RU' : 'ҚАЗ',
            semanticsLabel: kk ? 'Русский язык' : 'Қазақ тілі',
          ),
        ),
        if (_tab == 2 && runtime.accountId != null)
          IconButton(
            tooltip: tr(kk, 'Выйти', 'Шығу'),
            onPressed: () async {
              try {
                await runtime.signOut();
              } catch (_) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        tr(
                          kk,
                          'Не удалось выйти. Попробуйте ещё раз.',
                          'Шығу мүмкін болмады. Қайта көріңіз.',
                        ),
                      ),
                    ),
                  );
                }
              }
            },
            icon: const Icon(Icons.logout),
          ),
      ],
    ),
    body: SafeArea(
      child: LayoutBuilder(
        builder: (context, constraints) => Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: SizedBox(
                width: double.infinity,
                child: SegmentedButton<int>(
                  selected: {_tab},
                  onSelectionChanged: (values) =>
                      setState(() => _tab = values.single),
                  showSelectedIcon: false,
                  segments: [
                    ButtonSegment(
                      value: 0,
                      label: Text(tr(kk, 'Сегодня', 'Бүгін')),
                    ),
                    ButtonSegment(
                      value: 1,
                      label: Text(tr(kk, 'Цены', 'Бағалар')),
                    ),
                    ButtonSegment(
                      value: 2,
                      label: Text(tr(kk, 'Мои', 'Менің')),
                    ),
                  ],
                ),
              ),
            ),
            if (_pending != null || _pendingError != null)
              ConstrainedBox(
                constraints: BoxConstraints(
                  maxHeight: constraints.maxHeight * .4,
                ),
                child: SingleChildScrollView(
                  child: Column(
                    children: [
                      if (_pending != null)
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                          child: Notice(
                            text: _pending!.completedResponse != null
                                ? tr(
                                    kk,
                                    'Есть подтверждённое действие. Восстановите результат.',
                                    'Расталған әрекет бар. Нәтижені қалпына келтіріңіз.',
                                  )
                                : tr(
                                    kk,
                                    'Результат прошлого действия неизвестен. Повторим тот же запрос без дубля.',
                                    'Алдыңғы әрекеттің нәтижесі белгісіз. Сол сұрауды қайталаймыз.',
                                  ),
                            action: FilledButton.tonal(
                              onPressed: _retrying ? null : _retry,
                              child: Text(
                                _retrying
                                    ? tr(kk, 'Проверяем…', 'Тексерілуде…')
                                    : _pending!.kind == 'upload'
                                    ? tr(
                                        kk,
                                        'Вернуться к фото и форме',
                                        'Фото мен формаға оралу',
                                      )
                                    : tr(
                                        kk,
                                        'Восстановить действие',
                                        'Әрекетті қалпына келтіру',
                                      ),
                              ),
                            ),
                          ),
                        ),
                      if (_pendingError != null)
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                          child: Notice(
                            text: safeError(_pendingError!, kk),
                            error: true,
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            Expanded(
              child: !runtime.configured || runtime.api == null
                  ? _Unavailable(kk: kk)
                  : _tab == 1
                  ? _Statistics(api: runtime.api!, kk: kk, reload: _reload)
                  : _tab == 2 && runtime.accountId == null
                  ? _SignInPrompt(
                      kk: kk,
                      enabled: runtime.authConfigured,
                      login: _login,
                    )
                  : _Listings(
                      key: ValueKey('$_tab-${runtime.epoch}'),
                      api: runtime.api!,
                      kk: kk,
                      owned: _tab == 2,
                      reload: _reload,
                      onTap: (item) => _detail(item, _tab == 2),
                    ),
            ),
          ],
        ),
      ),
    ),
    floatingActionButton: runtime.configured && _tab != 1
        ? FloatingActionButton.extended(
            onPressed: () => _edit(),
            icon: const Icon(Icons.add),
            label: Text(tr(kk, 'Подать объявление', 'Хабарландыру беру')),
          )
        : null,
  );
}

class _Unavailable extends StatelessWidget {
  const _Unavailable({required this.kk});
  final bool kk;
  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    padding: const EdgeInsets.all(24),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 24),
        const Icon(Icons.grass, size: 64),
        const SizedBox(height: 24),
        Text(
          tr(kk, 'Рынок начинается\nс доверия.', 'Сауда сенімнен\nбасталады.'),
          style: const TextStyle(
            fontSize: 34,
            fontWeight: FontWeight.w800,
            height: 1.1,
          ),
        ),
        const SizedBox(height: 24),
        Notice(
          text: tr(
            kk,
            'Подключение к серверу пока не настроено. Объявления появятся после настройки приложения командой.',
            'Серверге қосылу әлі бапталмаған. Команда қолданбаны баптағаннан кейін хабарландырулар көрсетіледі.',
          ),
        ),
        const SizedBox(height: 24),
        Text(
          tr(
            kk,
            'Сегодняшние предложения · Цена за голову · Связь с владельцем',
            'Бүгінгі ұсыныстар · Бір бас бағасы · Иесімен байланыс',
          ),
          style: Theme.of(context).textTheme.bodyLarge,
        ),
      ],
    ),
  );
}

class _SignInPrompt extends StatelessWidget {
  const _SignInPrompt({
    required this.kk,
    required this.enabled,
    required this.login,
  });
  final bool kk;
  final bool enabled;
  final VoidCallback login;
  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    padding: const EdgeInsets.all(24),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 32),
        const Icon(Icons.person_outline, size: 60),
        const SizedBox(height: 20),
        Text(
          tr(kk, 'Ваши объявления', 'Сіздің хабарландыруларыңыз'),
          style: Theme.of(context).textTheme.headlineMedium,
        ),
        const SizedBox(height: 16),
        Text(
          tr(
            kk,
            'Войдите, чтобы публиковать, редактировать и подтверждать наличие.',
            'Жариялау, өңдеу және бар екенін растау үшін кіріңіз.',
          ),
        ),
        const SizedBox(height: 24),
        if (enabled)
          FilledButton(onPressed: login, child: Text(tr(kk, 'Войти', 'Кіру')))
        else
          Notice(
            text: tr(
              kk,
              'Вход пока не настроен командой.',
              'Кіруді команда әлі баптамаған.',
            ),
          ),
      ],
    ),
  );
}

class _Listings extends StatefulWidget {
  const _Listings({
    super.key,
    required this.api,
    required this.kk,
    required this.owned,
    required this.reload,
    required this.onTap,
  });
  final LivestockApi api;
  final bool kk;
  final bool owned;
  final int reload;
  final ValueChanged<Json> onTap;
  @override
  State<_Listings> createState() => _ListingsState();
}

class _ListingsState extends State<_Listings> {
  final _locality = TextEditingController();
  final _market = TextEditingController();
  String? _species;
  String? _status;
  String? _cursor;
  String _appliedLocality = '';
  String _appliedMarket = '';
  List<Json> _items = [];
  bool _loading = true;
  Object? _error;
  int _request = 0;
  bool get kk => qadamKk(context);
  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant _Listings oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.reload != widget.reload) _load();
  }

  @override
  void dispose() {
    _locality.dispose();
    _market.dispose();
    super.dispose();
  }

  Future<void> _load({bool more = false}) async {
    final request = ++_request;
    setState(() {
      _loading = true;
      _error = null;
      if (!more) {
        _items = [];
        _cursor = null;
        _appliedLocality = normalizedPlace(_locality.text);
        _appliedMarket = normalizedPlace(_market.text);
      }
    });
    try {
      if (_appliedMarket.isNotEmpty && _appliedLocality.isEmpty) {
        throw const ApiFailure('LOCALITY_REQUIRED');
      }
      final response = await widget.api.get(
        widget.owned ? '/livestock/me/listings' : '/livestock/listings',
        authenticated: widget.owned,
        query: {
          'limit': '20',
          'species': ?_species,
          if (_appliedLocality.isNotEmpty) 'locality': _appliedLocality,
          if (_appliedMarket.isNotEmpty) 'market': _appliedMarket,
          if (widget.owned && _status != null) 'status': _status!,
          if (more && _cursor != null) 'cursor': _cursor!,
        },
      );
      if (!mounted || request != _request) return;
      setState(() {
        final incoming = (response['items'] as List).cast<Json>();
        _items = more
            ? [
                ..._items,
                ...incoming.where(
                  (entry) =>
                      !_items.any((existing) => existing['id'] == entry['id']),
                ),
              ]
            : incoming;
        _cursor = response['next_cursor'] as String?;
        _loading = false;
      });
    } catch (error) {
      if (mounted && request == _request) {
        setState(() {
          _error = error;
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => RefreshIndicator(
    onRefresh: _load,
    child: ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
      children: [
        Text(
          widget.owned
              ? tr(kk, 'Мои объявления', 'Менің хабарландыруларым')
              : tr(kk, 'Есть сегодня', 'Бүгін бар'),
          style: QadamTheme.pageTitle,
        ),
        const SizedBox(height: 8),
        Text(
          widget.owned
              ? tr(
                  kk,
                  'Все статусы. Наличие подтверждает владелец.',
                  'Барлық күйлер. Бар екенін иесі растайды.',
                )
              : tr(
                  kk,
                  'Только подтверждённые сегодня предложения',
                  'Бүгін расталған ұсыныстар ғана',
                ),
        ),
        const SizedBox(height: 20),
        DropdownButtonFormField<String>(
          initialValue: _species ?? '',
          isExpanded: true,
          decoration: InputDecoration(
            labelText: tr(kk, 'Вид животного', 'Мал түрі'),
          ),
          items: [
            DropdownMenuItem(
              value: '',
              child: Text(tr(kk, 'Все виды', 'Барлық түрлер')),
            ),
            ...speciesCodes.map(
              (code) => DropdownMenuItem(
                value: code,
                child: Text(speciesName(code, kk)),
              ),
            ),
          ],
          onChanged: (value) {
            setState(() => _species = value == '' ? null : value);
            _load();
          },
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _locality,
          maxLength: 100,
          textInputAction: TextInputAction.search,
          onSubmitted: (_) => _load(),
          decoration: InputDecoration(
            labelText: tr(kk, 'Город или село', 'Қала немесе ауыл'),
            counterText: '',
            suffixIcon: IconButton(
              tooltip: tr(kk, 'Применить фильтр', 'Сүзгіні қолдану'),
              onPressed: _load,
              icon: const Icon(Icons.search),
            ),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _market,
          maxLength: 100,
          textInputAction: TextInputAction.search,
          onSubmitted: (_) => _load(),
          decoration: InputDecoration(
            labelText: tr(
              kk,
              'Рынок (все, если пусто)',
              'Базар (бос болса, барлығы)',
            ),
            counterText: '',
            suffixIcon: IconButton(
              tooltip: tr(
                kk,
                'Применить фильтр рынка',
                'Базар сүзгісін қолдану',
              ),
              onPressed: _load,
              icon: const Icon(Icons.search),
            ),
          ),
        ),
        if (widget.owned)
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: DropdownButtonFormField<String>(
              initialValue: _status ?? '',
              isExpanded: true,
              decoration: InputDecoration(labelText: tr(kk, 'Статус', 'Күйі')),
              items: [
                DropdownMenuItem(
                  value: '',
                  child: Text(tr(kk, 'Все статусы', 'Барлық күйлер')),
                ),
                DropdownMenuItem(
                  value: 'active',
                  child: Text(tr(kk, 'Активные', 'Белсенді')),
                ),
                DropdownMenuItem(
                  value: 'sold',
                  child: Text(tr(kk, 'Продано', 'Сатылды')),
                ),
                DropdownMenuItem(
                  value: 'withdrawn',
                  child: Text(tr(kk, 'Снято', 'Алып тасталды')),
                ),
              ],
              onChanged: (value) {
                setState(() => _status = value == '' ? null : value);
                _load();
              },
            ),
          ),
        const SizedBox(height: 20),
        if (_error != null)
          Notice(
            error: true,
            text: safeError(_error!, kk),
            action: OutlinedButton.icon(
              onPressed: () => _load(more: _items.isNotEmpty),
              icon: const Icon(Icons.refresh),
              label: Text(tr(kk, 'Повторить', 'Қайталау')),
            ),
          ),
        if (!_loading && _error == null && _items.isEmpty)
          Notice(
            icon: Icons.grass,
            text: widget.owned
                ? tr(
                    kk,
                    'Пока нет объявлений по этим фильтрам.',
                    'Бұл сүзгілер бойынша хабарландыру жоқ.',
                  )
                : tr(
                    kk,
                    'Сегодня здесь пока нет предложений. Попробуйте другой вид или место.',
                    'Бүгін мұнда ұсыныстар жоқ. Басқа түрді не орынды таңдаңыз.',
                  ),
          ),
        ..._items.map(
          (item) => ListingCard(
            listing: item,
            api: widget.api,
            kk: kk,
            owned: widget.owned,
            onTap: () => widget.onTap(item),
          ),
        ),
        if (_loading)
          const Padding(
            padding: EdgeInsets.all(24),
            child: Center(child: CircularProgressIndicator()),
          ),
        if (_cursor != null && !_loading)
          OutlinedButton(
            onPressed: () => _load(more: true),
            child: Text(tr(kk, 'Показать ещё', 'Тағы көрсету')),
          ),
      ],
    ),
  );
}

class _Statistics extends StatefulWidget {
  const _Statistics({
    required this.api,
    required this.kk,
    required this.reload,
  });
  final LivestockApi api;
  final bool kk;
  final int reload;
  @override
  State<_Statistics> createState() => _StatisticsState();
}

class _StatisticsState extends State<_Statistics> {
  final _locality = TextEditingController();
  final _market = TextEditingController();
  String _species = 'cattle';
  Json? _result;
  Object? _error;
  bool _loading = false;
  bool _showDemoExample = false;
  int _request = 0;
  bool get kk => qadamKk(context);
  @override
  void didUpdateWidget(covariant _Statistics oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.reload != widget.reload && _result != null) _load();
  }

  @override
  void dispose() {
    _locality.dispose();
    _market.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (_locality.text.trim().isEmpty) return;
    final request = ++_request;
    setState(() {
      _loading = true;
      _error = null;
      _result = null;
      _showDemoExample = false;
    });
    try {
      final result = await widget.api.get(
        '/livestock/prices',
        query: {
          'species': _species,
          'locality': normalizedPlace(_locality.text),
          if (_market.text.trim().isNotEmpty)
            'market': normalizedPlace(_market.text),
        },
      );
      if (mounted && request == _request) {
        setState(() {
          _result = result;
          _loading = false;
        });
      }
    } catch (error) {
      if (mounted && request == _request) {
        setState(() {
          _error = error;
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(20),
    children: [
      Text(
        tr(kk, 'Цены предложений', 'Ұсыныс бағалары'),
        style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w800),
      ),
      const SizedBox(height: 12),
      Text(
        tr(
          kk,
          'Минимум и медиана за голову среди сегодняшних объявлений. Это цены предложений, без гарантии сделки.',
          'Бүгінгі хабарландырулардағы бір бас бағасының минимумы мен медианасы. Бұл мәмілеге кепілдік бермейтін ұсыныс бағалары.',
        ),
      ),
      const SizedBox(height: 24),
      DropdownButtonFormField<String>(
        initialValue: _species,
        isExpanded: true,
        decoration: InputDecoration(
          labelText: tr(kk, 'Вид животного', 'Мал түрі'),
        ),
        items: speciesCodes
            .map(
              (code) => DropdownMenuItem(
                value: code,
                child: Text(speciesName(code, kk)),
              ),
            )
            .toList(),
        onChanged: (value) => setState(() {
          _species = value!;
          _result = null;
          _showDemoExample = false;
          _request++;
          _loading = false;
        }),
      ),
      const SizedBox(height: 12),
      TextField(
        controller: _locality,
        maxLength: 100,
        textInputAction: TextInputAction.search,
        onChanged: (_) => setState(() {
          _result = null;
          _showDemoExample = false;
          _request++;
          _loading = false;
        }),
        onSubmitted: (_) => _load(),
        decoration: InputDecoration(
          labelText: tr(kk, 'Город или село', 'Қала немесе ауыл'),
        ),
      ),
      const SizedBox(height: 12),
      TextField(
        controller: _market,
        maxLength: 100,
        textInputAction: TextInputAction.search,
        onChanged: (_) => setState(() {
          _result = null;
          _error = null;
          _showDemoExample = false;
          _request++;
          _loading = false;
        }),
        onSubmitted: (_) => _load(),
        decoration: InputDecoration(
          labelText: tr(
            kk,
            'Рынок (все, если пусто)',
            'Базар (бос болса, барлығы)',
          ),
        ),
      ),
      const SizedBox(height: 12),
      FilledButton(
        onPressed: _loading || _locality.text.trim().isEmpty ? null : _load,
        child: Text(tr(kk, 'Посмотреть цены', 'Бағаларды көру')),
      ),
      const SizedBox(height: 24),
      if (_loading) const Center(child: CircularProgressIndicator()),
      if (_error != null) Notice(error: true, text: safeError(_error!, kk)),
      if (_result != null)
        Card(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${speciesName(_result!['species'] as String, kk)} · ${_result!['locality']}',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  _result!['market'] as String? ??
                      tr(kk, 'Все рынки', 'Барлық базарлар'),
                ),
                const SizedBox(height: 20),
                Text(
                  tr(
                    kk,
                    'Минимальная цена за голову',
                    'Бір бастың ең төмен бағасы',
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  !_result!.containsKey('min_price_per_head_minor')
                      ? tr(
                          kk,
                          'Минимум не поддерживается сервером',
                          'Сервер ең төмен бағаны бермейді',
                        )
                      : _result!['min_price_per_head_minor'] == null
                      ? tr(kk, 'Нет данных', 'Деректер жоқ')
                      : tr(
                          kk,
                          'От ${money(_result!['min_price_per_head_minor'] as int)}',
                          '${money(_result!['min_price_per_head_minor'] as int)} бастап',
                        ),
                  key: const ValueKey('minimum-price'),
                  style: const TextStyle(
                    fontSize: 30,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                Text(
                  tr(
                    kk,
                    'Среди сегодняшних объявлений',
                    'Бүгінгі хабарландырулар арасында',
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  tr(kk, 'Медиана за голову', 'Бір бас бағасының медианасы'),
                ),
                const SizedBox(height: 8),
                if (_result!['status'] == 'insufficient_data')
                  Text(
                    tr(kk, 'Пока мало данных', 'Деректер әлі аз'),
                    style: Theme.of(context).textTheme.headlineSmall,
                  )
                else
                  Text(
                    money(_result!['median_price_per_head_minor'] as int),
                    style: const TextStyle(
                      fontSize: 34,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                const SizedBox(height: 12),
                Text(
                  '${tr(kk, 'Объявлений', 'Хабарландыру')}: ${_result!['sample_count']}',
                ),
                const SizedBox(height: 8),
                Text(
                  '${_result!['period_from']} — ${_result!['period_to']}\n${_result!['timezone']}',
                ),
                if (_result!['status'] == 'insufficient_data')
                  Padding(
                    padding: const EdgeInsets.only(top: 16),
                    child: Text(
                      tr(
                        kk,
                        'Для медианы нужно не меньше 5 неучебных объявлений.',
                        'Медиана үшін кемінде 5 оқу емес хабарландыру қажет.',
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      if (_result?['status'] == 'insufficient_data') ...[
        OutlinedButton.icon(
          key: const ValueKey('toggle-demo-price-example'),
          onPressed: () =>
              setState(() => _showDemoExample = !_showDemoExample),
          icon: Icon(
            _showDemoExample
                ? Icons.visibility_off_outlined
                : Icons.school_outlined,
          ),
          label: Text(
            _showDemoExample
                ? tr(kk, 'Скрыть пример', 'Үлгіні жасыру')
                : tr(kk, 'Показать пример для демо', 'Демо үлгісін көрсету'),
          ),
        ),
        if (_showDemoExample)
          _DemoPriceExample(species: _species, kk: kk),
      ],
      const SizedBox(height: 20),
      Notice(
        text: tr(
          kk,
          'Учебные объявления не участвуют в статистике. Размер лота не увеличивает число наблюдений.',
          'Оқу хабарландырулары статистикаға кірмейді. Мал саны бақылау санын арттырмайды.',
        ),
      ),
    ],
  );
}

// Synthetic values stay out of API requests and server statistics.
const _demoPriceExamples = <String, ({int minimumMinor, int medianMinor})>{
  'cattle': (minimumMinor: 32000000, medianMinor: 35000000),
  'sheep': (minimumMinor: 4000000, medianMinor: 5000000),
  'goat': (minimumMinor: 3500000, medianMinor: 4500000),
  'horse': (minimumMinor: 50000000, medianMinor: 65000000),
  'camel': (minimumMinor: 80000000, medianMinor: 95000000),
};

class _DemoPriceExample extends StatelessWidget {
  const _DemoPriceExample({required this.species, required this.kk});
  final String species;
  final bool kk;

  @override
  Widget build(BuildContext context) {
    final example = _demoPriceExamples[species]!;
    return Card(
      color: QadamTheme.soft,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.school_outlined, color: QadamTheme.green),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        tr(
                          kk,
                          'Учебный пример · не рынок',
                          'Оқу үлгісі · нарық дерегі емес',
                        ),
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        tr(
                          kk,
                          '5 вымышленных предложений для демонстрации',
                          'Демоға арналған 5 ойдан шығарылған ұсыныс',
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            Text(
              '${speciesGlyph(species)}  ${speciesName(species, kk)}',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 14),
            Text(
              tr(
                kk,
                'Минимум за голову',
                'Бір бастың ең төмен бағасы',
              ),
            ),
            Text(
              money(example.minimumMinor),
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 12),
            Text(
              tr(
                kk,
                'Медиана за голову',
                'Бір бас бағасының медианасы',
              ),
            ),
            Text(
              money(example.medianMinor),
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 16),
            Text(
              tr(
                kk,
                'Цены вымышлены: это не данные выбранного города или рынка и не реальные объявления. Они не отправляются и не входят в статистику.',
                'Бағалар ойдан шығарылған: олар таңдалған қала не базар дерегі емес және нақты хабарландырулардан алынбаған. Олар жіберілмейді және статистикаға кірмейді.',
              ),
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}

class _Detail extends StatefulWidget {
  const _Detail({
    required this.runtime,
    required this.item,
    required this.owned,
    required this.kk,
  });
  final MobileRuntime runtime;
  final Json item;
  final bool owned;
  final bool kk;
  @override
  State<_Detail> createState() => _DetailState();
}

class _DetailState extends State<_Detail> with WidgetsBindingObserver {
  Json? _item;
  Object? _error;
  bool _busy = false;
  Timer? _timer;
  int _request = 0;
  bool get kk => qadamKk(context);
  LivestockApi get api => widget.runtime.api!;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
    _timer = Timer.periodic(const Duration(minutes: 1), (_) {
      if (!_busy) _load();
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && !_busy) _load();
  }

  Future<void> _load() async {
    final request = ++_request;
    setState(() {
      _error = null;
      _item = null;
    });
    try {
      Json? result;
      if (!widget.owned) {
        result = await api.get('/livestock/listings/${widget.item['id']}');
      } else {
        // The contract deliberately has no private GET-by-id route.
        String? cursor;
        do {
          final page = await api.get(
            '/livestock/me/listings',
            authenticated: true,
            query: {'limit': '100', 'cursor': ?cursor},
          );
          for (final item in (page['items'] as List).cast<Json>()) {
            if (item['id'] == widget.item['id']) {
              result = item;
              break;
            }
          }
          cursor = page['next_cursor'] as String?;
        } while (result == null &&
            cursor != null &&
            mounted &&
            request == _request);
      }
      if (!mounted || request != _request) return;
      setState(() {
        _item = result;
        if (result == null) _error = ApiFailure('NOT_FOUND');
      });
    } catch (error) {
      if (mounted && request == _request) setState(() => _error = error);
    }
  }

  Future<void> _action(String action) async {
    if (_busy || _item == null) return;
    final id = _item!['id'] as String;
    final epoch = widget.runtime.epoch;
    setState(() => _busy = true);
    final labels = action == 'sell'
        ? [
            tr(kk, 'Отметить проданным?', 'Сатылды деп белгілеу керек пе?'),
            tr(
              kk,
              'Объявление исчезнет из общей ленты. Вернуть его в активные нельзя. Продажа в денежном журнале не создаётся.',
              'Хабарландыру жалпы тізімнен жоғалады. Оны қайта белсенді етуге болмайды. Ақша журналында сату жазбасы жасалмайды.',
            ),
          ]
        : action == 'withdraw'
        ? [
            tr(kk, 'Снять объявление?', 'Хабарландыруды алып тастау керек пе?'),
            tr(
              kk,
              'Оно останется в «Моих», но больше не будет публиковаться.',
              'Ол «Менің» бөлімінде қалады, бірақ енді жарияланбайды.',
            ),
          ]
        : [
            tr(kk, 'Животные есть сегодня?', 'Мал бүгін бар ма?'),
            tr(
              kk,
              'Подтвердите актуальность предложения на сегодня.',
              'Ұсыныстың бүгін өзекті екенін растаңыз.',
            ),
          ];
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(labels[0]),
        content: Text(labels[1]),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(tr(kk, 'Отмена', 'Бас тарту')),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(tr(kk, 'Подтвердить', 'Растау')),
          ),
        ],
      ),
    );
    if (!mounted || epoch != widget.runtime.epoch) return;
    if (confirm != true) {
      setState(() => _busy = false);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final result = await api.mutate(
        'POST',
        '/livestock/listings/$id/actions',
        {'action': action},
      );
      if (!mounted || epoch != widget.runtime.epoch) return;
      setState(() => _item = result);
      await api.acknowledgePending();
      if (!mounted || epoch != widget.runtime.epoch) return;
      await _load();
    } catch (error) {
      if (mounted && epoch == widget.runtime.epoch) {
        setState(() => _error = error);
      }
    } finally {
      if (mounted && epoch == widget.runtime.epoch) {
        setState(() => _busy = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final item = _item;
    final photos = (item?['photos'] as List? ?? []).cast<Json>();
    return Scaffold(
      appBar: AppBar(
        title: Text(tr(kk, 'Объявление', 'Хабарландыру')),
        actions: const [LanguageAction()],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            if (_error != null)
              Notice(
                error: true,
                text: safeError(_error!, kk),
                action: OutlinedButton(
                  onPressed: _load,
                  child: Text(tr(kk, 'Обновить', 'Жаңарту')),
                ),
              ),
            if (item == null && _error == null)
              const Padding(
                padding: EdgeInsets.all(40),
                child: Center(child: CircularProgressIndicator()),
              ),
            if (item != null) ...[
              if (item['is_demo'] == true)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Notice(
                    text: tr(
                      kk,
                      'Учебное объявление. Не реальное рыночное предложение.',
                      'Оқу хабарландыруы. Нақты нарықтық ұсыныс емес.',
                    ),
                  ),
                ),
              ...photos.map(
                (photo) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(22),
                    child: ApiPhoto(
                      api: api,
                      path: widget.owned
                          ? '/livestock/me/photos/${photo['id']}'
                          : photo['url'] as String,
                      private: widget.owned,
                      kk: kk,
                      height: 260,
                    ),
                  ),
                ),
              ),
              Text(
                speciesName(item['species'] as String, kk),
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 16),
              Text(
                money(item['price_per_head_minor'] as int),
                style: const TextStyle(
                  fontSize: 36,
                  fontWeight: FontWeight.w800,
                ),
              ),
              Text(tr(kk, 'Цена за одну голову', 'Бір бас бағасы')),
              const SizedBox(height: 24),
              _detailRow(Icons.place_outlined, '${item['locality']}'),
              _detailRow(Icons.storefront_outlined, marketName(item, kk)),
              Text(
                tr(
                  kk,
                  'Место указано продавцом; адрес не проверен.',
                  'Орынды сатушы көрсеткен; мекенжай тексерілмеген.',
                ),
              ),
              _detailRow(
                Icons.pets_outlined,
                '${item['quantity']} ${tr(kk, 'голов', 'бас')}',
              ),
              if (item['age_months'] != null)
                _detailRow(
                  Icons.calendar_month_outlined,
                  '${item['age_months']} ${tr(kk, 'мес.', 'ай')}',
                ),
              if (item['sex'] != null)
                _detailRow(Icons.info_outline, switch (item['sex']) {
                  'male' => tr(kk, 'Самец', 'Еркек'),
                  'female' => tr(kk, 'Самка', 'Ұрғашы'),
                  _ => tr(kk, 'Пол не указан', 'Жынысы көрсетілмеген'),
                }),
              _detailRow(
                Icons.event_available_outlined,
                '${tr(kk, 'Подтверждено продавцом', 'Сатушы растаған')}: ${item['confirmed_on']}',
              ),
              if (widget.owned)
                _detailRow(Icons.circle_outlined, statusText(item, kk)),
              if ((item['description'] as String? ?? '').isNotEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 20),
                  child: Text(
                    item['description'] as String,
                    style: const TextStyle(fontSize: 17, height: 1.5),
                  ),
                ),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        tr(kk, 'Контакт владельца', 'Иесінің байланысы'),
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      SelectableText(item['contact'] as String),
                    ],
                  ),
                ),
              ),
              if (widget.owned) ...[
                const SizedBox(height: 20),
                OutlinedButton.icon(
                  onPressed: _busy
                      ? null
                      : () async {
                          final epoch = widget.runtime.epoch;
                          setState(() => _busy = true);
                          var opened = false;
                          try {
                            final pending = await api.loadPending();
                            if (!mounted ||
                                !context.mounted ||
                                widget.runtime.epoch != epoch) {
                              return;
                            }
                            if (pending != null && pending.kind == 'json') {
                              setState(
                                () => _error = const ApiFailure(
                                  'PENDING_OPERATION',
                                ),
                              );
                              return;
                            }
                            opened = true;
                            await Navigator.of(context).push(
                              MaterialPageRoute<bool>(
                                builder: (_) => ListingForm(
                                  runtime: widget.runtime,
                                  kk: kk,
                                  initial: item,
                                ),
                              ),
                            );
                          } catch (error) {
                            if (mounted && widget.runtime.epoch == epoch) {
                              setState(() => _error = error);
                            }
                          } finally {
                            if (mounted) {
                              setState(() => _busy = false);
                              if (opened) _load();
                            }
                          }
                        },
                  icon: const Icon(Icons.edit_outlined),
                  label: Text(tr(kk, 'Редактировать', 'Өңдеу')),
                ),
                if (item['status'] == 'active') ...[
                  const SizedBox(height: 10),
                  FilledButton.icon(
                    onPressed: _busy ? null : () => _action('confirm_today'),
                    icon: const Icon(Icons.check),
                    label: Text(tr(kk, 'Есть сегодня', 'Бүгін бар')),
                  ),
                  const SizedBox(height: 10),
                  OutlinedButton(
                    onPressed: _busy ? null : () => _action('sell'),
                    child: Text(tr(kk, 'Продано', 'Сатылды')),
                  ),
                  TextButton(
                    onPressed: _busy ? null : () => _action('withdraw'),
                    child: Text(
                      tr(kk, 'Снять объявление', 'Хабарландыруды алып тастау'),
                    ),
                  ),
                ],
                if (_busy) const Center(child: CircularProgressIndicator()),
                const SizedBox(height: 12),
                Text(
                  tr(
                    kk,
                    'Если ответ потерялся, вернитесь в список и восстановите сохранённое действие.',
                    'Жауап жоғалса, тізімге оралып, сақталған әрекетті қалпына келтіріңіз.',
                  ),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }

  Widget _detailRow(IconData icon, String text) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 7),
    child: Row(
      children: [
        Icon(icon, size: 20),
        const SizedBox(width: 12),
        Expanded(child: Text(text)),
      ],
    ),
  );
}

Future<void> showLogin(
  BuildContext context,
  MobileRuntime runtime,
  bool kk,
) async {
  if (!runtime.authConfigured) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          tr(
            kk,
            'Вход пока не настроен командой.',
            'Кіруді команда әлі баптамаған.',
          ),
        ),
      ),
    );
    return;
  }
  await Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => _Login(runtime: runtime, kk: kk),
    ),
  );
}

class _Login extends StatefulWidget {
  const _Login({required this.runtime, required this.kk});
  final MobileRuntime runtime;
  final bool kk;
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
  bool get kk => qadamKk(context);
  @override
  void dispose() {
    _password.clear();
    _password.dispose();
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_busy) return;
    if (!_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _failed = false;
    });
    try {
      await widget.runtime.signIn(_email.text.trim(), _password.text);
      if (mounted) Navigator.of(context).pop();
    } catch (_) {
      if (mounted) {
        setState(() {
          _failed = true;
          _busy = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(tr(kk, 'Вход', 'Кіру')),
      actions: const [LanguageAction()],
    ),
    body: SafeArea(
      child: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const SizedBox(height: 24),
            Text(
              tr(kk, 'С возвращением', 'Қош келдіңіз'),
              style: Theme.of(context).textTheme.headlineLarge,
            ),
            const SizedBox(height: 12),
            Text(
              tr(
                kk,
                'Используйте общий аккаунт Qadam.',
                'Ортақ Qadam аккаунтын пайдаланыңыз.',
              ),
            ),
            const SizedBox(height: 28),
            TextFormField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              autocorrect: false,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(labelText: 'Email'),
              validator: (value) => value == null || !value.contains('@')
                  ? tr(kk, 'Введите email', 'Email енгізіңіз')
                  : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _password,
              obscureText: _hidden,
              autocorrect: false,
              enableSuggestions: false,
              textInputAction: TextInputAction.done,
              onFieldSubmitted: (_) {
                if (!_busy) _submit();
              },
              decoration: InputDecoration(
                labelText: tr(kk, 'Пароль', 'Құпиясөз'),
                suffixIcon: IconButton(
                  tooltip: tr(
                    kk,
                    'Показать или скрыть пароль',
                    'Құпиясөзді көрсету немесе жасыру',
                  ),
                  onPressed: () => setState(() => _hidden = !_hidden),
                  icon: Icon(
                    _hidden
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                  ),
                ),
              ),
              validator: (value) => value == null || value.isEmpty
                  ? tr(kk, 'Введите пароль', 'Құпиясөз енгізіңіз')
                  : null,
            ),
            const SizedBox(height: 24),
            if (_failed)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Notice(
                  error: true,
                  text: tr(
                    kk,
                    'Не удалось войти. Проверьте email, пароль и соединение.',
                    'Кіру мүмкін болмады. Email, құпиясөз және байланысты тексеріңіз.',
                  ),
                ),
              ),
            FilledButton(
              onPressed: _busy ? null : _submit,
              child: Text(
                _busy ? tr(kk, 'Входим…', 'Кіруде…') : tr(kk, 'Войти', 'Кіру'),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
