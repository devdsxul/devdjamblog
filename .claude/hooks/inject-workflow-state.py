#!/usr/bin/env python3
"""Compatibility entrypoint; keep argv[0] for platform detection."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / ".trellis/scripts/hooks"))
from shared_workflow_state import main
if __name__ == "__main__":
    sys.exit(main())
