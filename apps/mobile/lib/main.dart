import 'package:flutter/material.dart';

import 'config.dart';
import 'runtime.dart';
import 'ui/app.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final runtime = await MobileRuntime.create(AppConfig.fromEnvironment());
  runApp(MobileApp(runtime: runtime));
}
