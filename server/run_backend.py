from __future__ import annotations

import argparse
import sys
from pathlib import Path

import uvicorn


SERVER_DIR = Path(__file__).resolve().parent
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

import app as backend_app


def main() -> None:
    parser = argparse.ArgumentParser(description="Run HVAC Design Master backend")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=3001)
    args = parser.parse_args()
    uvicorn.run(backend_app.app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
