import 'package:url_launcher/url_launcher.dart';
import 'data/public_urls.dart';
export 'data/public_urls.dart';

enum FrontendPage { seller, showcase }

typedef BrowserLauncher = Future<bool> Function(Uri url);

Uri? frontendUrl(String base, FrontendPage page) => frontendOrigin(
  base,
)?.replace(path: page == FrontendPage.seller ? '/seller' : '/');

Future<bool> openSystemBrowser(Uri url) =>
    launchUrl(url, mode: LaunchMode.externalApplication);
