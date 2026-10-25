"""Bounded RU/KK evidence grounding; no model, IDs, database or money writes.

The provider still selects intent and evidence. This is not a general language
parser: unknown/ambiguous amount syntax asks for clarification instead of guessing.
"""

import re
import unicodedata
from decimal import Decimal, InvalidOperation

from app.schemas import MAX_OPERATION_MINOR

SMALL = {
    "ноль": 0,
    "нуль": 0,
    "нөл": 0,
    "один": 1,
    "одна": 1,
    "одно": 1,
    "одну": 1,
    "бір": 1,
    "два": 2,
    "две": 2,
    "екі": 2,
    "три": 3,
    "үш": 3,
    "четыре": 4,
    "төрт": 4,
    "пять": 5,
    "бес": 5,
    "шесть": 6,
    "алты": 6,
    "семь": 7,
    "жеті": 7,
    "восемь": 8,
    "сегіз": 8,
    "девять": 9,
    "тоғыз": 9,
    "десять": 10,
    "он": 10,
    "одиннадцать": 11,
    "двенадцать": 12,
    "тринадцать": 13,
    "четырнадцать": 14,
    "пятнадцать": 15,
    "шестнадцать": 16,
    "семнадцать": 17,
    "восемнадцать": 18,
    "девятнадцать": 19,
    "двадцать": 20,
    "жиырма": 20,
    "тридцать": 30,
    "отыз": 30,
    "сорок": 40,
    "қырық": 40,
    "пятьдесят": 50,
    "елу": 50,
    "шестьдесят": 60,
    "алпыс": 60,
    "семьдесят": 70,
    "жетпіс": 70,
    "восемьдесят": 80,
    "сексен": 80,
    "девяносто": 90,
    "тоқсан": 90,
    "сто": 100,
    "двести": 200,
    "триста": 300,
    "четыреста": 400,
    "пятьсот": 500,
    "шестьсот": 600,
    "семьсот": 700,
    "восемьсот": 800,
    "девятьсот": 900,
    "полтора": Decimal("1.5"),
    "полторы": Decimal("1.5"),
}
SCALES = dict.fromkeys(("тысяча", "тысячи", "тысяч", "тысячу", "тыс", "мың", "мыңын", "мыңы"), 1000)
SCALES.update(dict.fromkeys(("миллион", "миллиона", "миллионов"), 1000000))
NUMBER = r"[0-9]+(?:[ \u00a0\u202f][0-9]{3})*(?:[.,][0-9]+)?"
TOKENS = re.compile(NUMBER + r"|[^\W\d_]+", re.UNICODE)
AMBIGUOUS = re.compile(
    r"\b(?:или|либо|әлде|не|если|может|кажется|примерно|около|шамамен|егер|"
    r"жарты|половин\w*|четверть|пол)\b",
    re.I,
)
FOREIGN = re.compile(r"[$€£₽]|\b(?:usd|eur|rub|доллар\w*|евро|рубл\w*)\b", re.I)
FULL = re.compile(
    r"\b(?:(?:оплатил[аи]?|оплачен[оа]?|заплатил[аи]?)\s+(?:(?:сразу|уже|сейчас)\s+)?(?:полностью|все)|"
    r"(?:полностью|все)\s+(?:оплатил[аи]?|оплачен[оа]?|заплатил[аи]?)|"
    r"(?:толық|түгел|бәрін|толығымен)\s+(?:төледі|төленді))\b"
)
ZERO = re.compile(
    r"\b(?:(?:все|полностью)\s+в\s+долг|ничего\s+не\s+(?:заплатил[аи]?|оплатил[аи]?)|"
    r"(?:бәрі|толығымен)\s+қарызға|(?:ештеңе|ақша)\s+төлемеді)\b"
)


def normalized(text):
    return unicodedata.normalize("NFC", text).casefold().replace("ё", "е")


def _number(tokens):
    """Descending scales/groups; reject repeated units and malformed combinations."""
    total, group = Decimal(0), None
    previous_scale, rank = 10**9, 4
    for token in tokens:
        if token in SCALES:
            scale = SCALES[token]
            if scale >= previous_scale:
                return None
            total += (Decimal(1) if group is None else group) * scale
            previous_scale, group, rank = scale, None, 4
        elif token == "жүз":
            if group is not None and not (0 < group < 10 and group == int(group)):
                return None
            if rank >= 3 and group is not None:
                return None
            group, rank = (Decimal(1) if group is None else group) * 100, 3
        elif token == "жарым":
            if group is None or not (0 < group < 10 and group == int(group)):
                return None
            group += Decimal("0.5")
            rank = 0
        elif token in SMALL:
            value = Decimal(SMALL[token])
            next_rank = 3 if value >= 100 else 2 if value >= 10 else 1
            if next_rank >= rank:
                return None
            group = (group or Decimal(0)) + value
            rank = next_rank
        else:
            if group is not None or len(token) > 30:
                return None
            cleaned = re.sub(r"[ \u00a0\u202f]", "", token).replace(",", ".")
            if "." in cleaned and len(cleaned.split(".")[1]) > 2:
                return None
            try:
                group = Decimal(cleaned)
            except InvalidOperation:
                return None
            rank = 0
    return total + (group or Decimal(0))


def money_from_quote(quote):
    """Exactly one contiguous numeric expression, in KZT or explicit tiyn."""
    if not quote:
        return None
    text = normalized(quote)
    if (
        AMBIGUOUS.search(text)
        or FOREIGN.search(text)
        or re.search(r"[+−–—\-/?%]", text)
        or re.search(r"\b(?:минус|теріс|телефон|номер|шт|штук|дана|кг|kg|процент\w*)\b", text)
    ):
        return None
    runs, current = [], []
    previous_end = None
    for match in TOKENS.finditer(text):
        token = match[0]
        number = (
            token in SMALL or token in SCALES or token in {"жүз", "жарым"} or token[0].isdigit()
        )
        # Punctuation between numerals is not addition (dates, ranges, alternatives).
        if current and previous_end is not None and text[previous_end : match.start()].strip():
            runs.append(current)
            current = []
        if number:
            current.append(token)
        elif current:
            runs.append(current)
            current = []
        previous_end = match.end()
    if current:
        runs.append(current)
    if len(runs) != 1:
        return None
    amount = _number(runs[0])
    if amount is None:
        return None
    factor = 1 if re.search(r"\b(?:тиын|тиына|тиынов|тиынға)\b", text) else 100
    minor = amount * factor
    if minor != minor.to_integral_value() or not 0 <= minor <= MAX_OPERATION_MINOR:
        return None
    return int(minor)


def money_from_evidence(quote, transcript):
    """Reject truncated numbers; retain an adjacent source currency unit.

    Repeated identical quotes with incompatible units cannot establish a value.
    Role/relevance of the quote remains a provider + explicit human-review boundary.
    """
    if not quote:
        return None
    quote, source = normalized(quote), normalized(transcript)
    tokens = list(TOKENS.finditer(quote))
    if not tokens:
        return None

    def numeric(word):
        return word in SMALL or word in SCALES or word in {"жүз", "жарым"} or word[0].isdigit()

    values = set()
    for match in re.finditer(re.escape(quote), source):
        before, after = source[: match.start()], source[match.end() :]
        if re.search(r"\b(?:не|нет|если)\s+(?:\w+\s+)?$", before):
            return None
        if re.match(r"\s*(?:теңге\s+)?(?:төлемеді|төленбеді|алмадым)\b", after):
            return None
        left, right = list(TOKENS.finditer(before)), list(TOKENS.finditer(after))
        if numeric(tokens[0][0]):
            if before.rstrip().endswith(("-", "−", "+")):
                return None
            if left and numeric(left[-1][0]) and not before[left[-1].end() :].strip():
                return None
            if quote[0].isdigit() and re.search(r"[\d.,]$", before):
                return None
        if numeric(tokens[-1][0]):
            if right and numeric(right[0][0]) and not after[: right[0].start()].strip():
                return None
            if quote[-1].isdigit() and re.match(r"(?:\d|[.,]\d)", after):
                return None
            if re.match(r"\s*(?:%|шт\b|штук\b|дана\b|кг\b)", after):
                return None
        unit = re.match(r"\s*(тиын(?:а|ов|ға)?|теңге(?:ге)?|тенге|тг|₸)(?!\w)", after)
        value = money_from_quote(quote + (" " + unit[1] if unit else ""))
        values.add(value)
    return values.pop() if len(values) == 1 else None


def customer_in_source(query, transcript):
    """Require a spoken name; bounded RU/KK case endings, never choose an ID."""
    if not query:
        return False
    source = normalized(transcript)
    name = normalized(query).strip()
    words = name.split()
    if not words or any(not re.fullmatch(r"[^\W\d_]+(?:[-'][^\W\d_]+)*", w) for w in words):
        return False
    last = re.escape(words[-1])
    # Cyrillic nominative → common oblique endings, not arbitrary fuzzy matching.
    forms = [last + r"(?:ға|ге|қа|ке|дан|ден|тан|тен|ның|нің|ды|ді|ты|ті|у|а|ом|е)?"]
    if words[-1].endswith("а"):
        forms.append(re.escape(words[-1][:-1]) + r"(?:е|у|ой|ы)")
    if words[-1].endswith("я"):
        forms.append(re.escape(words[-1][:-1]) + r"(?:е|ю|ей|и)")
    if words[-1].endswith("ь"):
        forms.append(re.escape(words[-1][:-1]) + r"(?:и|ю|е)")
    prefix = r"\s+".join(re.escape(w) for w in words[:-1])
    pattern = re.compile(
        r"(?<!\w)" + (prefix + r"\s+" if prefix else "") + "(?:" + "|".join(forms) + r")(?!\w)"
    )
    matches = list(pattern.finditer(source))
    if not matches:
        return False
    for match in matches:
        before, after = source[: match.start()], source[match.end() :]
        if not (
            re.search(r"\b(?:или|либо|әлде)\s*$", before)
            or re.match(r"\s+(?:или|либо|әлде)\b", after)
        ):
            return True
    return False


def full_payment_from_source(quote, transcript):
    """A short 'fully' quote needs an actual positive payment clause in source."""
    if not quote or "?" in quote or AMBIGUOUS.search(quote):
        return False
    if not FULL.search(quote) and quote not in {
        "полностью",
        "все",
        "толық",
        "түгел",
        "бәрін",
        "толығымен",
    }:
        return False
    source = normalized(transcript)
    evidence = list(re.finditer(re.escape(quote), source))
    clauses = list(FULL.finditer(source))
    return bool(evidence) and all(
        any(
            max(clause.start(), item.start()) < min(clause.end(), item.end())
            and not AMBIGUOUS.search(source[max(0, clause.start() - 25) : clause.start()])
            and not source[clause.end() :].lstrip().startswith("?")
            for clause in clauses
        )
        for item in evidence
    )


def zero_payment_from_source(quote, transcript):
    """A zero-payment quote must not omit adjacent negation or a question."""
    literal = quote.strip(" .,!;:")
    if not ZERO.fullmatch(literal):
        return False
    source = normalized(transcript)
    matches = list(re.finditer(re.escape(literal), source))
    return bool(matches) and all(
        not AMBIGUOUS.search(source[max(0, item.start() - 25) : item.start()])
        and not re.match(r"\s*(?:\?|емес\b)", source[item.end() :])
        for item in matches
    )


def ground_extraction(result):
    """Use quoted values, keep uncertainty, ask instead of inventing defaults."""

    def uncertain(field):
        setattr(result, field, None)
        if field not in result.uncertain_fields:
            result.uncertain_fields.append(field)

    result.uncertain_fields = list(dict.fromkeys(result.uncertain_fields))
    if result.kind == "unknown":
        return result
    if FOREIGN.search(result.transcript):
        result.kind = "unknown"
        result.total_minor = result.received_minor = result.amount_minor = None
        return result
    if result.customer_query and not customer_in_source(result.customer_query, result.transcript):
        uncertain("customer_query")
    field = "total_minor" if result.kind == "sale" else "amount_minor"
    quote = result.total_evidence if result.kind == "sale" else result.amount_evidence
    if getattr(result, field) is not None and field not in result.uncertain_fields:
        value = money_from_evidence(quote, result.transcript)
        if value is None or value == 0:
            uncertain(field)
        else:
            setattr(result, field, value)
    if result.kind == "repayment":
        return result
    if result.payment_status == "unknown" or "received_minor" in result.uncertain_fields:
        uncertain("received_minor")
        return result
    quote = normalized(result.payment_evidence or "")
    # Explicit numeric receipt wins over a conflicting provider paid/debt label.
    value = money_from_evidence(result.payment_evidence, result.transcript)
    numeric_quote = any(
        m[0] in SMALL or m[0] in SCALES or m[0] in {"жүз", "жарым"} or m[0][0].isdigit()
        for m in TOKENS.finditer(quote)
    )
    future = re.search(r"\b(?:должен|нужно|надо|завтра|потом|будет|ертең|кейін)\b", quote)
    receipt = re.search(
        r"\b(?:оплат\w*|заплат\w*|получил\w*|внес\w*|дал[аи]?|төлед\w*|"
        r"төлен\w*|берді|алдым|төлем)\b",
        quote,
    )
    if future or (numeric_quote and result.payment_status in {"paid", "debt"} and not receipt):
        uncertain("received_minor")
        result.payment_status = "unknown"
        return result
    if value is None:
        if zero_payment_from_source(quote, result.transcript):
            value = 0
        elif not numeric_quote and full_payment_from_source(quote, result.transcript):
            value = result.total_minor
    if value is None or (result.total_minor is not None and value > result.total_minor):
        uncertain("received_minor")
        result.payment_status = "unknown"
    else:
        result.received_minor = value
        result.payment_status = (
            "debt" if value == 0 else "paid" if value == result.total_minor else "partial"
        )
    return result
