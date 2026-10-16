import 'dart:async';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// A test seam around the existing Supabase session, not a second auth service.
abstract class AuthGateway {
  String? get accountId;
  Stream<String?> get accountChanges;
  Future<String?> accessToken();
  Future<void> signIn(String email, String password);
  Future<void> signOut();
}

class SupabaseAuthGateway implements AuthGateway {
  SupabaseAuthGateway(this.client) {
    _observedOwner = accountId;
    _identityEvents = client.auth.onAuthStateChange.listen(
      (state) => _observeOwner(state.session?.user.id),
      onError: (Object _) {},
    );
  }
  final SupabaseClient client;
  Future<AuthResponse>? _refresh;
  String? _refreshOwner;
  int? _refreshGeneration;
  String? _observedOwner;
  int _generation = 0;
  late final StreamSubscription<AuthState> _identityEvents;

  void _observeOwner(String? owner) {
    if (_observedOwner != owner) {
      _observedOwner = owner;
      _generation++;
    }
  }

  void close() => unawaited(_identityEvents.cancel());

  @override
  String? get accountId => client.auth.currentUser?.id;

  @override
  Stream<String?> get accountChanges => client.auth.onAuthStateChange.map(
    (state) => state.session?.user.id,
  );

  @override
  Future<String?> accessToken() async {
    _observeOwner(accountId);
    final owner = accountId;
    final generation = _generation;
    final session = client.auth.currentSession;
    if (session == null || session.user.id != owner) return null;
    if (!session.isExpired) return session.accessToken;
    // The SDK performs refresh and persists the new session. Coalesce callers.
    if (_refresh == null ||
        _refreshOwner != owner ||
        _refreshGeneration != generation) {
      _refreshOwner = owner;
      _refreshGeneration = generation;
      _refresh = client.auth.refreshSession();
    }
    final refresh = _refresh!;
    try {
      final result = await refresh;
      _observeOwner(accountId);
      if (_generation != generation || accountId != owner ||
          result.session?.user.id != owner) {
        return null;
      }
      return result.session?.accessToken;
    } finally {
      if (identical(_refresh, refresh)) _refresh = null;
    }
  }

  @override
  Future<void> signIn(String email, String password) async {
    await client.auth.signInWithPassword(email: email, password: password);
  }

  @override
  Future<void> signOut() => client.auth.signOut(scope: SignOutScope.local);
}

/// Supabase owns serialization, restoration, and refresh. This only replaces
/// its persistence medium with Android Keystore protected storage.
class SecureSessionStorage extends LocalStorage {
  const SecureSessionStorage();
  static const _storage = FlutterSecureStorage();
  static const _key = 'qadam.supabase.session.v1';

  @override
  Future<void> initialize() async {}
  @override
  Future<String?> accessToken() => _storage.read(key: _key);
  @override
  Future<bool> hasAccessToken() => _storage.containsKey(key: _key);
  @override
  Future<void> persistSession(String persistSessionString) =>
      _storage.write(key: _key, value: persistSessionString);
  @override
  Future<void> removePersistedSession() => _storage.delete(key: _key);
}
