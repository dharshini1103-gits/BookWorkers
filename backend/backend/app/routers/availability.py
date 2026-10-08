from datetime import date, datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Availability
from ..schemas import SlotIn, CheckIn
from ..utils.dependencies import require_role

router = APIRouter(prefix="/availability", tags=["Availability"])


def slot_to_dict(s: Availability) -> dict:
    return {"id": s.id, "worker_id": s.worker_id, "date": s.date.isoformat(),
            "start_time": s.start_time.strftime("%H:%M"),
            "end_time": s.end_time.strftime("%H:%M"), "is_booked": s.is_booked}


@router.post("")
def add_slot(data: SlotIn, user: User = Depends(require_role("worker")),
             db: Session = Depends(get_db)):
    if datetime.combine(data.date, data.start_time) < datetime.now():
        raise HTTPException(400, "Cannot add a slot in the past")
    overlap = (db.query(Availability)
                 .filter(Availability.worker_id == user.id, Availability.date == data.date,
                         Availability.start_time < data.end_time,
                         Availability.end_time > data.start_time).first())
    if overlap:
        raise HTTPException(409, "This overlaps an existing slot")
    slot = Availability(worker_id=user.id, **data.model_dump())
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot_to_dict(slot)


@router.post("/check")
def check_availability(data: CheckIn, user: User = Depends(require_role("customer")),
                       db: Session = Depends(get_db)):
    """Is this worker free at this exact date+time? If not, suggest the nearest free slots."""
    now = datetime.now()
    wanted = datetime.combine(data.date, data.time)
    slots = db.query(Availability).filter(Availability.worker_id == data.worker_id,
                                          Availability.date == data.date).all()
    hit = next((s for s in slots if s.start_time <= data.time < s.end_time), None)

    def alternatives():
        free = (db.query(Availability)
                  .filter(Availability.worker_id == data.worker_id, Availability.is_booked == False,  # noqa: E712
                          Availability.date >= date.today()).all())
        free = [s for s in free if datetime.combine(s.date, s.start_time) > now]
        free.sort(key=lambda s: (s.date != data.date,
                                 abs(datetime.combine(s.date, s.start_time) - wanted)
                                 if s.date == data.date else datetime.combine(s.date, s.start_time) - now))
        return [slot_to_dict(s) for s in free[:4]]

    if wanted <= now:
        return {"available": False, "reason": "past", "slot": None,
                "message": "That time has already passed.", "alternatives": alternatives()}
    if hit and not hit.is_booked:
        return {"available": True, "reason": None, "slot": slot_to_dict(hit),
                "message": "Available", "alternatives": []}
    if hit and hit.is_booked:
        return {"available": False, "reason": "booked", "slot": None,
                "message": "That slot is already booked.", "alternatives": alternatives()}
    return {"available": False, "reason": "not_available", "slot": None,
            "message": "Not available at that time.", "alternatives": alternatives()}


@router.get("/worker/{worker_id}")
def worker_slots(worker_id: int, only_free: bool = True, on_date: Optional[date] = None,
                 db: Session = Depends(get_db)):
    q = db.query(Availability).filter(Availability.worker_id == worker_id,
                                      Availability.date >= date.today())
    if only_free:
        q = q.filter(Availability.is_booked == False)  # noqa: E712
    if on_date:
        q = q.filter(Availability.date == on_date)
    return [slot_to_dict(s) for s in q.order_by(Availability.date, Availability.start_time).all()]


@router.delete("/{slot_id}")
def delete_slot(slot_id: int, user: User = Depends(require_role("worker")),
                db: Session = Depends(get_db)):
    slot = db.get(Availability, slot_id)
    if not slot or slot.worker_id != user.id:
        raise HTTPException(404, "Slot not found")
    if slot.is_booked:
        raise HTTPException(400, "Slot is booked; reject/cancel the booking first")
    db.delete(slot)
    db.commit()
    return {"deleted": True}
