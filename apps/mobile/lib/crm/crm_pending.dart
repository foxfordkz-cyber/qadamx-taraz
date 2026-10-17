import 'dart:async';
import 'dart:convert';

import 'package:cryptography/cryptography.dart';
import 'package:uuid/uuid.dart';

import '../data/api_failure.dart';
import '../secure_storage.dart';
import 'crm_models.dart';

abstract class CrmVault {
  Future<String?> read(String key);
  Future<void> write(String key, String value);
  Future<void> remove(String key);
}

class SecureCrmVault implements CrmVault {
  @override
  Future<String?> read(String key) => mobileSecureStorage.read(key: key);
  @override
  Future<void> write(String key, String value) =>
      mobileSecureStorage.write(key: key, value: value);
  @override
  Future<void> remove(String key) => mobileSecureStorage.delete(key: key);
}

class CrmIntent {
  CrmIntent(this.slot, this.key, CrmJson body, {CrmJson? receipt})
    : bodyJson = jsonEncode(body),
      receiptJson = receipt == null ? null : jsonEncode(receipt);
  final String slot;
  final String key;
  final String bodyJson;
  final String? receiptJson;
  CrmJson get body => crmObject(jsonDecode(bodyJson));
  CrmJson? get receipt =>
      receiptJson == null ? null : crmObject(jsonDecode(receiptJson!));
  bool same(CrmIntent? other) =>
      other != null &&
      slot == other.slot &&
      key == other.key &&
      bodyJson == other.bodyJson;
  CrmJson toJson() => {
    'version': 1,
    'slot': slot,
    'key': key,
    'body': body,
    'receipt': receipt,
  };
  factory CrmIntent.parse(String text, String slot) {
    final value = crmObject(jsonDecode(text));
    if (value['version'] != 1 ||
        value['slot'] != slot ||
        value['key'] is! String ||
        !crmUuid.hasMatch(value['key'] as String)) {
      throw const ApiFailure('PENDING_UNAVAILABLE');
    }
    return CrmIntent(
      slot,
      value['key'] as String,
      crmObject(value['body']),
      receipt: value['receipt'] == null ? null : crmObject(value['receipt']),
    );
  }
}

/// One pending action per environment/account/business/kind. Data is protected
/// by Keystore/Keychain; no passwords, bearer tokens or audio are persisted here.
class CrmPending {
  CrmPending(this.vault);
  final CrmVault vault;
  static final Map<String, Future<void>> _locks = {};
  Future<String> _key(String slot) async {
    final digest = await Sha256().hash(utf8.encode(slot));
    return 'qadam.crm.${digest.bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join()}';
  }

  Future<T> _locked<T>(
    String slot,
    Future<T> Function(String key) action,
  ) async {
    final key = await _key(slot);
    final previous = _locks[key] ?? Future<void>.value();
    final release = Completer<void>();
    _locks[key] = release.future;
    await previous;
    try {
      return await action(key);
    } on ApiFailure {
      rethrow;
    } catch (_) {
      throw const ApiFailure('PENDING_UNAVAILABLE', uncertain: true);
    } finally {
      release.complete();
      if (identical(_locks[key], release.future)) _locks.remove(key);
    }
  }

  Future<CrmIntent?> _read(String key, String slot) async {
    final raw = await vault.read(key);
    return raw == null ? null : CrmIntent.parse(raw, slot);
  }

  Future<CrmIntent?> load(CrmScope scope, String action) {
    final slot = scope.slot(action);
    return _locked(slot, (key) => _read(key, slot));
  }

  Future<CrmIntent> begin(CrmScope scope, String action, CrmJson body) {
    final slot = scope.slot(action);
    return _locked(slot, (key) async {
      if (await _read(key, slot) != null) {
        throw const ApiFailure('PENDING_EXISTS', uncertain: true);
      }
      final value = CrmIntent(slot, const Uuid().v4(), body);
      await vault.write(key, jsonEncode(value.toJson()));
      return value;
    });
  }

  Future<CrmIntent> complete(CrmIntent intent, CrmJson response) =>
      _locked(intent.slot, (key) async {
        final current = await _read(key, intent.slot);
        if (!intent.same(current)) {
          throw const ApiFailure('PENDING_CHANGED', uncertain: true);
        }
        final updated = CrmIntent(
          intent.slot,
          intent.key,
          intent.body,
          receipt: response,
        );
        await vault.write(key, jsonEncode(updated.toJson()));
        return updated;
      });

  /// A late K1 result cannot remove a new K2 intent, even within the same scope.
  Future<bool> acknowledge(CrmIntent intent) =>
      _locked(intent.slot, (key) async {
        final current = await _read(key, intent.slot);
        if (!intent.same(current) || current!.receipt == null) return false;
        await vault.remove(key);
        return true;
      });
}
