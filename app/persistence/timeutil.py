"""RFC 3339 UTC timestamps as fixed-width strings, so lexicographic order equals time order."""
from __future__ import annotations

from datetime import datetime, timezone


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def format_utc(moment: datetime) -> str:
    """e.g. 2026-10-11T08:30:00.123Z (millisecond precision, truncated)."""
    if moment.tzinfo is None:
        raise ValueError("naive datetime: pass a timezone-aware value")
    moment = moment.astimezone(timezone.utc)
    return moment.strftime("%Y-%m-%dT%H:%M:%S.") + f"{moment.microsecond // 1000:03d}Z"
