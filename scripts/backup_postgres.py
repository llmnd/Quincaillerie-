#!/usr/bin/env python3
"""Create a PostgreSQL dump for the ERP production database."""

from __future__ import annotations

import os
import subprocess
import sys
from datetime import datetime
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
    backup_dir = Path(get_env("BACKUP_DIR", "./backups"))
    backup_dir.mkdir(parents=True, exist_ok=True)

    ensure_command("pg_dump")

    parsed = urlparse(database_url)
    if parsed.scheme not in {"postgresql", "postgres"}:
        raise RuntimeError("DATABASE_URL must be a PostgreSQL URL such as postgresql://user:pass@host:5432/dbname")

    host = parsed.hostname or "localhost"
    port = parsed.port or 5432
    dbname = parsed.path.lstrip("/")
    user = parsed.username or "postgres"

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%SZ")
    backup_name = f"erp_backup_{timestamp}.sql"
    backup_path = backup_dir / backup_name

    command = [
        "pg_dump",
        f"--host={host}",
        f"--port={port}",
        f"--username={user}",
        f"--dbname={dbname}",
        "--clean",
        "--if-exists",
        "--format=plain",
        "--file",
        str(backup_path),
    ]

    env = os.environ.copy()
    env["PGPASSWORD"] = parsed.password or ""

    print(f"Creating backup: {backup_path}")
    result = subprocess.run(command, env=env)
    if result.returncode != 0:
        raise RuntimeError(f"pg_dump failed with exit code {result.returncode}")

    print(f"Backup created successfully: {backup_path}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # pragma: no cover - CLI safety
        print(f"Backup failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
