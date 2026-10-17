import 'package:flutter/material.dart';

/// Long names wrap between words. Adjust only their base type size when a
/// single word would otherwise split; the user's text scaler stays enabled.
class QadamName extends StatelessWidget {
  const QadamName(this.name, {super.key, this.style});
  final String name;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, box) {
      final base = DefaultTextStyle.of(
        context,
      ).style.merge(style ?? Theme.of(context).textTheme.titleMedium!);
      var size = base.fontSize ?? 16;
      if (box.maxWidth.isFinite) {
        final painter = TextPainter(
          textDirection: Directionality.of(context),
          textScaler: MediaQuery.textScalerOf(context),
          locale: Localizations.maybeLocaleOf(context),
        );
        for (final word in name.split(RegExp(r'\s+'))) {
          painter.text = TextSpan(
            text: word,
            style: base.copyWith(fontSize: size),
          );
          painter.layout();
          while (painter.width > box.maxWidth && size > 14) {
            size = (size - .5).clamp(14, size);
            painter.text = TextSpan(
              text: word,
              style: base.copyWith(fontSize: size),
            );
            painter.layout();
          }
        }
        painter.dispose();
      }
      return Text(name, style: base.copyWith(fontSize: size));
    },
  );
}
