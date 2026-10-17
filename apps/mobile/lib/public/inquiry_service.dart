import 'dart:async';

import '../crm/crm_models.dart';
import '../crm/crm_pending.dart';
import '../data/api_failure.dart';
import 'public_api.dart';

const inquiryAction = 'public.inquiry.v1';

CrmJson inquiryBody(String name, String contact, String message) {
  final body = {
    'visitor_name': name.trim(),
    'contact': contact.trim(),
    'message': message.trim(),
  };
  validateInquiryBody(body);
  return body;
}

void validateInquiryBody(CrmJson body) {
  const limits = {'visitor_name': 100, 'contact': 200, 'message': 2000};
  if (body.length != 3) throw const ApiFailure('VALIDATION_ERROR');
  for (final entry in limits.entries) {
    final value = body[entry.key];
    if (value is! String ||
        value.trim().isEmpty ||
        value != value.trim() ||
        value.runes.length > entry.value) {
      throw const ApiFailure('VALIDATION_ERROR');
    }
  }
}

void validateInquiryReceipt(CrmJson value) {
  crmId(value, 'id');
  final date = crmString(value, 'created_at');
  if (!RegExp(
        r'^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$',
        caseSensitive: false,
      ).hasMatch(date) ||
      DateTime.tryParse(date) == null)
    throw const ApiFailure('INVALID_RESPONSE', uncertain: true);
}

/// Encrypted, origin/account(or guest)/recipient scoped. No public lookup exists:
/// only explicit replay of the saved body + client_request_id is supported.
class InquiryService {
  InquiryService(this.api, this.pending, this.isCurrent);
  final PublicApi api;
  final CrmPending pending;
  final bool Function(CrmScope) isCurrent;
  static final Map<String, Future<void>> _locks = {};
  void check(CrmScope scope) {
    if (!isCurrent(scope) || scope.api != api.baseUrl.toString())
      throw const ApiFailure('ACCOUNT_CHANGED');
  }

  Future<CrmIntent?> load(CrmScope scope) async {
    check(scope);
    final saved = await pending.load(scope, inquiryAction);
    check(scope);
    if (saved != null) {
      validateInquiryBody(saved.body);
      if (saved.receipt != null) validateInquiryReceipt(saved.receipt!);
    }
    return saved;
  }

  Future<CrmIntent> submit(CrmScope scope, {CrmJson? newBody}) async {
    final slot = scope.slot(inquiryAction);
    final before = _locks[slot] ?? Future<void>.value();
    final done = Completer<void>();
    _locks[slot] = done.future;
    await before;
    try {
      check(scope);
      var intent = await load(scope);
      // A duplicate submit never starts a second intent after a confirmed result.
      if (intent?.receipt != null) return intent!;
      final fresh = intent == null;
      if (fresh) {
        if (newBody == null) throw const ApiFailure('PENDING_CHANGED');
        validateInquiryBody(newBody);
        intent = await pending.begin(scope, inquiryAction, newBody);
      }
      check(scope);
      final saved = intent!;
      try {
        final receipt = await api.request(
          'businesses/${scope.business}/inquiries',
          body: {...saved.body, 'client_request_id': saved.key},
        );
        validateInquiryReceipt(receipt);
        check(scope);
        return await pending.complete(saved, receipt);
      } on ApiFailure catch (error) {
        check(scope);
        final status = error.statusCode ?? 0;
        if (fresh &&
            status >= 400 &&
            status < 500 &&
            status != 408 &&
            status != 409) {
          // Only an initial definitive rejection may unlock editing. A restored
          // or previously unknown intent is never cleared by a later 4xx.
          await pending.rejectInitial(saved);
          throw const ApiFailure('INQUIRY_REJECTED');
        }
        rethrow;
      }
    } finally {
      done.complete();
      if (identical(_locks[slot], done.future)) _locks.remove(slot);
    }
  }
}
