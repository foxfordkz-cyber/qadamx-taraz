import 'package:flutter/material.dart';

import '../ui/common.dart';
import '../ui/qadam_theme.dart';
import 'crm_models.dart';
import 'crm_pages.dart';
import 'crm_ui.dart';
import 'crm_entry.dart';
import 'crm_analytics.dart';
import 'crm_catalog.dart';
import 'crm_daily.dart';
import 'crm_visual_components.dart';

class CrmDashboard extends CrmScreen {
  const CrmDashboard({
    super.key,
    required super.runtime,
    required super.business,
    required super.kk,
    this.slug = '',
  });
  final String slug;
  @override
  State<CrmDashboard> createState() => _CrmDashboardState();
}

class _CrmDashboardState extends CrmScreenState<CrmDashboard> {
  @override
  bool get kk => Localizations.localeOf(context).languageCode == 'kk';

  CrmJson? data;
  Object? error;
  bool busy = true;
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() {
      busy = true;
      error = null;
      data = null;
    });
    try {
      final value = await api.summary(scope);
      if (active) setState(() => data = value);
    } catch (e) {
      if (active) setState(() => error = e);
    } finally {
      if (active) setState(() => busy = false);
    }
  }

  Future<void> open(Widget page) async {
    await Navigator.push(context, MaterialPageRoute(builder: (_) => page));
    if (active) await load();
  }

  Widget action(String ru, String kz, IconData icon, Widget page) =>
      CrmActionTile(onTap: () => open(page), icon: icon, label: tr(kk, ru, kz));

  Widget section(String ru, String kz, List<Widget> children) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      const SizedBox(height: 24),
      Text(tr(kk, ru, kz), style: Theme.of(context).textTheme.titleMedium),
      const SizedBox(height: 12),
      CrmResponsiveGrid(children: children),
    ],
  );

  @override
  Widget build(BuildContext context) => guarded(
    Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: QadamTheme.green,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                tr(kk, 'Хорошего рабочего дня!', 'Жұмысыңыз сәтті болсын!'),
                style: Theme.of(
                  context,
                ).textTheme.titleLarge!.copyWith(color: QadamTheme.surface),
              ),
              const SizedBox(height: 8),
              Text(
                tr(
                  kk,
                  'Продажа вручную, текстом или голосом',
                  'Сатылымды қолмен, мәтінмен немесе дауыспен енгізу',
                ),
                style: const TextStyle(color: Color(0xffd2e2d4)),
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                key: const Key('crm-new-entry'),
                style: FilledButton.styleFrom(
                  backgroundColor: QadamTheme.lime,
                  foregroundColor: QadamTheme.ink,
                ),
                onPressed: () => open(
                  CrmEntryPage(
                    runtime: widget.runtime,
                    business: widget.business,
                    kk: kk,
                  ),
                ),
                icon: const Icon(Icons.add),
                label: Text(tr(kk, 'Новая запись', 'Жаңа жазба')),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: Text(
                tr(kk, 'Сегодня', 'Бүгін'),
                style: Theme.of(context).textTheme.titleLarge,
              ),
            ),
            IconButton(
              tooltip: tr(kk, 'Обновить показатели', 'Көрсеткіштерді жаңарту'),
              onPressed: busy ? null : load,
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
        if (data != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(
              '${crmCalendarDate(context, data!['date'] as String)} · ${tr(kk, 'время Тараза', 'Тараз уақыты')}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
        if (busy) const LinearProgressIndicator(),
        if (error != null) CrmReadError(onRetry: load, error: error),
        if (data != null)
          CrmResponsiveGrid(
            children: [
              CrmMetric(
                label: tr(kk, 'Продажи за день', 'Күнгі сатылымдар'),
                value: crmMoney(data!['sales_minor'] as int, kk),
                emphasized: true,
              ),
              CrmMetric(
                label: tr(kk, 'Поступления за день', 'Күнгі түсімдер'),
                value: crmMoney(data!['receipts_minor'] as int, kk),
              ),
              CrmMetric(
                label: tr(kk, 'Общий долг', 'Жалпы қарыз'),
                value: crmMoney(data!['outstanding_minor'] as int, kk),
                caption: tr(kk, 'За все даты', 'Барлық күндер үшін'),
              ),
              CrmMetric(
                label: tr(kk, 'Новые заявки', 'Жаңа өтінімдер'),
                value: '${data!['new_inquiries_count']}',
                caption: tr(kk, 'За сегодня', 'Бүгін'),
              ),
            ],
          ),
        section('Работа с клиентами', 'Клиенттермен жұмыс', [
          action(
            'Клиенты',
            'Клиенттер',
            Icons.people_outline,
            CustomersPage(
              runtime: widget.runtime,
              business: widget.business,
              kk: kk,
            ),
          ),
          action(
            'Долги',
            'Қарыздар',
            Icons.account_balance_wallet_outlined,
            LedgerPage(
              runtime: widget.runtime,
              business: widget.business,
              kk: kk,
              debts: true,
            ),
          ),
          action(
            'Заявки',
            'Өтінімдер',
            Icons.mail_outline,
            InquiriesPage(
              runtime: widget.runtime,
              business: widget.business,
              kk: kk,
            ),
          ),
          if (widget.slug.isNotEmpty)
            action(
              'Каталог',
              'Каталог',
              Icons.inventory_2_outlined,
              CatalogPage(
                runtime: widget.runtime,
                business: widget.business,
                kk: kk,
                slug: widget.slug,
              ),
            ),
        ]),
        section('Учёт и отчёты', 'Есеп және есептер', [
          action(
            'Итог дня',
            'Күн қорытындысы',
            Icons.today_outlined,
            DailySummaryPage(
              runtime: widget.runtime,
              business: widget.business,
              kk: kk,
            ),
          ),
          action(
            'История',
            'Тарих',
            Icons.history,
            LedgerPage(
              runtime: widget.runtime,
              business: widget.business,
              kk: kk,
            ),
          ),
          action(
            'Аналитика',
            'Аналитика',
            Icons.bar_chart,
            AnalyticsPage(
              runtime: widget.runtime,
              business: widget.business,
              kk: kk,
            ),
          ),
        ]),
        const SizedBox(height: 16),
      ],
    ),
  );
}
