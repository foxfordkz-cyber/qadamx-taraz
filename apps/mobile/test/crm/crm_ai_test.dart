import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:qadam_mobile/crm/crm_api.dart';
import 'package:qadam_mobile/crm/crm_analytics.dart';
import 'package:qadam_mobile/crm/crm_drafts.dart';
import 'package:qadam_mobile/crm/crm_models.dart';
import 'package:qadam_mobile/crm/crm_pending.dart';
import 'package:qadam_mobile/crm/voice_capture.dart';

import 'crm_test.dart' as fixture;

CrmJson draft() => {
  'id': fixture.saleId,
  'transcript': 'Synthetic test only',
  'kind': 'sale',
  'customer_query': null,
  'customer_candidates': [],
  'sale_candidates': [],
  'description': 'Fixture',
  'total_minor': 15000,
  'received_minor': null,
  'amount_minor': null,
  'missing_fields': ['received_minor'],
  'questions': ['Payment?'],
  'expires_at': DateTime.now()
      .toUtc()
      .add(const Duration(minutes: 30))
      .toIso8601String(),
};
Uint8List wav([int seconds = 1]) {
  final bytes = Uint8List(44 + seconds * 32000);
  final data = ByteData.sublistView(bytes);
  void tag(int offset, String value) =>
      bytes.setRange(offset, offset + 4, ascii.encode(value));
  tag(0, 'RIFF');
  data.setUint32(4, bytes.length - 8, Endian.little);
  tag(8, 'WAVE');
  tag(12, 'fmt ');
  data.setUint32(16, 16, Endian.little);
  data.setUint16(20, 1, Endian.little);
  data.setUint16(22, 1, Endian.little);
  data.setUint32(24, 16000, Endian.little);
  data.setUint32(28, 32000, Endian.little);
  data.setUint16(32, 2, Endian.little);
  data.setUint16(34, 16, Endian.little);
  tag(36, 'data');
  data.setUint32(40, seconds * 32000, Endian.little);
  return bytes;
}

class FakeRecorder implements VoiceRecorderPort {
  bool allowed = true;
  Completer<bool>? permissionResult;
  Completer<String?>? stopResult;
  int starts = 0;
  int stops = 0;
  int cancels = 0;
  @override
  Future<bool> permission() =>
      permissionResult?.future ?? Future.value(allowed);
  @override
  Future<void> start(String path) async {
    starts++;
  }

  @override
  Future<String?> stop() async {
    stops++;
    return stopResult == null ? '/synthetic/audio.wav' : stopResult!.future;
  }

  @override
  Future<void> cancel() async {
    cancels++;
  }

  @override
  Future<void> dispose() async {}
}

void main() {
  late String? account;
  late int epoch;
  late CrmApi api;
  setUp(() {
    account = fixture.owner;
    epoch = 0;
    api = CrmApi(
      baseUrl: fixture.base,
      accountId: () => account,
      epoch: () => epoch,
      accessToken: () async => 'synthetic-token',
      pending: CrmPending(fixture.MemoryCrmVault()),
      client: MockClient(
        (_) async => throw StateError('No ledger request allowed'),
      ),
    );
  });
  tearDown(() => api.close());
  test(
    'AI text is multipart; one request only, no operation and unknown paid remains null',
    () async {
      final requests = <http.Request>[];
      final controller = CrmDrafts(
        api,
        api.scope(fixture.business),
        clientFactory: () => MockClient((r) async {
          requests.add(r);
          return fixture.jsonResponse(draft(), 201);
        }),
      );
      await controller.analyze(text: 'Synthetic text', locale: 'ru');
      expect(controller.error, isNull);
      expect(controller.draft!['received_minor'], isNull);
      expect(requests, hasLength(1));
      expect(
        requests.single.url.path,
        '/api/v1/businesses/${fixture.business}/drafts',
      );
      expect(
        requests.single.headers['Content-Type'],
        startsWith('multipart/form-data; boundary='),
      );
      expect(requests.single.body, contains('name="text"'));
      expect(requests.single.body, isNot(contains('name="audio"')));
      controller.dispose();
    },
  );
  test(
    'cancel or changed source discards late AI response without a paid retry',
    () async {
      final ready = Completer<void>();
      final response = Completer<http.Response>();
      var count = 0;
      final controller = CrmDrafts(
        api,
        api.scope(fixture.business),
        clientFactory: () => MockClient((_) {
          count++;
          ready.complete();
          return response.future;
        }),
      );
      final task = controller.analyze(text: 'Old text', locale: 'kk');
      await ready.future;
      controller.invalidate();
      response.complete(fixture.jsonResponse(draft()));
      await task;
      expect(controller.draft, isNull);
      expect(controller.busy, isFalse);
      expect(count, 1);
      controller.dispose();
    },
  );
  test(
    'A to B to A rejects late extraction; failed extraction never retries',
    () async {
      final ready = Completer<void>();
      final response = Completer<http.Response>();
      var calls = 0;
      final controller = CrmDrafts(
        api,
        api.scope(fixture.business),
        clientFactory: () => MockClient((_) {
          calls++;
          ready.complete();
          return response.future;
        }),
      );
      final task = controller.analyze(text: 'Fixture', locale: 'ru');
      await ready.future;
      account = 'b';
      epoch++;
      account = fixture.owner;
      epoch++;
      controller.invalidate();
      response.complete(fixture.jsonResponse(draft()));
      await task;
      expect(controller.draft, isNull);
      expect(calls, 1);
      controller.dispose();
      final failed = CrmDrafts(
        api,
        api.scope(fixture.business),
        clientFactory: () => MockClient((_) async {
          calls++;
          return fixture.jsonResponse({}, 503);
        }),
      );
      await failed.analyze(text: 'Fixture', locale: 'ru');
      expect(failed.error, isNotNull);
      expect(calls, 2);
      failed.dispose();
    },
  );
  test(
    'wav header, actual duration and size are validated, not just extension',
    () {
      expect(validateVoiceWav(wav()), 1);
      expect(validateVoiceWav(wav(30)), 30);
      expect(
        () => validateVoiceWav(wav(31)),
        throwsA(fixture.failure('AUDIO_INVALID')),
      );
      final invalid = wav();
      invalid[0] = 0;
      expect(
        () => validateVoiceWav(invalid),
        throwsA(fixture.failure('AUDIO_INVALID')),
      );
      expect(
        () => validateVoiceWav(Uint8List(8 * 1024 * 1024 + 1)),
        throwsA(fixture.failure('AUDIO_INVALID')),
      );
      expect(
        () => validateDraft({...draft(), 'received_minor': 1.5}),
        throwsA(fixture.failure('INVALID_RESPONSE')),
      );
    },
  );
  test(
    'permission denied does not record; stop only produces local preview; cancel removes',
    () async {
      final recorder = FakeRecorder()..allowed = false;
      final removed = <String>[];
      final voice = VoiceCapture(
        recorder: recorder,
        createPath: () async => '/synthetic/audio.wav',
        read: (_) async => wav(),
        remove: (path) async {
          removed.add(path);
        },
      );
      await voice.start();
      expect(recorder.starts, 0);
      expect(voice.error, isNotNull);
      recorder.allowed = true;
      await voice.start();
      expect(voice.recording, isTrue);
      await voice.stop();
      expect(recorder.stops, 1);
      expect(voice.duration, 1);
      expect(voice.recording, isFalse);
      expect(await voice.bytes(), wav());
      await voice.cancel();
      expect(voice.path, isNull);
      expect(removed, contains('/synthetic/audio.wav'));
      voice.dispose();
    },
  );
  test(
    'cancel during permission request cannot start microphone afterward',
    () async {
      final recorder = FakeRecorder()..permissionResult = Completer<bool>();
      final voice = VoiceCapture(
        recorder: recorder,
        createPath: () async => '/synthetic/audio.wav',
        read: (_) async => wav(),
        remove: (_) async {},
      );
      final starting = voice.start();
      final cancelling = voice.cancel();
      recorder.permissionResult!.complete(true);
      await starting;
      await cancelling;
      expect(recorder.starts, 0);
      expect(voice.recording, isFalse);
      expect(voice.path, isNull);
      voice.dispose();
    },
  );
  test(
    'analytics accepts signed receipts and null average, rejects mismatched aggregation',
    () {
      final value = <String, dynamic>{
        'business_id': fixture.business,
        'days': 7,
        'timezone': 'Asia/Almaty',
        'currency': 'KZT',
        'today_incomplete': true,
        'as_of': '2026-10-17T05:00:00Z',
        'period_from': '2026-10-11',
        'period_to': '2026-10-17',
        'cards': {
          'sales_minor': 0,
          'receipts_minor': -50,
          'sales_count': 0,
          'average_ticket_minor': null,
          'outstanding_minor': 1500,
          'debtors_count': 1,
        },
        'daily': List.generate(
          7,
          (i) => {
            'date': '2026-10-${11 + i}',
            'sales_minor': 0,
            'receipts_minor': i == 6 ? -50 : 0,
            'sales_count': 0,
            'is_partial': i == 6,
          },
        ),
        'hourly': List.generate(24, (i) => {'hour': i, 'sales_count': 0}),
      };
      validateAnalytics(value, fixture.business, 7);
      value['cards']['receipts_minor'] = 0;
      expect(
        () => validateAnalytics(value, fixture.business, 7),
        throwsA(fixture.failure('INVALID_RESPONSE')),
      );
    },
  );
}
