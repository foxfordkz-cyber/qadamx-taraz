# Stage1 frozen paired-protocol evaluation v1

Application validator өзгермей тұрғанда18valid/24invalid synthetic case бекітілді. Case файл SHA-256: `46732cf49f163a0b571019c32ea44e9910c6e46d96a65f961786e0db66988700`.

Бір case = бір мағыналық intent + бір server snapshot + locale/days. Ескі валидатор legacy free-prose JSON алады; жаңа валидатор ID-only structured JSON алады. Екі representation алдын ала fixture-ге сақталды. Бірдей raw JSON екеуіне берілді деп айтылмайды: protocol өзгерісі — осы intervention-ның бір бөлігі. Override value/name/unit беру жаңа contract-та forbidden. Сондықтан нәтиже validation+rendering architecture correctness туралы, LLM-нің еркін жауапты түсіну қабілеті туралы емес.

Gold-positive=valid;TP validaccepted,FN validrejected,FP invalidaccepted,TN invalidrejected. FAR=FP/(FP+TN),FRR=FN/(TP+FN),precision=TP/(TP+FP),recall=TP/(TP+FN),F1=2TP/(2TP+FP+FN). Denominator0→null. Duplicate/malformed protocol-policy cases financial-association failures-мен бірге бар; category raw нәтижелерде ашылады. Convenience adversarial set prevalence-і шынайы application prevalence емес; finite rate-ті population accuracy-ге ауыстырмау.

Түпнұсқа4pilot: invented customer,wrong fact binding,wrong debtor amount accepted;new number rejected. Frozen42case baseline:TP18,FP19,TN5,FN0. Baseline comparison алдында copy-нің critical definitions AST-ы original main-мен бірдей екені және әр observed result-і live original validator-мен теңдігі тексерілді. Тек import/blank-line formatting нормаланған. Baseline `tests/evaluation_baselines` ішінде,production runtime импорттамайды.

No real person/debt/audio/license-restricted data; synthetic fixture,AI-assisted construction. No provider/network/database calls. Case/gold/snapshot freeze файлдары кейін tuned/өзгертілмейді; жаңа scope үшін v2dataset қажет. Implementation әлі осы freeze commit ішінде жоқ. Student independent verification/attribution кейін бекітіледі.
