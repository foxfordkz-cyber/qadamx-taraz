import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../crm/crm_models.dart';
import '../ui/common.dart' show tr;
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
  bool failed = false, loaded = false, feeding = false;
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
      await c.setBackgroundColor(const Color(0xfff5f3eb));
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
<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#f5f3eb}canvas{display:block;touch-action:none}.marker{position:fixed;transform:translate(-50%,-50%);width:48px;height:48px;border:2px solid #164c3e;border-radius:50%;background:#d7f36a;color:#164c3e;font:bold 18px sans-serif;z-index:2}</style></head><body><script>${js.replaceAll('</script', '<\\/script')}</script></body></html>''',
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
    if (failed) {
      return Text(
        tr(
          widget.kk,
          '3D недоступно. Изображение и список магазинов остаются ниже.',
          '3D қолжетімсіз. Сурет пен дүкендер тізімі төменде бар.',
        ),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          tr(
            widget.kk,
            'Поверните одним пальцем, измените масштаб двумя. Нажмите номер магазина.',
            'Бір саусақпен бұрыңыз, екі саусақпен масштабтаңыз. Дүкен нөмірін басыңыз.',
          ),
        ),
        SizedBox(
          height: 340,
          child: Stack(
            children: [
              if (controller != null)
                WebViewWidget(
                  controller: controller!,
                  gestureRecognizers: {
                    Factory<OneSequenceGestureRecognizer>(
                      () => EagerGestureRecognizer(),
                    ),
                  },
                ),
              if (!loaded) const Center(child: CircularProgressIndicator()),
            ],
          ),
        ),
        OutlinedButton(
          onPressed: loaded
              ? () => controller?.runJavaScript('window.resetVenue?.();')
              : null,
          child: Text(tr(widget.kk, 'Вернуть камеру', 'Камераны қайтару')),
        ),
      ],
    );
  }
}
