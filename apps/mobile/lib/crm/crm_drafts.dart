import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

import '../data/api_failure.dart';
import 'crm_api.dart';
import 'crm_models.dart';

void validateDraft(CrmJson value) {
  crmId(value, 'id');
  crmString(value, 'transcript');
  if (!const ['sale', 'repayment', 'unknown'].contains(value['kind'])) throw const ApiFailure('INVALID_RESPONSE');
  for (final key in ['customer_query', 'description']) {
    if (value[key] != null) crmString(value, key);
  }
  for (final key in ['total_minor', 'received_minor', 'amount_minor']) {
    if (value[key] != null) {
      final n = crmInt(value, key, nonnegative: true);
      if (n > 10000000000 || (key != 'received_minor' && n == 0)) throw const ApiFailure('INVALID_RESPONSE');
    }
  }
  if (value['total_minor'] is int && value['received_minor'] is int && (value['received_minor'] as int) > (value['total_minor'] as int)) throw const ApiFailure('INVALID_RESPONSE');
  for (final key in ['missing_fields', 'questions']) {
    if (value[key] is! List || (value[key] as List).any((v) => v is! String)) throw const ApiFailure('INVALID_RESPONSE');
  }
  for (final key in ['customer_candidates', 'sale_candidates']) {
    if (value[key] is! List) throw const ApiFailure('INVALID_RESPONSE');
  }
  for (final raw in value['customer_candidates'] as List) {
    final item = crmObject(raw); crmId(item, 'id'); crmString(item, 'display_name');
    if (item['contact'] != null) crmString(item, 'contact');
  }
  for (final raw in value['sale_candidates'] as List) { validateOpenSale(crmObject(raw)); }
  final expires = DateTime.tryParse(crmString(value, 'expires_at'));
  if (expires == null || !expires.isUtc) throw const ApiFailure('INVALID_RESPONSE');
}

/// Generation fence plus transport cancellation: changed input, account or
/// navigation cannot make an old AI result current. No automatic paid retry.
class CrmDrafts extends ChangeNotifier {
  CrmDrafts(this.api, this.scope, {http.Client Function()? clientFactory,
    this.timeout = const Duration(seconds: 65)}) : clientFactory = clientFactory ?? http.Client.new;
  final CrmApi api;
  final CrmScope scope;
  final http.Client Function() clientFactory;
  final Duration timeout;
  http.Client? _client;
  int _revision = 0;
  bool _disposed = false;
  bool busy = false;
  CrmJson? draft;
  Object? error;
  bool _valid(int revision) => !_disposed && revision == _revision && api.current(scope);
  void invalidate() {
    _revision++;
    _client?.close(); _client = null;
    busy = false; draft = null; error = null;
    if (!_disposed) notifyListeners();
  }
  Future<void> analyze({String? text, Uint8List? wav, required String locale}) async {
    if (busy || _disposed) return;
    invalidate();
    final revision = _revision;
    if (!api.current(scope)) return;
    busy = true; notifyListeners();
    final client = clientFactory(); _client = client;
    try {
      if ((text == null) == (wav == null) || !const ['ru', 'kk', 'auto'].contains(locale)) throw const ApiFailure('VALIDATION_ERROR');
      if (text != null && (text.trim().isEmpty || text.runes.length > 4000)) throw const ApiFailure('VALIDATION_ERROR');
      if (wav != null) validateVoiceWav(wav);
      final token = await api.accessToken();
      if (!_valid(revision)) return;
      if (token == null || token.isEmpty) throw const ApiFailure('AUTH_REQUIRED');
      final request = http.MultipartRequest('POST', api.url(scope, 'drafts'));
      request.followRedirects = false;
      request.headers['Authorization'] = 'Bearer $token';
      request.fields['locale'] = locale;
      if (text != null) request.fields['text'] = text.trim();
      if (wav != null) request.files.add(http.MultipartFile.fromBytes('audio', wav, filename: 'recording.wav', contentType: MediaType('audio', 'wav')));
      // Multipart client owns the boundary; no content-type override.
      final response = await client.send(request).then(http.Response.fromStream).timeout(timeout);
      if (!_valid(revision)) return;
      if (response.statusCode != 201 && response.statusCode != 200) throw ApiFailure(response.statusCode == 401 ? 'AUTH_REQUIRED' : 'AI_UNAVAILABLE');
      final value = crmObject(jsonDecode(utf8.decode(response.bodyBytes)));
      validateDraft(value);
      if (!_valid(revision)) return;
      if (!DateTime.now().toUtc().isBefore(DateTime.parse(value['expires_at'] as String))) throw const ApiFailure('DRAFT_EXPIRED');
      draft = value;
    } catch (e) {
      if (_valid(revision)) error = e is ApiFailure ? e : const ApiFailure('AI_UNAVAILABLE');
    } finally {
      client.close();
      if (identical(client, _client)) _client = null;
      if (_valid(revision)) { busy = false; notifyListeners(); }
    }
  }
  @override
  void dispose() { _disposed = true; invalidate(); super.dispose(); }
}

/// We generate PCM16 mono 16kHz WAV. Verify actual RIFF chunks, duration and
/// size, instead of trusting an extension or wall-clock recording timer.
double validateVoiceWav(Uint8List bytes) {
  if (bytes.length < 44 || bytes.length > 8 * 1024 * 1024) throw const ApiFailure('AUDIO_INVALID');
  String tag(int offset) => ascii.decode(bytes.sublist(offset, offset + 4), allowInvalid: true);
  final data = ByteData.sublistView(bytes);
  if (tag(0) != 'RIFF' || tag(8) != 'WAVE' || data.getUint32(4, Endian.little) + 8 != bytes.length) throw const ApiFailure('AUDIO_INVALID');
  var offset = 12; var rate = 0; var dataSize = 0; var formats = 0; var chunks = 0;
  while (offset + 8 <= bytes.length) {
    final length = data.getUint32(offset + 4, Endian.little);
    final start = offset + 8;
    if (start + length > bytes.length) throw const ApiFailure('AUDIO_INVALID');
    if (tag(offset) == 'fmt ') {
      formats++;
      if (length < 16 || data.getUint16(start, Endian.little) != 1 || data.getUint16(start + 2, Endian.little) != 1 || data.getUint32(start + 4, Endian.little) != 16000 || data.getUint16(start + 12, Endian.little) != 2 || data.getUint16(start + 14, Endian.little) != 16) throw const ApiFailure('AUDIO_INVALID');
      rate = data.getUint32(start + 8, Endian.little);
    }
    if (tag(offset) == 'data') { dataSize = length; chunks++; }
    offset = start + length + (length % 2);
  }
  if (offset != bytes.length || formats != 1 || chunks != 1 || rate != 32000 || dataSize <= 0 || dataSize % 2 != 0 || dataSize > 30 * rate) throw const ApiFailure('AUDIO_INVALID');
  return dataSize / rate;
}
