import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../data/livestock_api.dart';
import '../data/money.dart';
import '../runtime.dart';
import 'qadam_theme.dart';
import 'qadam_badge.dart';

typedef Json = Map<String, dynamic>;

const speciesCodes = ['cattle', 'sheep', 'goat', 'horse', 'camel'];
String tr(bool kk, String ru, String kz) => kk ? kz : ru;
String normalizedPlace(String value) =>
    value.trim().replaceAll(RegExp(r'\s+'), ' ');
String marketName(Json item, bool kk) =>
    item['market'] as String? ??
    tr(kk, 'Рынок не указан', 'Базар көрсетілмеген');

String speciesName(String code, bool kk) => switch (code) {
  'cattle' => tr(kk, 'Крупный рогатый скот', 'Ірі қара'),
  'sheep' => tr(kk, 'Овцы', 'Қой'),
  'goat' => tr(kk, 'Козы', 'Ешкі'),
  'horse' => tr(kk, 'Лошади', 'Жылқы'),
  'camel' => tr(kk, 'Верблюды', 'Түйе'),
  _ => code,
};

String speciesGlyph(String code) => switch (code) {
  'cattle' => '🐄',
  'sheep' => '🐑',
  'goat' => '🐐',
  'horse' => '🐎',
  'camel' => '🐪',
  _ => '🌿',
};

/// Exact decimal conversion: no binary floating-point money enters a request.
int? parseTenge(String input) => parsePriceMinor(input);

String editableMoney(int minor) => priceInput(minor);

String money(int minor) => formatPriceMinor(minor);

String safeError(Object error, bool kk) {
  final code = error is ApiFailure
      ? error.code
      : error is SessionFailure
      ? error.code
      : 'NETWORK_ERROR';
  return switch (code) {
    'LOCALITY_REQUIRED' => tr(
      kk,
      'Укажите город или село вместе с рынком.',
      'Базармен бірге қала немесе ауылды көрсетіңіз.',
    ),
    'AUTH_REQUIRED' || 'ACCOUNT_CHANGED' => tr(
      kk,
      'Войдите в аккаунт и повторите действие.',
      'Аккаунтқа кіріп, әрекетті қайталаңыз.',
    ),
    'NOT_FOUND' => tr(
      kk,
      'Объявление больше недоступно или не принадлежит вам.',
      'Хабарландыру қолжетімсіз немесе сізге тиесілі емес.',
    ),
    'INVALID_STATE' => tr(
      kk,
      'Статус уже изменился. Обновите список.',
      'Күйі өзгерді. Тізімді жаңартыңыз.',
    ),
    'PHOTO_TOO_LARGE' => tr(
      kk,
      'Фото должно быть не больше 8 МиБ.',
      'Фото көлемі 8 МиБ-тан аспауы керек.',
    ),
    'INVALID_PHOTO' => tr(
      kk,
      'Нужен JPEG, PNG или WebP до 8 МиБ и 20 Мп, без анимации.',
      'JPEG, PNG не WebP қажет: 8 МиБ, 20 Мп дейін, анимациясыз.',
    ),
    'PHOTO_IN_USE' => tr(
      kk,
      'Это фото уже используется в другом объявлении.',
      'Бұл фото басқа хабарландыруда қолданылған.',
    ),
    'VALIDATION_ERROR' || 'INVALID_AMOUNT' => tr(
      kk,
      'Проверьте поля формы. Данные сохранены.',
      'Форма өрістерін тексеріңіз. Деректер сақталды.',
    ),
    'RATE_LIMITED' => tr(
      kk,
      'Достигнут лимит загрузок. Попробуйте позже.',
      'Жүктеу шегіне жетті. Кейін қайталаңыз.',
    ),
    'STORAGE_UNAVAILABLE' => tr(
      kk,
      'Хранилище фото временно недоступно. Повторите сохранённый запрос.',
      'Фото қоймасы уақытша қолжетімсіз. Сақталған сұрауды қайталаңыз.',
    ),
    'IDEMPOTENCY_CONFLICT' => tr(
      kk,
      'Сервер не принял повтор. Сохранённое действие требует проверки команды.',
      'Сервер қайталауды қабылдамады. Сақталған әрекетті команда тексеруі қажет.',
    ),
    'PENDING_INTENT' ||
    'PENDING_OPERATION' ||
    'PENDING_EXISTS' ||
    'PENDING_RECEIPT' => tr(
      kk,
      'Сначала завершите сохранённое действие.',
      'Алдымен сақталған әрекетті аяқтаңыз.',
    ),
    'PENDING_ENVIRONMENT_CHANGED' => tr(
      kk,
      'Адрес сервера изменился. Команде нужно восстановить прежнее подключение для сохранённого действия.',
      'Сервер мекенжайы өзгерді. Сақталған әрекет үшін команда бұрынғы қосылымды қалпына келтіруі қажет.',
    ),
    'PENDING_DATA_UNREADABLE' || 'PENDING_PHOTO_UNAVAILABLE' => tr(
      kk,
      'Не удалось прочитать сохранённое действие на устройстве. Команда поможет восстановить результат без повторной публикации.',
      'Құрылғыдағы сақталған әрекет оқылмады. Команда нәтижені қайта жарияламай қалпына келтіруге көмектеседі.',
    ),
    'LOCAL_STORAGE_FAILED' || 'PHOTO_STORAGE_FAILED' => tr(
      kk,
      'Не удалось безопасно сохранить действие на устройстве. Проверьте свободное место и повторите.',
      'Әрекетті құрылғыда қауіпсіз сақтау мүмкін болмады. Бос орынды тексеріп, қайталаңыз.',
    ),
    _ => tr(
      kk,
      'Не удалось получить подтверждение сервера. Проверьте соединение и повторите.',
      'Сервер растауы алынбады. Байланысты тексеріп, қайталаңыз.',
    ),
  };
}

class Notice extends StatelessWidget {
  const Notice({
    super.key,
    required this.text,
    this.title,
    this.icon,
    this.action,
    this.error = false,
  });
  final String text;
  final String? title;
  final IconData? icon;
  final Widget? action;
  final bool error;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: error ? QadamTheme.noticeError : QadamTheme.noticeInfo,
      borderRadius: BorderRadius.circular(20),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              icon ?? (error ? Icons.error_outline : Icons.info_outline),
              size: 22,
              color: error ? QadamTheme.danger : QadamTheme.green,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (title != null) ...[
                    Text(
                      title!,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                  ],
                  Text(text, style: QadamTheme.noticeText),
                ],
              ),
            ),
          ],
        ),
        if (action != null)
          Padding(padding: const EdgeInsets.only(top: 12), child: action!),
      ],
    ),
  );
}

/// Shared read failure presentation; callers retain their own retry semantics.
class ReadError extends StatelessWidget {
  const ReadError({super.key, required this.onRetry, this.message});
  final VoidCallback? onRetry;
  final String? message;

  @override
  Widget build(BuildContext context) {
    final kk = Localizations.localeOf(context).languageCode == 'kk';
    return Notice(
      error: true,
      title: tr(kk, 'Не удалось загрузить данные', 'Деректер жүктелмеді'),
      text:
          message ??
          tr(kk, 'Проверьте сеть и повторите.', 'Желіні тексеріп, қайталаңыз.'),
      action: TextButton.icon(
        onPressed: onRetry,
        icon: const Icon(Icons.refresh),
        label: Text(tr(kk, 'Повторить', 'Қайталау')),
      ),
    );
  }
}

class ApiPhoto extends StatefulWidget {
  const ApiPhoto({
    super.key,
    required this.api,
    required this.path,
    required this.kk,
    this.private = false,
    this.height = 180,
  });
  final LivestockApi api;
  final String path;
  final bool private;
  final bool kk;
  final double height;
  @override
  State<ApiPhoto> createState() => _ApiPhotoState();
}

class _ApiPhotoState extends State<ApiPhoto> {
  late Future<Uint8List> _bytes;
  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _bytes = widget.api.photoBytes(widget.path, authenticated: widget.private);
  }

  @override
  void didUpdateWidget(covariant ApiPhoto oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.path != widget.path ||
        oldWidget.api != widget.api ||
        oldWidget.private != widget.private) {
      _load();
    }
  }

  @override
  Widget build(BuildContext context) => SizedBox(
    height: widget.height,
    width: double.infinity,
    child: FutureBuilder<Uint8List>(
      future: _bytes,
      builder: (context, snapshot) {
        if (snapshot.hasData) {
          return Image.memory(
            snapshot.data!,
            fit: BoxFit.cover,
            excludeFromSemantics: true,
            gaplessPlayback: false,
            errorBuilder: (_, _, _) =>
                const Center(child: Icon(Icons.broken_image_outlined)),
          );
        }
        if (snapshot.hasError) {
          return Center(
            child: TextButton.icon(
              onPressed: () => setState(_load),
              icon: const Icon(Icons.refresh),
              label: Text(tr(widget.kk, 'Загрузить фото', 'Фотоны жүктеу')),
            ),
          );
        }
        return const Center(child: CircularProgressIndicator(strokeWidth: 2));
      },
    ),
  );
}

class ListingCard extends StatelessWidget {
  const ListingCard({
    super.key,
    required this.listing,
    required this.api,
    required this.kk,
    required this.onTap,
    this.owned = false,
  });
  final Json listing;
  final LivestockApi api;
  final bool kk;
  final bool owned;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    final photos = (listing['photos'] as List? ?? []).cast<Json>();
    final code = listing['species'] as String? ?? '';
    return Card(
      clipBehavior: Clip.antiAlias,
      margin: const EdgeInsets.only(bottom: 16),
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (photos.isNotEmpty)
              ApiPhoto(
                api: api,
                kk: kk,
                path: owned
                    ? '/livestock/me/photos/${photos.first['id']}'
                    : photos.first['url'] as String,
                private: owned,
              )
            else
              Container(
                height: 128,
                width: double.infinity,
                color: const Color(0xffe6ebda),
                child: Center(
                  child: Text(
                    speciesGlyph(code),
                    style: const TextStyle(fontSize: 62),
                  ),
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 8,
                    runSpacing: 4,
                    children: [
                      if (listing['is_demo'] == true)
                        QadamBadge(
                          tr(kk, 'Учебное объявление', 'Оқу хабарландыруы'),
                          warning: true,
                        ),
                      if (owned)
                        _Tag(statusText(listing, kk), const Color(0xffe9eedf)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    speciesName(code, kk),
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    money(listing['price_per_head_minor'] as int),
                    style: const TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  Text(
                    tr(kk, 'за голову', 'бір бас үшін'),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      const Icon(Icons.place_outlined, size: 18),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          '${listing['locality']} · ${listing['quantity']} ${tr(kk, 'гол.', 'бас')}',
                        ),
                      ),
                      const Icon(Icons.arrow_outward, size: 20),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(marketName(listing, kk)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String statusText(Json item, bool kk) => switch (item['status']) {
  'sold' => tr(kk, 'Продано', 'Сатылды'),
  'withdrawn' => tr(kk, 'Снято', 'Алып тасталды'),
  _ =>
    item['available_today'] == true
        ? tr(kk, 'Есть сегодня', 'Бүгін бар')
        : tr(kk, 'Нужно подтвердить наличие', 'Бар екенін растау қажет'),
};

class _Tag extends StatelessWidget {
  const _Tag(this.text, this.color);
  final String text;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
    decoration: BoxDecoration(
      color: color,
      borderRadius: BorderRadius.circular(8),
    ),
    child: Text(
      text,
      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
    ),
  );
}
