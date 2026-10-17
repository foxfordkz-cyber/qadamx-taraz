import 'package:flutter/material.dart';

/// Mobile projection of apps/web/src/shared/tokens.css. No runtime font fetch.
class QadamTheme {
  QadamTheme._();
  static const double gap = 12, pagePadding = 16;
  static const paper = Color(0xfff5f3eb), ink = Color(0xff172a26);
  static const green = Color(0xff164c3e), lime = Color(0xffd7f36a);
  static const surface = Color(0xfffffefa), line = Color(0xffe1e2d8);
  static const muted = Color(0xff58685f), soft = Color(0xffeaf0e5);
  static const danger = Color(0xff9d2f1c);
  static const noticeError = Color(0xfffbe7e0);
  static const noticeInfo = Color(0xffe1eef1);
  static const warning = Color(0xff8a5410), warningSoft = Color(0xfffff2cf);
  static const warningLine = Color(0xfff2d68c), sceneSky = Color(0xffdfeceb);
  static const chartAmber = Color(0xffb36d20);
  static const appTitle = TextStyle(fontSize: 22, fontWeight: FontWeight.w800);
  static const pageTitle = TextStyle(fontSize: 28, fontWeight: FontWeight.w800);
  static const noticeText = TextStyle(height: 1.4);
  static ButtonStyle get limeAction => FilledButton.styleFrom(
    backgroundColor: lime,
    foregroundColor: ink,
    shape: const StadiumBorder(),
  );
  static TextStyle heading(BuildContext context) => Theme.of(context)
      .textTheme
      .headlineSmall!
      .copyWith(fontSize: MediaQuery.sizeOf(context).width < 360 ? 24 : 28);

  static ThemeData get light {
    final base = ThemeData(
      useMaterial3: true,
      fontFamily: 'Manrope',
      fontFamilyFallback: const [
        'QadamKazakhExt',
        'QadamKazakh',
        'QadamSymbols',
      ],
      colorScheme: ColorScheme.fromSeed(seedColor: green).copyWith(
        primary: green,
        onPrimary: surface,
        primaryContainer: lime,
        onPrimaryContainer: ink,
        secondary: green,
        tertiary: const Color(0xff5f8053),
        secondaryContainer: soft,
        onSecondaryContainer: ink,
        surface: surface,
        onSurface: ink,
        onSurfaceVariant: muted,
        outline: line,
        outlineVariant: line,
        error: danger,
        errorContainer: noticeError,
      ),
    );
    return base.copyWith(
      scaffoldBackgroundColor: paper,
      textTheme: base.textTheme.copyWith(
        headlineSmall: base.textTheme.headlineSmall!.copyWith(
          fontSize: 28,
          fontWeight: FontWeight.w800,
          height: 1.18,
        ),
        titleLarge: base.textTheme.titleLarge!.copyWith(
          fontSize: 22,
          fontWeight: FontWeight.w800,
          height: 1.25,
        ),
        titleMedium: base.textTheme.titleMedium!.copyWith(
          fontSize: 16,
          fontWeight: FontWeight.w700,
          height: 1.35,
        ),
        bodyLarge: base.textTheme.bodyLarge!.copyWith(
          fontSize: 16,
          height: 1.45,
        ),
        bodyMedium: base.textTheme.bodyMedium!.copyWith(
          fontSize: 14,
          height: 1.45,
        ),
        bodySmall: base.textTheme.bodySmall!.copyWith(
          fontSize: 12,
          height: 1.4,
          color: muted,
        ),
        labelLarge: base.textTheme.labelLarge!.copyWith(
          fontSize: 14,
          fontWeight: FontWeight.w700,
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: paper,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: TextStyle(
          fontFamily: 'Manrope',
          fontFamilyFallback: ['QadamKazakhExt', 'QadamKazakh', 'QadamSymbols'],
          color: ink,
          fontSize: 20,
          fontWeight: FontWeight.w800,
        ),
      ),
      cardTheme: const CardThemeData(
        elevation: 0,
        color: surface,
        margin: EdgeInsets.only(bottom: 12),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(20)),
          side: BorderSide(color: line),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
        errorMaxLines: 3,
        helperMaxLines: 4,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: line),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: line),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(48, 48),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(48, 48),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          side: const BorderSide(color: line),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
      ),
      chipTheme: base.chipTheme.copyWith(
        side: const BorderSide(color: line),
        backgroundColor: surface,
        selectedColor: lime,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      ),
      navigationBarTheme: const NavigationBarThemeData(
        backgroundColor: surface,
        indicatorColor: lime,
        height: 80,
      ),
      dividerTheme: const DividerThemeData(color: line, space: 24),
    );
  }
}
