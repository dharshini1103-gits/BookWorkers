from datetime import datetime
from fastapi import HTTPException
from sqlalchemy.orm import Session
from ..models import Availability, Booking


def create_booking(db: Session, customer_id: int, slot_id: int,
                   notes: str = "", source: str = "manual",
                   fee: float | None = None) -> Booking:
    slot = db.get(Availability, slot_id)
    if not slot:
        raise HTTPException(404, "Slot not found")
    if datetime.combine(slot.date, slot.start_time) < datetime.now():
        raise HTTPException(400, "Slot is in the past")
    if slot.worker_id == customer_id:
        raise HTTPException(400, "You cannot book yourself")

    # Atomic lock: only ONE request can flip is_booked False -> True.
    # This is what prevents double booking.
    updated = (db.query(Availability)
                 .filter(Availability.id == slot_id, Availability.is_booked == False)  # noqa: E712
                 .update({"is_booked": True}))
    if updated == 0:
        db.rollback()
        raise HTTPException(409, "Slot already booked")

    booking = Booking(customer_id=customer_id, worker_id=slot.worker_id,
                      slot_id=slot_id, notes=notes, source=source, fee=fee, status="pending")
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


def booking_to_dict(b: Booking) -> dict:
    return {
        "id": b.id, "status": b.status, "notes": b.notes, "source": b.source, "fee": b.fee,
        "slot_id": b.slot_id, "date": b.slot.date.isoformat(),
        "start_time": b.slot.start_time.strftime("%H:%M"),
        "end_time": b.slot.end_time.strftime("%H:%M"),
        "worker_id": b.worker_id, "worker_name": b.worker.name,
        "customer_id": b.customer_id, "customer_name": b.customer.name,
        "created_at": b.created_at.isoformat(),
    }
