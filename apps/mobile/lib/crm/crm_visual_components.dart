import 'package:flutter/material.dart';

import '../data/api_failure.dart';
import '../ui/common.dart' show ReadError;

/// Presentation only: values come from a validated server snapshot.
class CrmMetric extends StatelessWidget {
  const CrmMetric({
    super.key,
    required this.label,
    required this.value,
    this.caption,
    this.emphasized = false,
  });

  final String label;
  final String value;
  final String? caption;
  final bool emphasized;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      container: true,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: emphasized
              ? theme.colorScheme.primaryContainer
              : theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: theme.colorScheme.outlineVariant),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: theme.textTheme.labelLarge),
              const SizedBox(height: 8),
              Text(
                value,
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
              if (caption != null) ...[
                const SizedBox(height: 4),
                Text(caption!, style: theme.textTheme.bodySmall),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// No fixed card heights: large system text and amounts can wrap and grow.
class CrmResponsiveGrid extends StatelessWidget {
  const CrmResponsiveGrid({super.key, required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final scale = MediaQuery.textScalerOf(context).scale(16) / 16;
      final columns = constraints.maxWidth >= 320 && scale <= 1.3 ? 2 : 1;
      final width = (constraints.maxWidth - (columns - 1) * 12) / columns;
      return Wrap(
        spacing: 12,
        runSpacing: 12,
        children: [
          for (final child in children) SizedBox(width: width, child: child),
        ],
      );
    },
  );
}

class CrmActionTile extends StatelessWidget {
  const CrmActionTile({
    super.key,
    required this.label,
    required this.icon,
    required this.onTap,
  });
  final String label;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: theme.colorScheme.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: theme.colorScheme.outlineVariant),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 64),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Icon(icon, color: theme.colorScheme.primary, size: 24),
                const SizedBox(width: 12),
                Expanded(child: Text(label, style: theme.textTheme.titleSmall)),
                const SizedBox(width: 4),
                const Icon(Icons.chevron_right, size: 18),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

String crmCalendarDate(BuildContext context, String iso, {bool short = false}) {
  final date = DateTime.tryParse(iso);
  if (date == null) return iso;
  final locale = MaterialLocalizations.of(context);
  return short ? locale.formatShortDate(date) : locale.formatMediumDate(date);
}

class CrmReadError extends StatelessWidget {
  const CrmReadError({super.key, required this.onRetry, this.error});
  final VoidCallback onRetry;
  final Object? error;

  @override
  Widget build(BuildContext context) {
    final kk = Localizations.localeOf(context).languageCode == 'kk';
    final code = error is ApiFailure ? (error as ApiFailure).code : '';
    final message = switch (code) {
      'AUTH_REQUIRED' =>
        kk
            ? 'Сессия расталмады. Профиль арқылы қайта кіріңіз.'
            : 'Не удалось подтвердить сессию. Войдите снова через Профиль.',
      'NOT_FOUND' || 'ACCOUNT_CHANGED' =>
        kk
            ? 'Нүктеге қолжетімділікті жаңартып, оны қайта таңдаңыз.'
            : 'Обновите доступ к торговым точкам и выберите точку снова.',
      _ =>
        kk
            ? 'Байланысты тексеріп, қайталаңыз. Көрсеткіштер әлі алынбады.'
            : 'Проверьте подключение и повторите. Показатели пока не получены.',
    };
    return ReadError(onRetry: onRetry, message: message);
  }
}
