import 'package:flutter/material.dart';
import 'qadam_theme.dart';

class QadamBadge extends StatelessWidget {
  const QadamBadge(this.label, {super.key, this.warning = false});
  final String label;
  final bool warning;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(
      color: warning ? QadamTheme.warningSoft : QadamTheme.soft,
      border: Border.all(
        color: warning ? QadamTheme.warningLine : QadamTheme.line,
      ),
      borderRadius: BorderRadius.circular(999),
    ),
    child: Text(
      label,
      style: Theme.of(context).textTheme.labelSmall!.copyWith(
        fontSize: 12,
        fontWeight: FontWeight.w700,
        color: warning ? QadamTheme.warning : QadamTheme.ink,
      ),
    ),
  );
}
