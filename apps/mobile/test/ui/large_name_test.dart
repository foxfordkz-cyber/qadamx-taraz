import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:qadam_mobile/ui/qadam_name.dart';
import 'package:qadam_mobile/ui/qadam_theme.dart';
import '../visual/visual_fixture.dart' show loadVisualFonts;

void main() {
  testWidgets(
    'Kazakh names keep whole words at 2x in shop and point selector',
    (tester) async {
      await loadVisualFonts();
      const word = 'Кайкарметтің';
      for (final (width, fontSize) in [(288.0, 24.0), (216.0, 16.0)]) {
        await tester.pumpWidget(
          MaterialApp(
            theme: QadamTheme.light,
            home: Scaffold(
              body: Center(
                child: MediaQuery(
                  data: const MediaQueryData(textScaler: TextScaler.linear(2)),
                  child: SizedBox(
                    width: width,
                    child: QadamName(
                      '$word отбасылық дүкені',
                      style: QadamTheme.light.textTheme.titleMedium!.copyWith(
                        fontSize: fontSize,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        final paragraph = tester.renderObject<RenderParagraph>(
          find.descendant(
            of: find.byType(QadamName),
            matching: find.byType(RichText),
          ),
        );
        final boxes = paragraph.getBoxesForSelection(
          const TextSelection(baseOffset: 0, extentOffset: word.length),
        );
        expect(boxes, isNotEmpty);
        // Kazakh fallback glyphs can produce separate runs on the same line.
        for (final box in boxes) {
          expect((box.top - boxes.first.top).abs(), lessThan(1));
          expect(box.right, lessThanOrEqualTo(width));
        }
        expect(paragraph.textScaler.scale(16), 32);
        expect(tester.takeException(), isNull);
      }
    },
  );
}
