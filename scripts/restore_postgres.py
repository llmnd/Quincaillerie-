#!/usr/bin/env python3
"""Restore a PostgreSQL dump into the configured ERP database."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlparse


def get_env(name: str, default: str | None = None) -> str:
    value = os.getenv(name, default)
    if value is None:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def ensure_command(command: str) -> None:
    if subprocess.run(["where", command], shell=True, capture_output=True).returncode != 0:
        raise RuntimeError(f"Command not found: {command}. Install PostgreSQL client tools first.")


def main() -> int:
    database_url = get_env("DATABASE_URL")
    backup_file = Path(get_env("BACKUP_FILE"))

    if not backup_file.exists():
        raise FileNotFoundError(f"Backup file not found: {backup_file}")

    ensure_command("psql")

    parsed = urlparse(database_url)
    if parsed.scheme not in {"postgresql", "postgres"}:
        raise RuntimeError("DATABASE_URL must be a PostgreSQL URL such as postgresql://user:pass@host:5432/dbname")

    host = parsed.hostname or "localhost"
    port = parsed.port or 5432
    dbname = parsed.path.lstrip("/")
    user = parsed.username or "postgres"

    command = [
        "psql",
        f"--host={host}",
        f"--port={port}",
        f"--username={user}",
        f"--dbname={dbname}",
        "--single-transaction",
        "--file",
        str(backup_file),
    ]

    env = os.environ.copy()
    env["PGPASSWORD"] = parsed.password or ""

    print(f"Restoring backup into {dbname} from {backup_file}")
    result = subprocess.run(command, env=env)
    if result.returncode != 0:
        raise RuntimeError(f"psql restore failed with exit code {result.returncode}")

    print("Restore completed successfully.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # pragma: no cover - CLI safety
        print(f"Restore failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
