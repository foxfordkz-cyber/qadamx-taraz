import 'package:flutter/material.dart';

import 'common.dart';
import 'qadam_theme.dart';

/// The stepped mark follows the existing website's M8 30h8v-8h8v-8h8 path.
class QadamBrand extends StatelessWidget {
  const QadamBrand({super.key});
  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: QadamTheme.green,
          borderRadius: BorderRadius.circular(9),
        ),
        child: const CustomPaint(painter: _BrandPainter()),
      ),
      const SizedBox(width: 8),
      const Text('qadam'),
    ],
  );
}

class _BrandPainter extends CustomPainter {
  const _BrandPainter();
  @override
  void paint(Canvas canvas, Size size) {
    canvas.scale(size.width / 40, size.height / 40);
    canvas.drawPath(
      Path()
        ..moveTo(8, 30)
        ..lineTo(16, 30)
        ..lineTo(16, 22)
        ..lineTo(24, 22)
        ..lineTo(24, 14)
        ..lineTo(32, 14),
      Paint()
        ..color = QadamTheme.lime
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.5
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round,
    );
  }

  @override
  bool shouldRepaint(_BrandPainter oldDelegate) => false;
}

class QadamWelcome extends StatelessWidget {
  const QadamWelcome({
    super.key,
    required this.kk,
    required this.explore,
    required this.business,
  });
  final bool kk;
  final VoidCallback explore, business;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(24),
    decoration: BoxDecoration(
      color: QadamTheme.green,
      borderRadius: BorderRadius.circular(24),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          '●  QADAM MARKET · TARAZ',
          style: TextStyle(
            color: QadamTheme.lime,
            fontSize: 11,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          tr(
            kk,
            'Найдите магазин\nна рынке Тараза',
            'Тараз базарынан\nдүкен табыңыз',
          ),
          style: Theme.of(context).textTheme.headlineSmall!.copyWith(
            color: QadamTheme.surface,
            fontSize: 30,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          tr(
            kk,
            'Площадки, магазины и продавцы — в одном приложении.',
            'Алаңдар, дүкендер мен сатушылар — бір қолданбада.',
          ),
          style: const TextStyle(color: Color(0xffd2e2d4)),
        ),
        const SizedBox(height: 20),
        FilledButton.icon(
          key: const Key('home-explore'),
          onPressed: explore,
          style: FilledButton.styleFrom(
            backgroundColor: QadamTheme.lime,
            foregroundColor: QadamTheme.ink,
          ),
          icon: const Icon(Icons.arrow_outward, size: 18),
          label: Text(tr(kk, 'Найти магазин', 'Дүкен табу')),
        ),
        const SizedBox(height: 8),
        OutlinedButton(
          onPressed: business,
          style: OutlinedButton.styleFrom(
            foregroundColor: QadamTheme.surface,
            side: const BorderSide(color: Color(0xff608175)),
          ),
          child: Text(tr(kk, 'Кабинет продавца', 'Сатушы кабинеті')),
        ),
      ],
    ),
  );
}

class QadamMenuItem extends StatelessWidget {
  const QadamMenuItem({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    required this.onTap,
    this.destructive = false,
  });
  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback? onTap;
  final bool destructive;
  @override
  Widget build(BuildContext context) => ListTile(
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
    leading: Icon(
      icon,
      color: destructive ? QadamTheme.danger : QadamTheme.green,
    ),
    title: Text(
      title,
      style: TextStyle(
        fontWeight: FontWeight.w700,
        color: destructive ? QadamTheme.danger : null,
      ),
    ),
    subtitle: subtitle == null ? null : Text(subtitle!),
    trailing: const Icon(Icons.chevron_right, size: 20),
    onTap: onTap,
  );
}
