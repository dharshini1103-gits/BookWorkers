from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, WorkerProfile, Availability
from ..schemas import VoiceIn
from ..services.voice_parser import parse_command, parse_datetime
from ..utils.dependencies import require_role

router = APIRouter(prefix="/voice", tags=["Voice Agent"])


@router.post("/parse")
def voice_parse(data: VoiceIn, user: User = Depends(require_role("customer")),
                db: Session = Depends(get_db)):
    """Step 1: understand the sentence + suggest the best matching slots.
    The frontend reads the suggestion back, the user confirms,
    then the frontend calls POST /bookings with source="voice"."""
    parsed = parse_command(data.text)
    missing = [k for k in ("job", "date", "time") if not parsed[k]]
    result = {
        "heard": data.text,
        "parsed": {"job": parsed["job"], "location": parsed["location"],
                   "date": parsed["date"].isoformat() if parsed["date"] else None,
                   "time": parsed["time"].strftime("%H:%M") if parsed["time"] else None},
        "missing": missing, "suggestions": [],
    }
    if missing:
        result["message"] = "I still need: " + ", ".join(missing)
        return result

    q = (db.query(Availability, WorkerProfile)
           .join(WorkerProfile, WorkerProfile.user_id == Availability.worker_id)
           .filter(Availability.is_booked == False,  # noqa: E712
                   Availability.date == parsed["date"],
                   WorkerProfile.job.ilike(f"%{parsed['job']}%")))
    if parsed["location"]:
        q = q.filter(WorkerProfile.location.ilike(f"%{parsed['location']}%"))

    wanted = datetime.combine(parsed["date"], parsed["time"])
    now = datetime.now()
    rows = [(s, p) for s, p in q.all() if datetime.combine(s.date, s.start_time) > now]
    # best = closest to requested time, then highest rating
    rows.sort(key=lambda r: (abs(datetime.combine(r[0].date, r[0].start_time) - wanted),
                             -(r[1].avg_rating or 0)))
    for s, p in rows[:3]:
        result["suggestions"].append({
            "slot_id": s.id, "worker_id": p.user_id, "worker_name": p.user.name,
            "job": p.job, "location": p.location, "avg_rating": round(p.avg_rating or 0, 2),
            "date": s.date.isoformat(), "start_time": s.start_time.strftime("%H:%M"),
            "end_time": s.end_time.strftime("%H:%M"),
        })
    if result["suggestions"]:
        top = result["suggestions"][0]
        result["message"] = (f"{top['worker_name']} ({top['job']}), {top['date']} at "
                             f"{top['start_time']}. Shall I confirm?")
    else:
        result["message"] = "No free workers match that. Try another time or date."
    return result


@router.post("/datetime")
def voice_datetime(data: VoiceIn, user: User = Depends(require_role("customer"))):
    """Understand a spoken date and/or time, e.g. 'tomorrow at 5 pm'."""
    p = parse_datetime(data.text, expect_time=(data.expect == "time"))
    return {"date": p["date"].isoformat() if p["date"] else None,
            "time": p["time"].strftime("%H:%M") if p["time"] else None}
