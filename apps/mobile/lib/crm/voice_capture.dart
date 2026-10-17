import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import 'package:uuid/uuid.dart';

import '../data/api_failure.dart';
import 'crm_drafts.dart';

abstract class VoiceRecorderPort {
  Future<bool> permission();
  Future<void> start(String path);
  Future<String?> stop();
  Future<void> cancel();
  Future<void> dispose();
}

class NativeVoiceRecorder implements VoiceRecorderPort {
  final AudioRecorder recorder = AudioRecorder();
  @override
  Future<bool> permission() => recorder.hasPermission();
  @override
  Future<void> start(String path) => recorder.start(
    const RecordConfig(
      encoder: AudioEncoder.wav,
      sampleRate: 16000,
      numChannels: 1,
    ),
    path: path,
  );
  @override
  Future<String?> stop() => recorder.stop();
  @override
  Future<void> cancel() => recorder.cancel();
  @override
  Future<void> dispose() => recorder.dispose();
}

/// Capture is independent of network transport. Stop only finalizes a local
/// WAV; the page exposes a separate, explicit Analyze action.
class VoiceCapture extends ChangeNotifier {
  VoiceCapture({
    VoiceRecorderPort? recorder,
    Future<String> Function()? createPath,
    Future<Uint8List> Function(String)? read,
    Future<void> Function(String)? remove,
  }) : recorder = recorder ?? NativeVoiceRecorder(),
       createPath = createPath ?? _newPath,
       read = read ?? ((path) => File(path).readAsBytes()),
       remove = remove ?? _remove;
  final VoiceRecorderPort recorder;
  final Future<String> Function() createPath;
  final Future<Uint8List> Function(String) read;
  final Future<void> Function(String) remove;
  static Future<String> _newPath() async {
    final directory = Directory(
      '${(await getTemporaryDirectory()).path}/qadam-voice',
    );
    await directory.create(recursive: true);
    // Remove old capture leftovers after a process crash. This directory is
    // dedicated to this feature and never contains user-selected files.
    await for (final entity in directory.list(followLinks: false)) {
      if (entity is File &&
          entity.path.endsWith('.wav') &&
          (await entity.lastModified()).isBefore(
            DateTime.now().subtract(const Duration(hours: 1)),
          )) {
        await entity.delete();
      }
    }
    return '${directory.path}/${const Uuid().v4()}.wav';
  }

  static Future<void> _remove(String path) async {
    final file = File(path);
    if (await file.exists()) await file.delete();
  }

  bool recording = false;
  bool _working = false;
  bool _cancelling = false;
  bool get busy => _working || _cancelling;
  bool _disposed = false;
  int _revision = 0;
  String? path;
  double? duration;
  int seconds = 0;
  Object? error;
  Timer? _timer;
  Completer<void>? _starting;
  Completer<void>? _stopping;
  Completer<void>? _cancellation;
  final Stopwatch _clock = Stopwatch();
  void _notify() {
    if (!_disposed) notifyListeners();
  }

  Future<void> start() async {
    if (busy || recording || _disposed) return;
    final revision = ++_revision;
    _working = true;
    error = null;
    duration = null;
    _notify();
    final starting = Completer<void>();
    _starting = starting;
    try {
      if (path != null) {
        await remove(path!);
        path = null;
      }
      if (!await recorder.permission()) {
        throw const ApiFailure('MICROPHONE_DENIED');
      }
      if (_disposed || revision != _revision) return;
      path = await createPath();
      if (_disposed || revision != _revision) return;
      await recorder.start(path!);
      if (_disposed || revision != _revision) {
        await recorder.cancel();
        return;
      }
      recording = true;
      seconds = 0;
      _clock.reset();
      _clock.start();
      _timer = Timer.periodic(const Duration(milliseconds: 250), (_) {
        seconds = _clock.elapsed.inSeconds;
        if (seconds >= 29) {
          unawaited(stop());
        } else {
          _notify();
        }
      });
    } catch (_) {
      if (revision == _revision && !_disposed) {
        error = const ApiFailure('MICROPHONE_UNAVAILABLE');
      }
      // No audio or platform exception text is logged.
      try {
        await recorder.cancel();
      } catch (_) {}
      if (path != null) {
        try {
          await remove(path!);
        } catch (_) {}
        path = null;
      }
    } finally {
      _working = false;
      starting.complete();
      if (identical(_starting, starting)) _starting = null;
      _notify();
    }
  }

  Future<void> stop() async {
    if (!recording || busy || _disposed) return;
    _working = true;
    final revision = _revision;
    final stopping = Completer<void>();
    _stopping = stopping;
    _timer?.cancel();
    _clock.stop();
    _notify();
    try {
      final saved = await recorder.stop();
      if (_disposed || revision != _revision) return;
      recording = false;
      if (saved == null || saved != path) {
        throw const ApiFailure('AUDIO_INVALID');
      }
      final bytes = await read(saved);
      if (_disposed || revision != _revision) return;
      duration = validateVoiceWav(bytes);
    } catch (_) {
      if (!_disposed && revision == _revision)
        error = const ApiFailure('AUDIO_INVALID');
      duration = null;
      try {
        await recorder.cancel();
      } catch (_) {}
      if (path != null) {
        try {
          await remove(path!);
        } catch (_) {}
        path = null;
      }
    } finally {
      recording = false;
      _working = false;
      stopping.complete();
      if (identical(_stopping, stopping)) _stopping = null;
      _notify();
    }
  }

  Future<Uint8List> bytes() async {
    if (recording || busy || path == null || duration == null) {
      throw const ApiFailure('AUDIO_INVALID');
    }
    final data = await read(path!);
    validateVoiceWav(data);
    return data;
  }

  Future<void> cancel() async {
    if (_cancellation != null) return _cancellation!.future;
    final cancellation = Completer<void>();
    _cancellation = cancellation;
    _cancelling = true;
    _revision++;
    _timer?.cancel();
    _clock.stop();
    final starting = _starting;
    if (starting != null) await starting.future;
    final stopping = _stopping;
    if (stopping != null) await stopping.future;
    try {
      await recorder.cancel();
    } catch (_) {}
    if (path != null) {
      try {
        await remove(path!);
      } catch (_) {}
    }
    path = null;
    recording = false;
    _working = false;
    _cancelling = false;
    duration = null;
    seconds = 0;
    error = null;
    cancellation.complete();
    _cancellation = null;
    _notify();
  }

  @override
  void dispose() {
    _disposed = true;
    unawaited(cancel().whenComplete(recorder.dispose));
    super.dispose();
  }
}
