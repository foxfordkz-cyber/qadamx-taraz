import 'dart:convert';

import '../data/api_failure.dart';
import '../data/money.dart';

typedef CrmJson = Map<String, dynamic>;
void validateInquiry(CrmJson value, String business) {
  crmBusiness(value, business);
  crmId(value, 'id');
  for (final key in ['visitor_name', 'contact', 'message', 'created_at']) {
    crmString(value, key);
  }
  if (!const ['new', 'in_progress', 'closed'].contains(value['status'])) {
    throw const ApiFailure('INVALID_RESPONSE');
  }
}

final crmUuid = RegExp(r'^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$');

CrmJson crmObject(Object? value) {
  if (value is! Map<String, dynamic>) {
    throw const ApiFailure('INVALID_RESPONSE');
  }
  return value;
}

int crmInt(CrmJson value, String name, {bool nonnegative = false}) {
  final n = value[name];
  if (n is! int || (nonnegative && n < 0)) {
    throw const ApiFailure('INVALID_RESPONSE');
  }
  return n;
}

String crmString(CrmJson value, String name) {
  final text = value[name];
  if (text is! String) throw const ApiFailure('INVALID_RESPONSE');
  return text;
}

String crmId(CrmJson value, String name) {
  final id = crmString(value, name);
  if (!crmUuid.hasMatch(id)) throw const ApiFailure('INVALID_RESPONSE');
  return id;
}

void crmBusiness(CrmJson value, String business) {
  if (value['business_id'] != business) {
    throw const ApiFailure('INVALID_RESPONSE');
  }
}

void validateCustomer(CrmJson value, String business) {
  crmBusiness(value, business);
  crmId(value, 'id');
  if (crmString(value, 'display_name').trim().isEmpty) {
    throw const ApiFailure('INVALID_RESPONSE');
  }
  crmInt(value, 'balance_minor', nonnegative: true);
  if (value['contact'] != null && value['contact'] is! String) {
    throw const ApiFailure('INVALID_RESPONSE');
  }
  if (value['note'] != null && value['note'] is! String) {
    throw const ApiFailure('INVALID_RESPONSE');
  }
}

void validateOperation(CrmJson value, String business) {
  crmBusiness(value, business);
  crmId(value, 'id');
  crmId(value, 'sale_id');
  if (!const ['sale', 'repayment', 'reversal'].contains(value['kind'])) {
    throw const ApiFailure('INVALID_RESPONSE');
  }
  crmInt(value, 'sales_delta_minor');
  crmInt(value, 'receipts_delta_minor');
  crmString(value, 'description');
  if (DateTime.tryParse(crmString(value, 'created_at')) == null) {
    throw const ApiFailure('INVALID_RESPONSE');
  }
  if (value['customer_id'] != null) crmId(value, 'customer_id');
}

void validateOperationReceipt(CrmJson value, String business) {
  validateOperation(crmObject(value['operation']), business);
  crmInt(value, 'sale_balance_minor', nonnegative: true);
  if (value['customer_balance_minor'] != null) {
    crmInt(value, 'customer_balance_minor', nonnegative: true);
  }
}

void validateOpenSale(CrmJson value) {
  crmId(value, 'id');
  if (value['customer_id'] != null) crmId(value, 'customer_id');
  final total = crmInt(value, 'total_minor', nonnegative: true);
  final paid = crmInt(value, 'received_minor', nonnegative: true);
  final balance = crmInt(value, 'balance_minor', nonnegative: true);
  if (total <= 0 ||
      total > maxPriceMinor ||
      paid > total ||
      balance != total - paid) {
    throw const ApiFailure('INVALID_RESPONSE');
  }
  crmString(value, 'description');
  crmString(value, 'created_at');
}

void validateSummary(CrmJson value) {
  if (value['currency'] != 'KZT' || value['timezone'] != 'Asia/Almaty') {
    throw const ApiFailure('INVALID_RESPONSE');
  }
  crmString(value, 'date');
  crmInt(value, 'sales_minor');
  crmInt(value, 'receipts_minor');
  crmInt(value, 'outstanding_minor', nonnegative: true);
  crmInt(value, 'new_inquiries_count', nonnegative: true);
}

class CrmPage {
  const CrmPage(this.items, this.next);
  final List<CrmJson> items;
  final String? next;
  factory CrmPage.parse(CrmJson data, void Function(CrmJson) validate) {
    if (data['items'] is! List ||
        (data['next_cursor'] != null &&
            (data['next_cursor'] is! String ||
                !crmUuid.hasMatch(data['next_cursor'] as String)))) {
      throw const ApiFailure('INVALID_RESPONSE');
    }
    final items = (data['items'] as List).map(crmObject).toList();
    for (final item in items) {
      validate(item);
    }
    return CrmPage(List.unmodifiable(items), data['next_cursor'] as String?);
  }
}

/// Financial scope is durable across restarts; epoch only fences this session.
class CrmScope {
  const CrmScope(this.api, this.account, this.business, this.epoch);
  final String api;
  final String account;
  final String business;
  final int epoch;
  String slot(String action) =>
      jsonEncode(['qadam.crm.v1', api, account, business, action]);
}

int? crmAmount(String value, {bool allowZero = false}) {
  final clean = value.trim().replaceAll(RegExp(r'[ \u00a0\u202f]'), '');
  if (allowZero && RegExp(r'^0+([.,]0{1,2})?$').hasMatch(clean)) return 0;
  return parsePriceMinor(value);
}

String crmMoney(int? minor, bool kk) => minor == null
    ? (kk ? 'Деректер жоқ' : 'Нет данных')
    : '${minor < 0 ? '−' : ''}${formatPriceMinor(minor.abs())}';

String crmDate(String value) {
  final time = DateTime.tryParse(value);
  if (time == null) return value;
  final local = time.toUtc().add(const Duration(hours: 5));
  String pad(int n) => n.toString().padLeft(2, '0');
  return '${pad(local.day)}.${pad(local.month)}.${local.year}, ${pad(local.hour)}:${pad(local.minute)}';
}
