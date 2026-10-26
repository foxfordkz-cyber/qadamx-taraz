"""Safety and artifact checks for the local release-readiness tooling."""

import json
import zipfile

import pytest

from tools.stage11_release.dataset_audit import build
from tools.stage11_release.rehearsal import validate_run


@pytest.mark.parametrize(
    "run_id,port", [("../main", 55441), ("a;DROP", 55441), ("", 55441), ("a", 543), ("a", 65536)]
)
def test_rehearsal_rejects_unsafe_names_and_ports(run_id, port):
    with pytest.raises(ValueError):
        validate_run(run_id, port)


def test_blind_packet_is_reproducible_and_contains_no_gold(tmp_path):
    first, second = tmp_path / "first", tmp_path / "second"
    build(first)
    build(second)
    assert (first / "blind-review-only.zip").read_bytes() == (
        second / "blind-review-only.zip"
    ).read_bytes()
    with zipfile.ZipFile(first / "blind-review-only.zip") as archive:
        assert set(archive.namelist()) == {
            "INSTRUCTIONS.md",
            "cases.jsonl",
            "reviewer-A.jsonl",
            "reviewer-B.jsonl",
            "gold.schema.json",
        }
        cards = [json.loads(line) for line in archive.read("cases.jsonl").splitlines()]
        assert b"\r\n" not in archive.read("cases.jsonl"), "Freeze portable LF inside ZIP"
        assert len(cards) == 60
        for card in cards:
            assert set(card) == {"sample_id", "language", "text", "customers"}
        for name in ("reviewer-A.jsonl", "reviewer-B.jsonl"):
            for row in map(json.loads, archive.read(name).splitlines()):
                assert row["annotation_status"] == "unreviewed"
                assert row["kind"] is None and row["annotator_code"] == ""
