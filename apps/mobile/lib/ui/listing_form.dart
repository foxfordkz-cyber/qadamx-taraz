import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:image_picker/image_picker.dart';

import '../data/livestock_api.dart';
import '../runtime.dart';
import 'common.dart';

class ListingForm extends StatefulWidget {
  const ListingForm({
    super.key,
    required this.runtime,
    required this.kk,
    this.initial,
  });
  final MobileRuntime runtime;
  final bool kk;
  final Json? initial;
  static const storage = FlutterSecureStorage();
  static final Map<String, Future<void>> _queues = {};
  static Future<T> _serialized<T>(String account, Future<T> Function() action) {
    final previous = _queues[account] ?? Future<void>.value();
    final next = previous.catchError((Object _) {}).then((_) => action());
    late final Future<void> completion;
    void release() {
      if (identical(_queues[account], completion)) _queues.remove(account);
    }

    completion = next.then<void>(
      (_) => release(),
      onError: (Object _, StackTrace _) => release(),
    );
    _queues[account] = completion;
    return next;
  }

  static String draftKey(String account) => 'livestock_editor_$account';
  static const pickerKey = 'livestock_picker_owner';
  static Future<void> clearDraft(String account) =>
      _serialized(account, () => storage.delete(key: draftKey(account)));
  static Future<String?> readDraft(String account) =>
      _serialized(account, () => storage.read(key: draftKey(account)));
  static Future<void> writeDraft(
    String account,
    String value,
    bool Function() stillCurrent,
  ) => _serialized(account, () async {
    if (stillCurrent()) {
      await storage.write(key: draftKey(account), value: value);
    }
  });
  static Future<void> clearDraftFor(PendingIntent intent) =>
      _serialized(intent.accountId, () async {
        if (intent.kind != 'json' || intent.path.endsWith('/actions')) return;
        final raw = await storage.read(key: draftKey(intent.accountId));
        if (raw == null) return;
        final draft = jsonDecode(raw) as Json;
        final sameEditor = intent.method == 'POST'
            ? draft['editing_id'] == null
            : intent.method == 'PUT' &&
                  draft['editing_id'] == intent.path.split('/').last;
        if (sameEditor) await storage.delete(key: draftKey(intent.accountId));
      });
  static Future<bool> hasPickerRecovery(String account) async {
    try {
      final raw = await storage.read(key: pickerKey);
      if (raw == null) return false;
      return (jsonDecode(raw) as Json)['account'] == account;
    } catch (_) {
      return false;
    }
  }

  @override
  State<ListingForm> createState() => _ListingFormState();
}

class _ListingFormState extends State<ListingForm> {
  final _form = GlobalKey<FormState>();
  final _quantity = TextEditingController(text: '1');
  final _price = TextEditingController();
  final _locality = TextEditingController();
  final _market = TextEditingController();
  final _age = TextEditingController();
  final _description = TextEditingController();
  final _contact = TextEditingController();
  final _picker = ImagePicker();
  final _scroll = ScrollController();
  late final String _account;
  late final int _epoch;
  String _species = 'cattle';
  String? _sex;
  String? _editingId;
  List<String> _photos = [];
  bool _consent = false;
  bool _ready = false;
  bool _busy = false;
  bool _restored = false;
  bool _preview = false;
  bool _completed = false;
  String? _message;
  Object? _error;
  PendingIntent? _pending;
  Timer? _saveTimer;
  Future<void> _saveQueue = Future<void>.value();
  bool get kk => widget.kk;
  bool get _current =>
      mounted &&
      widget.runtime.epoch == _epoch &&
      widget.runtime.accountId == _account;
  LivestockApi get api => widget.runtime.api!;
  bool get _locked => _busy || _pending != null || _completed;

  @override
  void initState() {
    super.initState();
    _account = widget.runtime.accountId!;
    _epoch = widget.runtime.epoch;
    for (final controller in [
      _quantity,
      _price,
      _locality,
      _market,
      _age,
      _description,
      _contact,
    ]) {
      controller.addListener(_changed);
    }
    _initialize();
  }

  @override
  void dispose() {
    _saveTimer?.cancel();
    if (_ready && !_completed && _current) {
      unawaited(_persist().catchError((Object _) {}));
    }
    for (final controller in [
      _quantity,
      _price,
      _locality,
      _market,
      _age,
      _description,
      _contact,
    ]) {
      controller.dispose();
    }
    _scroll.dispose();
    super.dispose();
  }

  void _changed() {
    if (!_ready || _completed || !_current) return;
    _saveTimer?.cancel();
    _saveTimer = Timer(
      const Duration(milliseconds: 250),
      () => unawaited(
        _persist().catchError((Object error) {
          if (_current) setState(() => _error = error);
        }),
      ),
    );
  }

  Json _draft() => {
    'editing_id': _editingId,
    'species': _species,
    'quantity_text': _quantity.text,
    'price_text': _price.text,
    'locality': _locality.text,
    'market': _market.text,
    'age_text': _age.text,
    'sex': _sex,
    'description': _description.text,
    'contact': _contact.text,
    'contact_consent': _consent,
    'photo_ids': _photos,
  };
  Future<void> _persist() {
    if (!_current || _completed) return Future<void>.value();
    final value = jsonEncode(_draft());
    // Serial writes prevent an older debounced value replacing a photo receipt.
    _saveQueue = _saveQueue.catchError((Object _) {}).then((_) async {
      if (_completed) return;
      await ListingForm.writeDraft(
        _account,
        value,
        () =>
            !_completed &&
            widget.runtime.epoch == _epoch &&
            widget.runtime.accountId == _account,
      );
    });
    return _saveQueue;
  }

  void _populate(Json value, {bool draft = false}) {
    _editingId = (draft ? value['editing_id'] : value['id']) as String?;
    _species = value['species'] as String? ?? 'cattle';
    _quantity.text = draft
        ? value['quantity_text'] as String? ?? '1'
        : '${value['quantity'] ?? 1}';
    _price.text = draft
        ? value['price_text'] as String? ?? ''
        : value['price_per_head_minor'] is int
        ? editableMoney(value['price_per_head_minor'] as int)
        : '';
    _locality.text = value['locality'] as String? ?? '';
    _market.text = value['market'] as String? ?? '';
    _age.text = draft
        ? value['age_text'] as String? ?? ''
        : value['age_months'] == null
        ? ''
        : '${value['age_months']}';
    _sex = value['sex'] as String?;
    _description.text = value['description'] as String? ?? '';
    _contact.text = value['contact'] as String? ?? '';
    // Existing public contact is not consent for this new submission.
    _consent = draft && value['contact_consent'] == true;
    _photos = draft
        ? (value['photo_ids'] as List? ?? []).cast<String>()
        : (value['photos'] as List? ?? [])
              .map((photo) => (photo as Json)['id'] as String)
              .toList();
  }

  Future<void> _initialize() async {
    try {
      final pending = await api.loadPending();
      final raw = await ListingForm.readDraft(_account);
      if (!_current) return;
      final saved = raw == null ? null : jsonDecode(raw) as Json;
      if (saved != null &&
          (widget.initial == null ||
              saved['editing_id'] == widget.initial!['id'] ||
              pending != null)) {
        _populate(saved, draft: true);
        _restored = true;
      } else if (widget.initial != null) {
        _populate(widget.initial!);
      }
      _pending = pending;
      if (pending?.kind == 'json' &&
          pending!.body.containsKey('species') &&
          saved == null) {
        _populate(pending.body);
        _editingId = pending.method == 'PUT'
            ? pending.path.split('/').last
            : null;
        _photos = (pending.body['photo_ids'] as List? ?? []).cast<String>();
        _consent = pending.body['contact_consent'] == true;
        _restored = true;
      }
      setState(() => _ready = true);
      await _persist();
      await _recoverPicker();
    } catch (error) {
      if (_current) {
        setState(() {
          _error = error;
          _ready = true;
        });
      }
    }
  }

  Future<void> _recoverPicker() async {
    final marker = await ListingForm.storage.read(key: ListingForm.pickerKey);
    if (marker == null) return;
    final owner = jsonDecode(marker) as Json;
    if (!_current) return;
    final recovery = await _picker.retrieveLostData();
    if (!_current) return;
    await ListingForm.storage.delete(key: ListingForm.pickerKey);
    if (!_current) return;
    // Never attach A's interrupted Android picker result to B's draft.
    if (owner['account'] != _account) return;
    if (owner['editing_id'] != _editingId) {
      setState(
        () => _message = tr(
          kk,
          'Прерванный выбор фото относится к другой форме. Выберите фото ещё раз.',
          'Үзілген фото таңдау басқа формаға қатысты. Фотоны қайта таңдаңыз.',
        ),
      );
      return;
    }
    if (recovery.exception != null) {
      _cameraError();
      return;
    }
    if (recovery.files?.isNotEmpty == true && _pending == null) {
      await _acceptFile(recovery.files!.first);
    }
  }

  void _cameraError() {
    if (_current) {
      setState(
        () => _message = tr(
          kk,
          'Камера или галерея недоступна. Проверьте разрешение в настройках телефона или выберите другой источник. Форма сохранена.',
          'Камера немесе галерея қолжетімсіз. Телефон баптауындағы рұқсатты тексеріңіз не басқа дереккөзді таңдаңыз. Форма сақталды.',
        ),
      );
    }
  }

  Future<void> _pick(ImageSource source) async {
    if (_locked || _photos.length >= 3) return;
    setState(() {
      _message = null;
      _error = null;
      _busy = true;
    });
    try {
      await _persist();
      if (!_current) return;
      await ListingForm.storage.write(
        key: ListingForm.pickerKey,
        value: jsonEncode({'account': _account, 'editing_id': _editingId}),
      );
      if (!_current) return;
      final file = await _picker.pickImage(source: source);
      if (!_current) return;
      await ListingForm.storage.delete(key: ListingForm.pickerKey);
      if (file != null) await _acceptFile(file);
    } on PlatformException {
      _cameraError();
    } catch (error) {
      if (_current) setState(() => _error = error);
    } finally {
      if (_current) setState(() => _busy = false);
    }
  }

  Future<void> _acceptFile(XFile file) async {
    if (!_current) return;
    if (await File(file.path).length() > 8 * 1024 * 1024) {
      if (_current) {
        setState(() => _error = const ApiFailure('PHOTO_TOO_LARGE'));
      }
      return;
    }
    if (!_current || _photos.length >= 3) return;
    setState(() => _busy = true);
    try {
      await _persist();
      if (!_current) return;
      final response = await api.uploadPhoto(file.path);
      if (!_current) return;
      await _integratePhoto(response);
    } catch (error) {
      await _refreshPending(error);
    } finally {
      if (_current) setState(() => _busy = false);
    }
  }

  Future<void> _refreshPending([Object? error]) async {
    if (!_current) return;
    if (error != null) {
      setState(() => _error = error);
      _scrollToTop();
    }
    try {
      final pending = await api.loadPending();
      if (_current) setState(() => _pending = pending);
    } catch (readError) {
      if (_current) setState(() => _error = readError);
    }
  }

  Future<void> _integratePhoto(Json response) async {
    final id = response['id'] as String;
    if (!_photos.contains(id)) {
      if (_photos.length >= 3) throw const ApiFailure('INVALID_PHOTO');
      setState(() => _photos = [..._photos, id]);
    }
    // Persist the photo ID before clearing the durable upload receipt.
    await _persist();
    if (!_current) return;
    await api.acknowledgePending();
    if (_current) {
      setState(() {
        _pending = null;
        _error = null;
      });
    }
  }

  Json _body() => {
    'species': _species,
    'quantity': int.parse(_quantity.text.trim()),
    'price_per_head_minor': parseTenge(_price.text)!,
    'locality': normalizedPlace(_locality.text),
    'market': normalizedPlace(_market.text),
    'age_months': _age.text.trim().isEmpty ? null : int.parse(_age.text.trim()),
    'sex': _sex,
    'description': _description.text.trim().isEmpty
        ? null
        : _description.text.trim(),
    'photo_ids': _photos,
    'contact': _contact.text.trim(),
    'contact_consent': _consent,
  };
  Future<void> _previewForm() async {
    FocusScope.of(context).unfocus();
    _form.currentState!.validate();
    // ListView may dispose distant fields. Validate the entire draft as well.
    final errors = <String?>[
      _integer(_quantity.text, 1, 10000),
      if (parseTenge(_price.text) == null)
        tr(
          kk,
          'Введите цену за голову от 0,01 до 100 000 000 ₸.',
          'Бір бас бағасын енгізіңіз: 0,01–100 000 000 ₸.',
        ),
      _textLimit(_locality.text, 100, required: true),
      _textLimit(_market.text, 100, required: true),
      if (_age.text.trim().isNotEmpty) _integer(_age.text, 0, 600),
      _textLimit(_description.text, 2000),
      _textLimit(_contact.text, 200, required: true),
      if (!_consent)
        tr(
          kk,
          'Подтвердите согласие на публикацию контакта.',
          'Байланысты жариялауға келісіміңізді растаңыз.',
        ),
    ].whereType<String>().toList();
    if (errors.isNotEmpty) {
      setState(() => _message = errors.first);
      _scrollToTop();
      return;
    }
    try {
      await _persist();
      if (_current) {
        setState(() {
          _preview = true;
          _message = null;
          _error = null;
        });
        _scrollToTop();
      }
    } catch (error) {
      if (_current) {
        setState(() => _error = error);
        _scrollToTop();
      }
    }
  }

  void _scrollToTop() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_current && _scroll.hasClients) _scroll.jumpTo(0);
    });
  }

  Future<void> _publish() async {
    if (_locked) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await _persist();
      if (!_current) return;
      final result = await api.mutate(
        _editingId == null ? 'POST' : 'PUT',
        _editingId == null
            ? '/livestock/listings'
            : '/livestock/listings/$_editingId',
        _body(),
      );
      if (!_current) return;
      await _finish(result);
    } catch (error) {
      await _refreshPending(error);
    } finally {
      if (_current) setState(() => _busy = false);
    }
  }

  Future<void> _finish(Json response) async {
    final intent = await api.loadPending();
    if (!_current) return;
    if (intent == null || !_matchesEditor(intent)) {
      throw const ApiFailure('PENDING_OPERATION');
    }
    // The transport validated a server receipt. Read current canonical state too.
    await api.get('/livestock/me/listings', authenticated: true);
    if (!_current) return;
    _saveTimer?.cancel();
    await _saveQueue;
    if (!_current) return;
    await ListingForm.clearDraft(_account);
    if (!_current) return;
    await api.acknowledgePending();
    if (!_current) return;
    setState(() {
      _completed = true;
      _pending = null;
      _preview = false;
      _error = null;
    });
  }

  bool _matchesEditor(PendingIntent intent) =>
      intent.kind == 'json' &&
      intent.body.containsKey('species') &&
      ((_editingId == null &&
              intent.method == 'POST' &&
              intent.path == '/livestock/listings') ||
          (_editingId != null &&
              intent.method == 'PUT' &&
              intent.path == '/livestock/listings/$_editingId'));

  Future<void> _retry() async {
    if (_pending == null || _busy) return;
    if (_pending!.kind == 'json' && !_matchesEditor(_pending!)) {
      setState(() => _error = const ApiFailure('PENDING_OPERATION'));
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final result = await api.retryPending();
      if (!_current) return;
      if (_pending!.kind == 'upload') {
        await _integratePhoto(result);
      } else {
        await _finish(result);
      }
    } catch (error) {
      await _refreshPending(error);
    } finally {
      if (_current) {
        await _refreshPending();
        if (_current) setState(() => _busy = false);
      }
    }
  }

  String? _integer(String? value, int min, int max) {
    final text = value?.trim() ?? '';
    final amount = RegExp(r'^\d+$').hasMatch(text) ? int.tryParse(text) : null;
    return amount == null || amount < min || amount > max
        ? tr(
            kk,
            'Целое число от $min до $max',
            '$min–$max аралығындағы бүтін сан',
          )
        : null;
  }

  String? _textLimit(String? value, int max, {bool required = false}) {
    final text = value?.trim() ?? '';
    if (required && text.isEmpty) {
      return tr(kk, 'Заполните поле', 'Өрісті толтырыңыз');
    }
    if (text.runes.length > max) {
      return tr(kk, 'Не больше $max символов', '$max таңбадан аспауы керек');
    }
    return null;
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_busy,
    child: Scaffold(
      appBar: AppBar(
        title: Text(
          _completed
              ? tr(kk, 'Готово', 'Дайын')
              : _preview
              ? tr(kk, 'Предпросмотр', 'Алдын ала қарау')
              : _editingId == null
              ? tr(kk, 'Новое объявление', 'Жаңа хабарландыру')
              : tr(kk, 'Редактирование', 'Өңдеу'),
        ),
        leading: _preview
            ? IconButton(
                tooltip: tr(kk, 'К форме', 'Формаға'),
                onPressed: _locked
                    ? null
                    : () => setState(() => _preview = false),
                icon: const Icon(Icons.arrow_back),
              )
            : null,
      ),
      body: SafeArea(
        child: !_ready
            ? const Center(child: CircularProgressIndicator())
            : _completed
            ? _success()
            : Form(
                key: _form,
                child: ListView(
                  controller: _scroll,
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
                  children: [
                    if (_restored && !_preview)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: Notice(
                          text: tr(
                            kk,
                            'Черновик восстановлен. Проверьте данные перед отправкой.',
                            'Жоба қалпына келтірілді. Жіберу алдында деректерді тексеріңіз.',
                          ),
                        ),
                      ),
                    if (_pending != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: Notice(
                          text: tr(
                            kk,
                            'Сохранено незавершённое действие. Повтор использует тот же запрос и ключ.',
                            'Аяқталмаған әрекет сақталған. Қайталау сол сұрау мен кілтті қолданады.',
                          ),
                          action: FilledButton.tonal(
                            onPressed: _busy ? null : _retry,
                            child: Text(
                              tr(
                                kk,
                                'Восстановить результат',
                                'Нәтижені қалпына келтіру',
                              ),
                            ),
                          ),
                        ),
                      ),
                    if (_error != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: Notice(
                          error: true,
                          text: safeError(_error!, kk),
                        ),
                      ),
                    if (_message != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: Notice(text: _message!),
                      ),
                    if (_preview) ..._previewWidgets() else ..._fields(),
                    if (_busy)
                      const Padding(
                        padding: EdgeInsets.all(20),
                        child: Center(child: CircularProgressIndicator()),
                      ),
                  ],
                ),
              ),
      ),
    ),
  );
  Widget _success() => ListView(
    padding: const EdgeInsets.all(24),
    children: [
      const SizedBox(height: 48),
      const Icon(Icons.check_circle, size: 80, color: Color(0xff536d24)),
      const SizedBox(height: 24),
      Text(
        _editingId == null
            ? tr(kk, 'Объявление опубликовано', 'Хабарландыру жарияланды')
            : tr(kk, 'Изменения сохранены', 'Өзгерістер сақталды'),
        textAlign: TextAlign.center,
        style: Theme.of(context).textTheme.headlineMedium,
      ),
      const SizedBox(height: 16),
      Text(
        tr(
          kk,
          'Сервер подтвердил результат. Объявление доступно в разделе «Мои».',
          'Сервер нәтижені растады. Хабарландыру «Менің» бөлімінде.',
        ),
        textAlign: TextAlign.center,
      ),
      const SizedBox(height: 32),
      FilledButton(
        onPressed: () => Navigator.of(context).pop(true),
        child: Text(tr(kk, 'Мои объявления', 'Менің хабарландыруларым')),
      ),
    ],
  );
  List<Widget> _fields() => [
    Text(
      tr(kk, 'Покажите животных', 'Малды көрсетіңіз'),
      style: Theme.of(context).textTheme.headlineSmall,
    ),
    const SizedBox(height: 8),
    Text(
      tr(
        kk,
        'До 3 фото · JPEG, PNG, WebP · до 8 МиБ каждое',
        '3 фотоға дейін · JPEG, PNG, WebP · әрқайсысы 8 МиБ дейін',
      ),
    ),
    const SizedBox(height: 16),
    ..._photoWidgets(editable: !_locked),
    if (_photos.length < 3)
      Wrap(
        spacing: 10,
        runSpacing: 10,
        children: [
          OutlinedButton.icon(
            onPressed: _locked ? null : () => _pick(ImageSource.camera),
            icon: const Icon(Icons.camera_alt_outlined),
            label: Text(tr(kk, 'Камера', 'Камера')),
          ),
          OutlinedButton.icon(
            onPressed: _locked ? null : () => _pick(ImageSource.gallery),
            icon: const Icon(Icons.photo_library_outlined),
            label: Text(tr(kk, 'Галерея', 'Галерея')),
          ),
        ],
      ),
    const SizedBox(height: 26),
    DropdownButtonFormField<String>(
      initialValue: _species,
      isExpanded: true,
      decoration: InputDecoration(
        labelText: tr(kk, 'Вид животного', 'Мал түрі'),
      ),
      items: speciesCodes
          .map(
            (code) => DropdownMenuItem(
              value: code,
              child: Text(speciesName(code, kk)),
            ),
          )
          .toList(),
      onChanged: _locked
          ? null
          : (value) {
              setState(() => _species = value!);
              _changed();
            },
    ),
    const SizedBox(height: 16),
    TextFormField(
      controller: _quantity,
      enabled: !_locked,
      keyboardType: TextInputType.number,
      textInputAction: TextInputAction.next,
      decoration: InputDecoration(
        labelText: tr(kk, 'Количество голов', 'Мал басы саны'),
      ),
      validator: (value) => _integer(value, 1, 10000),
    ),
    const SizedBox(height: 16),
    TextFormField(
      controller: _price,
      enabled: !_locked,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      textInputAction: TextInputAction.next,
      decoration: InputDecoration(
        labelText: tr(kk, 'Цена за голову, ₸', 'Бір бас бағасы, ₸'),
        helperText: tr(
          kk,
          'Не общая стоимость лота',
          'Бүкіл малдың жалпы құны емес',
        ),
      ),
      validator: (value) => parseTenge(value ?? '') == null
          ? tr(
              kk,
              'От 0,01 до 100 000 000 ₸; до 2 знаков после запятой',
              '0,01–100 000 000 ₸; үтірден кейін 2 таңбаға дейін',
            )
          : null,
    ),
    const SizedBox(height: 16),
    TextFormField(
      controller: _locality,
      enabled: !_locked,
      maxLength: 100,
      textInputAction: TextInputAction.next,
      decoration: InputDecoration(
        labelText: tr(kk, 'Город или село', 'Қала немесе ауыл'),
      ),
      validator: (value) => _textLimit(value, 100, required: true),
    ),
    const SizedBox(height: 8),
    TextFormField(
      controller: _market,
      enabled: !_locked,
      maxLength: 100,
      textInputAction: TextInputAction.next,
      decoration: InputDecoration(
        labelText: tr(kk, 'Рынок', 'Базар'),
        helperText: tr(
          kk,
          'Название со слов продавца, не проверенный адрес',
          'Сатушы көрсеткен атау, тексерілген мекенжай емес',
        ),
        helperMaxLines: 3,
      ),
      validator: (value) => _textLimit(value, 100, required: true),
    ),
    const SizedBox(height: 8),
    TextFormField(
      controller: _age,
      enabled: !_locked,
      keyboardType: TextInputType.number,
      textInputAction: TextInputAction.next,
      decoration: InputDecoration(
        labelText: tr(
          kk,
          'Возраст в месяцах (необязательно)',
          'Жасы, ай (міндетті емес)',
        ),
      ),
      validator: (value) => value == null || value.trim().isEmpty
          ? null
          : _integer(value, 0, 600),
    ),
    const SizedBox(height: 16),
    DropdownButtonFormField<String>(
      initialValue: _sex ?? '',
      isExpanded: true,
      decoration: InputDecoration(labelText: tr(kk, 'Пол', 'Жынысы')),
      items: [
        DropdownMenuItem(
          value: '',
          child: Text(tr(kk, 'Не указан', 'Көрсетілмеген')),
        ),
        DropdownMenuItem(value: 'male', child: Text(tr(kk, 'Самец', 'Еркек'))),
        DropdownMenuItem(
          value: 'female',
          child: Text(tr(kk, 'Самка', 'Ұрғашы')),
        ),
        DropdownMenuItem(
          value: 'unknown',
          child: Text(tr(kk, 'Неизвестен', 'Белгісіз')),
        ),
      ],
      onChanged: _locked
          ? null
          : (value) {
              setState(() => _sex = value == '' ? null : value);
              _changed();
            },
    ),
    const SizedBox(height: 16),
    TextFormField(
      controller: _description,
      enabled: !_locked,
      minLines: 3,
      maxLines: 7,
      maxLength: 2000,
      decoration: InputDecoration(
        labelText: tr(
          kk,
          'Описание (необязательно)',
          'Сипаттама (міндетті емес)',
        ),
        alignLabelWithHint: true,
      ),
      validator: (value) => _textLimit(value, 2000),
    ),
    const SizedBox(height: 16),
    TextFormField(
      controller: _contact,
      enabled: !_locked,
      maxLength: 200,
      textInputAction: TextInputAction.done,
      decoration: InputDecoration(
        labelText: tr(
          kk,
          'Телефон или другой контакт',
          'Телефон немесе басқа байланыс',
        ),
      ),
      validator: (value) => _textLimit(value, 200, required: true),
    ),
    CheckboxListTile(
      value: _consent,
      contentPadding: EdgeInsets.zero,
      controlAffinity: ListTileControlAffinity.leading,
      onChanged: _locked
          ? null
          : (value) {
              setState(() => _consent = value ?? false);
              _changed();
            },
      title: Text(
        tr(
          kk,
          'Согласен опубликовать этот контакт в объявлении',
          'Бұл байланысты хабарландыруда жариялауға келісемін',
        ),
      ),
    ),
    const SizedBox(height: 16),
    FilledButton(
      onPressed: _locked ? null : _previewForm,
      child: Text(tr(kk, 'Предпросмотр', 'Алдын ала қарау')),
    ),
    const SizedBox(height: 12),
    Text(
      tr(
        kk,
        'Черновик хранится на этом устройстве для вашего аккаунта. Выход очищает форму.',
        'Жоба осы құрылғыда сіздің аккаунтыңыз үшін сақталады. Шығу форманы тазартады.',
      ),
      style: Theme.of(context).textTheme.bodySmall,
    ),
  ];
  List<Widget> _photoWidgets({bool editable = false}) => _photos
      .map(
        (id) => Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Column(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: ApiPhoto(
                  api: api,
                  path: '/livestock/me/photos/$id',
                  private: true,
                  kk: kk,
                ),
              ),
              if (editable)
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton.icon(
                    onPressed: () {
                      setState(() => _photos.remove(id));
                      _changed();
                    },
                    icon: const Icon(Icons.close),
                    label: Text(tr(kk, 'Убрать фото', 'Фотоны алып тастау')),
                  ),
                ),
            ],
          ),
        ),
      )
      .toList();
  List<Widget> _previewWidgets() => [
    Notice(
      text: _editingId == null
          ? tr(
              kk,
              'Проверьте объявление. Оно станет публичным только после нажатия «Опубликовать».',
              'Хабарландыруды тексеріңіз. Ол «Жариялау» басылғаннан кейін ғана жарияланады.',
            )
          : tr(
              kk,
              'Проверьте изменения. Редактирование не подтверждает наличие на сегодня.',
              'Өзгерістерді тексеріңіз. Өңдеу бүгін бар екенін растамайды.',
            ),
    ),
    const SizedBox(height: 24),
    ..._photoWidgets(),
    Text(
      speciesName(_species, kk),
      style: Theme.of(context).textTheme.headlineMedium,
    ),
    const SizedBox(height: 16),
    Text(
      money(parseTenge(_price.text)!),
      style: const TextStyle(fontSize: 34, fontWeight: FontWeight.w800),
    ),
    Text(tr(kk, 'за одну голову', 'бір бас үшін')),
    const SizedBox(height: 20),
    Text(
      '${_locality.text.trim()} · ${_quantity.text} ${tr(kk, 'голов', 'бас')}',
    ),
    const SizedBox(height: 8),
    Text('${tr(kk, 'Рынок', 'Базар')}: ${normalizedPlace(_market.text)}'),
    if (_age.text.trim().isNotEmpty)
      Padding(
        padding: const EdgeInsets.only(top: 12),
        child: Text('${_age.text} ${tr(kk, 'месяцев', 'ай')}'),
      ),
    if (_sex != null)
      Padding(
        padding: const EdgeInsets.only(top: 12),
        child: Text(switch (_sex) {
          'male' => tr(kk, 'Самец', 'Еркек'),
          'female' => tr(kk, 'Самка', 'Ұрғашы'),
          _ => tr(kk, 'Пол неизвестен', 'Жынысы белгісіз'),
        }),
      ),
    if (_description.text.trim().isNotEmpty)
      Padding(
        padding: const EdgeInsets.symmetric(vertical: 20),
        child: Text(
          _description.text.trim(),
          style: const TextStyle(height: 1.5),
        ),
      ),
    const SizedBox(height: 16),
    Text(
      tr(kk, 'Публичный контакт', 'Жария байланыс'),
      style: Theme.of(context).textTheme.titleMedium,
    ),
    const SizedBox(height: 8),
    Text(_contact.text.trim()),
    const SizedBox(height: 28),
    FilledButton(
      onPressed: _locked ? null : _publish,
      child: Text(
        _editingId == null
            ? tr(kk, 'Опубликовать', 'Жариялау')
            : tr(kk, 'Сохранить изменения', 'Өзгерістерді сақтау'),
      ),
    ),
    const SizedBox(height: 12),
    OutlinedButton(
      onPressed: _locked ? null : () => setState(() => _preview = false),
      child: Text(tr(kk, 'Вернуться к форме', 'Формаға оралу')),
    ),
  ];
}
