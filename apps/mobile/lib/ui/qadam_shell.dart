import 'dart:async';

import 'package:flutter/material.dart';
import 'language.dart';

import '../business_access.dart';
import '../crm/crm_dashboard.dart';
import '../public/public_pages.dart';
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
  bool _signingOut = false;
  bool get kk => qadamKk(context);
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

  Widget _publicAccess() => _card([
    _title('Площадки и магазины', 'Алаңдар мен дүкендер'),
    Text(
      tr(
        kk,
        'Просмотр магазинов и заявки доступны без входа.',
        'Дүкендер мен өтінімдер кірусіз қолжетімді.',
      ),
    ),
    _gap(),
    FilledButton.icon(
      key: const Key('open-showcase'),
      onPressed: () => widget.onSection(3),
      icon: const Icon(Icons.map_outlined),
      label: Text(tr(kk, 'Открыть площадки', 'Алаңдарды ашу')),
    ),
  ]);

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
        if (runtime.accountEmail != null) Text(runtime.accountEmail!),
        OutlinedButton(
          onPressed: access.refresh,
          child: Text(tr(kk, 'Обновить доступ', 'Қолжетімділікті жаңарту')),
        ),
        TextButton(
          onPressed: _signingOut ? null : _logout,
          child: Text(tr(kk, 'Выйти', 'Шығу')),
        ),
        _title(
          'Ожидается подключение торговой точки',
          'Сауда нүктесінің қосылуын күтеміз',
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
    return Card(
      child: ExpansionTile(
        key: ValueKey('point-selector-${access.selectedId}'),
        initiallyExpanded: access.selected == null,
        leading: MediaQuery.textScalerOf(context).scale(14) <= 18.2
            ? const Icon(Icons.storefront_outlined)
            : null,
        title: Text(
          access.selected?.name ?? tr(kk, 'Выберите точку', 'Нүктені таңдаңыз'),
          style: Theme.of(context).textTheme.titleMedium,
        ),
        subtitle: Text(tr(kk, 'Сменить точку', 'Нүктені ауыстыру')),
        children: [
          for (final business in access.businesses)
            ListTile(
              key: ValueKey('business-${business.id}'),
              title: Text(business.name),
              selected: access.selectedId == business.id,
              leading: Icon(
                access.selectedId == business.id
                    ? Icons.radio_button_checked
                    : Icons.radio_button_off,
              ),
              onTap: () => access.select(business.id),
            ),
        ],
      ),
    );
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
                    const Text('0.5.0+9'),
                    if (runtime.accountEmail != null)
                      Text(runtime.accountEmail!),
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
                        'Основные функции Qadam доступны внутри приложения.',
                        'Qadam негізгі мүмкіндіктері қолданба ішінде қолжетімді.',
                      ),
                    ),
                  ]),
                  _publicAccess(),
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
                      slug: access.selected!.slug,
                      kk: kk,
                    ),
                  _publicAccess(),
                ],
        ),
      ),
    ),
  );

  @override
  Widget build(BuildContext context) => Scaffold(
    body: IndexedStack(
      index: widget.section,
      children: [
        _page(false),
        widget.market,
        _page(true),
        PublicHome(
          runtime: runtime,
          kk: kk,
          toggleLanguage: widget.toggleLanguage,
        ),
      ],
    ),
    bottomNavigationBar: NavigationBar(
      selectedIndex: const [0, 1, 3, 2].indexOf(widget.section),
      onDestinationSelected: (index) {
        final section = const [0, 1, 3, 2][index];
        widget.onSection(section);
        if (section == 0) unawaited(access.refresh());
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
          key: const Key('nav-public'),
          icon: const Icon(Icons.map_outlined),
          selectedIcon: const Icon(Icons.map),
          label: tr(kk, 'Площадки', 'Алаңдар'),
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
