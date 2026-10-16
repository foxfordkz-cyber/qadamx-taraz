/// A safe, localizable failure. Server messages, URLs and tokens are never
/// included in [toString] or displayed by the data layer.
class ApiFailure implements Exception {
  const ApiFailure(this.code, {this.uncertain = false, this.statusCode});

  final String code;
  final bool uncertain;
  final int? statusCode;

  @override
  String toString() => 'ApiFailure($code, uncertain: $uncertain)';
}
