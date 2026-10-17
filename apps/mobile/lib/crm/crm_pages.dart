import 'dart:async';
import 'package:flutter/material.dart';

import '../data/api_failure.dart';
import '../data/money.dart';
import '../ui/common.dart';
import 'crm_api.dart';
import 'crm_models.dart';
import 'crm_ui.dart';
import 'crm_daily.dart';

class CustomersPage extends CrmScreen {
  const CustomersPage({
    super.key,
    required super.runtime,
    required super.business,
    required super.kk,
    this.picker = false,
  });
  final bool picker;
  @override
  State<CustomersPage> createState() => _CustomersPageState();
}

class _CustomersPageState extends CrmScreenState<CustomersPage> {
  final query = TextEditingController();
  List<CrmJson> items = [];
  String? next;
  String submittedQuery = '';
  Object? error;
  bool busy = true;
  int request = 0;
  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  void dispose() {
    query.dispose();
    super.dispose();
  }

  Future<void> load({bool more = false}) async {
    final generation = ++request;
    if (!more) submittedQuery = query.text.trim();
    setState(() {
      busy = true;
      error = null;
      if (!more) {
        items = [];
        next = null;
      }
    });
    try {
      final result = await api.customers(
        scope,
        query: submittedQuery,
        cursor: more ? next : null,
      );
      if (active && generation == request) {
        setState(() {
          items = [...items, ...result.items];
          next = result.next;
        });
      }
    } catch (e) {
      if (active && generation == request) setState(() => error = e);
    } finally {
      if (active && generation == request) setState(() => busy = false);
    }
  }

  Future<void> create() async {
    final result = await Navigator.push<CrmJson>(
      context,
      MaterialPageRoute(
        builder: (_) => CustomerForm(
          runtime: widget.runtime,
          business: widget.business,
          kk: kk,
        ),
      ),
    );
    if (!mounted || !active) return;
    if (widget.picker && result != null) {
      Navigator.pop(context, result);
      return;
    }
    await load();
  }

  @override
  Widget build(BuildContext context) => page(
    widget.picker ? 'Выберите клиента' : 'Клиенты',
    widget.picker ? 'Клиентті таңдаңыз' : 'Клиенттер',
    ListView(
      padding: const EdgeInsets.all(16),
      children: [
        TextField(
          controller: query,
          maxLength: 200,
          decoration: InputDecoration(
            labelText: tr(kk, 'Имя или контакт', 'Аты немесе байланысы'),
          ),
          onSubmitted: (_) => load(),
        ),
        OutlinedButton(
          onPressed: busy ? null : () => load(),
          child: Text(tr(kk, 'Найти', 'Іздеу')),
        ),
        FilledButton.icon(
          onPressed: create,
          icon: const Icon(Icons.person_add_outlined),
          label: Text(
            tr(
              kk,
              'Новый клиент / восстановить',
              'Жаңа клиент / қалпына келтіру',
            ),
          ),
        ),
        crmGap,
        if (busy) const LinearProgressIndicator(),
        if (error != null) Text(crmError(error!, kk)),
        if (!busy && error == null && items.isEmpty)
          Text(
            tr(
              kk,
              'Клиентов пока нет по этому запросу.',
              'Бұл сұрау бойынша клиенттер жоқ.',
            ),
          ),
        for (final customer in items)
          crmCard([
            Text(
              customer['display_name'] as String,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            if (customer['contact'] != null)
              Text(customer['contact'] as String),
            Text(
              '${tr(kk, 'Долг', 'Қарыз')}: ${crmMoney(customer['balance_minor'] as int, kk)}',
            ),
            if ((customer['note'] as String? ?? '').isNotEmpty)
              Text(customer['note'] as String),
            if (widget.picker)
              FilledButton(
                onPressed: () => Navigator.pop(context, customer),
                child: Text(tr(kk, 'Выбрать', 'Таңдау')),
              )
            else
              OutlinedButton(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => LedgerPage(
                      runtime: widget.runtime,
                      business: widget.business,
                      kk: kk,
                      debts: true,
                      customer: customer['id'] as String,
                    ),
                  ),
                ),
                child: Text(tr(kk, 'Открытые продажи', 'Ашық сатылымдар')),
              ),
          ]),
        if (next != null)
          OutlinedButton(
            onPressed: busy ? null : () => load(more: true),
            child: Text(tr(kk, 'Загрузить ещё', 'Тағы жүктеу')),
          ),
      ],
    ),
  );
}

class CustomerForm extends CrmScreen {
  const CustomerForm({
    super.key,
    required super.runtime,
    required super.business,
    required super.kk,
  });
  @override
  State<CustomerForm> createState() => _CustomerFormState();
}

class _CustomerFormState extends CrmScreenState<CustomerForm> {
  final name = TextEditingController();
  final contact = TextEditingController();
  final note = TextEditingController();
  @override
  void dispose() {
    name.dispose();
    contact.dispose();
    note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => page(
    'Новый клиент',
    'Жаңа клиент',
    ListView(
      padding: const EdgeInsets.all(16),
      children: [
        CrmWritePanel(
          api: api,
          scope: scope,
          kk: kk,
          action: customerAction,
          body: () => {
            'display_name': name.text.trim(),
            'contact': contact.text.trim().isEmpty ? null : contact.text.trim(),
            'note': note.text.trim(),
          },
          onDone: (customer) => Navigator.pop(context, customer),
          form: Column(
            children: [
              TextField(
                key: const Key('customer-name'),
                controller: name,
                maxLength: 200,
                decoration: InputDecoration(
                  labelText: tr(kk, 'Имя клиента', 'Клиенттің аты'),
                ),
              ),
              crmGap,
              TextField(
                controller: contact,
                maxLength: 200,
                decoration: InputDecoration(
                  labelText: tr(
                    kk,
                    'Контакт — необязательно',
                    'Байланыс — міндетті емес',
                  ),
                ),
              ),
              crmGap,
              TextField(
                controller: note,
                maxLength: 2000,
                maxLines: 3,
                decoration: InputDecoration(
                  labelText: tr(kk, 'Заметка', 'Ескерту'),
                ),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class OperationForm extends CrmScreen {
  const OperationForm({
    super.key,
    required super.runtime,
    required super.business,
    required super.kk,
    this.sale,
    this.draft,
  });
  final CrmJson? sale;
  final CrmJson? draft;
  @override
  State<OperationForm> createState() => _OperationFormState();
}

class _OperationFormState extends CrmScreenState<OperationForm> {
  final total = TextEditingController();
  final paid = TextEditingController();
  final description = TextEditingController();
  CrmJson? customer;
  CrmJson? sale;
  bool get repayment =>
      widget.sale != null || widget.draft?['kind'] == 'repayment';
  @override
  void initState() {
    super.initState();
    sale = widget.sale;
    final draft = widget.draft;
    if (draft != null) {
      description.text = draft['description'] as String? ?? '';
      final amount = draft[repayment ? 'amount_minor' : 'total_minor'];
      if (amount is int) total.text = priceInput(amount);
      // Unknown payment is intentionally blank, never a fabricated zero.
      if (!repayment && draft['received_minor'] is int) {
        paid.text = priceInput(draft['received_minor'] as int);
      }
    }
  }

  @override
  void dispose() {
    total.dispose();
    paid.dispose();
    description.dispose();
    super.dispose();
  }

  Future<void> chooseCustomer() async {
    final selected = await Navigator.push<CrmJson>(
      context,
      MaterialPageRoute(
        builder: (_) => CustomersPage(
          runtime: widget.runtime,
          business: widget.business,
          kk: kk,
          picker: true,
        ),
      ),
    );
    if (active && selected != null) {
      setState(() {
        customer = selected;
        sale = null;
      });
    }
  }

  Future<void> chooseSale() async {
    final selected = await Navigator.push<CrmJson>(
      context,
      MaterialPageRoute(
        builder: (_) => LedgerPage(
          runtime: widget.runtime,
          business: widget.business,
          kk: kk,
          debts: true,
          picker: true,
          customer: customer?['id'] as String?,
        ),
      ),
    );
    if (active && selected != null) setState(() => sale = selected);
  }

  void checkDraft() {
    if (widget.draft == null) return;
    final expiry = DateTime.tryParse(
      widget.draft!['expires_at'] as String? ?? '',
    );
    if (expiry == null || !DateTime.now().toUtc().isBefore(expiry)) {
      throw const ApiFailure('DRAFT_EXPIRED');
    }
  }

  CrmJson body() {
    checkDraft();
    final amount = crmAmount(total.text);
    if (amount == null) throw const ApiFailure('VALIDATION_ERROR');
    if (repayment) {
      if (sale == null || amount > (sale!['balance_minor'] as int)) {
        throw const ApiFailure('VALIDATION_ERROR');
      }
      return {
        'kind': 'repayment',
        'sale_id': sale!['id'],
        'amount_minor': amount,
        'description': description.text.trim(),
        if (widget.draft != null) 'draft_id': widget.draft!['id'],
      };
    }
    final received = crmAmount(paid.text, allowZero: true);
    if (received == null ||
        received > amount ||
        (received < amount && customer == null)) {
      throw const ApiFailure('VALIDATION_ERROR');
    }
    return {
      'kind': 'sale',
      'customer_id': customer?['id'],
      'total_minor': amount,
      'received_minor': received,
      'description': description.text.trim(),
      if (widget.draft != null) 'draft_id': widget.draft!['id'],
    };
  }

  @override
  Widget build(BuildContext context) => page(
    repayment ? 'Доплата' : 'Новая продажа',
    repayment ? 'Қосымша төлем' : 'Жаңа сатылым',
    ListView(
      padding: const EdgeInsets.all(16),
      children: [
        CrmWritePanel(
          api: api,
          scope: scope,
          kk: kk,
          action: operationAction,
          body: body,
          beforeConfirm: checkDraft,
          reviewNote: repayment
              ? '${sale?['description'] ?? ''}\n${sale == null ? '' : crmDate(sale!['created_at'] as String)}'
              : customer?['display_name'] as String?,
          onDone: (receipt) => Navigator.pop(context, receipt),
          form: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (widget.draft != null) ...[
                Text(
                  tr(
                    kk,
                    'AI подготовил черновик. Проверьте суммы и самостоятельно выберите клиента / продажу. Деньги ещё не записаны.',
                    'AI жоба дайындады. Сомаларды тексеріп, клиентті / сатылымды өзіңіз таңдаңыз. Ақша әлі жазылған жоқ.',
                  ),
                ),
                crmGap,
                for (final question
                    in (widget.draft!['questions'] as List? ?? []))
                  Text('• $question'),
                crmGap,
              ],
              if (widget.sale == null) ...[
                Text(
                  customer?['display_name'] as String? ??
                      tr(kk, 'Клиент не выбран', 'Клиент таңдалмаған'),
                ),
                OutlinedButton(
                  onPressed: chooseCustomer,
                  child: Text(tr(kk, 'Выбрать клиента', 'Клиентті таңдау')),
                ),
                if (customer != null && !repayment)
                  TextButton(
                    onPressed: () => setState(() => customer = null),
                    child: Text(
                      tr(kk, 'Убрать клиента', 'Клиентті алып тастау'),
                    ),
                  ),
              ],
              if (repayment) ...[
                if (sale == null)
                  Text(
                    tr(
                      kk,
                      'Выберите конкретную открытую продажу.',
                      'Нақты ашық сатылымды таңдаңыз.',
                    ),
                  )
                else
                  Text(
                    '${sale!['description']}\n${tr(kk, 'Остаток', 'Қалдық')}: ${crmMoney(sale!['balance_minor'] as int, kk)}',
                  ),
                if (widget.sale == null)
                  OutlinedButton(
                    onPressed: chooseSale,
                    child: Text(tr(kk, 'Выбрать продажу', 'Сатылымды таңдау')),
                  ),
              ],
              crmGap,
              TextField(
                key: const Key('operation-total'),
                controller: total,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration: InputDecoration(
                  labelText: tr(
                    kk,
                    repayment ? 'Сумма доплаты, ₸' : 'Сумма продажи, ₸',
                    repayment ? 'Қосымша төлем, ₸' : 'Сатылым сомасы, ₸',
                  ),
                ),
              ),
              crmGap,
              if (!repayment) ...[
                TextField(
                  key: const Key('operation-paid'),
                  controller: paid,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  decoration: InputDecoration(
                    labelText: tr(
                      kk,
                      'Получено, ₸ — укажите явно',
                      'Алынды, ₸ — нақты көрсетіңіз',
                    ),
                  ),
                ),
                TextButton(
                  onPressed: () => setState(() => paid.text = total.text),
                  child: Text(
                    tr(kk, 'Получена вся сумма', 'Толық сома алынды'),
                  ),
                ),
                crmGap,
              ],
              TextField(
                controller: description,
                maxLength: 1000,
                maxLines: 3,
                decoration: InputDecoration(
                  labelText: tr(kk, 'Описание', 'Сипаттама'),
                ),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class LedgerPage extends CrmScreen {
  const LedgerPage({
    super.key,
    required super.runtime,
    required super.business,
    required super.kk,
    this.debts = false,
    this.picker = false,
    this.customer,
  });
  final bool debts;
  final bool picker;
  final String? customer;
  @override
  State<LedgerPage> createState() => _LedgerPageState();
}

class _LedgerPageState extends CrmScreenState<LedgerPage> {
  List<CrmJson> items = [];
  final Map<String, String> names = {};
  int nameRequest = 0;
  String? next;
  bool busy = true;
  Object? error;
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load({bool more = false}) async {
    setState(() {
      busy = true;
      error = null;
      if (!more) {
        items = [];
        next = null;
      }
    });
    try {
      final result = await api.operations(
        scope,
        debts: widget.debts,
        customer: widget.customer,
        cursor: more ? next : null,
      );
      if (active) {
        setState(() {
          items = [...items, ...result.items];
          next = result.next;
        });
        unawaited(loadNames());
      }
    } catch (e) {
      if (active) setState(() => error = e);
    } finally {
      if (active) setState(() => busy = false);
    }
  }

  Future<void> loadNames() async {
    final request = ++nameRequest;
    final wanted = items
        .map((item) => item['customer_id'])
        .whereType<String>()
        .where((id) => !names.containsKey(id))
        .toSet();
    if (wanted.isEmpty) return;
    String? cursor;
    final visited = <String>{};
    try {
      // Bound the optional name lookup; ledger amounts never depend on it.
      for (var page = 0; page < 10; page++) {
        final result = await api.customers(scope, cursor: cursor);
        if (!active || request != nameRequest) return;
        setState(() {
          for (final customer in result.items) {
            names[customer['id'] as String] =
                customer['display_name'] as String;
            wanted.remove(customer['id']);
          }
        });
        cursor = result.next;
        if (wanted.isEmpty || cursor == null || !visited.add(cursor)) return;
      }
    } catch (_) {
      /* Amounts remain the validated server ledger; no guessed names. */
    }
  }

  Future<void> open(CrmJson sale) async {
    if (widget.picker) {
      Navigator.pop(context, sale);
      return;
    }
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => OperationForm(
          runtime: widget.runtime,
          business: widget.business,
          kk: kk,
          sale: sale,
        ),
      ),
    );
    if (active) await load();
  }

  @override
  Widget build(BuildContext context) => page(
    widget.debts ? 'Долги / открытые продажи' : 'История',
    widget.debts ? 'Қарыздар / ашық сатылымдар' : 'Тарих',
    ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          tr(
            kk,
            'Время: Asia/Almaty. Балансы и записи получены с сервера.',
            'Уақыт: Asia/Almaty. Қалдықтар мен жазбалар серверден алынды.',
          ),
        ),
        OutlinedButton(
          onPressed: busy ? null : () => load(),
          child: Text(tr(kk, 'Обновить', 'Жаңарту')),
        ),
        if (busy) const LinearProgressIndicator(),
        if (error != null) Text(crmError(error!, kk)),
        if (!busy && error == null && items.isEmpty)
          Text(
            tr(
              kk,
              widget.debts ? 'Открытых долгов нет.' : 'Записей пока нет.',
              widget.debts ? 'Ашық қарыздар жоқ.' : 'Әзірге жазбалар жоқ.',
            ),
          ),
        for (final item in items)
          crmCard([
            if (item['customer_id'] != null)
              Text(
                names[item['customer_id']] ??
                    tr(
                      kk,
                      'Имя клиента пока не загружено',
                      'Клиент аты әлі жүктелмеді',
                    ),
              ),
            Text(
              item['description'] as String,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            Text(crmDate(item['created_at'] as String)),
            if (widget.debts) ...[
              Text(
                '${tr(kk, 'Продажа', 'Сатылым')}: ${crmMoney(item['total_minor'] as int, kk)}',
              ),
              Text(
                '${tr(kk, 'Получено', 'Алынды')}: ${crmMoney(item['received_minor'] as int, kk)}',
              ),
              Text(
                '${tr(kk, 'Остаток', 'Қалдық')}: ${crmMoney(item['balance_minor'] as int, kk)}',
              ),
              FilledButton(
                onPressed: () => open(item),
                child: Text(
                  tr(
                    kk,
                    widget.picker ? 'Выбрать' : 'Записать доплату',
                    widget.picker ? 'Таңдау' : 'Қосымша төлемді жазу',
                  ),
                ),
              ),
            ] else ...[
              if (item['kind'] != 'reversal')
                OutlinedButton(
                  onPressed: () async {
                    await Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => ReverseOperationPage(
                          runtime: widget.runtime,
                          business: widget.business,
                          kk: kk,
                          operation: item,
                        ),
                      ),
                    );
                    if (active) await load();
                  },
                  child: Text(tr(kk, 'Отменить операцию', 'Операцияны жою')),
                ),
              Text(switch (item['kind']) {
                'sale' => tr(kk, 'Продажа', 'Сатылым'),
                'repayment' => tr(kk, 'Доплата', 'Қосымша төлем'),
                _ => tr(kk, 'Отмена операции', 'Операцияны жою'),
              }),
              Text(
                '${tr(kk, 'Продажи', 'Сатылымдар')}: ${crmMoney(item['sales_delta_minor'] as int, kk)}',
              ),
              Text(
                '${tr(kk, 'Поступления', 'Түсімдер')}: ${crmMoney(item['receipts_delta_minor'] as int, kk)}',
              ),
            ],
          ]),
        if (next != null)
          OutlinedButton(
            onPressed: busy ? null : () => load(more: true),
            child: Text(tr(kk, 'Загрузить ещё', 'Тағы жүктеу')),
          ),
      ],
    ),
  );
}

class InquiriesPage extends CrmScreen {
  const InquiriesPage({
    super.key,
    required super.runtime,
    required super.business,
    required super.kk,
  });
  @override
  State<InquiriesPage> createState() => _InquiriesPageState();
}

class _InquiriesPageState extends CrmScreenState<InquiriesPage> {
  List<CrmJson> items = [];
  String? next;
  Object? error;
  bool busy = true;
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load({bool more = false}) async {
    setState(() {
      busy = true;
      error = null;
      if (!more) items = [];
    });
    try {
      final result = await api.inquiries(scope, cursor: more ? next : null);
      if (active) {
        setState(() {
          items = [...items, ...result.items];
          next = result.next;
        });
      }
    } catch (e) {
      if (active) setState(() => error = e);
    } finally {
      if (active) setState(() => busy = false);
    }
  }

  String statusLabel(String status) => switch (status) {
    'new' => tr(kk, 'Новая', 'Жаңа'),
    'in_progress' => tr(kk, 'В работе', 'Жұмыста'),
    _ => tr(kk, 'Закрыта', 'Жабық'),
  };
  Future<void> update(CrmJson item, String status) async {
    if (busy || !active) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          tr(kk, 'Изменить статус заявки?', 'Өтінім күйін өзгерту керек пе?'),
        ),
        content: Text('${item['visitor_name']} → ${statusLabel(status)}'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(tr(kk, 'Отмена', 'Бас тарту')),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(tr(kk, 'Подтвердить', 'Растау')),
          ),
        ],
      ),
    );
    if (!active || confirmed != true) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final value = await api.updateInquiry(
        scope,
        item['id'] as String,
        status,
      );
      if (active) {
        setState(
          () => items = [
            for (final old in items)
              if (old['id'] == value['id']) value else old,
          ],
        );
      }
    } catch (e) {
      if (active) setState(() => error = e);
    } finally {
      if (active) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => page(
    'Заявки',
    'Өтінімдер',
    ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          tr(
            kk,
            'Заявки с витрины. Изменение статуса не создаёт продажу.',
            'Витринадан түскен өтінімдер. Күйді өзгерту сатылым жасамайды.',
          ),
        ),
        OutlinedButton(
          onPressed: busy ? null : () => load(),
          child: Text(tr(kk, 'Обновить', 'Жаңарту')),
        ),
        if (busy) const LinearProgressIndicator(),
        if (error != null) Text(crmError(error!, kk)),
        if (!busy && error == null && items.isEmpty)
          Text(tr(kk, 'Заявок пока нет.', 'Әзірге өтінімдер жоқ.')),
        for (final item in items)
          crmCard([
            Text(item['visitor_name'] as String),
            Text(item['contact'] as String),
            Text(item['message'] as String),
            Text(switch (item['status']) {
              'new' => tr(kk, 'Новая', 'Жаңа'),
              'in_progress' => tr(kk, 'В работе', 'Жұмыста'),
              _ => tr(kk, 'Закрыта', 'Жабық'),
            }),
            Wrap(
              spacing: 8,
              children: [
                for (final status in ['new', 'in_progress', 'closed'])
                  if (status != item['status'])
                    OutlinedButton(
                      onPressed: busy ? null : () => update(item, status),
                      child: Text(statusLabel(status)),
                    ),
              ],
            ),
          ]),
        if (next != null)
          OutlinedButton(
            onPressed: busy ? null : () => load(more: true),
            child: Text(tr(kk, 'Загрузить ещё', 'Тағы жүктеу')),
          ),
      ],
    ),
  );
}
