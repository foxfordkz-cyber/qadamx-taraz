import 'package:flutter/material.dart';

import '../data/api_failure.dart';
import '../ui/common.dart';
import 'crm_models.dart';
import 'crm_ui.dart';
import 'crm_visual_components.dart';
import 'crm_charts.dart';

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
  @override
  bool get kk => Localizations.localeOf(context).languageCode == 'kk';

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
    final theme = Theme.of(context);
    return page(
      'Аналитика',
      'Аналитика',
      ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              Expanded(
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final count in [7, 30])
                      ChoiceChip(
                        label: Text(tr(kk, '$count дней', '$count күн')),
                        selected: days == count,
                        onSelected: (_) {
                          if (days == count) return;
                          days = count;
                          load();
                        },
                      ),
                  ],
                ),
              ),
              IconButton(
                tooltip: tr(kk, 'Обновить', 'Жаңарту'),
                onPressed: busy ? null : load,
                icon: const Icon(Icons.refresh),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (busy) const LinearProgressIndicator(),
          if (error != null) CrmReadError(onRetry: load, error: error),
          if (cards != null) ...[
            Text(
              '${crmCalendarDate(context, data!['period_from'] as String)} — ${crmCalendarDate(context, data!['period_to'] as String)}',
              style: theme.textTheme.titleMedium,
            ),
            const SizedBox(height: 4),
            Text(
              tr(
                kk,
                'Сегодня — неполный день · время Тараза',
                'Бүгінгі күн әлі аяқталмады · Тараз уақыты',
              ),
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: 16),
            CrmResponsiveGrid(
              children: [
                CrmMetric(
                  label: tr(
                    kk,
                    'Действующие продажи',
                    'Қолданыстағы сатылымдар',
                  ),
                  value: crmMoney(cards['sales_minor'] as int, kk),
                  emphasized: true,
                ),
                CrmMetric(
                  label: tr(kk, 'Поступления', 'Түсімдер'),
                  value: crmMoney(cards['receipts_minor'] as int, kk),
                ),
                CrmMetric(
                  label: tr(kk, 'Количество продаж', 'Сатылым саны'),
                  value: '${cards['sales_count']}',
                ),
                CrmMetric(
                  label: tr(kk, 'Средний чек', 'Орташа чек'),
                  value: crmMoney(cards['average_ticket_minor'] as int?, kk),
                ),
                CrmMetric(
                  label: tr(kk, 'Общий долг', 'Жалпы қарыз'),
                  value: crmMoney(cards['outstanding_minor'] as int, kk),
                  caption: tr(kk, 'За все даты', 'Барлық күндер үшін'),
                ),
                CrmMetric(
                  label: tr(kk, 'Должников', 'Борышкерлер'),
                  value: '${cards['debtors_count']}',
                  caption: tr(kk, 'За все даты', 'Барлық күндер үшін'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (cards['sales_count'] == 0)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Text(
                  tr(
                    kk,
                    'Продаж за период нет. Поступления по прошлым продажам всё равно учитываются.',
                    'Осы кезеңде сатылым жоқ. Бұрынғы сатылымдар бойынша түсімдер есепке алынады.',
                  ),
                ),
              ),
            CrmDailyChart(
              days: (data!['daily'] as List).map(crmObject).toList(),
            ),
            CrmHourlyChart(
              hours: (data!['hourly'] as List).map(crmObject).toList(),
            ),
            ExpansionTile(
              tilePadding: EdgeInsets.zero,
              title: Text(tr(kk, 'Как читать отчёт', 'Есепті қалай оқу керек')),
              children: [
                Text(
                  tr(
                    kk,
                    'Продажи учитываются без отменённых записей. Отмена исключает исходную продажу из её дня. Поступления включают доплаты и отрицательные движения в день отмены. Долг и число должников — за все даты.',
                    'Жойылған жазбалар сатылымдарға кірмейді. Жою бастапқы сатылымды оның күнінен алып тастайды. Түсімдерге қосымша төлемдер мен жойылған күнгі теріс қозғалыстар кіреді. Қарыз бен борышкерлер саны — барлық күндер үшін.',
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  '${tr(kk, 'Получено на', 'Алынған уақыт')}: ${crmDate(data!['as_of'] as String)}',
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
