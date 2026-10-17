import 'package:flutter/material.dart';
import '../ui/common.dart' show tr;
import 'crm_models.dart';
import 'crm_ui.dart';

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
          tr(kk, 'Серверный день · Asia/Almaty', 'Сервер күні · Asia/Almaty'),
        ),
        OutlinedButton(
          onPressed: busy ? null : choose,
          child: Text(date ?? tr(kk, 'Выбрать дату', 'Күнді таңдау')),
        ),
        TextButton(
          onPressed: busy
              ? null
              : () {
                  date = null;
                  load();
                },
          child: Text(tr(kk, 'Сегодня по серверу', 'Сервер бойынша бүгін')),
        ),
        if (busy) const LinearProgressIndicator(),
        if (error != null) ...[
          Text(crmError(error!, kk)),
          OutlinedButton(
            onPressed: busy ? null : load,
            child: Text(tr(kk, 'Повторить', 'Қайталау')),
          ),
        ],
        if (summary != null)
          crmCard([
            Text(
              summary!['date'] as String,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            Text(
              '${tr(kk, 'Движения продаж', 'Сатылым қозғалысы')}: ${crmMoney(summary!['sales_minor'] as int, kk)}',
            ),
            Text(
              '${tr(kk, 'Поступления', 'Түсімдер')}: ${crmMoney(summary!['receipts_minor'] as int, kk)}',
            ),
            Text(
              '${tr(kk, 'Текущий общий долг', 'Ағымдағы жалпы қарыз')}: ${crmMoney(summary!['outstanding_minor'] as int, kk)}',
            ),
            Text(
              '${tr(kk, 'Новые заявки', 'Жаңа өтінімдер')}: ${summary!['new_inquiries_count']}',
            ),
            Text(
              tr(
                kk,
                'Отмены учитываются движениями в день отмены. Текущий долг — за всё время.',
                'Жоюлар жойылған күнгі қозғалыста есептеледі. Ағымдағы қарыз — барлық уақыт үшін.',
              ),
            ),
          ]),
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
          action: 'operation.reverse.v1',
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
