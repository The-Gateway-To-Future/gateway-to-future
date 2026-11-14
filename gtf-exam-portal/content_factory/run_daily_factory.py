#!/usr/bin/env python3
"""
Wrapper entry point delegating to workspace master content_factory/run_daily_factory.py.
Allows running `python content_factory/run_daily_factory.py` from either workspace root
or `gtf-exam-portal/`.
"""

from __future__ import annotations

import runpy
import sys
from pathlib import Path

ROOT_FACTORY_SCRIPT = (
    Path(__file__).resolve().parent.parent.parent / "content_factory" / "run_daily_factory.py"
)

if __name__ == "__main__":
    if not ROOT_FACTORY_SCRIPT.exists():
        print(f"ERROR: Master runner not found at {ROOT_FACTORY_SCRIPT}", file=sys.stderr)
        sys.exit(1)
    runpy.run_path(str(ROOT_FACTORY_SCRIPT), run_name="__main__")
