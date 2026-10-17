import 'package:flutter/material.dart';

import '../data/api_failure.dart';
import '../runtime.dart';
import '../ui/common.dart';
import '../ui/qadam_theme.dart';
import 'crm_api.dart';
import 'crm_models.dart';
import 'crm_pending.dart';

String crmError(Object error, bool kk) {
  final code = error is ApiFailure ? error.code : '';
  return switch (code) {
    'ACCOUNT_CHANGED' => tr(
      kk,
      'Аккаунт изменился. Вернитесь к выбору точки.',
      'Аккаунт өзгерді. Нүктені қайта таңдаңыз.',
    ),
    'AUTH_REQUIRED' => tr(
      kk,
      'Не удалось подтвердить вход. Повторите вход через Профиль.',
      'Кіру расталмады. Профиль арқылы қайта кіріңіз.',
    ),
    'VALIDATION_ERROR' => tr(
      kk,
      'Проверьте поля: суммы в тенге, не больше двух знаков после запятой. При долге нужен клиент.',
      'Өрістерді тексеріңіз: сома теңгемен, үтірден кейін екі таңбадан аспайды. Қарыз үшін клиент қажет.',
    ),
    'BALANCE_CHANGED' => tr(
      kk,
      'Остаток изменился. Проверьте историю и текущий долг в кабинете.',
      'Қалдық өзгерді. Кабинеттен тарих пен ағымдағы қарызды тексеріңіз.',
    ),
    'DRAFT_EXPIRED' || 'DRAFT_USED' => tr(
      kk,
      'Черновик истёк или уже использован. Проверьте историю в кабинете.',
      'Жоба мерзімі аяқталған немесе қолданылған. Кабинеттен тарихты тексеріңіз.',
    ),
    'NOT_FOUND' => tr(
      kk,
      'Доступ к записи не подтверждён. Обновите список точек.',
      'Жазбаға қолжетімділік расталмады. Нүктелер тізімін жаңартыңыз.',
    ),
    'PENDING_UNAVAILABLE' => tr(
      kk,
      'Защищённое хранилище недоступно. Запись не отправляем; повторите позже.',
      'Қорғалған сақтау орны қолжетімсіз. Жазба жіберілмейді; кейін қайталаңыз.',
    ),
    'PENDING_EXISTS' || 'PENDING_CHANGED' => tr(
      kk,
      'Есть сохранённое действие. Закройте форму и откройте её снова для восстановления.',
      'Сақталған әрекет бар. Қалпына келтіру үшін пішінді қайта ашыңыз.',
    ),
    'IDEMPOTENCY_CONFLICT' => tr(
      kk,
      'Конфликт сохранённого запроса. Не создавайте дубликат; нужна проверка команды.',
      'Сақталған сұрау қайшылығы. Қайталама жазба жасамаңыз; команда тексеруі қажет.',
    ),
    _ => tr(
      kk,
      'Ответ не получен или не прошёл проверку. Данные формы сохранены. Проверьте сеть и повторите.',
      'Жауап алынбады немесе тексеруден өтпеді. Пішін деректері сақталды. Желіні тексеріп, қайталаңыз.',
    ),
  };
}

Widget crmCard(List<Widget> children) => Card(
  margin: const EdgeInsets.only(bottom: QadamTheme.gap),
  child: Padding(
    padding: const EdgeInsets.all(QadamTheme.pagePadding),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: children,
    ),
  ),
);
const crmGap = SizedBox(height: QadamTheme.gap);

/// All private routes fence responses by SDK identity and session generation.
abstract class CrmScreen extends StatefulWidget {
  const CrmScreen({
    super.key,
    required this.runtime,
    required this.business,
    required this.kk,
  });
  final MobileRuntime runtime;
  final String business;
  final bool kk;
}

abstract class CrmScreenState<T extends CrmScreen> extends State<T> {
  late final CrmApi api;
  late final CrmScope scope;
  bool get kk => widget.kk;
  bool get active => mounted && api.current(scope);
  @override
  void initState() {
    super.initState();
    api = widget.runtime.crmApi!;
    scope = api.scope(widget.business);
    widget.runtime.addListener(identityChanged);
  }

  void identityChanged() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    widget.runtime.removeListener(identityChanged);
    super.dispose();
  }

  Widget guarded(Widget child) => active
      ? child
      : Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(crmError(const ApiFailure('ACCOUNT_CHANGED'), kk)),
          ),
        );
  Widget page(String ru, String kz, Widget body) => Scaffold(
    appBar: AppBar(title: Text(tr(kk, ru, kz))),
    body: SafeArea(child: guarded(body)),
  );
}

/// The only UI that sends CRM writes. Preview is separate from confirmation.
/// Once dispatched, the immutable intent remains until a validated receipt is
/// acknowledged. Neither a timeout nor not_observed unlocks a new key.
class CrmWritePanel extends StatefulWidget {
  const CrmWritePanel({
    super.key,
    required this.api,
    required this.scope,
    required this.kk,
    required this.action,
    required this.form,
    required this.body,
    required this.onDone,
    this.beforeConfirm,
    this.reviewNote,
  });
  final CrmApi api;
  final CrmScope scope;
  final bool kk;
  final String action;
  final Widget form;
  final CrmJson Function() body;
  final ValueChanged<CrmJson> onDone;
  final void Function()? beforeConfirm;
  final String? reviewNote;
  @override
  State<CrmWritePanel> createState() => _CrmWritePanelState();
}

class _CrmWritePanelState extends State<CrmWritePanel> {
  CrmIntent? intent;
  Object? error;
  bool busy = true;
  bool unavailable = false;
  bool notObserved = false;
  bool get valid => mounted && widget.api.current(widget.scope);
  bool get kk => widget.kk;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final saved = await widget.api.pending.load(widget.scope, widget.action);
      if (!valid) return;
      if (saved != null) widget.api.validateBody(widget.action, saved.body);
      setState(() {
        intent = saved;
        unavailable = false;
      });
    } catch (e) {
      if (valid) {
        setState(() {
          error = e;
          unavailable = true;
        });
      }
    } finally {
      if (valid) setState(() => busy = false);
    }
  }

  Future<void> _preview() async {
    if (busy || !valid) return;
    try {
      final body = widget.body();
      widget.api.validateBody(widget.action, body);
      final accepted = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(tr(kk, 'Проверьте запись', 'Жазбаны тексеріңіз')),
          content: SingleChildScrollView(
            child: Text('${widget.reviewNote ?? ''}\n${_description(body)}'),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(tr(kk, 'Изменить', 'Өзгерту')),
            ),
            FilledButton(
              key: const Key('crm-confirm'),
              onPressed: () => Navigator.pop(context, true),
              child: Text(tr(kk, 'Подтвердить запись', 'Жазбаны растау')),
            ),
          ],
        ),
      );
      if (accepted != true || !valid) return;
      widget.beforeConfirm?.call();
      setState(() {
        busy = true;
        error = null;
      });
      intent = await widget.api.begin(widget.scope, widget.action, body);
      if (!valid) return;
      await _send();
    } catch (e) {
      if (valid) setState(() => error = e);
    } finally {
      if (valid) setState(() => busy = false);
    }
  }

  Future<void> _send({bool recover = false}) async {
    if (!valid || intent == null) return;
    setState(() {
      busy = true;
      error = null;
      notObserved = false;
    });
    try {
      final result = recover
          ? await widget.api.recoverCustomer(widget.scope, intent!)
          : await widget.api.send(widget.scope, widget.action, intent!);
      if (valid) {
        setState(() {
          intent = result;
          notObserved = recover && result.receipt == null;
        });
      }
    } catch (e) {
      if (valid) setState(() => error = e);
    } finally {
      if (valid) setState(() => busy = false);
    }
  }

  String _description(CrmJson body) {
    if (widget.action == customerAction) {
      return '${body['display_name']}\n${body['contact'] ?? ''}\n${body['note'] ?? ''}';
    }
    if (body['kind'] == 'repayment') {
      return '${tr(kk, 'Доплата', 'Қосымша төлем')}: ${crmMoney(body['amount_minor'] as int, kk)}\n${body['description']}';
    }
    return '${tr(kk, 'Продажа', 'Сатылым')}: ${crmMoney(body['total_minor'] as int, kk)}\n${tr(kk, 'Получено', 'Алынды')}: ${crmMoney(body['received_minor'] as int, kk)}\n${tr(kk, 'Долг', 'Қарыз')}: ${crmMoney((body['total_minor'] as int) - (body['received_minor'] as int), kk)}\n${body['description']}\n${tr(kk, body['customer_id'] == null ? 'Без клиента' : 'Клиент выбран в форме', body['customer_id'] == null ? 'Клиентсіз' : 'Клиент пішінде таңдалған')}';
  }

  Future<void> _done() async {
    if (!valid || busy || intent?.receipt == null) return;
    setState(() => busy = true);
    try {
      final receipt = intent!.receipt!;
      final removed = await widget.api.pending.acknowledge(intent!);
      if (!removed) throw const ApiFailure('PENDING_CHANGED');
      if (valid) widget.onDone(receipt);
    } catch (e) {
      if (valid) {
        setState(() {
          error = e;
          busy = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      if (busy) const LinearProgressIndicator(),
      if (error != null)
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Text(crmError(error!, kk), key: const Key('crm-error')),
        ),
      if (unavailable)
        OutlinedButton(
          onPressed: busy ? null : _load,
          child: Text(tr(kk, 'Проверить хранилище', 'Сақтау орнын тексеру')),
        )
      else if (intent == null) ...[
        widget.form,
        crmGap,
        FilledButton(
          key: const Key('crm-preview'),
          onPressed: busy ? null : _preview,
          child: Text(tr(kk, 'Предпросмотр', 'Алдын ала қарау')),
        ),
      ] else ...[
        Text(_description(intent!.body)),
        crmGap,
        if (intent!.receipt != null) ...[
          Text(
            tr(kk, 'Сервер подтвердил запись.', 'Сервер жазбаны растады.'),
            key: const Key('crm-confirmed'),
          ),
          FilledButton(
            onPressed: busy ? null : _done,
            child: Text(tr(kk, 'Готово', 'Дайын')),
          ),
        ] else ...[
          Text(
            tr(
              kk,
              'Сохранён незавершённый запрос. Повтор отправит те же данные с тем же ключом. Новую запись пока не создавайте.',
              'Аяқталмаған сұрау сақталды. Қайталау сол деректерді сол кілтпен жібереді. Әзірге жаңа жазба жасамаңыз.',
            ),
          ),
          if (notObserved)
            Text(
              tr(
                kk,
                'Результат пока не найден. Это не подтверждает отказ; исходный запрос сохранён.',
                'Нәтиже әлі табылмады. Бұл бас тартуды растамайды; бастапқы сұрау сақталды.',
              ),
            ),
          if (widget.action == customerAction)
            OutlinedButton(
              onPressed: busy ? null : () => _send(recover: true),
              child: Text(tr(kk, 'Проверить результат', 'Нәтижені тексеру')),
            ),
          FilledButton(
            onPressed: busy ? null : () => _send(),
            child: Text(
              tr(kk, 'Повторить исходный запрос', 'Бастапқы сұрауды қайталау'),
            ),
          ),
        ],
      ],
    ],
  );
}
