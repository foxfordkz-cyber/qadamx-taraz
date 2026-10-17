import 'package:flutter/material.dart';

import '../data/api_failure.dart';
import '../ui/common.dart';
import 'crm_models.dart';
import 'crm_ui.dart';

void validateAnalytics(CrmJson value, String business, int days) {
  crmBusiness(value, business);
  if (value['days'] != days ||
      value['timezone'] != 'Asia/Almaty' ||
      value['currency'] != 'KZT' ||
      value['today_incomplete'] != true) {
    throw const ApiFailure('INVALID_RESPONSE');
  }
  for (final key in ['as_of', 'period_from', 'period_to']) {
    if (DateTime.tryParse(crmString(value, key)) == null) {
      throw const ApiFailure('INVALID_RESPONSE');
    }
  }
  final cards = crmObject(value['cards']);
  for (final key in [
    'sales_minor',
    'sales_count',
    'outstanding_minor',
    'debtors_count',
  ]) {
    crmInt(cards, key, nonnegative: true);
  }
  crmInt(cards, 'receipts_minor');
  if (cards['average_ticket_minor'] != null) {
    crmInt(cards, 'average_ticket_minor', nonnegative: true);
  }
  if ((cards['sales_count'] == 0) != (cards['average_ticket_minor'] == null)) {
    throw const ApiFailure('INVALID_RESPONSE');
  }
  if (value['daily'] is! List ||
      (value['daily'] as List).length != days ||
      value['hourly'] is! List ||
      (value['hourly'] as List).length != 24) {
    throw const ApiFailure('INVALID_RESPONSE');
  }
  final from = DateTime.parse(value['period_from'] as String);
  var total = 0;
  var receipts = 0;
  var count = 0;
  for (var i = 0; i < days; i++) {
    final day = crmObject(value['daily'][i]);
    if (day['date'] !=
            from.add(Duration(days: i)).toIso8601String().substring(0, 10) ||
        day['is_partial'] != (i == days - 1)) {
      throw const ApiFailure('INVALID_RESPONSE');
    }
    total += crmInt(day, 'sales_minor', nonnegative: true);
    receipts += crmInt(day, 'receipts_minor');
    count += crmInt(day, 'sales_count', nonnegative: true);
  }
  var hourlyCount = 0;
  for (var hour = 0; hour < 24; hour++) {
    final item = crmObject(value['hourly'][hour]);
    if (item['hour'] != hour) throw const ApiFailure('INVALID_RESPONSE');
    hourlyCount += crmInt(item, 'sales_count', nonnegative: true);
  }
  if (count != cards['sales_count'] ||
      hourlyCount != count ||
      total != cards['sales_minor'] ||
      receipts != cards['receipts_minor'] ||
      value['daily'].last['date'] != value['period_to']) {
    throw const ApiFailure('INVALID_RESPONSE');
  }
}

class AnalyticsPage extends CrmScreen {
  const AnalyticsPage({
    super.key,
    required super.runtime,
    required super.business,
    required super.kk,
  });
  @override
  State<AnalyticsPage> createState() => _AnalyticsPageState();
}

class _AnalyticsPageState extends CrmScreenState<AnalyticsPage> {
  int days = 7;
  int generation = 0;
  CrmJson? data;
  Object? error;
  bool busy = true;
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    final request = ++generation;
    final requestedDays = days;
    setState(() {
      data = null;
      error = null;
      busy = true;
    });
    try {
      final value = await api.request(
        scope,
        'GET',
        'analytics',
        query: {'days': '$requestedDays'},
      );
      validateAnalytics(value, scope.business, requestedDays);
      if (active && request == generation) setState(() => data = value);
    } catch (e) {
      if (active && request == generation) setState(() => error = e);
    } finally {
      if (active && request == generation) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cards = data == null ? null : crmObject(data!['cards']);
    return page(
      'Аналитика',
      'Аналитика',
      ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Wrap(
            spacing: 12,
            children: [
              for (final count in [7, 30])
                ChoiceChip(
                  label: Text(tr(kk, '$count дней', '$count күн')),
                  selected: days == count,
                  onSelected: (_) {
                    days = count;
                    load();
                  },
                ),
            ],
          ),
          crmGap,
          Text(
            tr(
              kk,
              'Asia/Almaty. Сегодняшний день ещё не завершён. Общий долг и число должников — за всё время.',
              'Asia/Almaty. Бүгінгі күн әлі аяқталған жоқ. Жалпы қарыз бен борышкерлер саны — бүкіл кезең үшін.',
            ),
          ),
          crmGap,
          if (busy) const LinearProgressIndicator(),
          if (error != null) Text(crmError(error!, kk)),
          OutlinedButton(
            onPressed: busy ? null : load,
            child: Text(tr(kk, 'Обновить', 'Жаңарту')),
          ),
          if (cards != null) ...[
            Text('${data!['period_from']} — ${data!['period_to']}'),
            Text(
              '${tr(kk, 'Получено на', 'Алынған уақыт')}: ${crmDate(data!['as_of'] as String)}',
            ),
            crmGap,
            crmCard([
              Text(
                '${tr(kk, 'Продажи', 'Сатылымдар')}: ${crmMoney(cards['sales_minor'] as int, kk)}',
              ),
              Text(
                '${tr(kk, 'Поступления', 'Түсімдер')}: ${crmMoney(cards['receipts_minor'] as int, kk)}',
              ),
              Text(
                '${tr(kk, 'Количество продаж', 'Сатылым саны')}: ${cards['sales_count']}',
              ),
              Text(
                '${tr(kk, 'Средний чек', 'Орташа чек')}: ${crmMoney(cards['average_ticket_minor'] as int?, kk)}',
              ),
              Text(
                '${tr(kk, 'Общий долг', 'Жалпы қарыз')}: ${crmMoney(cards['outstanding_minor'] as int, kk)}',
              ),
              Text(
                '${tr(kk, 'Должников', 'Борышкерлер')}: ${cards['debtors_count']}',
              ),
            ]),
            if (cards['sales_count'] == 0)
              Text(
                tr(
                  kk,
                  'Продаж за период нет. Поступления по прошлым продажам всё равно учитываются.',
                  'Осы кезеңде сатылым жоқ. Бұрынғы сатылымдар бойынша түсімдер есепке алынады.',
                ),
              ),
            Text(
              tr(kk, 'По дням', 'Күндер бойынша'),
              style: Theme.of(context).textTheme.titleLarge,
            ),
            for (final day in data!['daily'] as List)
              crmCard([
                Text(
                  '${day['date']}${day['is_partial'] == true ? tr(kk, ' · день продолжается', ' · күн жалғасуда') : ''}',
                ),
                Text(
                  '${tr(kk, 'Продажи', 'Сатылымдар')}: ${crmMoney(day['sales_minor'] as int, kk)} · ${day['sales_count']}',
                ),
                Text(
                  '${tr(kk, 'Поступления', 'Түсімдер')}: ${crmMoney(day['receipts_minor'] as int, kk)}',
                ),
              ]),
            Text(
              tr(kk, 'Продажи по часам', 'Сағат бойынша сатылымдар'),
              style: Theme.of(context).textTheme.titleLarge,
            ),
            for (final hour in data!['hourly'] as List)
              ListTile(
                dense: true,
                title: Text(
                  '${(hour['hour'] as int).toString().padLeft(2, '0')}:00',
                ),
                trailing: Text('${hour['sales_count']}'),
              ),
          ],
        ],
      ),
    );
  }
}
