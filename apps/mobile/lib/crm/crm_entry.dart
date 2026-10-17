import 'dart:async';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:file_selector/file_selector.dart';

import '../data/api_failure.dart';
import '../ui/common.dart';
import 'crm_drafts.dart';
import 'crm_models.dart';
import 'crm_pages.dart';
import 'crm_ui.dart';
import 'voice_capture.dart';
import 'audio_input.dart';

class CrmEntryPage extends CrmScreen {
  const CrmEntryPage({
    super.key,
    required super.runtime,
    required super.business,
    required super.kk,
  });
  @override
  State<CrmEntryPage> createState() => _CrmEntryPageState();
}

class _CrmEntryPageState extends CrmScreenState<CrmEntryPage>
    with WidgetsBindingObserver {
  late final CrmDrafts drafts;
  late final VoiceCapture voice;
  final text = TextEditingController();
  final AudioPlayer player = AudioPlayer();
  bool voiceMode = false;
  bool playing = false;
  bool preparing = false;
  bool selecting = false;
  AudioInput? imported;
  String? importedPath;
  double? get audioDuration => imported == null
      ? voice.duration
      : imported!.duration.inMilliseconds / 1000;
  Object? localError;
  int sourceRevision = 0;
  StreamSubscription<void>? playback;
  @override
  void initState() {
    super.initState();
    drafts = CrmDrafts(api, scope)..addListener(changed);
    voice = VoiceCapture()..addListener(changed);
    text.addListener(sourceChanged);
    playback = player.onPlayerComplete.listen((_) {
      if (mounted) setState(() => playing = false);
    });
    WidgetsBinding.instance.addObserver(this);
  }

  void changed() {
    if (mounted) setState(() {});
  }

  void sourceChanged() {
    sourceRevision++;
    drafts.invalidate();
  }

  @override
  void identityChanged() {
    if (!api.current(scope)) {
      sourceRevision++;
      drafts.invalidate();
      unawaited(voice.cancel());
      unawaited(stopPlayback());
      unawaited(removeCachedAudio(importedPath));
      importedPath = null;
      imported = null;
    }
    super.identityChanged();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.detached) {
      if (voice.busy) {
        unawaited(voice.cancel());
      } else if (voice.recording) {
        unawaited(voice.stop());
      }
      unawaited(stopPlayback());
    }
  }

  Future<void> stopPlayback() async {
    try {
      await player.stop();
    } catch (_) {}
    if (mounted) setState(() => playing = false);
  }

  Future<void> play() async {
    final path = importedPath ?? voice.path;
    if (path == null || audioDuration == null) return;
    final revision = sourceRevision;
    try {
      await player.play(DeviceFileSource(path));
      if (!active || revision != sourceRevision) {
        await stopPlayback();
        return;
      }
      setState(() => playing = true);
    } catch (_) {
      if (mounted) {
        setState(() => localError = const ApiFailure('AUDIO_INVALID'));
      }
    }
  }

  Future<void> resetAudio() async {
    sourceChanged();
    await stopPlayback();
    await voice.cancel();
    await removeCachedAudio(importedPath);
    importedPath = null;
    imported = null;
    if (mounted) setState(() => localError = null);
  }

  Future<void> selectAudio() async {
    if (!active || selecting || preparing || voice.recording || voice.busy) {
      return;
    }
    setState(() => selecting = true);
    await resetAudio();
    if (!active) {
      if (mounted) setState(() => selecting = false);
      return;
    }
    final revision = sourceRevision;
    String? cache;
    StreamSubscription<Duration>? durationEvents;
    try {
      final file = await openFile(
        acceptedTypeGroups: [
          const XTypeGroup(
            label: 'Audio',
            extensions: [
              'wav',
              'mp3',
              'ogg',
              'opus',
              'webm',
              'm4a',
              'mp4',
              'flac',
            ],
            mimeTypes: ['audio/*', 'video/webm', 'video/mp4'],
            uniformTypeIdentifiers: ['public.audio', 'public.movie'],
          ),
        ],
      );
      if (!active || revision != sourceRevision || file == null) return;
      if (await file.length() > 8 * 1024 * 1024) {
        throw const ApiFailure('AUDIO_INVALID');
      }
      final bytes = await file.readAsBytes();
      final format = detectAudio(bytes);
      if (!active || revision != sourceRevision) return;
      cache = await cacheAudio(bytes, format);
      if (!active || revision != sourceRevision) return;
      final measured = Completer<Duration>();
      durationEvents = player.onDurationChanged.listen((value) {
        if (value > Duration.zero && !measured.isCompleted) {
          measured.complete(value);
        }
      });
      await player
          .setSource(DeviceFileSource(cache))
          .timeout(const Duration(seconds: 8));
      final known = await player.getDuration();
      if (known != null && known > Duration.zero && !measured.isCompleted) {
        measured.complete(known);
      }
      final duration = await measured.future.timeout(
        const Duration(seconds: 8),
      );
      final input = AudioInput(bytes, duration);
      if (!active || revision != sourceRevision) return;
      setState(() {
        imported = input;
        importedPath = cache;
      });
      cache = null;
    } catch (_) {
      if (active && revision == sourceRevision) {
        setState(() => localError = const ApiFailure('AUDIO_INVALID'));
      }
    } finally {
      await durationEvents?.cancel();
      await removeCachedAudio(cache);
      if (mounted) setState(() => selecting = false);
    }
  }

  Future<void> analyze() async {
    if (preparing || selecting || drafts.busy || !active) return;
    final revision = sourceRevision;
    final sourceText = text.text;
    setState(() {
      preparing = true;
      localError = null;
    });
    try {
      await stopPlayback();
      final fileAudio = imported;
      final bytes = voiceMode && fileAudio == null ? await voice.bytes() : null;
      if (!active || revision != sourceRevision) return;
      await drafts.analyze(
        text: voiceMode ? null : sourceText,
        wav: bytes,
        audio: voiceMode ? fileAudio : null,
        locale: kk ? 'kk' : 'ru',
      );
    } catch (e) {
      if (active) setState(() => localError = e);
    } finally {
      if (active) setState(() => preparing = false);
    }
  }

  Future<void> openForm({CrmJson? draft}) async {
    if (!active) return;
    sourceChanged();
    await stopPlayback();
    if (voice.busy) {
      await voice.cancel();
    } else if (voice.recording) {
      await voice.stop();
    }
    if (!mounted || !active) return;
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => OperationForm(
          runtime: widget.runtime,
          business: widget.business,
          kk: kk,
          draft: draft,
        ),
      ),
    );
    if (active && result != null) {
      drafts.invalidate();
      await resetAudio();
      if (mounted) Navigator.pop(context, result);
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    text.removeListener(sourceChanged);
    text.dispose();
    drafts.removeListener(changed);
    drafts.dispose();
    voice.removeListener(changed);
    voice.dispose();
    unawaited(playback?.cancel());
    unawaited(player.dispose());
    unawaited(removeCachedAudio(importedPath));
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => page(
    'Новая запись',
    'Жаңа жазба',
    ListView(
      padding: const EdgeInsets.all(16),
      children: [
        FilledButton.icon(
          onPressed: () => openForm(),
          icon: const Icon(Icons.edit_outlined),
          label: Text(
            tr(
              kk,
              'Продажа вручную / восстановить',
              'Қолмен сату / қалпына келтіру',
            ),
          ),
        ),
        OutlinedButton(
          onPressed: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => LedgerPage(
                runtime: widget.runtime,
                business: widget.business,
                kk: kk,
                debts: true,
              ),
            ),
          ),
          child: Text(
            tr(
              kk,
              'Доплата по открытой продаже',
              'Ашық сатылым бойынша қосымша төлем',
            ),
          ),
        ),
        crmGap,
        Text(
          tr(
            kk,
            'Или подготовьте черновик с AI',
            'Немесе AI көмегімен жоба дайындаңыз',
          ),
          style: Theme.of(context).textTheme.titleLarge,
        ),
        Text(
          tr(
            kk,
            'AI может ошибаться. Анализ отправляется только по кнопке. Черновик не создаёт денежную запись.',
            'AI қателесуі мүмкін. Талдау тек батырма арқылы жіберіледі. Жоба ақша жазбасын жасамайды.',
          ),
        ),
        crmGap,
        Wrap(
          spacing: 12,
          children: [
            for (final mode in [false, true])
              ChoiceChip(
                label: Text(
                  mode ? tr(kk, 'Голос', 'Дауыс') : tr(kk, 'Текст', 'Мәтін'),
                ),
                selected: voiceMode == mode,
                onSelected:
                    voice.busy || voice.recording || preparing || selecting
                    ? null
                    : (_) async {
                        drafts.invalidate();
                        await resetAudio();
                        if (active) setState(() => voiceMode = mode);
                      },
              ),
          ],
        ),
        crmGap,
        if (!voiceMode)
          TextField(
            key: const Key('ai-source'),
            controller: text,
            maxLength: 4000,
            minLines: 3,
            maxLines: 8,
            decoration: InputDecoration(
              labelText: tr(
                kk,
                'Что продали и сколько получили?',
                'Не сатылды және қанша алынды?',
              ),
            ),
          )
        else
          crmCard([
            Text(
              tr(
                kk,
                'Запись или файл: до 30 секунд и 8 MiB. WAV, MP3, OGG/Opus, WebM, M4A/MP4, FLAC. До отправки можно прослушать и удалить. Разрешение микрофона нужно только для записи.',
                'Жазба немесе файл: 30 секундқа және 8 MiB дейін. WAV, MP3, OGG/Opus, WebM, M4A/MP4, FLAC. Жібермес бұрын тыңдауға және өшіруге болады. Микрофон рұқсаты тек жазу үшін қажет.',
              ),
            ),
            if (voice.recording) ...[
              Text(
                '${voice.paused ? tr(kk, 'Пауза', 'Кідіріс') : tr(kk, 'Идёт запись', 'Жазылуда')}: ${voice.seconds} / 29 с',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              FilledButton.icon(
                onPressed: voice.busy ? null : voice.stop,
                icon: const Icon(Icons.stop),
                label: Text(tr(kk, 'Остановить запись', 'Жазуды тоқтату')),
              ),
              if (voice.canPause)
                OutlinedButton.icon(
                  onPressed: voice.busy ? null : voice.togglePause,
                  icon: Icon(voice.paused ? Icons.mic : Icons.pause),
                  label: Text(
                    voice.paused
                        ? tr(kk, 'Продолжить запись', 'Жазуды жалғастыру')
                        : tr(kk, 'Пауза', 'Кідіріс'),
                  ),
                ),
            ] else if (audioDuration != null) ...[
              Text(
                '${tr(kk, 'Готово к прослушиванию', 'Тыңдауға дайын')}: ${audioDuration!.toStringAsFixed(1)} с',
              ),
              OutlinedButton.icon(
                onPressed: playing ? stopPlayback : play,
                icon: Icon(playing ? Icons.stop : Icons.play_arrow),
                label: Text(
                  tr(
                    kk,
                    playing ? 'Остановить прослушивание' : 'Прослушать',
                    playing ? 'Тыңдауды тоқтату' : 'Тыңдау',
                  ),
                ),
              ),
              TextButton(
                onPressed: preparing ? null : resetAudio,
                child: Text(
                  tr(kk, 'Удалить / перезаписать', 'Өшіру / қайта жазу'),
                ),
              ),
            ] else
              FilledButton.icon(
                onPressed: voice.busy || preparing || selecting
                    ? null
                    : () {
                        drafts.invalidate();
                        voice.start();
                      },
                icon: const Icon(Icons.mic),
                label: Text(tr(kk, 'Начать запись', 'Жазуды бастау')),
              ),
            if (!voice.recording)
              OutlinedButton.icon(
                onPressed: voice.busy || preparing || selecting
                    ? null
                    : selectAudio,
                icon: const Icon(Icons.audio_file_outlined),
                label: Text(tr(kk, 'Выбрать аудиофайл', 'Аудиофайл таңдау')),
              ),
            if (voice.recording)
              TextButton(
                onPressed: resetAudio,
                child: Text(
                  tr(kk, 'Отменить и удалить', 'Бас тарту және өшіру'),
                ),
              ),
            if (voice.error != null)
              Text(
                tr(
                  kk,
                  'Запись недоступна. Проверьте разрешение микрофона в настройках или введите текст вручную.',
                  'Жазу қолжетімсіз. Баптаулардан микрофон рұқсатын тексеріңіз немесе мәтінді қолмен енгізіңіз.',
                ),
              ),
          ]),
        if (drafts.busy || preparing || selecting)
          const LinearProgressIndicator(),
        if (localError is ApiFailure &&
            (localError as ApiFailure).code == 'AUDIO_INVALID')
          Text(
            tr(
              kk,
              'Не удалось прочитать аудио. Проверьте формат, длительность до 30 секунд и размер до 8 MiB. Можно записать заново или ввести текст.',
              'Аудионы оқу мүмкін болмады. Пішімін, 30 секундқа дейінгі ұзақтығын және 8 MiB дейінгі өлшемін тексеріңіз. Қайта жазыңыз немесе мәтін енгізіңіз.',
            ),
          ),
        if (drafts.error != null || localError != null)
          Text(
            tr(
              kk,
              'Черновик не получен. Исходные данные оставлены. Проверьте сеть или продолжите вручную. Автоматического повтора нет.',
              'Жоба алынбады. Бастапқы деректер сақталды. Желіні тексеріңіз немесе қолмен жалғастырыңыз. Автоматты қайталау жоқ.',
            ),
          ),
        FilledButton(
          onPressed:
              drafts.busy ||
                  preparing ||
                  selecting ||
                  voice.recording ||
                  voice.busy ||
                  (voiceMode && audioDuration == null)
              ? null
              : analyze,
          child: Text(tr(kk, 'Получить AI-черновик', 'AI жобасын алу')),
        ),
        if (drafts.busy)
          TextButton(
            onPressed: drafts.invalidate,
            child: Text(tr(kk, 'Отменить ожидание', 'Күтуден бас тарту')),
          ),
        if (drafts.draft != null)
          crmCard([
            Text(
              tr(kk, 'Распознано', 'Танылған мәтін'),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            Text(drafts.draft!['transcript'] as String),
            crmGap,
            if (drafts.draft!['customer_query'] != null)
              Text(
                '${tr(kk, 'Упомянутый клиент', 'Аталған клиент')}: ${drafts.draft!['customer_query']}',
              ),
            Text(
              '${tr(kk, 'Сумма', 'Сома')}: ${crmMoney(drafts.draft![drafts.draft!['kind'] == 'repayment' ? 'amount_minor' : 'total_minor'] as int?, kk)}',
            ),
            Text(
              '${tr(kk, 'Получено', 'Алынды')}: ${crmMoney(drafts.draft!['received_minor'] as int?, kk)}',
            ),
            if (drafts.draft!['kind'] == 'unknown')
              Text(
                tr(
                  kk,
                  'Тип операции не определён. Выберите ручную продажу или доплату выше.',
                  'Операция түрі анықталмады. Жоғарыдан қолмен сатуды немесе қосымша төлемді таңдаңыз.',
                ),
              )
            else
              FilledButton(
                onPressed: () => openForm(draft: drafts.draft),
                child: Text(
                  tr(kk, 'Проверить и исправить', 'Тексеру және түзету'),
                ),
              ),
            TextButton(
              onPressed: drafts.invalidate,
              child: Text(tr(kk, 'Отменить черновик', 'Жобадан бас тарту')),
            ),
          ]),
      ],
    ),
  );
}
