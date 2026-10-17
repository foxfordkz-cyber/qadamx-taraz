import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../crm/crm_models.dart';
import '../ui/common.dart' show tr;
import '../ui/language.dart';
import '../ui/qadam_theme.dart';
import 'venue_assets.dart';

/// Local 3D surface only. All navigation, data requests and business forms stay
/// native. No remote page, auth cookie, bearer token or browser storage is used.
class VenueViewer extends StatefulWidget {
  const VenueViewer({
    super.key,
    required this.asset,
    required this.venueId,
    required this.businesses,
    required this.kk,
    required this.onSelect,
  });
  final VenueAsset asset;
  final String venueId;
  final List<CrmJson> businesses;
  final bool kk;
  final ValueChanged<CrmJson> onSelect;
  @override
  State<VenueViewer> createState() => _VenueViewerState();
}

class _VenueViewerState extends State<VenueViewer> with WidgetsBindingObserver {
  WebViewController? controller;
  bool failed = false, loaded = false, feeding = false, interacting = false;
  Timer? timer;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    start();
  }

  Future<void> start() async {
    if (kIsWeb ||
        ![
          TargetPlatform.android,
          TargetPlatform.iOS,
        ].contains(defaultTargetPlatform)) {
      setState(() => failed = true);
      return;
    }
    try {
      final js = await rootBundle.loadString('assets/venues/renderer.js');
      if (!mounted) return;
      final c = WebViewController();
      controller = c;
      await c.setJavaScriptMode(JavaScriptMode.unrestricted);
      await c.setBackgroundColor(QadamTheme.sceneSky);
      await c.setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: (request) => request.url == 'about:blank'
              ? NavigationDecision.navigate
              : NavigationDecision.prevent,
          onWebResourceError: (_) => failure(),
        ),
      );
      await c.addJavaScriptChannel(
        'QadamVenue',
        onMessageReceived: (message) {
          if (!mounted || failed || message.message.length > 400) return;
          try {
            final payload = crmObject(jsonDecode(message.message));
            if (payload['type'] == 'ready' && !feeding) {
              feeding = true;
              feed();
            }
            if (payload['type'] == 'loaded') {
              timer?.cancel();
              setState(() => loaded = true);
            }
            if (payload['type'] == 'error') failure();
            if (loaded &&
                payload['type'] == 'select' &&
                payload['id'] is String) {
              final business = widget.asset.businessFor(
                payload['id'] as String,
                widget.venueId,
                widget.businesses,
              );
              if (business != null) widget.onSelect(business);
            }
          } catch (_) {
            failure();
          }
        },
      );
      timer = Timer(const Duration(seconds: 25), failure);
      // CSP denies all network access. Scripts and GLB bytes are bundled locally;
      // blob images are only textures decoded by GLTFLoader from the accepted GLB.
      await c.loadHtmlString(
        '''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; worker-src 'none';">
<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#dfeceb}canvas{display:block;touch-action:none}.marker{position:fixed;transform:translate(-50%,-50%);width:48px;height:48px;border:0;padding:0;background:transparent;color:#164c3e;font:bold 14px sans-serif;z-index:2;isolation:isolate}.marker:before{content:"";position:absolute;inset:11px;border:2px solid #164c3e;border-radius:50%;background:#d7f36a;z-index:-1}.marker.selected:before{background:#164c3e;border-color:#fffefa}.marker.selected{color:#fffefa}</style></head><body><script>${js.replaceAll('</script', '<\\/script')}</script></body></html>''',
      );
      if (mounted) setState(() {});
    } catch (_) {
      failure();
    }
  }

  Future<void> feed() async {
    try {
      final bytes = await rootBundle.load(widget.asset.model);
      final encoded = base64Encode(
        bytes.buffer.asUint8List(bytes.offsetInBytes, bytes.lengthInBytes),
      );
      // Keep individual platform messages small; model paths never come from JS.
      for (var offset = 0; offset < encoded.length; offset += 32768) {
        if (!mounted || failed) return;
        final end = (offset + 32768).clamp(0, encoded.length);
        await controller!.runJavaScript(
          'window.qadamChunks.push(${jsonEncode(encoded.substring(offset, end))});',
        );
      }
      if (!mounted || failed) return;
      final publicMarkers = widget.businesses
          .map((b) => {'id': b['id'], 'slug': b['slug'], 'name': b['name']})
          .toList();
      await controller!.runJavaScript(
        'window.setVenue(${jsonEncode(widget.asset.data)},${jsonEncode(publicMarkers)},${widget.kk});',
      );
    } catch (_) {
      failure();
    }
  }

  void failure() {
    timer?.cancel();
    if (mounted && !failed) setState(() => failed = true);
    unawaited(
      controller?.runJavaScript('window.disposeVenue?.();').catchError((_) {}),
    );
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final method = state == AppLifecycleState.resumed
        ? 'resumeVenue'
        : 'pauseVenue';
    unawaited(
      controller?.runJavaScript('window.$method?.();').catchError((_) {}),
    );
  }

  @override
  void dispose() {
    timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    unawaited(
      controller?.runJavaScript('window.disposeVenue?.();').catchError((_) {}),
    );
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final kk = qadamKk(context);
    final height = (MediaQuery.sizeOf(context).width * .72).clamp(210.0, 320.0);
    Widget image() => Image.asset(
      widget.asset.poster,
      fit: BoxFit.contain,
      semanticLabel: tr(kk, 'Изображение площадки', 'Алаң суреті'),
      errorBuilder: (_, _, _) => const Icon(Icons.storefront, size: 48),
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            color: QadamTheme.sceneSky,
            border: Border.all(color: QadamTheme.line),
            borderRadius: BorderRadius.circular(20),
          ),
          child: SizedBox(
            height: height,
            child: Stack(
              fit: StackFit.expand,
              children: [
                if (!failed && controller != null)
                  IgnorePointer(
                    ignoring: !interacting,
                    child: WebViewWidget(
                      controller: controller!,
                      gestureRecognizers: {
                        if (interacting)
                          Factory<OneSequenceGestureRecognizer>(
                            () => EagerGestureRecognizer(),
                          ),
                      },
                    ),
                  ),
                if (!loaded || failed)
                  ColoredBox(color: QadamTheme.sceneSky, child: image()),
                if (!loaded && !failed)
                  const Align(
                    alignment: Alignment.bottomCenter,
                    child: LinearProgressIndicator(),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        if (failed)
          Text(
            tr(
              kk,
              'Показано изображение. Выберите магазин в списке ниже.',
              'Сурет көрсетілді. Төмендегі тізімнен дүкен таңдаңыз.',
            ),
            style: Theme.of(context).textTheme.bodySmall,
          )
        else
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              OutlinedButton.icon(
                onPressed: loaded
                    ? () => setState(() => interacting = !interacting)
                    : null,
                icon: Icon(
                  interacting ? Icons.check : Icons.touch_app_outlined,
                ),
                label: Text(
                  interacting
                      ? tr(kk, 'Готово', 'Дайын')
                      : tr(kk, 'Управлять 3D', '3D басқару'),
                ),
              ),
              TextButton(
                onPressed: loaded
                    ? () => controller?.runJavaScript('window.resetVenue?.();')
                    : null,
                child: Text(tr(kk, 'Общий вид', 'Жалпы көрініс')),
              ),
            ],
          ),
        if (interacting && !failed)
          Text(
            tr(
              kk,
              'Вращайте одним пальцем, масштабируйте двумя. Номер открывает магазин. Для прокрутки нажмите «Готово».',
              'Бір саусақпен бұрыңыз, екі саусақпен масштабтаңыз. Нөмір дүкенді ашады. Айналдыру үшін «Дайын» басыңыз.',
            ),
            style: Theme.of(context).textTheme.bodySmall,
          ),
      ],
    );
  }
}
