import 'dart:convert';
import 'dart:io';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:qadam_mobile/data/livestock_api.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late Directory directory;
  late SecurePendingStore store;
  const key = '983aaac7-b41d-4af6-9c77-c24ff6adc0db';

  setUp(() async {
    // Only the platform key-value adapter is mocked. AES-GCM and file I/O run
    // normally; this does not claim a physical Android Keystore test.
    FlutterSecureStorage.setMockInitialValues({});
    directory = await Directory.systemTemp.createTemp('qadam-pending-test-');
    store = SecurePendingStore(supportDirectory: () async => directory);
  });
  tearDown(() async => directory.delete(recursive: true));

  Future<PendingIntent> snapshot(List<int> bytes) async {
    final source = File('${directory.path}/camera.jpg');
    await source.writeAsBytes(bytes);
    final snapshotPath = await store.snapshotPhoto('account-a', key, source.path);
    final pending = PendingIntent(
      accountId: 'account-a',
      key: key,
      method: 'POST',
      path: '/livestock/photos',
      url: 'https://api.example.test/api/v1/livestock/photos',
      body: {},
      kind: 'upload',
      filePath: snapshotPath,
    );
    await store.write('account-a', pending);
    return pending;
  }

  test('durable snapshot is encrypted, immutable and restored after reopen', () async {
    final bytes = utf8.encode('private-photo-sensitive-bytes-${List.filled(100, 'x').join()}');
    final pending = await snapshot(bytes);
    final encrypted = await File(pending.filePath!).readAsBytes();
    expect(encrypted, isNot(bytes));
    expect(utf8.decode(encrypted, allowMalformed: true),
        isNot(contains('private-photo-sensitive-bytes')));
    expect(encrypted.length, bytes.length + 28);
    await File('${directory.path}/camera.jpg').delete();

    store = SecurePendingStore(supportDirectory: () async => directory);
    final restored = (await store.read('account-a'))!;
    expect(await store.readPhoto(restored), bytes);
    expect(await store.read('account-b'), isNull);
    await store.delete('account-a');
    expect(await store.read('account-a'), isNull);
    expect(await File(pending.filePath!).exists(), isFalse);
  });

  test('authenticated encryption rejects changed snapshot bytes', () async {
    final pending = await snapshot(List.generate(500, (index) => index % 256));
    final file = File(pending.filePath!);
    final encrypted = await file.readAsBytes();
    encrypted[20] ^= 1;
    await file.writeAsBytes(encrypted);
    await expectLater(store.readPhoto(pending),
        throwsA(isA<ApiFailure>().having((e) => e.code, 'code', 'PENDING_PHOTO_UNAVAILABLE')));
    expect(await store.read('account-a'), isNotNull);
  });

  test('larger than eight MiB is rejected before encryption and upload', () async {
    final source = File('${directory.path}/large.jpg');
    final handle = await source.open(mode: FileMode.write);
    await handle.truncate(maxPhotoBytes + 1);
    await handle.close();
    await expectLater(store.snapshotPhoto('account-a', key, source.path),
        throwsA(isA<ApiFailure>().having((e) => e.code, 'code', 'PHOTO_TOO_LARGE')));
    expect(await store.read('account-a'), isNull);
  });

  test('pending body and response are copied rather than mutable references', () {
    final original = <String, dynamic>{'photo_ids': ['photo-a']};
    final pending = PendingIntent(
      accountId: 'account-a', key: key, method: 'POST',
      path: '/livestock/listings',
      url: 'https://api.example.test/api/v1/livestock/listings', body: original,
    );
    (original['photo_ids'] as List).clear();
    (pending.body['photo_ids'] as List).clear();
    final response = <String, dynamic>{'id': 'listing-a'};
    final completed = pending.withReceipt(response);
    response['id'] = 'listing-b';
    completed.completedResponse!['id'] = 'listing-c';
    expect(completed.body['photo_ids'], ['photo-a']);
    expect(completed.completedResponse!['id'], 'listing-a');
    final restored = PendingIntent.fromJson(completed.toJson());
    expect(restored.bodyJson, pending.bodyJson);
    expect(restored.completedResponse!['id'], 'listing-a');
  });
}
