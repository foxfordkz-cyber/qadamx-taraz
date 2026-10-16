import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';

import 'api_failure.dart';
import 'pending_store.dart';
import 'response_validation.dart';

export 'api_failure.dart';
export 'pending_store.dart';

class _Session {
  const _Session(this.accountId, this.generation);
  final String accountId;
  final int generation;
}

/// Live FastAPI transport. No automatic fallback, synthetic data or automatic
/// replay is used. A pending intent always belongs to one Supabase account.
class LivestockApi {
  LivestockApi({
    required Uri baseUrl,
    required String? Function() accountId,
    required Future<String?> Function() accessToken,
    required PendingStore store,
    http.Client? client,
    Duration timeout = const Duration(seconds: 30),
  }) : _baseUrl = baseUrl,
       _accountId = accountId,
       _accessToken = accessToken,
       _store = store,
       _client = client ?? http.Client(),
       _timeout = timeout {
    if (!const ['http', 'https'].contains(baseUrl.scheme) ||
        baseUrl.host.isEmpty ||
        baseUrl.userInfo.isNotEmpty ||
        baseUrl.hasQuery ||
        baseUrl.hasFragment ||
        !RegExp(r'^/api/v1/?$').hasMatch(baseUrl.path)) {
      throw const ApiFailure('INVALID_API_URL');
    }
    _observedAccount = _accountId();
  }

  final Uri _baseUrl;
  final String? Function() _accountId;
  final Future<String?> Function() _accessToken;
  final PendingStore _store;
  final http.Client _client;
  final Duration _timeout;
  String? _observedAccount;
  int _generation = 0;
  bool _busy = false;
  String? _deliveredKey;
  _Session? _deliveredSession;

  /// The auth owner calls this synchronously on every identity transition,
  /// including sign-out. This fences an A -> B -> A change between awaits.
  void notifyAccountChanged() {
    _observedAccount = _accountId();
    _generation++;
    _deliveredKey = null;
    _deliveredSession = null;
  }

  void close() => _client.close();

  void _observeAccount() {
    if (_observedAccount != _accountId()) notifyAccountChanged();
  }

  _Session _capture() {
    _observeAccount();
    final id = _observedAccount;
    if (id == null || id.isEmpty) throw const ApiFailure('AUTH_REQUIRED');
    return _Session(id, _generation);
  }

  void _check(_Session session) {
    _observeAccount();
    if (session.generation != _generation ||
        session.accountId != _observedAccount) {
      throw const ApiFailure('ACCOUNT_CHANGED', uncertain: true);
    }
  }

  Uri _resolve(String path, {Map<String, String>? query}) {
    final relative = Uri.tryParse(path);
    if (relative == null ||
        relative.hasScheme ||
        relative.hasAuthority ||
        relative.hasQuery ||
        relative.hasFragment ||
        path.contains('\\') ||
        path.contains('%') ||
        relative.pathSegments.any((part) => part == '..' || part == '.')) {
      throw const ApiFailure('INVALID_API_PATH');
    }
    final fullPath = path.startsWith('/api/v1/livestock/')
        ? path
        : path.startsWith('/livestock/')
        ? '/api/v1$path'
        : null;
    if (fullPath == null) throw const ApiFailure('INVALID_API_PATH');
    return _baseUrl.replace(path: fullPath, queryParameters: query);
  }

  Future<String> _token(_Session session) async {
    final String? token;
    try {
      token = await _accessToken();
    } catch (_) {
      _check(session);
      throw const ApiFailure('AUTH_UNAVAILABLE', uncertain: true);
    }
    _check(session);
    if (token == null || token.isEmpty) throw const ApiFailure('AUTH_REQUIRED');
    return token;
  }

  Future<http.Response> _sendRequest(
    http.BaseRequest request, {
    _Session? session,
  }) async {
    request.followRedirects = false;
    request.headers['Accept'] = request.headers['Accept'] ?? 'application/json';
    if (session != null) {
      // Resolve accepts only relative contract paths. Redirects are disabled,
      // so credentials can never be forwarded to a server-selected origin.
      request.headers['Authorization'] = 'Bearer ${await _token(session)}';
      _check(session);
    }
    try {
      final response = await _client
          .send(request)
          .then(http.Response.fromStream)
          .timeout(_timeout);
      if (session != null) _check(session);
      return response;
    } on ApiFailure {
      rethrow;
    } on TimeoutException {
      if (session != null) _check(session);
      throw const ApiFailure('NETWORK_TIMEOUT', uncertain: true);
    } catch (_) {
      if (session != null) _check(session);
      throw const ApiFailure('NETWORK_UNAVAILABLE', uncertain: true);
    }
  }

  Map<String, dynamic> _decode(http.Response response) {
    try {
      final value = jsonDecode(utf8.decode(response.bodyBytes));
      if (value is! Map<String, dynamic>) {
        throw const FormatException('Expected JSON object');
      }
      return value;
    } catch (_) {
      throw const ApiFailure('INVALID_RESPONSE', uncertain: true);
    }
  }

  ApiFailure? _responseFailure(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) return null;
    final uncertain = response.statusCode >= 500 ||
        response.statusCode == 401 ||
        response.statusCode == 408 ||
        response.statusCode < 400;
    String? code;
    try {
      final body = _decode(response);
      final error = body['error'];
      if (error is Map) {
        final candidate = error['code'];
        if (candidate is String &&
            RegExp(r'^[A-Z][A-Z0-9_]{0,63}$').hasMatch(candidate)) {
          code = candidate;
        }
      }
    } on ApiFailure {
      // An HTTP error remains an error even if its body is malformed HTML.
    }
    return ApiFailure(
      code ??
          switch (response.statusCode) {
            401 => 'AUTH_REQUIRED',
            404 => 'NOT_FOUND',
            429 => 'RATE_LIMITED',
            >= 500 => 'SERVER_UNAVAILABLE',
            _ => 'REQUEST_REJECTED',
          },
      uncertain: uncertain || code == 'IDEMPOTENCY_CONFLICT',
      statusCode: response.statusCode,
    );
  }

  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, String>? query,
    bool authenticated = false,
  }) async {
    final uri = _resolve(path, query: query);
    final session = authenticated ? _capture() : null;
    final response = await _sendRequest(
      http.Request('GET', uri),
      session: session,
    );
    final failure = _responseFailure(response);
    if (failure != null) throw failure;
    final value = _decode(response);
    validateLivestockResponse('GET', path, value);
    return value;
  }

  /// Public paths already include /api/v1. Private photos always use the
  /// owner's /livestock/me/photos/{id} route and an SDK-provided bearer token.
  Future<Uint8List> photoBytes(
    String path, {
    bool authenticated = false,
  }) async {
    final uri = _resolve(path);
    final session = authenticated ? _capture() : null;
    final request = http.Request('GET', uri);
    request.headers['Accept'] = 'image/jpeg';
    final response = await _sendRequest(request, session: session);
    final failure = _responseFailure(response);
    if (failure != null) throw failure;
    if (!(response.headers['content-type'] ?? '').startsWith('image/jpeg')) {
      throw const ApiFailure('INVALID_PHOTO_RESPONSE');
    }
    return response.bodyBytes;
  }

  Future<T> _exclusive<T>(Future<T> Function() operation) async {
    if (_busy) throw const ApiFailure('REQUEST_IN_PROGRESS');
    _busy = true;
    try {
      return await operation();
    } finally {
      _busy = false;
    }
  }

  Future<PendingIntent?> _readPending(_Session session) async {
    final pending = await _store.read(session.accountId);
    _check(session);
    if (pending != null && pending.accountId != session.accountId) {
      throw const ApiFailure('ACCOUNT_CHANGED', uncertain: true);
    }
    return pending;
  }

  Future<PendingIntent?> loadPending() async {
    _observeAccount();
    if (_observedAccount == null) return null;
    return _readPending(_capture());
  }

  void _validateMutation(String method, String path) {
    const uuid =
        r'[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
    final valid = method == 'POST' && path == '/livestock/listings' ||
        method == 'PUT' && RegExp('^/livestock/listings/$uuid\$').hasMatch(path) ||
        method == 'POST' &&
            RegExp('^/livestock/listings/$uuid/actions\$').hasMatch(path);
    if (!valid) throw const ApiFailure('INVALID_API_PATH');
  }

  Future<void> _requireNoPending(_Session session) async {
    final pending = await _readPending(session);
    if (pending != null) {
      throw ApiFailure(
        pending.completedResponse == null ? 'PENDING_OPERATION' : 'PENDING_RECEIPT',
        uncertain: pending.completedResponse == null,
      );
    }
  }

  Future<Map<String, dynamic>> mutate(
    String method,
    String path,
    Map<String, dynamic> body,
  ) => _exclusive(() async {
    _validateMutation(method, path);
    final url = _resolve(path);
    final session = _capture();
    // Snapshot synchronously, before a caller can edit the original form.
    final pending = PendingIntent(
      accountId: session.accountId,
      key: const Uuid().v4(),
      method: method,
      path: path,
      url: url.toString(),
      body: body,
    );
    await _requireNoPending(session);
    await _store.write(session.accountId, pending);
    _check(session);
    return _dispatch(pending, session);
  });

  Future<Map<String, dynamic>> uploadPhoto(String filePath) =>
      _exclusive(() async {
        final session = _capture();
        await _requireNoPending(session);
        final key = const Uuid().v4();
        final snapshot = await _store.snapshotPhoto(session.accountId, key, filePath);
        _check(session);
        const path = '/livestock/photos';
        final pending = PendingIntent(
          accountId: session.accountId,
          key: key,
          method: 'POST',
          path: path,
          url: _resolve(path).toString(),
          body: const {},
          kind: 'upload',
          filePath: snapshot,
        );
        await _store.write(session.accountId, pending);
        _check(session);
        return _dispatch(pending, session);
      });

  Future<Map<String, dynamic>> retryPending() => _exclusive(() async {
    final session = _capture();
    final pending = await _readPending(session);
    if (pending == null) throw const ApiFailure('NO_PENDING_OPERATION');
    return _dispatch(pending, session);
  });

  Future<Map<String, dynamic>> _dispatch(
    PendingIntent pending,
    _Session session,
  ) async {
    _check(session);
    if (pending.accountId != session.accountId) {
      throw const ApiFailure('ACCOUNT_CHANGED', uncertain: true);
    }
    final resolved = _resolve(pending.path);
    if (resolved.toString() != pending.url) {
      throw const ApiFailure('PENDING_ENVIRONMENT_CHANGED', uncertain: true);
    }
    final receipt = pending.completedResponse;
    if (receipt != null) {
      validateLivestockResponse(pending.method, pending.path, receipt);
      _deliveredKey = pending.key;
      _deliveredSession = session;
      return receipt;
    }

    final http.BaseRequest request;
    if (pending.kind == 'upload') {
      if (pending.method != 'POST' || pending.path != '/livestock/photos') {
        throw const ApiFailure('PENDING_DATA_UNREADABLE', uncertain: true);
      }
      final bytes = await _store.readPhoto(pending);
      _check(session);
      if (bytes.isEmpty || bytes.length > maxPhotoBytes) {
        throw const ApiFailure('PENDING_PHOTO_UNAVAILABLE', uncertain: true);
      }
      final multipart = http.MultipartRequest(pending.method, resolved);
      // The HTTP client creates Content-Type and boundary. The backend checks
      // actual bytes; a stable name avoids persisting a sensitive camera path.
      multipart.files.add(
        http.MultipartFile.fromBytes('file', bytes, filename: 'photo'),
      );
      request = multipart;
    } else {
      _validateMutation(pending.method, pending.path);
      request = http.Request(pending.method, resolved)
        ..headers['Content-Type'] = 'application/json; charset=utf-8'
        ..body = pending.bodyJson;
    }
    request.headers['Idempotency-Key'] = pending.key;
    final http.Response response;
    try {
      response = await _sendRequest(request, session: session);
    } on ApiFailure catch (failure) {
      // The intention is already durable. Even a missing/expired local session
      // must return the user to its original retry instead of a new key.
      throw ApiFailure(
        failure.code,
        uncertain: true,
        statusCode: failure.statusCode,
      );
    }
    _check(session);
    final failure = _responseFailure(response);
    if (failure != null) {
      if (!failure.uncertain) {
        await _store.delete(session.accountId);
        _check(session);
      }
      throw failure;
    }
    final decoded = _decode(response);
    validateLivestockResponse(pending.method, pending.path, decoded);
    // Persist the receipt before returning success. A crash or storage failure
    // can then only replay the original key, never generate a duplicate.
    await _store.write(session.accountId, pending.withReceipt(decoded));
    _check(session);
    _deliveredKey = pending.key;
    _deliveredSession = session;
    return decoded;
  }

  /// Call only after applying the confirmed result to UI/draft state. Supplying
  /// the key from loadPending additionally guards against a stale screen.
  Future<void> acknowledgePending({String? key}) => _exclusive(() async {
    final session = _capture();
    final delivered = _deliveredSession;
    if (delivered == null || _deliveredKey == null) {
      throw const ApiFailure('RECEIPT_NOT_DELIVERED');
    }
    _check(delivered);
    final pending = await _readPending(session);
    if (pending == null) return;
    if (pending.completedResponse == null ||
        pending.key != _deliveredKey ||
        key != null && key != pending.key) {
      throw const ApiFailure('RECEIPT_NOT_DELIVERED');
    }
    await _store.delete(session.accountId);
    _check(session);
    _deliveredKey = null;
    _deliveredSession = null;
  });
}
