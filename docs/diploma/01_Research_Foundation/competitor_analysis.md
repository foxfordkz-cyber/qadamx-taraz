# Аналогтарды шектеулі source-based салыстыру

**Тақырып:** «Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу».

**Нұсқа күні:** 24.10.2026. Негізгі source: `main@2518b2e80b8c`. Зерттеу кандидаты: `feature/ml-sales-debt-research@b7c4750b158a`. Ресми жұмыс/жоба жіктелімі расталмаған.

| Жүйе | Есеп дәлелі | Еске салу | Тіл/дауыс | Шектеу | Дерек |
|---|---|---|---|---|---|
| Qadam main | Journal sale/repayment/reversal кодымен расталған | WhatsApp deep-link, сатушы өзі жібереді | RU/KK және voice/text draft кодта бар | Шығын/салық/stock толық есебі жоқ | [`apps/api/app/services/ledger.py:78`](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/2518b2e80b8c8ef881063a968645382d61aeb37e/apps/api/app/services/ledger.py#L78) |
| МойСклад | Контрагент айналымы, қарыз/аванс және reconciliation есебі ресми docs-та | Осы source бетінде reminder салыстыруы тексерілмеді | Kazakh/STT support осы зерттеуде Not verified | Кеңірек accounting doc flow; практикалық trial жүргізілмеді | [L23](https://support.moysklad.ru/hc/ru/отчеты/взаиморасчеты) |
| Zoho Books | Pending invoice/bill туралы reminder context бар | Due-date based automated reminder ресми FAQ-та бар | Kazakh/shop voice extraction осы зерттеуде Not verified | Region/plan ерекшелігі болуы мүмкін; price тексерілген жоқ | [L22](https://www.zoho.com/us/books/kb/reminders/rem-addnew.html) |
| 1С:УНФ | Сатып алушы және жеткізуші қарызы операциялардан көрінеді | Осы қысқа source-та reminder capability Not verified | Kazakh/STT осы зерттеуде Not verified | Толық trial не Kazakhstan-localized edition салыстырылмады | [L24](https://its.1c.ru/db/content/pubchaos2order/src/text/107.html) |

Бұл feature ranking не сатып алу ұсынысы емес. «Not verified» өнімде мүмкіндік жоқ дегенді білдірмейді. Баға, licensing, offline, deployment, Kazakhstan compliance және нақты task completion бірдей protocol-пен тексерілгеннен кейін ғана артықшылық қорытындысы жасалады. Үш ресми source 24.10.2026 күні қаралды. Келесі trial: бір sale, partial payment, later repayment, reversal, reminder, language change. Бірдей seed/тапсырма және дәлел capture қажет.
