import '../data/api_failure.dart';
import 'crm_api.dart';
import 'crm_models.dart';

/// A point-in-time view of names and server balances for requested customers.
/// Missing IDs are deliberately indistinguishable from inaccessible customers.
class CustomerNameSnapshot {
  CustomerNameSnapshot(Map<String, CrmJson> customers, Set<String> missing)
    : customers = Map.unmodifiable(customers),
      missing = Set.unmodifiable(missing);

  final Map<String, CrmJson> customers;
  final Set<String> missing;
}

/// Read-only, screen-local lookup for every loaded page of operations.
///
/// Construct a new instance for each account/business/API scope. Call dispose
/// when leaving the screen, and pass an isActive guard that also checks the
/// selected business. No customer information is written to disk or shared
/// between instances. Failure never falls back to the first customer page.
class CustomerNames {
  CustomerNames({
    required this.api,
    required this.scope,
    required this.isActive,
  });

  final CrmApi api;
  final CrmScope scope;
  final bool Function() isActive;
  final Map<String, CrmJson> _customers = {};
  final Set<String> _resolved = {};
  int _generation = 0;
  bool _disposed = false;

  void _check(int generation) {
    api.check(scope);
    if (_disposed || generation != _generation || !isActive()) {
      throw const ApiFailure('ACCOUNT_CHANGED');
    }
  }

  /// Supply IDs from ALL currently loaded operation pages, not only the latest.
  /// A refresh after a write reloads balances and previously missing names.
  Future<CustomerNameSnapshot> load(
    Iterable<String> customerIds, {
    bool refresh = false,
  }) async {
    final generation = ++_generation;
    _check(generation);
    final requested = <String>{};
    for (final id in customerIds) {
      if (!crmUuid.hasMatch(id)) {
        throw const ApiFailure('VALIDATION_ERROR');
      }
      requested.add(id.toLowerCase());
    }
    final customers = refresh ? <String, CrmJson>{} : {..._customers};
    final resolved = refresh ? <String>{} : {..._resolved};
    final remaining = requested.difference(resolved).toList(growable: false);
    for (var start = 0; start < remaining.length; start += 100) {
      _check(generation);
      final end = (start + 100).clamp(0, remaining.length);
      final group = remaining.sublist(start, end);
      final page = await api.customersByIds(scope, group);
      _check(generation);
      for (final item in page.items) {
        customers[(item['id'] as String).toLowerCase()] =
            Map<String, dynamic>.unmodifiable(item);
      }
      resolved.addAll(group);
    }
    _check(generation);
    // Commit atomically. A failure or late result cannot change a newer cache.
    _customers
      ..clear()
      ..addAll(customers);
    _resolved
      ..clear()
      ..addAll(resolved);
    return CustomerNameSnapshot({
      for (final id in requested)
        if (customers.containsKey(id)) id: customers[id]!,
    }, requested.difference(customers.keys.toSet()));
  }

  /// Also use when a business is switched without disposing the owning route.
  void invalidate() {
    _generation++;
    _customers.clear();
    _resolved.clear();
  }

  void dispose() {
    _disposed = true;
    invalidate();
  }
}
