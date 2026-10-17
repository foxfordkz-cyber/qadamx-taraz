import 'dart:async';

import 'package:flutter/material.dart';

import '../business_access.dart';
import '../crm/crm_dashboard.dart';
import '../data/api_failure.dart';
import '../frontend_links.dart';
import '../runtime.dart';
import 'common.dart';
import 'qadam_theme.dart';

class QadamShell extends StatefulWidget {
  const QadamShell({
    super.key,
    required this.runtime,
    required this.kk,
    required this.section,
    required this.onSection,
    required this.toggleLanguage,
    required this.login,
    required this.market,
    this.browserLauncher = openSystemBrowser,
  });
  final MobileRuntime runtime;
  final bool kk;
  final int section;
  final ValueChanged<int> onSection;
  final VoidCallback toggleLanguage;
  final Future<void> Function(BuildContext) login;
  final Widget market;
  final BrowserLauncher browserLauncher;
  @override
  State<QadamShell> createState() => _QadamShellState();
}

class _QadamShellState extends State<QadamShell> with WidgetsBindingObserver {
  late final BusinessAccess access;
  bool _launching = false;
  bool _signingOut = false;
  bool get kk => widget.kk;
  MobileRuntime get runtime => widget.runtime;

  @override
  void initState() {
    super.initState();
    access = BusinessAccess(runtime)..addListener(_changed);
    WidgetsBinding.instance.addObserver(this);
  }

  void _changed() {
    if (mounted) setState(() {});
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) unawaited(access.refresh());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    access.removeListener(_changed);
    access.dispose();
    super.dispose();
  }

  void _message(String ru, String kz) {
    if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(tr(kk, ru, kz))));
    }
  }

  Future<void> _open(FrontendPage page) async {
    if (_launching) return;
    final url = frontendUrl(runtime.frontendBaseUrl, page);
    if (url == null) return;
    setState(() => _launching = true);
    try {
      final opened = await widget.browserLauncher(url);
      if (!opened) {
        _message(
          'Не удалось открыть браузер. Попробуйте ещё раз.',
          'Браузер ашылмады. Қайта көріңіз.',
        );
      }
    } catch (_) {
      // Platform failures may include URLs. Only a fixed, localized message.
      _message(
        'Не удалось открыть браузер. Попробуйте ещё раз.',
        'Браузер ашылмады. Қайта көріңіз.',
      );
    } finally {
      if (mounted) setState(() => _launching = false);
    }
  }

  Widget _card(List<Widget> children) => Card(
    margin: const EdgeInsets.only(bottom: QadamTheme.gap),
    child: Padding(
      padding: const EdgeInsets.all(QadamTheme.pagePadding),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: children,
      ),
    ),
  );
  Widget _title(String ru, String kz) => Padding(
    padding: const EdgeInsets.only(bottom: QadamTheme.gap),
    child: Text(tr(kk, ru, kz), style: Theme.of(context).textTheme.titleLarge),
  );
  Widget _gap() => const SizedBox(height: QadamTheme.gap);

  Widget _webAccess() {
    final origin = frontendOrigin(runtime.frontendBaseUrl);
    return _card([
      _title('Кабинет продавца', 'Сатушы кабинеті'),
      Text(
        tr(
          kk,
          'Клиенты, продажи, долги и отчёты доступны в web-кабинете Qadam.',
          'Клиенттер, сатылымдар, қарыздар мен есептер Qadam веб-кабинетінде қолжетімді.',
        ),
      ),
      _gap(),
      Text(
        tr(
          kk,
          'Откроется системный браузер. Войдите и выберите торговую точку на сайте. Сессия приложения в браузер не передаётся.',
          'Жүйелік браузер ашылады. Сайтқа кіріп, сауда нүктесін таңдаңыз. Қолданба сессиясы браузерге берілмейді.',
        ),
      ),
      _gap(),
      if (origin == null)
        Text(
          tr(
            kk,
            'Адрес кабинета пока не настроен. Мал базар доступен независимо от кабинета.',
            'Кабинет мекенжайы әлі бапталмаған. Мал базар кабинетке тәуелсіз жұмыс істейді.',
          ),
        )
      else ...[
        Text(origin.host, style: Theme.of(context).textTheme.bodySmall),
        _gap(),
      ],
      FilledButton.icon(
        key: const Key('open-seller'),
        onPressed: origin == null || _launching
            ? null
            : () => _open(FrontendPage.seller),
        icon: const Icon(Icons.open_in_browser),
        label: Text(tr(kk, 'Открыть кабинет продавца', 'Сатушы кабинетін ашу')),
      ),
      _gap(),
      OutlinedButton.icon(
        key: const Key('open-showcase'),
        onPressed: origin == null || _launching
            ? null
            : () => _open(FrontendPage.showcase),
        icon: const Icon(Icons.storefront_outlined),
        label: Text(tr(kk, 'Витрина в браузере', 'Браузердегі витрина')),
      ),
    ]);
  }

  Widget _businesses() {
    if (runtime.accountId == null) {
      return _card([
        _title('Ваши торговые точки', 'Сіздің сауда нүктелеріңіз'),
        Text(
          tr(
            kk,
            'Войдите, чтобы увидеть подключённые торговые точки. Публичный Мал базар доступен без входа.',
            'Қосылған сауда нүктелерін көру үшін кіріңіз. Мал базардың ашық бөлімі кіруді талап етпейді.',
          ),
        ),
        _gap(),
        FilledButton(
          onPressed: runtime.authConfigured
              ? () => widget.login(context)
              : null,
          child: Text(tr(kk, 'Войти', 'Кіру')),
        ),
      ]);
    }
    if (access.loading) {
      return _card([
        const LinearProgressIndicator(),
        _gap(),
        Text(tr(kk, 'Загружаем торговые точки…', 'Сауда нүктелері жүктелуде…')),
      ]);
    }
    if (runtime.accountApi == null || access.error != null) {
      final authError =
          access.error is ApiFailure &&
          (access.error as ApiFailure).code == 'AUTH_REQUIRED';
      return _card([
        Text(
          authError
              ? tr(
                  kk,
                  'Не удалось подтвердить сессию. Повторите запрос или войдите снова через Профиль.',
                  'Сессия расталмады. Сұрауды қайталаңыз немесе Профиль арқылы қайта кіріңіз.',
                )
              : tr(
                  kk,
                  'Не удалось загрузить торговые точки. Проверьте подключение и повторите.',
                  'Сауда нүктелері жүктелмеді. Байланысты тексеріп, қайталаңыз.',
                ),
        ),
        _gap(),
        OutlinedButton(
          onPressed: runtime.accountApi == null ? null : access.refresh,
          child: Text(tr(kk, 'Повторить', 'Қайталау')),
        ),
      ]);
    }
    if (access.businesses.isEmpty) {
      return _card([
        _title(
          'Нет подключённых торговых точек',
          'Қосылған сауда нүктелері жоқ',
        ),
        Text(
          tr(
            kk,
            'Для Мал базара торговая точка не нужна. Можно смотреть и публиковать объявления.',
            'Мал базар үшін сауда нүктесі қажет емес. Хабарландыруларды көруге және жариялауға болады.',
          ),
        ),
        _gap(),
        OutlinedButton(
          onPressed: () => widget.onSection(1),
          child: Text(tr(kk, 'Перейти в Мал базар', 'Мал базарға өту')),
        ),
      ]);
    }
    return _card([
      _title('Ваши торговые точки', 'Сіздің сауда нүктелеріңіз'),
      Text(
        access.selected == null
            ? tr(
                kk,
                'Выберите активную точку в приложении.',
                'Қолданбадағы белсенді нүктені таңдаңыз.',
              )
            : tr(
                kk,
                'Активная точка: ${access.selected!.name}',
                'Белсенді нүкте: ${access.selected!.name}',
              ),
      ),
      _gap(),
      for (final business in access.businesses)
        ListTile(
          key: ValueKey('business-${business.id}'),
          contentPadding: EdgeInsets.zero,
          title: Text(business.name),
          subtitle: Text(tr(kk, 'Владелец', 'Иесі')),
          selected: access.selectedId == business.id,
          leading: Icon(
            access.selectedId == business.id
                ? Icons.radio_button_checked
                : Icons.radio_button_off,
          ),
          onTap: () => access.select(business.id),
        ),
      Text(
        tr(
          kk,
          'На сайте выбор точки выполняется отдельно.',
          'Сайтта нүкте бөлек таңдалады.',
        ),
        style: Theme.of(context).textTheme.bodySmall,
      ),
    ]);
  }

  Future<void> _logout() async {
    if (_signingOut) return;
    setState(() => _signingOut = true);
    try {
      await runtime.signOut();
    } catch (_) {
      _message(
        'Не удалось выйти. Попробуйте ещё раз.',
        'Шығу мүмкін болмады. Қайта көріңіз.',
      );
    } finally {
      if (mounted) setState(() => _signingOut = false);
    }
  }

  Widget _page(bool profile) => Scaffold(
    appBar: AppBar(
      title: Text(
        profile
            ? tr(kk, 'Профиль', 'Профиль')
            : tr(kk, 'Мой бизнес', 'Менің бизнесім'),
      ),
      actions: [
        TextButton(
          onPressed: widget.toggleLanguage,
          child: Text(
            kk ? 'RU' : 'ҚАЗ',
            semanticsLabel: kk ? 'Русский язык' : 'Қазақ тілі',
          ),
        ),
      ],
    ),
    body: SafeArea(
      child: RefreshIndicator(
        onRefresh: access.refresh,
        child: ListView(
          padding: const EdgeInsets.all(QadamTheme.pagePadding),
          physics: const AlwaysScrollableScrollPhysics(),
          children: profile
              ? [
                  _card([
                    _title('Qadam', 'Qadam'),
                    Text(
                      runtime.accountId == null
                          ? tr(
                              kk,
                              'Вы не вошли в аккаунт',
                              'Сіз аккаунтқа кірмедіңіз',
                            )
                          : tr(kk, 'Вход выполнен', 'Аккаунтқа кірдіңіз'),
                    ),
                    _gap(),
                    if (runtime.accountId == null)
                      FilledButton(
                        onPressed: runtime.authConfigured
                            ? () => widget.login(context)
                            : null,
                        child: Text(tr(kk, 'Войти', 'Кіру')),
                      )
                    else
                      OutlinedButton.icon(
                        onPressed: _signingOut ? null : _logout,
                        icon: const Icon(Icons.logout),
                        label: Text(
                          tr(kk, 'Выйти из приложения', 'Қолданбадан шығу'),
                        ),
                      ),
                    _gap(),
                    Text(
                      tr(
                        kk,
                        'Вход на сайте выполняется отдельно. Выход из приложения не завершает сессию браузера.',
                        'Сайтқа бөлек кіресіз. Қолданбадан шығу браузердегі сессияны аяқтамайды.',
                      ),
                    ),
                  ]),
                  _webAccess(),
                ]
              : [
                  _businesses(),
                  if (access.selected != null && runtime.crmApi != null)
                    CrmDashboard(
                      key: ValueKey(
                        '${runtime.accountId}:${runtime.epoch}:${access.selectedId}',
                      ),
                      runtime: runtime,
                      business: access.selectedId!,
                      kk: kk,
                    ),
                  _webAccess(),
                ],
        ),
      ),
    ),
  );

  @override
  Widget build(BuildContext context) => Scaffold(
    body: IndexedStack(
      index: widget.section,
      children: [_page(false), widget.market, _page(true)],
    ),
    bottomNavigationBar: NavigationBar(
      selectedIndex: widget.section,
      onDestinationSelected: (index) {
        widget.onSection(index);
        if (index == 0) unawaited(access.refresh());
      },
      destinations: [
        NavigationDestination(
          key: const Key('nav-business'),
          icon: const Icon(Icons.business_center_outlined),
          selectedIcon: const Icon(Icons.business_center),
          label: tr(kk, 'Мой бизнес', 'Менің бизнесім'),
        ),
        const NavigationDestination(
          key: Key('nav-market'),
          icon: Icon(Icons.storefront_outlined),
          selectedIcon: Icon(Icons.storefront),
          label: 'Мал базар',
        ),
        NavigationDestination(
          key: const Key('nav-profile'),
          icon: const Icon(Icons.person_outline),
          selectedIcon: const Icon(Icons.person),
          label: tr(kk, 'Профиль', 'Профиль'),
        ),
      ],
    ),
  );
}
