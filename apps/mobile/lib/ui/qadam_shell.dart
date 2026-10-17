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
import 'qadam_components.dart';
import 'app_version.dart';

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
    this.onMarket,
    this.browserLauncher = openSystemBrowser,
  });
  final MobileRuntime runtime;
  final bool kk;
  final int section;
  final ValueChanged<int> onSection;
  final VoidCallback toggleLanguage;
  final Future<void> Function(BuildContext) login;
  final Widget market;
  final ValueChanged<int>? onMarket;
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
          onPressed: () => _openMarket(0),
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

  void _openMarket(int tab) {
    if (widget.onMarket != null) {
      widget.onMarket!(tab);
    } else {
      widget.onSection(1);
    }
  }

  void _help() => showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (context) => SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              tr(kk, 'Как пользоваться Qadam', 'Qadam қолдану жолы'),
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 20),
            Text(
              tr(kk, 'Покупателю', 'Сатып алушыға'),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 6),
            Text(
              tr(
                kk,
                'Выберите площадку, откройте магазин и оставьте заявку. Мал базар находится в том же списке площадок.',
                'Алаңды таңдап, дүкенді ашыңыз және өтінім қалдырыңыз. Мал базар да сол алаңдар тізімінде.',
              ),
            ),
            const SizedBox(height: 20),
            Text(
              tr(kk, 'Продавцу', 'Сатушыға'),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 6),
            Text(
              tr(
                kk,
                'Войдите и выберите свою точку в Кабинете. Там доступны продажи, клиенты, долги, заявки, каталог и аналитика. Для объявлений Мал базара торговая точка не требуется.',
                'Кіріп, Кабинетте өз нүктеңізді таңдаңыз. Онда сатылымдар, клиенттер, қарыздар, өтінімдер, каталог пен талдау бар. Мал базар хабарландыруларына сауда нүктесі қажет емес.',
              ),
            ),
            const SizedBox(height: 20),
            Text(
              tr(kk, 'При потере связи', 'Байланыс үзілгенде'),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 6),
            Text(
              tr(
                kk,
                'Если результат отправки неизвестен, вернитесь к сохранённому действию и проверьте его. Не создавайте ту же запись заново.',
                'Жіберу нәтижесі белгісіз болса, сақталған әрекетке оралып, тексеріңіз. Сол жазбаны қайтадан жасамаңыз.',
              ),
            ),
          ],
        ),
      ),
    ),
  );

  Widget _profile() => Scaffold(
    appBar: AppBar(
      title: Text(tr(kk, 'Профиль', 'Профиль')),
      actions: [const LanguageAction()],
    ),
    body: SafeArea(
      child: ListView(
        key: const PageStorageKey('profile'),
        padding: const EdgeInsets.all(16),
        children: [
          _card([
            const Align(
              alignment: Alignment.centerLeft,
              child: CircleAvatar(
                radius: 26,
                backgroundColor: QadamTheme.soft,
                child: Icon(
                  Icons.person_outline,
                  size: 30,
                  color: QadamTheme.green,
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              runtime.accountId == null
                  ? tr(kk, 'Добро пожаловать', 'Қош келдіңіз')
                  : tr(kk, 'Ваш аккаунт', 'Сіздің аккаунтыңыз'),
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 6),
            if (runtime.accountEmail != null)
              SelectableText(runtime.accountEmail!),
            if (runtime.accountId == null) ...[
              Text(tr(kk, 'Вы не вошли в аккаунт', 'Сіз аккаунтқа кірмедіңіз')),
              const SizedBox(height: 6),
              Text(
                tr(
                  kk,
                  'Войдите, чтобы управлять бизнесом и своими объявлениями.',
                  'Бизнесіңіз бен хабарландыруларыңызды басқару үшін кіріңіз.',
                ),
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: runtime.authConfigured
                    ? () => widget.login(context)
                    : null,
                child: Text(tr(kk, 'Войти', 'Кіру')),
              ),
            ] else ...[
              const SizedBox(height: 8),
              Text(
                access.selected?.name ??
                    tr(
                      kk,
                      'Выберите торговую точку в Кабинете',
                      'Кабинетте сауда нүктесін таңдаңыз',
                    ),
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ]),
          const SizedBox(height: 8),
          _title('Мои разделы', 'Менің бөлімдерім'),
          Card(
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                QadamMenuItem(
                  key: const Key('profile-business'),
                  icon: Icons.business_center_outlined,
                  title: tr(kk, 'Кабинет продавца', 'Сатушы кабинеті'),
                  subtitle:
                      access.selected?.name ??
                      tr(
                        kk,
                        'Торговые точки и управление',
                        'Сауда нүктелері мен басқару',
                      ),
                  onTap: () => widget.onSection(0),
                ),
                const Divider(height: 1),
                QadamMenuItem(
                  key: const Key('profile-listings'),
                  icon: Icons.assignment_outlined,
                  title: tr(kk, 'Мои объявления', 'Менің хабарландыруларым'),
                  subtitle: 'Мал базар',
                  onTap: () => _openMarket(2),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          _title('Настройки', 'Баптаулар'),
          _card([
            Text(
              tr(kk, 'Язык приложения', 'Қолданба тілі'),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ChoiceChip(
                  label: const Text('Русский'),
                  selected: !kk,
                  onSelected: (_) {
                    if (kk) widget.toggleLanguage();
                  },
                ),
                ChoiceChip(
                  label: const Text('Қазақша'),
                  selected: kk,
                  onSelected: (_) {
                    if (!kk) widget.toggleLanguage();
                  },
                ),
              ],
            ),
          ]),
          Card(
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                QadamMenuItem(
                  key: const Key('profile-help'),
                  icon: Icons.help_outline,
                  title: tr(kk, 'Как пользоваться', 'Қолдану жолы'),
                  onTap: _help,
                ),
                const Divider(height: 1),
                QadamMenuItem(
                  icon: Icons.info_outline,
                  title: tr(kk, 'О приложении', 'Қолданба туралы'),
                  subtitle: 'Qadam $qadamVersion',
                  onTap: () => showAboutDialog(
                    context: context,
                    applicationName: 'Qadam',
                    applicationVersion: qadamVersion,
                    children: [
                      Text(
                        tr(
                          kk,
                          'Магазины Тараза, Мал базар и учёт для продавца. Учебные данные помечены в приложении.',
                          'Тараз дүкендері, Мал базар және сатушы есебі. Оқу деректері қолданбада белгіленген.',
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (runtime.accountId != null) ...[
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: _signingOut ? null : _logout,
              style: OutlinedButton.styleFrom(
                foregroundColor: QadamTheme.danger,
              ),
              icon: const Icon(Icons.logout),
              label: Text(tr(kk, 'Выйти из приложения', 'Қолданбадан шығу')),
            ),
          ],
          const SizedBox(height: 12),
          Center(
            child: Text(
              'Qadam $qadamVersion',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
        ],
      ),
    ),
  );

  Widget _businessPage() => Scaffold(
    appBar: AppBar(
      title: Text(tr(kk, 'Кабинет', 'Кабинет')),
      actions: [const LanguageAction()],
    ),
    body: SafeArea(
      child: RefreshIndicator(
        onRefresh: access.refresh,
        child: ListView(
          key: const PageStorageKey('business'),
          padding: const EdgeInsets.all(16),
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
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
  Widget build(BuildContext context) => PopScope(
    canPop: widget.section == 4,
    onPopInvokedWithResult: (didPop, result) {
      if (!didPop) widget.onSection(widget.section == 1 ? 3 : 4);
    },
    child: Scaffold(
      body: IndexedStack(
        index: widget.section,
        children: [
          _businessPage(),
          widget.market,
          _profile(),
          PublicHome(
            runtime: runtime,
            kk: kk,
            toggleLanguage: widget.toggleLanguage,
            onMarket: () => _openMarket(0),
          ),
          PublicHome(
            runtime: runtime,
            kk: kk,
            toggleLanguage: widget.toggleLanguage,
            landing: true,
            onMarket: () => _openMarket(0),
            onExplore: () => widget.onSection(3),
            onBusiness: () => widget.onSection(0),
          ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: const [
          4,
          3,
          0,
          2,
        ].indexOf(widget.section == 1 ? 3 : widget.section),
        onDestinationSelected: (index) {
          final section = const [4, 3, 0, 2][index];
          widget.onSection(section);
          if (section == 0 && access.selected == null) {
            unawaited(access.refresh());
          }
        },
        destinations: [
          NavigationDestination(
            key: const Key('nav-home'),
            icon: const Icon(Icons.home_outlined),
            selectedIcon: const Icon(Icons.home),
            label: tr(kk, 'Главная', 'Басты'),
          ),
          NavigationDestination(
            key: const Key('nav-public'),
            icon: const Icon(Icons.map_outlined),
            selectedIcon: const Icon(Icons.map),
            label: tr(kk, 'Площадки', 'Алаңдар'),
          ),
          NavigationDestination(
            key: const Key('nav-business'),
            icon: const Icon(Icons.business_center_outlined),
            selectedIcon: const Icon(Icons.business_center),
            label: tr(kk, 'Кабинет', 'Кабинет'),
          ),
          NavigationDestination(
            key: const Key('nav-profile'),
            icon: const Icon(Icons.person_outline),
            selectedIcon: const Icon(Icons.person),
            label: tr(kk, 'Профиль', 'Профиль'),
          ),
        ],
      ),
    ),
  );
}
