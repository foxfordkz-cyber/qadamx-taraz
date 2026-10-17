import 'dart:async';

import 'package:flutter/foundation.dart';

import 'data/account_api.dart';
import 'runtime.dart';

/// Private membership state stays in memory and is invalidated on every auth
/// transition. A late response (including A -> B -> A) can never restore it.
class BusinessAccess extends ChangeNotifier {
  BusinessAccess(this.runtime) {
    runtime.addListener(_identityChanged);
    unawaited(refresh());
  }
  final MobileRuntime runtime;
  List<BusinessMembership> businesses = const [];
  String? selectedId;
  Object? error;
  bool loading = false;
  bool _disposed = false;
  int _request = 0;

  BusinessMembership? get selected {
    for (final business in businesses) {
      if (business.id == selectedId) return business;
    }
    return null;
  }

  void _identityChanged() {
    businesses = const [];
    selectedId = null;
    error = null;
    unawaited(refresh());
  }

  void select(String id) {
    if (businesses.any((business) => business.id == id)) {
      selectedId = id;
      notifyListeners();
    }
  }

  Future<void> refresh() async {
    final request = ++_request;
    final owner = runtime.accountId;
    final epoch = runtime.epoch;
    final previous = selectedId;
    businesses = const [];
    selectedId = null;
    error = null;
    loading = owner != null && runtime.accountApi != null;
    notifyListeners();
    if (!loading) return;
    bool current() =>
        !_disposed &&
        request == _request &&
        runtime.accountId == owner &&
        runtime.epoch == epoch;
    try {
      final result = await runtime.accountApi!.memberships();
      if (!current()) return;
      businesses = result;
      // Preserve a deliberate selection only within the same identity and
      // only while the server still grants the membership. Never fabricate one.
      if (result.any((business) => business.id == previous)) {
        selectedId = previous;
      }
    } catch (failure) {
      if (!current()) return;
      error = failure;
    } finally {
      if (current()) {
        loading = false;
        notifyListeners();
      }
    }
  }

  @override
  void dispose() {
    _disposed = true;
    runtime.removeListener(_identityChanged);
    super.dispose();
  }
}
