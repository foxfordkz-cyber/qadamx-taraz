# Зерттеу шекарасы

**Тақырып:** «Жасанды интеллект технологиялары негізінде шағын бизнестің сатылымдары мен қарыздарын басқаруға арналған ақпараттық жүйені әзірлеу».

**Нұсқа күні:** 24.10.2026. Негізгі source: `main@2518b2e80b8c`. Зерттеу кандидаты: `feature/ml-sales-debt-research@b7c4750b158a`. Ресми жұмыс/жоба жіктелімі расталмаған.


## Негізгі және candidate қабаттар

- **Core source:** main `2518b2e80b8c8ef881063a968645382d61aeb37e`. Sales/payment/debt/reversal/customer/AI draft/assistant/descriptive analytics бар. Толық бухгалтерия/салық/forecast/risk/user-study нәтижесі main-да жоқ.
- **Candidate:** `b7c4750b158a6b1fc747e63a68ae7b2d078b5107` main-нан төрт commit алда. Ridge forecast, rules-v1 priority және feedback persistence коды бар; main-ға merge жасалмаған. Forecast/risk screen және FeedbackForm route integration табылмады.
- **Proposed:** structured semantic factual validator v2. Main мен candidate assistant.py бірдей. Stage 1 осы open gap-қа бағытталады.
- **Unverified:** production revision, PostgreSQL integration осы workspace run, Flutter build/device acceptance, real ASR quality және user feedback.

## Қамтылмайтын жұмыс

Осы орындауда application source өзгерту, migration орындау, deployment, merge/main push, production DB/AI request, қарыздарды өзгерту, контактілерге хабар жіберу және нақты зерттеу нәтижесін ойдан толтыру жоқ. Catering жобасынан ешбір generated financial dataset алынған жоқ. Нақты дерек жиналғанша synthetic мәлімет business evidence ретінде қолданылмайды.

## Scope шешімдері

Ресми жіктелім расталмайынша «дипломдық жұмыс» және «дипломдық жоба» талаптары қатар көрсетіледі. 50 мазмұндық бет — conditional planning target, approved layout емес. Студенттің жеке үлесі/аты белгісіз болғандықтан final authorship статусы `Blocked`.

## Status анықтамалары

Not started, In progress, Implemented, Tested, Evidence collected, Verified for thesis, Blocked. `Implemented` source code барын білдіреді. `Tested` нақты көрсетілген suite/орта үшін ғана. `Evidence collected` artifact барын білдіреді, бүкіл гипотеза дәлелденгенін білдірмейді. `Verified for thesis` тек студент/жетекші тексеріп, claim мен source байланысын бекіткенде қойылады. Қазір бұл мәртебе автоматты берілмейді.
