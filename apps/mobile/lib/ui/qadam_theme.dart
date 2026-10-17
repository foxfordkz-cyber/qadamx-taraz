import 'package:flutter/material.dart';

/// Existing Qadam mobile styling, centralized for the team's next design pass.
class QadamTheme {
  QadamTheme._();
  static const double gap = 12;
  static const double pagePadding = 16;
  static const appTitle = TextStyle(fontWeight: FontWeight.w800);
  static const pageTitle = TextStyle(fontSize: 30, fontWeight: FontWeight.w800);
  static const noticeText = TextStyle(height: 1.4);
  static const noticeError = Color(0xffffeae4);
  static const noticeInfo = Color(0xffeef1e7);
  // Body typography follows Material's platform font and system text scaling.
  static ThemeData get light => ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: const Color(0xfff7f7ef),
    colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff68871e))
        .copyWith(
          primary: const Color(0xff26371a),
          onPrimary: Colors.white,
          primaryContainer: const Color(0xffd5f577),
          onPrimaryContainer: const Color(0xff172112),
          surface: const Color(0xfffffff9),
          onSurface: const Color(0xff20271d),
        ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Color(0xfff7f7ef),
      surfaceTintColor: Colors.transparent,
    ),
    cardTheme: const CardThemeData(
      elevation: 0,
      color: Color(0xfffffff9),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(24)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 17),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xffdce0d2)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xffdce0d2)),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(48, 52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(48, 50),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
    ),
    navigationBarTheme: const NavigationBarThemeData(
      backgroundColor: Color(0xfffffff9),
      indicatorColor: Color(0xffd5f577),
      height: 76,
    ),
  );
}
