import 'package:flutter/material.dart';

bool qadamKk(BuildContext context) =>
    Localizations.localeOf(context).languageCode == 'kk';

/// Above Navigator so pushed native pages can change language in place.
class QadamLanguage extends InheritedWidget {
  const QadamLanguage({
    super.key,
    required this.toggle,
    required this.kk,
    required super.child,
  });
  final VoidCallback toggle;
  final bool kk;
  static QadamLanguage? of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<QadamLanguage>();
  @override
  bool updateShouldNotify(QadamLanguage oldWidget) => kk != oldWidget.kk;
}

class LanguageAction extends StatelessWidget {
  const LanguageAction({super.key});
  @override
  Widget build(BuildContext context) {
    final language = QadamLanguage.of(context);
    if (language == null) return const SizedBox.shrink();
    return TextButton(
      onPressed: language.toggle,
      child: Text(
        language.kk ? 'RU' : 'ҚАЗ',
        semanticsLabel: language.kk ? 'Русский язык' : 'Қазақ тілі',
      ),
    );
  }
}
