import 'package:flutter/material.dart';
import '../ui/common.dart' show tr;
import 'crm_models.dart';
import 'crm_api.dart';
import 'crm_ui.dart';
import 'crm_visual_components.dart';

class DailySummaryPage extends CrmScreen {
  const DailySummaryPage({
    super.key,
    required super.runtime,
    required super.business,
    required super.kk,
  });
  @override
  State<DailySummaryPage> createState() => _DailySummaryPageState();
}

class _DailySummaryPageState extends CrmScreenState<DailySummaryPage> {
  @override
  bool get kk => Localizations.localeOf(context).languageCode == 'kk';

  CrmJson? summary;
  String? date;
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
      summary = null;
    });
    try {
      final result = await api.summary(scope, date: date);
      if (active) setState(() => summary = result);
    } catch (e) {
      if (active) setState(() => error = e);
    } finally {
      if (active) setState(() => busy = false);
    }
  }

  Future<void> choose() async {
    final initial =
        DateTime.tryParse(summary?['date'] as String? ?? date ?? '') ??
        DateTime.now();
    final selected = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (!active || selected == null) return;
    date =
        '${selected.year}-${selected.month.toString().padLeft(2, '0')}-${selected.day.toString().padLeft(2, '0')}';
    await load();
  }

  @override
  Widget build(BuildContext context) => page(
    'Итог дня',
    'Күн қорытындысы',
    ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          tr(kk, 'По времени Тараза', 'Тараз уақыты бойынша'),
          style: Theme.of(context).textTheme.bodySmall,
        ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: busy ? null : choose,
          icon: const Icon(Icons.calendar_today_outlined),
          label: Text(
            summary != null
                ? crmCalendarDate(context, summary!['date'] as String)
                : date != null
                ? crmCalendarDate(context, date!)
                : tr(kk, 'Выбрать дату', 'Күнді таңдау'),
          ),
        ),
        if (date != null)
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: busy
                  ? null
                  : () {
                      date = null;
                      load();
                    },
              icon: const Icon(Icons.today_outlined),
              label: Text(tr(kk, 'Вернуться к сегодня', 'Бүгінге оралу')),
            ),
          ),
        const SizedBox(height: 16),
        if (busy) const LinearProgressIndicator(),
        if (error != null) CrmReadError(onRetry: load, error: error),
        if (summary != null) ...[
          if (date == null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(
                tr(
                  kk,
                  'Сегодняшний день ещё продолжается',
                  'Бүгінгі күн әлі жалғасуда',
                ),
              ),
            ),
          CrmResponsiveGrid(
            children: [
              CrmMetric(
                label: tr(kk, 'Движения продаж', 'Сатылым қозғалысы'),
                value: crmMoney(summary!['sales_minor'] as int, kk),
                emphasized: true,
              ),
              CrmMetric(
                label: tr(kk, 'Поступления', 'Түсімдер'),
                value: crmMoney(summary!['receipts_minor'] as int, kk),
              ),
              CrmMetric(
                label: tr(kk, 'Текущий общий долг', 'Ағымдағы жалпы қарыз'),
                value: crmMoney(summary!['outstanding_minor'] as int, kk),
                caption: tr(kk, 'За все даты', 'Барлық күндер үшін'),
              ),
              CrmMetric(
                label: tr(kk, 'Новые заявки', 'Жаңа өтінімдер'),
                value: '${summary!['new_inquiries_count']}',
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            tr(
              kk,
              'Отмены учитываются в день отмены. Долг отражает текущее состояние за все даты.',
              'Жоюлар жойылған күні есептеледі. Қарыз барлық күндер бойынша ағымдағы күйді көрсетеді.',
            ),
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 12),
          TextButton.icon(
            onPressed: busy ? null : load,
            icon: const Icon(Icons.refresh),
            label: Text(tr(kk, 'Обновить', 'Жаңарту')),
          ),
        ],
      ],
    ),
  );
}

class ReverseOperationPage extends CrmScreen {
  const ReverseOperationPage({
    super.key,
    required super.runtime,
    required super.business,
    required super.kk,
    required this.operation,
  });
  final CrmJson operation;
  @override
  State<ReverseOperationPage> createState() => _ReverseOperationPageState();
}

class _ReverseOperationPageState extends CrmScreenState<ReverseOperationPage> {
  @override
  bool get kk => Localizations.localeOf(context).languageCode == 'kk';

  final description = TextEditingController();
  @override
  void dispose() {
    description.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => page(
    'Отменить операцию',
    'Операцияны жою',
    ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          tr(
            kk,
            'Запись останется в истории. Сервер создаст обратную операцию только после подтверждения. При доплатах сначала отменяются связанные доплаты.',
            'Жазба тарихта қалады. Сервер растаудан кейін ғана кері операция жасайды. Алдымен байланысты қосымша төлемдер жойылады.',
          ),
        ),
        Text(widget.operation['description'] as String),
        CrmWritePanel(
          api: api,
          scope: scope,
          kk: kk,
          action: reversalActionFor(widget.operation['id'] as String),
          form: TextField(
            controller: description,
            maxLength: 1000,
            maxLines: 3,
            decoration: InputDecoration(
              labelText: tr(kk, 'Причина отмены', 'Жою себебі'),
            ),
          ),
          body: () => {
            'operation_id': widget.operation['id'],
            'sale_id': widget.operation['sale_id'],
            'customer_id': widget.operation['customer_id'],
            'sales_delta_minor': widget.operation['sales_delta_minor'],
            'receipts_delta_minor': widget.operation['receipts_delta_minor'],
            'description': description.text.trim(),
          },
          onDone: (receipt) => Navigator.pop(context, receipt),
        ),
      ],
    ),
  );
}
