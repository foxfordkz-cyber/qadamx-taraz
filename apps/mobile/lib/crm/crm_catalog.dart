import 'package:flutter/material.dart';
import '../ui/common.dart';
import 'crm_models.dart';
import 'crm_ui.dart';

class CatalogPage extends CrmScreen {
  const CatalogPage({
    super.key,
    required super.runtime,
    required super.business,
    required super.kk,
    required this.slug,
  });
  final String slug;
  @override
  State<CatalogPage> createState() => _CatalogPageState();
}

class _CatalogPageState extends CrmScreenState<CatalogPage> {
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
      final value = await api.catalog(scope, widget.slug);
      if (active) setState(() => data = value);
    } catch (e) {
      if (active) setState(() => error = e);
    } finally {
      if (active) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => page(
    'Каталог',
    'Каталог',
    ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          tr(
            kk,
            'Публичный каталог точки. Редактирование каталога пока не поддерживается общим API.',
            'Нүктенің ашық каталогы. Жалпы API каталогты өңдеуді әзірге қолдамайды.',
          ),
        ),
        OutlinedButton(
          onPressed: busy ? null : load,
          child: Text(tr(kk, 'Обновить', 'Жаңарту')),
        ),
        if (busy) const LinearProgressIndicator(),
        if (error != null) Text(crmError(error!, kk)),
        if (data != null) ...[
          if (data!['is_demo'] == true)
            Text(tr(kk, 'Учебная торговая точка', 'Оқу сауда нүктесі')),
          if ((data!['catalog'] as List).isEmpty)
            Text(tr(kk, 'Каталог пока пуст.', 'Каталог әзірге бос.')),
          for (final item in data!['catalog'] as List)
            crmCard([
              Text(
                item['name'] as String,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              Text(crmMoney(item['price_minor'] as int?, kk)),
              Text(
                item['available'] == true
                    ? tr(kk, 'В наличии', 'Бар')
                    : tr(kk, 'Нет в наличии', 'Жоқ'),
              ),
              if (item['is_demo'] == true)
                Text(tr(kk, 'Учебная позиция', 'Оқу позициясы')),
            ]),
        ],
      ],
    ),
  );
}
