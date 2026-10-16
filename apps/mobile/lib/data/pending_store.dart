import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:cryptography/cryptography.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:path_provider/path_provider.dart';

import 'api_failure.dart';

const maxPhotoBytes = 8 * 1024 * 1024;

/// The original operation and, after a confirmed response, its durable receipt.
/// A receipt is removed only when the UI acknowledges that it has applied it.
class PendingIntent {
  PendingIntent({
    required this.accountId,
    required this.key,
    required this.method,
    required this.path,
    required this.url,
    required Map<String, dynamic> body,
    this.kind = 'json',
    this.filePath,
  }) : bodyJson = jsonEncode(body),
       _responseJson = null;

  const PendingIntent._({
    required this.accountId,
    required this.key,
    required this.method,
    required this.path,
    required this.url,
    required this.bodyJson,
    required this.kind,
    required this.filePath,
    required String? responseJson,
  }) : _responseJson = responseJson;

  final String accountId;
  final String key;
  final String method;
  final String path;
  final String url;
  final String kind;
  final String? filePath;
  final String bodyJson;
  final String? _responseJson;

  // Return fresh objects so callers cannot mutate the persisted request.
  Map<String, dynamic> get body =>
      Map<String, dynamic>.from(jsonDecode(bodyJson) as Map);
  Map<String, dynamic>? get completedResponse => _responseJson == null
      ? null
      : Map<String, dynamic>.from(jsonDecode(_responseJson) as Map);

  PendingIntent withReceipt(Map<String, dynamic> response) => PendingIntent._(
    accountId: accountId,
    key: key,
    method: method,
    path: path,
    url: url,
    bodyJson: bodyJson,
    kind: kind,
    filePath: filePath,
    responseJson: jsonEncode(response),
  );

  Map<String, dynamic> toJson() => {
    'version': 1,
    'accountId': accountId,
    'key': key,
    'method': method,
    'path': path,
    'url': url,
    'bodyJson': bodyJson,
    'kind': kind,
    'filePath': filePath,
    'responseJson': _responseJson,
  };

  factory PendingIntent.fromJson(Map<String, dynamic> json) {
    if (json['version'] != 1 ||
        !const ['json', 'upload'].contains(json['kind'])) {
      throw const FormatException('Unsupported pending data');
    }
    final pending = PendingIntent._(
      accountId: json['accountId'] as String,
      key: json['key'] as String,
      method: json['method'] as String,
      path: json['path'] as String,
      url: json['url'] as String,
      bodyJson: json['bodyJson'] as String,
      kind: json['kind'] as String,
      filePath: json['filePath'] as String?,
      responseJson: json['responseJson'] as String?,
    );
    if (!RegExp(
      r'^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$',
    ).hasMatch(pending.key)) {
      throw const FormatException('Invalid pending key');
    }
    // Validate JSON now; do not silently discard unrecoverable operations.
    pending.body;
    pending.completedResponse;
    return pending;
  }
}

abstract class PendingStore {
  Future<PendingIntent?> read(String accountId);
  Future<void> write(String accountId, PendingIntent intent);
  Future<void> delete(String accountId);

  /// Store an immutable private snapshot before its first network request.
  Future<String> snapshotPhoto(String accountId, String key, String sourcePath);
  Future<Uint8List> readPhoto(PendingIntent intent);
}

/// Pending metadata and snapshot keys use Android Keystore-backed storage.
/// Large photo bytes are AES-GCM encrypted in the private app support folder,
/// rather than inserted as megabytes of base64 in secure preferences.
class SecurePendingStore implements PendingStore {
  SecurePendingStore({
    FlutterSecureStorage? storage,
    Future<Directory> Function()? supportDirectory,
  }) : _storage = storage ?? const FlutterSecureStorage(),
       _supportDirectory = supportDirectory ?? getApplicationSupportDirectory;

  final FlutterSecureStorage _storage;
  final Future<Directory> Function() _supportDirectory;
  final _cipher = AesGcm.with256bits();

  String _recordKey(String accountId) =>
      'livestock.pending.v1.${base64Url.encode(utf8.encode(accountId))}';
  String _photoKey(String key) => 'livestock.photo.v1.$key';

  Future<File> _photoFile(String key) async {
    if (!RegExp(
      r'^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$',
    ).hasMatch(key)) {
      throw const ApiFailure('PENDING_DATA_UNREADABLE', uncertain: true);
    }
    final support = await _supportDirectory();
    final directory = Directory('${support.path}/livestock_pending');
    await directory.create(recursive: true);
    return File('${directory.path}/$key.bin');
  }

  @override
  Future<PendingIntent?> read(String accountId) async {
    try {
      final raw = await _storage.read(key: _recordKey(accountId));
      if (raw == null) return null;
      final intent = PendingIntent.fromJson(
        Map<String, dynamic>.from(jsonDecode(raw) as Map),
      );
      if (intent.accountId != accountId) {
        throw const FormatException('Account mismatch');
      }
      return intent;
    } catch (_) {
      throw const ApiFailure('PENDING_DATA_UNREADABLE', uncertain: true);
    }
  }

  @override
  Future<void> write(String accountId, PendingIntent intent) async {
    if (intent.accountId != accountId) {
      throw const ApiFailure('ACCOUNT_CHANGED', uncertain: true);
    }
    try {
      await _storage.write(
        key: _recordKey(accountId),
        value: jsonEncode(intent.toJson()),
      );
    } catch (_) {
      throw const ApiFailure('LOCAL_STORAGE_FAILED', uncertain: true);
    }
  }

  @override
  Future<void> delete(String accountId) async {
    final intent = await read(accountId);
    try {
      await _storage.delete(key: _recordKey(accountId));
    } catch (_) {
      throw const ApiFailure('LOCAL_STORAGE_FAILED', uncertain: true);
    }
    if (intent?.kind == 'upload') {
      // Metadata deletion is authoritative. An interrupted cleanup leaves an
      // encrypted orphan, never a plaintext photo or a replayable operation.
      try {
        await _storage.delete(key: _photoKey(intent!.key));
        final file = await _photoFile(intent.key);
        if (await file.exists()) await file.delete();
      } catch (_) {
        // Cleanup can be retried operationally; do not repeat a confirmed write.
      }
    }
  }

  @override
  Future<String> snapshotPhoto(
    String accountId,
    String key,
    String sourcePath,
  ) async {
    try {
      final source = File(sourcePath);
      final length = await source.length();
      if (length == 0 || length > maxPhotoBytes) {
        throw ApiFailure(length == 0 ? 'INVALID_PHOTO' : 'PHOTO_TOO_LARGE');
      }
      final bytes = await source.readAsBytes();
      if (bytes.isEmpty || bytes.length > maxPhotoBytes) {
        throw ApiFailure(bytes.isEmpty ? 'INVALID_PHOTO' : 'PHOTO_TOO_LARGE');
      }
      final secret = await _cipher.newSecretKey();
      final box = await _cipher.encrypt(bytes, secretKey: secret);
      final file = await _photoFile(key);
      final temporary = File('${file.path}.tmp');
      await temporary.writeAsBytes(box.concatenation(), flush: true);
      await _storage.write(
        key: _photoKey(key),
        value: base64Encode(await secret.extractBytes()),
      );
      await temporary.rename(file.path);
      return file.path;
    } on ApiFailure {
      rethrow;
    } catch (_) {
      throw const ApiFailure('PHOTO_STORAGE_FAILED');
    }
  }

  @override
  Future<Uint8List> readPhoto(PendingIntent intent) async {
    try {
      final encodedKey = await _storage.read(key: _photoKey(intent.key));
      if (encodedKey == null) throw const FormatException('No photo key');
      final file = await _photoFile(intent.key);
      final encrypted = await file.readAsBytes();
      if (encrypted.length > maxPhotoBytes + 28) {
        throw const FormatException('Invalid photo length');
      }
      final box = SecretBox.fromConcatenation(
        encrypted,
        nonceLength: 12,
        macLength: 16,
      );
      final bytes = await _cipher.decrypt(
        box,
        secretKey: SecretKey(base64Decode(encodedKey)),
      );
      return Uint8List.fromList(bytes);
    } catch (_) {
      throw const ApiFailure('PENDING_PHOTO_UNAVAILABLE', uncertain: true);
    }
  }
}
