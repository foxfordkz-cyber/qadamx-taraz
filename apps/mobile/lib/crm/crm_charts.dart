import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../ui/common.dart' show tr;
import 'crm_models.dart';
import 'crm_visual_components.dart';

/// A native chart over the existing validated snapshot. No aggregation or
/// financial calculations happen here; doubles are used only for canvas pixels.
class CrmDailyChart extends StatefulWidget {
  const CrmDailyChart({super.key, required this.days});
  final List<CrmJson> days;

  @override
  State<CrmDailyChart> createState() => _CrmDailyChartState();
}

class _CrmDailyChartState extends State<CrmDailyChart> {
  int? selection;

  @override
  void didUpdateWidget(CrmDailyChart oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.days.firstOrNull?['date'] !=
            widget.days.firstOrNull?['date'] ||
        oldWidget.days.length != widget.days.length) {
      selection = null;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.days.isEmpty) return const SizedBox.shrink();
    final kk = Localizations.localeOf(context).languageCode == 'kk';
    final theme = Theme.of(context);
    final selected = (selection ?? widget.days.length - 1).clamp(
      0,
      widget.days.length - 1,
    );
    final day = widget.days[selected];
    final sales = widget.days
        .map((d) => (d['sales_minor'] as int) / 100)
        .toList();
    final receipts = widget.days
        .map((d) => (d['receipts_minor'] as int) / 100)
        .toList();
    final scale = MediaQuery.textScalerOf(context).scale(12) / 12;
    final labels = widget.days.map((d) {
      final date = DateTime.parse(d['date'] as String);
      return '${date.day}.${date.month.toString().padLeft(2, '0')}';
    }).toList();
    return _ChartCard(
      children: [
        Text(
          tr(kk, 'По дням', 'Күндер бойынша'),
          style: theme.textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 16,
          runSpacing: 8,
          children: [
            _Legend(
              label: tr(kk, 'Продажи', 'Сатылымдар'),
              color: theme.colorScheme.primary,
            ),
            _Legend(
              label: tr(kk, 'Поступления', 'Түсімдер'),
              color: theme.colorScheme.tertiary,
              dotted: true,
            ),
          ],
        ),
        const SizedBox(height: 12),
        Text(tr(kk, 'Сумма, ₸', 'Сома, ₸'), style: theme.textTheme.bodySmall),
        _Plot(
          first: sales,
          second: receipts,
          labels: labels,
          selected: selected,
          scale: scale,
          kk: kk,
          onSelected: (value) => setState(() => selection = value),
        ),
        _SelectionControls(
          label: crmCalendarDate(context, day['date'] as String),
          previous: selected > 0
              ? () => setState(() => selection = selected - 1)
              : null,
          next: selected + 1 < widget.days.length
              ? () => setState(() => selection = selected + 1)
              : null,
        ),
        Semantics(
          liveRegion: true,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                '${tr(kk, 'Продажи', 'Сатылымдар')}: ${crmMoney(day['sales_minor'] as int, kk)}',
              ),
              Text(
                '${tr(kk, 'Поступления', 'Түсімдер')}: ${crmMoney(day['receipts_minor'] as int, kk)}',
              ),
              Text(
                '${tr(kk, 'Количество продаж', 'Сатылым саны')}: ${day['sales_count']}',
              ),
              if (day['is_partial'] == true)
                Text(
                  tr(
                    kk,
                    'Сегодня — неполный день',
                    'Бүгінгі күн әлі аяқталмады',
                  ),
                  style: theme.textTheme.bodySmall,
                ),
            ],
          ),
        ),
        const Divider(height: 24),
        ExpansionTile(
          key: const Key('analytics-daily-table'),
          tilePadding: EdgeInsets.zero,
          title: Text(tr(kk, 'Данные по дням', 'Күндер бойынша деректер')),
          children: [
            for (final row in widget.days)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Semantics(
                  container: true,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        crmCalendarDate(context, row['date'] as String),
                        style: theme.textTheme.titleSmall,
                      ),
                      Text(
                        '${tr(kk, 'Продажи', 'Сатылымдар')}: ${crmMoney(row['sales_minor'] as int, kk)}',
                      ),
                      Text(
                        '${tr(kk, 'Поступления', 'Түсімдер')}: ${crmMoney(row['receipts_minor'] as int, kk)}',
                      ),
                      Text(
                        '${tr(kk, 'Количество', 'Саны')}: ${row['sales_count']}',
                      ),
                      if (row['is_partial'] == true)
                        Text(
                          tr(kk, 'День продолжается', 'Күн жалғасуда'),
                          style: theme.textTheme.bodySmall,
                        ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class CrmHourlyChart extends StatefulWidget {
  const CrmHourlyChart({super.key, required this.hours});
  final List<CrmJson> hours;

  @override
  State<CrmHourlyChart> createState() => _CrmHourlyChartState();
}

class _CrmHourlyChartState extends State<CrmHourlyChart> {
  int selection = 12;

  @override
  Widget build(BuildContext context) {
    if (widget.hours.isEmpty) return const SizedBox.shrink();
    final kk = Localizations.localeOf(context).languageCode == 'kk';
    final theme = Theme.of(context);
    final selected = selection.clamp(0, widget.hours.length - 1);
    final row = widget.hours[selected];
    final hour = (row['hour'] as int).toString().padLeft(2, '0');
    return _ChartCard(
      children: [
        Text(
          tr(kk, 'Продажи по часам', 'Сағат бойынша сатылымдар'),
          style: theme.textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        Text(
          tr(
            kk,
            'Часы регистрации продаж · время Тараза',
            'Сатылым тіркелген сағаттар · Тараз уақыты',
          ),
          style: theme.textTheme.bodySmall,
        ),
        _Plot(
          first: widget.hours
              .map((h) => (h['sales_count'] as int).toDouble())
              .toList(),
          labels: widget.hours
              .map((h) => '${h['hour']}'.padLeft(2, '0'))
              .toList(),
          selected: selected,
          scale: MediaQuery.textScalerOf(context).scale(12) / 12,
          kk: kk,
          bars: true,
          onSelected: (value) => setState(() => selection = value),
        ),
        _SelectionControls(
          label: '$hour:00–$hour:59',
          previous: selected > 0
              ? () => setState(() => selection = selected - 1)
              : null,
          next: selected + 1 < widget.hours.length
              ? () => setState(() => selection = selected + 1)
              : null,
        ),
        Semantics(
          liveRegion: true,
          child: Text(
            '${tr(kk, 'Количество продаж', 'Сатылым саны')}: ${row['sales_count']}',
          ),
        ),
        const Divider(height: 24),
        ExpansionTile(
          key: const Key('analytics-hourly-table'),
          tilePadding: EdgeInsets.zero,
          title: Text(tr(kk, 'Данные по часам', 'Сағаттар бойынша деректер')),
          children: [
            for (final row in widget.hours)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    '${(row['hour'] as int).toString().padLeft(2, '0')}:00 · ${tr(kk, 'продаж', 'сатылым')}: ${row['sales_count']}',
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class _ChartCard extends StatelessWidget {
  const _ChartCard({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Card(
    margin: const EdgeInsets.only(bottom: 16),
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: children,
      ),
    ),
  );
}

class _Legend extends StatelessWidget {
  const _Legend({
    required this.label,
    required this.color,
    this.dotted = false,
  });
  final String label;
  final Color color;
  final bool dotted;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Text(
        dotted ? '┄' : '━',
        style: TextStyle(
          color: color,
          fontSize: 20,
          fontWeight: FontWeight.bold,
        ),
      ),
      const SizedBox(width: 6),
      Flexible(
        child: Text(label, style: Theme.of(context).textTheme.bodySmall),
      ),
    ],
  );
}

class _SelectionControls extends StatelessWidget {
  const _SelectionControls({required this.label, this.previous, this.next});
  final String label;
  final VoidCallback? previous;
  final VoidCallback? next;

  @override
  Widget build(BuildContext context) {
    final kk = Localizations.localeOf(context).languageCode == 'kk';
    return Row(
      children: [
        IconButton(
          tooltip: tr(kk, 'Предыдущее значение', 'Алдыңғы мән'),
          onPressed: previous,
          icon: const Icon(Icons.chevron_left),
        ),
        Expanded(
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleSmall,
          ),
        ),
        IconButton(
          tooltip: tr(kk, 'Следующее значение', 'Келесі мән'),
          onPressed: next,
          icon: const Icon(Icons.chevron_right),
        ),
      ],
    );
  }
}

class _Plot extends StatelessWidget {
  const _Plot({
    required this.first,
    this.second,
    required this.labels,
    required this.selected,
    required this.scale,
    required this.kk,
    required this.onSelected,
    this.bars = false,
  });
  final List<double> first;
  final List<double>? second;
  final List<String> labels;
  final int selected;
  final double scale;
  final bool kk;
  final bool bars;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final left = 48 + 16 * (scale - 1);
    return ExcludeSemantics(
      // Selection controls and expandable full tables provide the accessible
      // equivalent. The chart itself is never the only source of information.
      child: LayoutBuilder(
        builder: (context, constraints) => GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapUp: (event) {
            final available = constraints.maxWidth - left - 14;
            final fraction = ((event.localPosition.dx - left) / available)
                .clamp(0.0, 1.0);
            onSelected((fraction * (first.length - 1)).round());
          },
          child: CustomPaint(
            key: Key(bars ? 'analytics-hourly-chart' : 'analytics-daily-chart'),
            size: Size(constraints.maxWidth, 180 + 40 * scale),
            painter: _PlotPainter(
              first: first,
              second: second,
              labels: labels,
              selected: selected,
              scale: scale,
              kk: kk,
              bars: bars,
              left: left,
              primary: theme.colorScheme.primary,
              secondary: theme.colorScheme.tertiary,
              grid: theme.colorScheme.outlineVariant,
              text: theme.textTheme.bodySmall!.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _PlotPainter extends CustomPainter {
  _PlotPainter({
    required this.first,
    required this.second,
    required this.labels,
    required this.selected,
    required this.scale,
    required this.kk,
    required this.bars,
    required this.left,
    required this.primary,
    required this.secondary,
    required this.grid,
    required this.text,
  });
  final List<double> first;
  final List<double>? second;
  final List<String> labels;
  final int selected;
  final double scale;
  final bool kk;
  final bool bars;
  final double left;
  final Color primary, secondary, grid;
  final TextStyle text;

  String axis(double amount) {
    final magnitude = amount.abs();
    final divisor = magnitude >= 1000000
        ? 1000000
        : magnitude >= 1000
        ? 1000
        : 1;
    final value = amount / divisor;
    final number = value == value.roundToDouble()
        ? value.toStringAsFixed(0)
        : value.toStringAsFixed(1);
    final suffix = divisor == 1000000
        ? 'млн'
        : divisor == 1000
        ? (kk ? 'мың' : 'тыс')
        : '';
    return '$number${suffix.isEmpty ? '' : ' $suffix'}';
  }

  @override
  void paint(Canvas canvas, Size size) {
    final values = [...first, ...?second];
    final minimum = math.min(0.0, values.reduce(math.min));
    var maximum = math.max(0.0, values.reduce(math.max));
    if (maximum == minimum) maximum = minimum + 1;
    final plot = Rect.fromLTRB(
      left,
      18 * scale,
      size.width - 14,
      size.height - 28 * scale,
    );
    double x(int i) =>
        plot.left + plot.width * i / math.max(first.length - 1, 1);
    double y(double n) =>
        plot.bottom - (n - minimum) / (maximum - minimum) * plot.height;
    void label(
      String value,
      Offset offset, {
      bool right = false,
      double? width,
    }) {
      final painter = TextPainter(
        text: TextSpan(
          text: value,
          style: text.copyWith(fontSize: 11 * scale),
        ),
        textDirection: TextDirection.ltr,
        textAlign: right ? TextAlign.right : TextAlign.center,
      )..layout(maxWidth: width ?? size.width);
      painter.paint(
        canvas,
        Offset(
          right ? offset.dx - painter.width : offset.dx - painter.width / 2,
          offset.dy,
        ),
      );
    }

    final ticks = <double>{minimum, maximum, 0};
    if (minimum == 0 && maximum > 1) {
      ticks.add(bars ? (maximum / 2).floorToDouble() : maximum / 2);
    }
    for (final tick in ticks) {
      final height = y(tick);
      canvas.drawLine(
        Offset(plot.left, height),
        Offset(plot.right, height),
        Paint()
          ..color = grid
          ..strokeWidth = tick == 0 ? 1.5 : 1,
      );
      label(
        axis(tick),
        Offset(plot.left - 8, height - 7 * scale),
        right: true,
        width: left - 8,
      );
    }
    canvas.drawLine(
      Offset(x(selected), plot.top),
      Offset(x(selected), plot.bottom),
      Paint()
        ..color = primary.withValues(alpha: .24)
        ..strokeWidth = 1,
    );
    final labelIndices = <int>{0, labels.length ~/ 2, labels.length - 1};
    for (final i in labelIndices) {
      label(
        labels[i],
        Offset(x(i).clamp(plot.left + 6, plot.right - 6), plot.bottom + 8),
      );
    }
    canvas.save();
    canvas.clipRect(plot.inflate(4));
    if (bars) {
      final width = math.max(2.0, plot.width / first.length * .6);
      for (var i = 0; i < first.length; i++) {
        if (first[i] == 0) continue;
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromLTRB(
              x(i) - width / 2,
              y(first[i]),
              x(i) + width / 2,
              y(0),
            ),
            const Radius.circular(2),
          ),
          Paint()..color = primary.withValues(alpha: i == selected ? 1 : .65),
        );
      }
    } else {
      void series(List<double> list, Color color, {bool dotted = false}) {
        final path = Path()..moveTo(x(0), y(list[0]));
        for (var i = 1; i < list.length; i++) {
          path.lineTo(x(i), y(list[i]));
        }
        final paint = Paint()
          ..color = color
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.5;
        if (dotted) {
          for (final metric in path.computeMetrics()) {
            for (var start = 0.0; start < metric.length; start += 9) {
              canvas.drawPath(
                metric.extractPath(start, math.min(start + 5, metric.length)),
                paint,
              );
            }
          }
        } else {
          canvas.drawPath(path, paint);
        }
        canvas.drawCircle(
          Offset(x(selected), y(list[selected])),
          4,
          Paint()..color = color,
        );
      }

      series(first, primary);
      if (second != null) series(second!, secondary, dotted: true);
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _PlotPainter oldDelegate) => true;
}
