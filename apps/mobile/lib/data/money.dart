const maxPriceMinor = 10000000000;

/// Converts a typed KZT amount to integer tiyn without floating point.
/// Accepts a decimal comma or point and optional spaces between digit groups.
int? parsePriceMinor(String text) {
  final normalized = text.trim().replaceAll(RegExp(r'[ \u00a0\u202f]'), '');
  if (!RegExp(r'^\d{1,9}([.,]\d{1,2})?$').hasMatch(normalized)) return null;
  final parts = normalized.split(RegExp(r'[.,]'));
  final whole = int.tryParse(parts.first);
  if (whole == null) return null;
  final fraction = parts.length == 1 ? 0 : int.parse(parts[1].padRight(2, '0'));
  final minor = whole * 100 + fraction;
  return minor > 0 && minor <= maxPriceMinor ? minor : null;
}

/// Form text remains exact even at the maximum supported price.
String priceInput(int minor) {
  final whole = minor ~/ 100;
  final fraction = minor.remainder(100).abs();
  return fraction == 0
      ? '$whole'
      : '$whole.${fraction.toString().padLeft(2, '0')}';
}

String formatPriceMinor(int minor) {
  final amount = priceInput(minor).split('.');
  final grouped = amount.first.replaceAllMapped(
    RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
    (match) => '${match[1]} ',
  );
  return '$grouped${amount.length == 2 ? ',${amount[1]}' : ''} ₸';
}
