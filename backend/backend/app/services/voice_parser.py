"""Free, offline voice-command parser (no paid API).
Input is text from the browser's Web Speech API, e.g.
  "book a plumber tomorrow at 5 pm in Chennai"
"""
import re
from datetime import date, time, timedelta

JOBS = {
    "plumber": ["plumber", "plumbing", "pipe", "tap leak"],
    "electrician": ["electrician", "electrical", "wiring"],
    "carpenter": ["carpenter", "carpentry", "furniture"],
    "painter": ["painter", "painting"],
    "cleaner": ["cleaner", "cleaning", "maid"],
    "mechanic": ["mechanic", "car repair"],
    "ac technician": ["ac technician", "ac repair", "air conditioner"],
    "driver": ["driver"],
    "gardener": ["gardener", "gardening"],
}
WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


def _parse_job(text: str):
    for job, words in JOBS.items():
        if any(w in text for w in words):
            return job
    return None


def _parse_time(text: str):
    m = re.search(r"\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)", text)
    if m:
        h, mins = int(m.group(1)), int(m.group(2) or 0)
        pm = m.group(3).startswith("p")
        if pm and h < 12:
            h += 12
        if not pm and h == 12:
            h = 0
        if h < 24 and mins < 60:
            return time(h, mins)
    m = re.search(r"\bat\s+(\d{1,2})(?::(\d{2}))?\b", text)
    if m:  # "at 5" -> assume PM for hours 1-6
        h, mins = int(m.group(1)), int(m.group(2) or 0)
        if 1 <= h <= 6:
            h += 12
        if h < 24 and mins < 60:
            return time(h, mins)
    m = re.search(r"\b(\d{1,2}):(\d{2})\b", text)
    if m:  # "17:30" or "5:30"
        h, mins = int(m.group(1)), int(m.group(2))
        if 1 <= h <= 6:
            h += 12
        if h < 24 and mins < 60:
            return time(h, mins)
    if "morning" in text:
        return time(9, 0)
    if "afternoon" in text:
        return time(14, 0)
    if "evening" in text:
        return time(18, 0)
    return None


def _parse_date(text: str):
    today = date.today()
    if "day after tomorrow" in text:
        return today + timedelta(days=2)
    if "tomorrow" in text:
        return today + timedelta(days=1)
    if "today" in text or "tonight" in text:
        return today
    for i, name in enumerate(WEEKDAYS):
        if name in text:
            ahead = (i - today.weekday()) % 7 or 7
            return today + timedelta(days=ahead)
    has_date_words = re.search(
        r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b|\b\d{1,2}(st|nd|rd|th)\b|\b\d{1,2}[/-]\d{1,2}\b|next week", text)
    if not has_date_words:
        return None
    try:  # fallback for things like "on 25 december"
        from dateparser.search import search_dates
        found = search_dates(text, settings={"PREFER_DATES_FROM": "future"})
        for _, dt in found or []:
            if dt.date() >= today:
                return dt.date()
    except Exception:
        pass
    return None


def _parse_location(text: str):
    m = re.search(r"\b(?:in|near|around)\s+([a-z][a-z ]*?)(?=\s+(?:tomorrow|today|at|on|for|by)\b|$)", text)
    return m.group(1).strip().title() if m else None


def parse_command(raw: str) -> dict:
    text = raw.lower().strip()
    return {
        "job": _parse_job(text),
        "date": _parse_date(text),
        "time": _parse_time(text),
        "location": _parse_location(text),
    }


def parse_datetime(raw: str, expect_time: bool = False) -> dict:
    """Used in the step-by-step assistant: pull out a date and/or a time."""
    text = raw.lower().strip()
    t = _parse_time(text)
    if t is None and expect_time:
        m = re.fullmatch(r"(?:at\s+)?(\d{1,2})(?::(\d{2}))?", text)  # bare "5" or "5:30"
        if m:
            h, mins = int(m.group(1)), int(m.group(2) or 0)
            if 1 <= h <= 6:
                h += 12
            if h < 24 and mins < 60:
                t = time(h, mins)
    return {"date": _parse_date(text), "time": t}
