"""The chapters' "In production" Python snippets run in real, pinned LangGraph (reference/requirements.txt),
and print what the page says they print. tests/unit/content.test.ts checks the page quotes them exactly."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_send_map_reduce_prints_what_chapter_6_says():
    src = ROOT / "src/data/snippets/send_map_reduce.py.txt"
    out = subprocess.run([sys.executable, "-c", src.read_text()], capture_output=True, text=True, check=True).stdout
    assert out.strip() == "['answer to q1', 'answer to q2', 'answer to q3', '3 answers merged']"
    page = (ROOT / "content/chapters/06-fan-out-and-map-reduce.mdx").read_text()
    assert "['answer to q1', 'answer to q2', 'answer to q3', '3 answers merged']" in page
