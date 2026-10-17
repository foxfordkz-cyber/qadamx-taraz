import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../data/api_failure.dart';
import 'crm_models.dart';
import 'crm_pending.dart';

const customerAction = 'customer.create.v1';
const operationAction = 'operation.create.v1';

class CrmApi {
  CrmApi({
    required this.baseUrl,
    required this.accountId,
    required this.epoch,
    required this.accessToken,
    required this.pending,
    http.Client? client,
    this.timeout = const Duration(seconds: 35),
  }) : client = client ?? http.Client();
  final Uri baseUrl;
  final String? Function() accountId;
  final int Function() epoch;
  final Future<String?> Function() accessToken;
  final CrmPending pending;
  final http.Client client;
  final Duration timeout;
  CrmScope scope(String business) {
    final owner = accountId();
    if (owner == null) throw const ApiFailure('AUTH_REQUIRED');
    if (!crmUuid.hasMatch(business)) throw const ApiFailure('INVALID_RESPONSE');
    return CrmScope(baseUrl.toString(), owner, business, epoch());
  }

  bool current(CrmScope scope) =>
      scope.api == baseUrl.toString() &&
      scope.account == accountId() &&
      scope.epoch == epoch();
  void check(CrmScope scope) {
    if (!current(scope)) {
      throw const ApiFailure('ACCOUNT_CHANGED', uncertain: true);
    }
  }

  Uri url(CrmScope scope, String resource, [Map<String, String>? query]) =>
      baseUrl.replace(
        path: '/api/v1/businesses/${scope.business}/$resource',
        queryParameters: query,
      );

  Future<CrmJson> request(
    CrmScope scope,
    String method,
    String resource, {
    Map<String, String>? query,
    CrmJson? body,
    String? key,
  }) async {
    check(scope);
    String? token;
    try {
      token = await accessToken();
    } catch (_) {
      check(scope);
      throw const ApiFailure('AUTH_REQUIRED');
    }
    check(scope);
    if (token == null || token.isEmpty) throw const ApiFailure('AUTH_REQUIRED');
    final request = http.Request(method, url(scope, resource, query));
    request.followRedirects = false;
    request.headers['Authorization'] = 'Bearer $token';
    if (key != null) request.headers['Idempotency-Key'] = key;
    if (body != null) {
      request.headers['Content-Type'] = 'application/json';
      request.body = jsonEncode(body);
    }
    try {
      final response = await client
          .send(request)
          .then(http.Response.fromStream)
          .timeout(timeout);
      check(scope);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        String code = response.statusCode == 401
            ? 'AUTH_REQUIRED'
            : 'CRM_UNAVAILABLE';
        try {
          final error = crmObject(
            jsonDecode(utf8.decode(response.bodyBytes)),
          )['error'];
          if (error is Map &&
              const {
                'NOT_FOUND',
                'VALIDATION_ERROR',
                'IDEMPOTENCY_CONFLICT',
                'BALANCE_CHANGED',
                'DRAFT_USED',
                'DRAFT_EXPIRED',
                'AUTH_REQUIRED',
                'CUSTOMER_RECOVERY_PAUSED',
              }.contains(error['code'])) {
            code = error['code'] as String;
          }
        } catch (_) {
          /* Do not expose bodies, headers or exception messages. */
        }
        throw ApiFailure(
          code,
          statusCode: response.statusCode,
          uncertain: method != 'GET',
        );
      }
      return crmObject(jsonDecode(utf8.decode(response.bodyBytes)));
    } on ApiFailure {
      rethrow;
    } catch (_) {
      check(scope);
      throw ApiFailure('CRM_UNAVAILABLE', uncertain: method != 'GET');
    }
  }

  Future<CrmJson> summary(CrmScope scope) async {
    final value = await request(scope, 'GET', 'summary');
    validateSummary(value);
    return value;
  }

  Future<CrmPage> customers(
    CrmScope scope, {
    String query = '',
    String? cursor,
  }) async => CrmPage.parse(
    await request(
      scope,
      'GET',
      'customers',
      query: {'q': query, 'limit': '50', 'cursor': ?cursor},
    ),
    (item) => validateCustomer(item, scope.business),
  );
  Future<CrmPage> operations(
    CrmScope scope, {
    bool debts = false,
    String? customer,
    String? cursor,
  }) async => CrmPage.parse(
    await request(
      scope,
      'GET',
      'operations',
      query: {
        'outstanding_only': '$debts',
        'limit': '50',
        'customer_id': ?customer,
        'cursor': ?cursor,
      },
    ),
    (item) => debts
        ? validateOpenSale(item)
        : validateOperation(item, scope.business),
  );
  Future<CrmPage> inquiries(CrmScope scope, {String? cursor}) async =>
      CrmPage.parse(
        await request(
          scope,
          'GET',
          'inquiries',
          query: {'limit': '50', 'cursor': ?cursor},
        ),
        (item) => validateInquiry(item, scope.business),
      );

  Future<CrmJson> updateInquiry(
    CrmScope scope,
    String id,
    String status,
  ) async {
    if (!crmUuid.hasMatch(id) ||
        !const ['new', 'in_progress', 'closed'].contains(status))
      throw const ApiFailure('VALIDATION_ERROR');
    final result = await request(
      scope,
      'PATCH',
      'inquiries/$id',
      body: {'status': status},
    );
    validateInquiry(result, scope.business);
    if (result['id'] != id || result['status'] != status)
      throw const ApiFailure('INVALID_RESPONSE');
    return result;
  }

  Future<CrmJson> catalog(CrmScope scope, String slug) async {
    check(scope);
    if (slug.isEmpty || slug.contains('/') || slug.contains('..'))
      throw const ApiFailure('VALIDATION_ERROR');
    final request = http.Request(
      'GET',
      baseUrl.replace(pathSegments: ['api', 'v1', 'businesses', slug]),
    );
    request.followRedirects = false;
    try {
      final response = await client
          .send(request)
          .then(http.Response.fromStream)
          .timeout(timeout);
      check(scope);
      if (response.statusCode != 200) throw const ApiFailure('CRM_UNAVAILABLE');
      final value = crmObject(jsonDecode(utf8.decode(response.bodyBytes)));
      if (value['id'] != scope.business ||
          value['slug'] != slug ||
          value['catalog'] is! List ||
          value['is_demo'] is! bool)
        throw const ApiFailure('INVALID_RESPONSE');
      crmString(value, 'name');
      for (final raw in value['catalog'] as List) {
        final item = crmObject(raw);
        crmBusiness(item, scope.business);
        crmId(item, 'id');
        crmString(item, 'name');
        if (item['price_minor'] != null)
          crmInt(item, 'price_minor', nonnegative: true);
        if (item['is_demo'] is! bool || item['available'] is! bool)
          throw const ApiFailure('INVALID_RESPONSE');
      }
      return value;
    } on ApiFailure {
      rethrow;
    } catch (_) {
      check(scope);
      throw const ApiFailure('CRM_UNAVAILABLE');
    }
  }

  void validateBody(String action, CrmJson body) {
    bool text(String key, int max, {bool empty = true}) =>
        body[key] is String &&
        (body[key] as String).runes.length <= max &&
        (empty || (body[key] as String).trim().isNotEmpty);
    bool id(String key) =>
        body[key] == null ||
        (body[key] is String && crmUuid.hasMatch(body[key] as String));
    void keys(Set<String> allowed) {
      if (body.keys.any((key) => !allowed.contains(key))) {
        throw const ApiFailure('VALIDATION_ERROR');
      }
    }

    if (action == customerAction) {
      keys({'display_name', 'note', 'contact'});
      if (!text('display_name', 200, empty: false) ||
          !text('note', 2000) ||
          (body['contact'] != null && !text('contact', 200))) {
        throw const ApiFailure('VALIDATION_ERROR');
      }
    } else if (action == operationAction) {
      if (!id('draft_id')) throw const ApiFailure('VALIDATION_ERROR');
      if (!text('description', 1000)) {
        throw const ApiFailure('VALIDATION_ERROR');
      }
      if (body['kind'] == 'sale') {
        keys({
          'kind',
          'draft_id',
          'customer_id',
          'description',
          'total_minor',
          'received_minor',
        });
        if (!id('customer_id')) throw const ApiFailure('VALIDATION_ERROR');
        final total = body['total_minor'];
        final paid = body['received_minor'];
        if (total is! int ||
            total <= 0 ||
            total > 10000000000 ||
            paid is! int ||
            paid < 0 ||
            paid > total ||
            (paid < total && body['customer_id'] == null)) {
          throw const ApiFailure('VALIDATION_ERROR');
        }
      } else if (body['kind'] == 'repayment') {
        keys({'kind', 'draft_id', 'sale_id', 'description', 'amount_minor'});
        final amount = body['amount_minor'];
        if (amount is! int ||
            amount <= 0 ||
            amount > 10000000000 ||
            body['sale_id'] is! String ||
            !crmUuid.hasMatch(body['sale_id'] as String)) {
          throw const ApiFailure('VALIDATION_ERROR');
        }
      } else {
        throw const ApiFailure('VALIDATION_ERROR');
      }
    } else {
      throw const ApiFailure('INVALID_ACTION');
    }
  }

  Future<CrmIntent> begin(CrmScope scope, String action, CrmJson body) async {
    check(scope);
    validateBody(action, body);
    final intent = await pending.begin(scope, action, body);
    check(scope);
    return intent;
  }

  Future<CrmIntent> send(
    CrmScope scope,
    String action,
    CrmIntent intent,
  ) async {
    check(scope);
    if (intent.slot != scope.slot(action)) {
      throw const ApiFailure('ACCOUNT_CHANGED', uncertain: true);
    }
    validateBody(action, intent.body);
    final saved = await pending.load(scope, action);
    check(scope);
    if (!intent.same(saved)) {
      throw const ApiFailure('PENDING_CHANGED', uncertain: true);
    }
    if (saved!.receipt != null) {
      _validateReceipt(scope, action, saved.receipt!, intent.body);
      return saved;
    }
    final value = await request(
      scope,
      'POST',
      action == customerAction ? 'customers' : 'operations',
      body: intent.body,
      key: intent.key,
    );
    _validateReceipt(scope, action, value, intent.body);
    check(scope);
    return pending.complete(intent, value);
  }

  void _validateReceipt(
    CrmScope scope,
    String action,
    CrmJson response,
    CrmJson body,
  ) {
    if (action == customerAction) {
      validateCustomer(response, scope.business);
      return;
    }
    validateOperationReceipt(response, scope.business);
    final operation = crmObject(response['operation']);
    if (operation['kind'] != body['kind'] ||
        operation['description'] != body['description'])
      throw const ApiFailure('INVALID_RESPONSE');
    if (body['kind'] == 'sale') {
      if (operation['customer_id'] != body['customer_id'] ||
          operation['sales_delta_minor'] != body['total_minor'] ||
          operation['receipts_delta_minor'] != body['received_minor'])
        throw const ApiFailure('INVALID_RESPONSE');
    } else if (operation['sale_id'] != body['sale_id'] ||
        operation['sales_delta_minor'] != 0 ||
        operation['receipts_delta_minor'] != body['amount_minor']) {
      throw const ApiFailure('INVALID_RESPONSE');
    }
  }

  Future<CrmIntent> recoverCustomer(CrmScope scope, CrmIntent intent) async {
    check(scope);
    if (intent.slot != scope.slot(customerAction)) {
      throw const ApiFailure('ACCOUNT_CHANGED');
    }
    if (intent.receipt != null) {
      validateCustomer(intent.receipt!, scope.business);
      return intent;
    }
    final value = await request(
      scope,
      'GET',
      'customer-creation-result',
      key: intent.key,
    );
    if (value['status'] == 'not_observed' && value['customer'] == null) {
      return intent;
    }
    if (value['status'] != 'completed') {
      throw const ApiFailure('INVALID_RESPONSE', uncertain: true);
    }
    final customer = crmObject(value['customer']);
    validateCustomer(customer, scope.business);
    check(scope);
    return pending.complete(intent, customer);
  }

  void close() => client.close();
}
