import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:path_provider/path_provider.dart';
import 'package:uuid/uuid.dart';
import '../data/api_failure.dart';

/// File-picker metadata is not trusted. Device decoding supplies duration;
/// backend decoding remains authoritative for format and speech limits.
class AudioInput {
  AudioInput(Uint8List data, this.duration)
    : bytes = Uint8List.fromList(data).asUnmodifiableView(),
      format = detectAudio(data) {
    if (duration <= Duration.zero || duration > const Duration(seconds: 30)) {
      throw const ApiFailure('AUDIO_INVALID');
    }
  }
  final Uint8List bytes;
  final Duration duration;
  final String format;
  String get mime => switch (format) {
    'mp3' => 'audio/mpeg',
    'm4a' => 'audio/mp4',
    _ => 'audio/$format',
  };
}

String detectAudio(Uint8List bytes) {
  if (bytes.length < 12 || bytes.length > 8 * 1024 * 1024) {
    throw const ApiFailure('AUDIO_INVALID');
  }
  String tag(int start, int length) =>
      ascii.decode(bytes.sublist(start, start + length), allowInvalid: true);
  if (tag(0, 4) == 'RIFF' && tag(8, 4) == 'WAVE') return 'wav';
  if (tag(0, 4) == 'OggS') return 'ogg';
  if (tag(0, 4) == 'fLaC') return 'flac';
  if (tag(4, 4) == 'ftyp') return 'm4a';
  if (bytes[0] == 0x1a &&
      bytes[1] == 0x45 &&
      bytes[2] == 0xdf &&
      bytes[3] == 0xa3) {
    return 'webm';
  }
  if (tag(0, 3) == 'ID3' || (bytes[0] == 0xff && bytes[1] & 0xe0 == 0xe0)) {
    return 'mp3';
  }
  throw const ApiFailure('AUDIO_INVALID');
}

/// Own cache copy only; never delete or modify the user-selected original.
Future<String> cacheAudio(Uint8List bytes, String format) async {
  final directory = Directory(
    '${(await getTemporaryDirectory()).path}/qadam-import-audio',
  );
  await directory.create(recursive: true);
  await for (final entity in directory.list(followLinks: false)) {
    if (entity is File &&
        (await entity.lastModified()).isBefore(
          DateTime.now().subtract(const Duration(hours: 1)),
        )) {
      await entity.delete();
    }
  }
  final path = '${directory.path}/${const Uuid().v4()}.$format';
  await File(path).writeAsBytes(bytes, flush: true);
  return path;
}

Future<void> removeCachedAudio(String? path) async {
  if (path == null) return;
  try {
    final file = File(path);
    if (await file.exists()) await file.delete();
  } catch (_) {}
}
