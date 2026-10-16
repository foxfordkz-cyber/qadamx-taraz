import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// One policy for session, account drafts and pending snapshot keys.
/// iOS items stay on this device and are readable only while it is unlocked.
const mobileSecureStorage = FlutterSecureStorage(
  iOptions: IOSOptions(
    accessibility: KeychainAccessibility.unlocked_this_device,
  ),
);
