import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/testing.dart';
import 'package:record/record.dart';
import 'package:qadam_mobile/crm/audio_input.dart';
import 'package:qadam_mobile/crm/crm_api.dart';
import 'package:qadam_mobile/crm/crm_drafts.dart';
import 'package:qadam_mobile/crm/crm_pending.dart';
import 'package:qadam_mobile/crm/voice_capture.dart';
import 'crm_ai_test.dart' as a;
import 'crm_test.dart' as f;

class PausableRecorder extends a.FakeRecorder
    implements PausableVoiceRecorderPort {
  final events = StreamController<RecordState>.broadcast(sync: true);
  Completer<void>? resumeResult;
  @override
  Stream<RecordState> get states => events.stream;
  @override
  Future<void> pause() async {
    events.add(RecordState.pause);
  }

  @override
  Future<void> resume() async {
    await resumeResult?.future;
    events.add(RecordState.record);
  }

  @override
  Future<void> dispose() => events.close();
}

void main() {
  test('import validates actual header, byte limit and decoded duration', () {
    expect(AudioInput(a.wav(), const Duration(seconds: 1)).mime, 'audio/wav');
    final signatures = {'OggS': 'ogg', 'fLaC': 'flac', 'ID3x': 'mp3'};
    for (final entry in signatures.entries) {
      final bytes = Uint8List(16)..setRange(0, 4, ascii.encode(entry.key));
      expect(detectAudio(bytes), entry.value);
    }
    expect(
      () => detectAudio(Uint8List(20)),
      throwsA(f.failure('AUDIO_INVALID')),
    );
    expect(
      () => detectAudio(Uint8List(8 * 1024 * 1024 + 1)),
      throwsA(f.failure('AUDIO_INVALID')),
    );
    expect(
      () => AudioInput(a.wav(), const Duration(milliseconds: 30001)),
      throwsA(f.failure('AUDIO_INVALID')),
    );
    expect(
      () => AudioInput(a.wav(), Duration.zero),
      throwsA(f.failure('AUDIO_INVALID')),
    );
    final bytes = a.wav();
    final input = AudioInput(bytes, const Duration(seconds: 1));
    bytes[0] = 0;
    expect(input.bytes[0], 82);
    expect(() => input.bytes[0] = 0, throwsUnsupportedError);
  });
  test(
    'imported audio uses multipart boundary and generic filename; no retry',
    () async {
      var count = 0;
      final api = CrmApi(
        baseUrl: f.base,
        accountId: () => f.owner,
        epoch: () => 0,
        accessToken: () async => 'synthetic-token',
        pending: CrmPending(f.MemoryCrmVault()),
      );
      final controller = CrmDrafts(
        api,
        api.scope(f.business),
        clientFactory: () => MockClient((r) async {
          count++;
          expect(
            r.headers['content-type'],
            startsWith('multipart/form-data; boundary='),
          );
          expect(r.body, contains('filename="selected.ogg"'));
          expect(r.body, contains('content-type: audio/ogg'));
          return f.jsonResponse({}, 503);
        }),
      );
      final bytes = Uint8List(16)..setRange(0, 4, ascii.encode('OggS'));
      final audio = AudioInput(bytes, const Duration(seconds: 1));
      await controller.analyze(audio: audio, locale: 'kk');
      expect(controller.error, isNotNull);
      expect(count, 1);
      await controller.analyze(text: 'Invalid XOR', audio: audio, locale: 'ru');
      expect(count, 1);
      controller.dispose();
      api.close();
    },
  );
  test(
    'pause, interruption and cancel during resume never restore old capture',
    () async {
      final recorder = PausableRecorder();
      final voice = VoiceCapture(
        recorder: recorder,
        createPath: () async => '/synthetic/audio.wav',
        read: (_) async => a.wav(),
        remove: (_) async {},
      );
      await voice.start();
      expect(voice.canPause, isTrue);
      await voice.togglePause();
      expect(voice.paused, isTrue);
      await voice.togglePause();
      expect(voice.paused, isFalse);
      recorder.events.add(RecordState.pause);
      expect(voice.paused, isTrue);
      recorder.resumeResult = Completer<void>();
      final resuming = voice.togglePause();
      final cancelling = voice.cancel();
      await voice.start();
      expect(recorder.starts, 1);
      recorder.resumeResult!.complete();
      await resuming;
      await cancelling;
      expect(voice.recording, isFalse);
      expect(voice.paused, isFalse);
      expect(voice.path, isNull);
      expect(voice.duration, isNull);
      voice.dispose();
    },
  );
}
