import 'package:flutter/material.dart';

import '../ui/common.dart';
import 'crm_models.dart';
import 'crm_pages.dart';
import 'crm_ui.dart';
import 'crm_entry.dart';
import 'crm_analytics.dart';

class CrmDashboard extends CrmScreen {
  const CrmDashboard({
    super.key,
    required super.runtime,
    required super.business,
    required super.kk,
  });
  @override
  State<CrmDashboard> createState() => _CrmDashboardState();
}

class _CrmDashboardState extends CrmScreenState<CrmDashboard> {
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
      OutlinedButton.icon(
        onPressed: () => open(page),
        icon: Icon(icon),
        label: Text(tr(kk, ru, kz)),
      );
  @override
  Widget build(BuildContext context) => guarded(
    Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        crmCard([
          Text(
            tr(kk, 'Сегодня в вашей точке', 'Бүгін сіздің нүктеңізде'),
            style: Theme.of(context).textTheme.titleLarge,
          ),
          crmGap,
          if (busy) const LinearProgressIndicator(),
          if (error != null) Text(crmError(error!, kk)),
          if (data != null) ...[
            Text('${data!['date']} · Asia/Almaty'),
            crmGap,
            Text(
              '${tr(kk, 'Продажи', 'Сатылымдар')}: ${crmMoney(data!['sales_minor'] as int, kk)}',
            ),
            Text(
              '${tr(kk, 'Поступления', 'Түсімдер')}: ${crmMoney(data!['receipts_minor'] as int, kk)}',
            ),
            Text(
              '${tr(kk, 'Общий долг', 'Жалпы қарыз')}: ${crmMoney(data!['outstanding_minor'] as int, kk)}',
            ),
            Text(
              '${tr(kk, 'Новые заявки', 'Жаңа өтінімдер')}: ${data!['new_inquiries_count']}',
            ),
          ],
          TextButton(
            onPressed: busy ? null : load,
            child: Text(
              tr(kk, 'Обновить показатели', 'Көрсеткіштерді жаңарту'),
            ),
          ),
        ]),
        FilledButton.icon(
          key: const Key('crm-new-entry'),
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
        crmGap,
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
          'Долги / доплата',
          'Қарыздар / қосымша төлем',
          Icons.account_balance_wallet_outlined,
          LedgerPage(
            runtime: widget.runtime,
            business: widget.business,
            kk: kk,
            debts: true,
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
        crmGap,
      ],
    ),
  );
}
