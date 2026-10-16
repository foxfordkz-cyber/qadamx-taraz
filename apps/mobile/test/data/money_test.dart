import 'package:flutter_test/flutter_test.dart';
import 'package:qadam_mobile/data/money.dart';

void main() {
  test('whole and fractional KZT convert to exact integer tiyn', () {
    expect(parsePriceMinor('350 000'), 35000000);
    expect(parsePriceMinor('1,01'), 101);
    expect(parsePriceMinor('0.29'), 29);
    expect(parsePriceMinor('1.1'), 110);
    expect(parsePriceMinor(' 100\u00a0000\u202f000.00 '), 10000000000);
    expect(parsePriceMinor('0001.05'), 105);
  });

  test('rejects zero, negative, floating precision and contract overflow', () {
    for (final input in [
      '', '0', '0.00', '-1', '+1', '1e6', 'NaN', 'Infinity',
      '1.001', '1,2.3', '1,', '100000000.01', '9999999999999999999',
    ]) {
      expect(parsePriceMinor(input), isNull, reason: input);
    }
  });

  test('format and form round trip preserve all minor units', () {
    for (final amount in [1, 29, 99, 100, 101, 35000000, 9999999999, 10000000000]) {
      expect(parsePriceMinor(priceInput(amount)), amount);
    }
    expect(formatPriceMinor(35000029), '350 000,29 ₸');
    expect(formatPriceMinor(35000000), '350 000 ₸');
  });
}
