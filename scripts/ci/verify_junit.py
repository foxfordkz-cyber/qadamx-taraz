"""Fail closed when CI reports are absent, empty, failed or contain skips."""

import sys
import xml.etree.ElementTree as ET
from pathlib import Path


def verify(path: Path) -> int:
    cases = list(ET.parse(path).getroot().iter("testcase"))
    if not cases or any(
        case.find(tag) is not None
        for case in cases
        for tag in ("failure", "error", "skipped")
    ):
        raise ValueError("Expected nonempty test cases with zero failures/errors/skips")
    return len(cases)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("At least one JUnit report is required")
    for argument in sys.argv[1:]:
        path = Path(argument)
        try:
            count = verify(path)
        except (OSError, ET.ParseError, ValueError) as error:
            # No report contents or captured test output in this diagnostic.
            raise SystemExit(
                f"Invalid CI report {path.name}: {type(error).__name__}"
            ) from None
        print(f"{path.name}: {count} cases, zero failures/errors/skips")
