import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/painting.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'auth.dart';
import 'config.dart';
import 'data/livestock_api.dart';
import 'data/account_api.dart';

class SessionFailure implements Exception {
  const SessionFailure(this.code);
  final String code;
  @override
  String toString() => code;
}

class MobileRuntime extends ChangeNotifier {
  MobileRuntime({
    AppConfig config = const AppConfig(),
    AuthGateway? auth,
    LivestockApi? api,
    AccountApi? accountApi,
    String? initializationError,
  }) : _config = config,
       _auth = auth,
       _api = api,
       _accountApi = accountApi,
       _initializationError = initializationError,
       _accountId = auth?.accountId {
    if (_api == null && config.apiUri != null) {
      _api = LivestockApi(
        baseUrl: config.apiUri!,
        accountId: () => accountId,
        accessToken: () async => _auth?.accessToken(),
        store: SecurePendingStore(),
      );
    }
    if (_accountApi == null && config.apiUri != null) {
      _accountApi = AccountApi(
        baseUrl: config.apiUri!,
        accountId: () => accountId,
        epoch: () => epoch,
        accessToken: () async => _auth?.accessToken(),
      );
    }
    _subscription = auth?.accountChanges.listen(
      _changeIdentity,
      // A temporary refresh outage must not log a token or destroy the draft.
      onError: (Object _) {},
    );
  }

  static Future<MobileRuntime> create(AppConfig config) async {
    AuthGateway? auth;
    String? initializationError;
    if (config.authConfigured) {
      try {
        await Supabase.initialize(
          url: config.supabaseUrl,
          publishableKey: config.supabasePublishableKey,
          debug: false,
          authOptions: const FlutterAuthClientOptions(
            localStorage: SecureSessionStorage(),
          ),
        );
        auth = SupabaseAuthGateway(Supabase.instance.client);
      } catch (_) {
        initializationError = 'AUTH_INITIALIZATION_FAILED';
      }
    }
    return MobileRuntime(
      config: config,
      auth: auth,
      initializationError: initializationError,
    );
  }

  final AppConfig _config;
  final AuthGateway? _auth;
  final String? _initializationError;
  LivestockApi? _api;
  AccountApi? _accountApi;
  StreamSubscription<String?>? _subscription;
  String? _accountId;
  int _epoch = 0;
  bool _authBusy = false;
  bool _disposed = false;

  LivestockApi? get api => _api;
  AccountApi? get accountApi => _accountApi;
  String get frontendBaseUrl => _config.frontendBaseUrl;
  bool get configured => _api != null;
  bool get authConfigured => _auth != null;
  // Read the SDK identity synchronously; its stream may deliver a transition
  // later. This keeps form guards and transport ownership aligned meanwhile.
  String? get accountId => _auth != null ? _auth.accountId : _accountId;
  int get epoch => _epoch;
  String? get configurationError => _config.errorCode ?? _initializationError;

  void _changeIdentity(String? account) {
    if (_disposed || _accountId == account) return;
    _accountId = account;
    _epoch++;
    _api?.notifyAccountChanged();
    // Image.memory may have entered Flutter's in-memory decoder cache.
    PaintingBinding.instance.imageCache.clear();
    PaintingBinding.instance.imageCache.clearLiveImages();
    notifyListeners();
  }

  Future<void> signIn(String email, String password) async {
    if (_auth == null) throw const SessionFailure('AUTH_NOT_CONFIGURED');
    if (_authBusy) throw const SessionFailure('AUTH_BUSY');
    _authBusy = true;
    try {
      await _auth.signIn(email.trim(), password);
      _changeIdentity(_auth.accountId);
    } on AuthException catch (error) {
      throw SessionFailure(
        error.code == 'invalid_credentials'
            ? 'AUTH_INVALID_CREDENTIALS'
            : 'AUTH_UNAVAILABLE',
      );
    } catch (_) {
      throw const SessionFailure('AUTH_UNAVAILABLE');
    } finally {
      _authBusy = false;
    }
  }

  Future<void> signOut() async {
    if (_auth == null) return;
    if (_authBusy) throw const SessionFailure('AUTH_BUSY');
    _authBusy = true;
    try {
      await _auth.signOut();
      _changeIdentity(null);
    } catch (_) {
      // Do not claim logout if the SDK could not complete it.
      _changeIdentity(_auth.accountId);
      throw const SessionFailure('AUTH_UNAVAILABLE');
    } finally {
      _authBusy = false;
    }
  }

  @override
  void dispose() {
    _disposed = true;
    unawaited(_subscription?.cancel());
    _api?.close();
    _accountApi?.close();
    if (_auth is SupabaseAuthGateway) _auth.close();
    super.dispose();
  }
}
