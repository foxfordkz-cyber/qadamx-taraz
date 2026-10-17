import 'dart:async';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';

import '../data/api_failure.dart';
import '../ui/common.dart';
import 'crm_drafts.dart';
import 'crm_models.dart';
import 'crm_pages.dart';
import 'crm_ui.dart';
import 'voice_capture.dart';

class CrmEntryPage extends CrmScreen {
  const CrmEntryPage({super.key, required super.runtime, required super.business, required super.kk});
  @override
  State<CrmEntryPage> createState() => _CrmEntryPageState();
}
class _CrmEntryPageState extends CrmScreenState<CrmEntryPage> with WidgetsBindingObserver {
  late final CrmDrafts drafts;
  late final VoiceCapture voice;
  final text = TextEditingController();
  final AudioPlayer player = AudioPlayer();
  bool voiceMode = false;
  bool playing = false;
  bool preparing = false;
  Object? localError;
  StreamSubscription<void>? playback;
  @override
  void initState() {
    super.initState();
    drafts = CrmDrafts(api, scope)..addListener(changed);
    voice = VoiceCapture()..addListener(changed);
    text.addListener(drafts.invalidate);
    playback = player.onPlayerComplete.listen((_) { if (mounted) setState(() => playing = false); });
    WidgetsBinding.instance.addObserver(this);
  }
  void changed() { if (mounted) setState(() {}); }
  @override
  void identityChanged() {
    if (!api.current(scope)) { drafts.invalidate(); unawaited(voice.cancel()); unawaited(stopPlayback()); }
    super.identityChanged();
  }
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused || state == AppLifecycleState.detached) {
      if (voice.recording) unawaited(voice.stop());
      unawaited(stopPlayback());
    }
  }
  Future<void> stopPlayback() async {
    try { await player.stop(); } catch (_) {}
    if (mounted) setState(() => playing = false);
  }
  Future<void> play() async {
    if (voice.path == null || voice.duration == null) return;
    try { await player.play(DeviceFileSource(voice.path!)); if (mounted) setState(() => playing = true); }
    catch (_) { if (mounted) setState(() => localError = const ApiFailure('AUDIO_INVALID')); }
  }
  Future<void> resetAudio() async {
    drafts.invalidate(); await stopPlayback(); await voice.cancel();
    if (mounted) setState(() => localError = null);
  }
  Future<void> analyze() async {
    if (preparing || drafts.busy || !active) return;
    setState(() { preparing = true; localError = null; });
    try {
      await stopPlayback();
      final bytes = voiceMode ? await voice.bytes() : null;
      if (!active) return;
      await drafts.analyze(text: voiceMode ? null : text.text, wav: bytes, locale: kk ? 'kk' : 'ru');
    } catch (e) { if (active) setState(() => localError = e); }
    finally { if (active) setState(() => preparing = false); }
  }
  Future<void> openForm({CrmJson? draft}) async {
    if (!active) return;
    await stopPlayback();
    if (!mounted || !active) return;
    final result = await Navigator.push(context, MaterialPageRoute(builder: (_) => OperationForm(runtime: widget.runtime, business: widget.business, kk: kk, draft: draft)));
    if (active && result != null) { drafts.invalidate(); await resetAudio(); if (mounted) Navigator.pop(context, result); }
  }
  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    text.removeListener(drafts.invalidate); text.dispose();
    drafts.removeListener(changed); drafts.dispose();
    voice.removeListener(changed); voice.dispose();
    unawaited(playback?.cancel()); unawaited(player.dispose());
    super.dispose();
  }
  @override
  Widget build(BuildContext context) => page('Новая запись', 'Жаңа жазба', ListView(padding: const EdgeInsets.all(16), children: [
    FilledButton.icon(onPressed: () => openForm(), icon: const Icon(Icons.edit_outlined), label: Text(tr(kk, 'Продажа вручную / восстановить', 'Қолмен сату / қалпына келтіру'))),
    OutlinedButton(onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => LedgerPage(runtime: widget.runtime, business: widget.business, kk: kk, debts: true))), child: Text(tr(kk, 'Доплата по открытой продаже', 'Ашық сатылым бойынша қосымша төлем'))), crmGap,
    Text(tr(kk, 'Или подготовьте черновик с AI', 'Немесе AI көмегімен жоба дайындаңыз'), style: Theme.of(context).textTheme.titleLarge),
    Text(tr(kk, 'AI может ошибаться. Анализ отправляется только по кнопке. Черновик не создаёт денежную запись.', 'AI қателесуі мүмкін. Талдау тек батырма арқылы жіберіледі. Жоба ақша жазбасын жасамайды.')), crmGap,
    Wrap(spacing: 12, children: [for (final mode in [false, true]) ChoiceChip(label: Text(mode ? tr(kk, 'Голос', 'Дауыс') : tr(kk, 'Текст', 'Мәтін')), selected: voiceMode == mode, onSelected: voice.busy || voice.recording || preparing ? null : (_) async {
      drafts.invalidate(); await resetAudio(); if (active) setState(() => voiceMode = mode);
    })]), crmGap,
    if (!voiceMode) TextField(key: const Key('ai-source'), controller: text, maxLength: 4000, minLines: 3, maxLines: 8, decoration: InputDecoration(labelText: tr(kk, 'Что продали и сколько получили?', 'Не сатылды және қанша алынды?')))
    else crmCard([
      Text(tr(kk, 'Разрешение микрофона нужно только для записи. До 30 секунд, WAV. После остановки можно прослушать, удалить или перезаписать.', 'Микрофон рұқсаты тек жазу үшін қажет. 30 секундқа дейін, WAV. Тоқтатқан соң тыңдауға, өшіруге не қайта жазуға болады.')),
      if (voice.recording) ...[
        Text('${tr(kk, 'Идёт запись', 'Жазылуда')}: ${voice.seconds} / 29 с', style: Theme.of(context).textTheme.titleLarge),
        FilledButton.icon(onPressed: voice.busy ? null : voice.stop, icon: const Icon(Icons.stop), label: Text(tr(kk, 'Остановить запись', 'Жазуды тоқтату'))),
      ] else if (voice.duration != null) ...[
        Text('${tr(kk, 'Готово к прослушиванию', 'Тыңдауға дайын')}: ${voice.duration!.toStringAsFixed(1)} с'),
        OutlinedButton.icon(onPressed: playing ? stopPlayback : play, icon: Icon(playing ? Icons.stop : Icons.play_arrow), label: Text(tr(kk, playing ? 'Остановить прослушивание' : 'Прослушать', playing ? 'Тыңдауды тоқтату' : 'Тыңдау'))),
        TextButton(onPressed: preparing ? null : resetAudio, child: Text(tr(kk, 'Удалить / перезаписать', 'Өшіру / қайта жазу'))),
      ] else FilledButton.icon(onPressed: voice.busy || preparing ? null : () { drafts.invalidate(); voice.start(); }, icon: const Icon(Icons.mic), label: Text(tr(kk, 'Начать запись', 'Жазуды бастау'))),
      if (voice.recording) TextButton(onPressed: resetAudio, child: Text(tr(kk, 'Отменить и удалить', 'Бас тарту және өшіру'))),
      if (voice.error != null) Text(tr(kk, 'Запись недоступна. Проверьте разрешение микрофона в настройках или введите текст вручную.', 'Жазу қолжетімсіз. Баптаулардан микрофон рұқсатын тексеріңіз немесе мәтінді қолмен енгізіңіз.')),
    ]),
    if (drafts.busy || preparing) const LinearProgressIndicator(),
    if (drafts.error != null || localError != null) Text(tr(kk, 'Черновик не получен. Исходные данные оставлены. Проверьте сеть или продолжите вручную. Автоматического повтора нет.', 'Жоба алынбады. Бастапқы деректер сақталды. Желіні тексеріңіз немесе қолмен жалғастырыңыз. Автоматты қайталау жоқ.')),
    FilledButton(onPressed: drafts.busy || preparing || voice.recording || voice.busy || (voiceMode && voice.duration == null) ? null : analyze, child: Text(tr(kk, 'Получить AI-черновик', 'AI жобасын алу'))),
    if (drafts.busy) TextButton(onPressed: drafts.invalidate, child: Text(tr(kk, 'Отменить ожидание', 'Күтуден бас тарту'))),
    if (drafts.draft != null) crmCard([
      Text(tr(kk, 'Распознано', 'Танылған мәтін'), style: Theme.of(context).textTheme.titleMedium),
      Text(drafts.draft!['transcript'] as String), crmGap,
      if (drafts.draft!['customer_query'] != null) Text('${tr(kk, 'Упомянутый клиент', 'Аталған клиент')}: ${drafts.draft!['customer_query']}'),
      Text('${tr(kk, 'Сумма', 'Сома')}: ${crmMoney(drafts.draft![drafts.draft!['kind'] == 'repayment' ? 'amount_minor' : 'total_minor'] as int?, kk)}'),
      Text('${tr(kk, 'Получено', 'Алынды')}: ${crmMoney(drafts.draft!['received_minor'] as int?, kk)}'),
      if (drafts.draft!['kind'] == 'unknown') Text(tr(kk, 'Тип операции не определён. Выберите ручную продажу или доплату выше.', 'Операция түрі анықталмады. Жоғарыдан қолмен сатуды немесе қосымша төлемді таңдаңыз.'))
      else FilledButton(onPressed: () => openForm(draft: drafts.draft), child: Text(tr(kk, 'Проверить и исправить', 'Тексеру және түзету'))),
      TextButton(onPressed: drafts.invalidate, child: Text(tr(kk, 'Отменить черновик', 'Жобадан бас тарту'))),
    ]),
  ]));
}
