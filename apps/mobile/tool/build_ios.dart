import 'dart:convert';
import 'dart:io';

/// Never forward arbitrary config fields or credentials to Flutter/Xcode.
void validateIosPublicConfig(Object? value) {
  const allowed = {'API_BASE_URL', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY'};
  if (value is! Map ||
      value.length != allowed.length ||
      !value.keys.every(allowed.contains) ||
      !value.values.every((v) => v is String && v.isNotEmpty)) {
    throw const FormatException(
      'Exactly three nonempty public fields required.',
    );
  }
  const project = 'https://pdjjdqgoitnkpgkbqjtp.supabase.co';
  if (value['SUPABASE_URL'] != project ||
      !RegExp(
        r'^sb_publishable_[A-Za-z0-9_-]{16,}$',
      ).hasMatch(value['SUPABASE_PUBLISHABLE_KEY'] as String)) {
    throw const FormatException('Use the agreed project and publishable key.');
  }
  final api = Uri.tryParse(value['API_BASE_URL'] as String);
  if (api == null ||
      api.scheme != 'https' ||
      api.host.isEmpty ||
      api.host == Uri.parse(project).host ||
      api.userInfo.isNotEmpty ||
      api.hasQuery ||
      api.hasFragment ||
      !const ['/api/v1', '/api/v1/'].contains(api.path)) {
    throw const FormatException('Use the agreed HTTPS FastAPI /api/v1 URL.');
  }
}

Future<void> main(List<String> args) async {
  const modes = {'validate', 'prepare', 'simulator', 'device', 'run'};
  if (args.length < 2 ||
      args.length > 3 ||
      !modes.contains(args[1]) ||
      (args[1] == 'run' ? args.length != 3 : args.length != 2)) {
    stderr.writeln(
      'From apps/mobile: dart run tool/build_ios.dart <public-config.json> '
      '<validate|prepare|simulator|device|run> [iPhone-device-id]',
    );
    exitCode = 64;
    return;
  }
  final File config;
  try {
    config = File(args[0]).absolute;
    validateIosPublicConfig(jsonDecode(await config.readAsString()));
  } catch (_) {
    // Do not print parser errors: they can contain values from a mistaken file.
    stderr.writeln(
      'Invalid public config. See docs/IOS_SETUP.md; no values logged.',
    );
    exitCode = 65;
    return;
  }
  if (args[1] == 'validate') {
    stdout.writeln('iOS public configuration: valid. No build performed.');
    return;
  }
  if (!Platform.isMacOS) {
    stderr.writeln('iOS build requires macOS and Xcode. No IPA was produced.');
    exitCode = 69;
    return;
  }
  final buildArgs = switch (args[1]) {
    'prepare' => ['build', 'ios', '--debug', '--config-only', '--no-codesign'],
    'simulator' => ['build', 'ios', '--debug', '--simulator'],
    'device' => ['build', 'ios', '--release', '--no-codesign'],
    'run' => ['run', '--release', '--device-id', args[2]],
    _ => throw StateError('Unknown mode'),
  };
  try {
    final process = await Process.start('flutter', [
      ...buildArgs,
      '--dart-define-from-file=${config.path}',
    ], mode: ProcessStartMode.inheritStdio);
    exitCode = await process.exitCode;
    if (exitCode == 0 && args[1] == 'device') {
      stdout.writeln(
        'Unsigned .app built. Signing is required for installation.',
      );
    }
  } catch (_) {
    stderr.writeln(
      'Could not start Flutter. Check Flutter/Xcode setup on this Mac.',
    );
    exitCode = 69;
  }
}
