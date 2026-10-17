import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../frontend_links.dart';
import 'common.dart';

/// A dated editorial snapshot, never an API listing or today's price statistic.
class ReferencePrices extends StatefulWidget {
  const ReferencePrices({
    super.key,
    required this.kk,
    this.browserLauncher = openSystemBrowser,
    this.bundle,
  });

  final bool kk;
  final BrowserLauncher browserLauncher;
  final AssetBundle? bundle;

  @override
  State<ReferencePrices> createState() => _ReferencePricesState();
}

class _ReferencePricesState extends State<ReferencePrices> {
  late final Future<Json> _snapshot = _load();
  bool _expanded = false;

  Future<Json> _load() async {
    final raw = await (widget.bundle ?? rootBundle).loadString(
      'assets/data/livestock-price-sources.json',
    );
    return jsonDecode(raw) as Json;
  }

  String _date(String value) => value.split('-').reversed.join('.');

  Future<void> _open(String source) async {
    final url = Uri.tryParse(source);
    var opened = false;
    try {
      if (url != null &&
          url.scheme == 'https' &&
          url.host == 'www.olx.kz' &&
          url.userInfo.isEmpty) {
        opened = await widget.browserLauncher(url);
      }
    } catch (_) {
      // Preserve the reference card when no browser can handle the link.
    }
    if (!opened && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            tr(
              widget.kk,
              'Не удалось открыть источник. Попробуйте ещё раз.',
              'Дереккөз ашылмады. Қайта көріңіз.',
            ),
          ),
        ),
      );
    }
  }

  Widget _entry(Json entry) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            entry[widget.kk ? 'title_kk' : 'title_ru'] as String,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Text(
            money(entry['price_minor'] as int),
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 4),
          Text(
            '${tr(widget.kk, 'Опубликовано', 'Жарияланған күні')}: '
            '${_date(entry['published_on'] as String)}',
          ),
          if (entry['source_kind'] == 'search_results')
            Text(entry['source_title'] as String),
          TextButton.icon(
            onPressed: () => _open(entry['source_url'] as String),
            icon: const Icon(Icons.open_in_new, size: 18),
            label: Text(
              entry['source_kind'] == 'search_results'
                  ? tr(widget.kk, 'Подборка OLX', 'OLX тізімі')
                  : tr(widget.kk, 'Объявление на OLX', 'OLX хабарландыруы'),
            ),
          ),
        ],
      ),
    ),
  );

  @override
  Widget build(BuildContext context) => FutureBuilder<Json>(
    future: _snapshot,
    builder: (context, snapshot) {
      if (snapshot.hasError) {
        return Notice(
          error: true,
          text: tr(widget.kk, 'Подборка цен недоступна.', 'Баға тізімі ашылмады.'),
        );
      }
      if (!snapshot.hasData) return const LinearProgressIndicator();
      final data = snapshot.data!;
      final entries = (data['entries'] as List).cast<Json>();
      return Column(
        key: const ValueKey('reference-prices'),
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            tr(
              widget.kk,
              'Тараз · цены из открытых источников',
              'Тараз · ашық дереккөздердегі бағалар',
            ),
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            '${speciesName(data['species'] as String, widget.kk)} · '
            '${entries.length} ${tr(widget.kk, 'объявлений', 'хабарландыру')}',
          ),
          const SizedBox(height: 8),
          Text(
            '${tr(widget.kk, 'Подборка собрана', 'Тізім жиналған күн')}: '
            '${_date(data['collected_on'] as String)}. '
            '${tr(widget.kk, 'Не обновляется автоматически. Наличие и цену уточняйте у продавца.', 'Автоматты түрде жаңартылмайды. Малдың бар-жоғын және бағасын сатушыдан нақтылаңыз.')}',
          ),
          const SizedBox(height: 8),
          Text(
            tr(
              widget.kk,
              'Цена указана как в источнике: за голову или за группу — уточняйте. Эти объявления не входят в статистику Qadam за сегодня.',
              'Баға дереккөздегідей берілген: бір басқа не топқа екенін нақтылаңыз. Бұл хабарландырулар Qadam-ның бүгінгі статистикасына кірмейді.',
            ),
          ),
          const SizedBox(height: 12),
          for (final entry in entries.take(_expanded ? entries.length : 2))
            _entry(entry),
          if (entries.length > 2)
            TextButton(
              onPressed: () => setState(() => _expanded = !_expanded),
              child: Text(
                _expanded
                    ? tr(widget.kk, 'Свернуть', 'Жию')
                    : tr(
                        widget.kk,
                        'Все ${entries.length} цен',
                        'Барлық ${entries.length} баға',
                      ),
              ),
            ),
        ],
      );
    },
  );
}
