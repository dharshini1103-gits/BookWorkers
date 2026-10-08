from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Booking
from ..schemas import BookingIn, StatusIn
from ..services.booking_service import create_booking, booking_to_dict
from ..utils.dependencies import require_role, get_current_user

router = APIRouter(prefix="/bookings", tags=["Bookings"])


@router.post("")
def book(data: BookingIn, user: User = Depends(require_role("customer")),
         db: Session = Depends(get_db)):
    """Used by BOTH the manual form and the voice agent (after user confirms)."""
    b = create_booking(db, user.id, data.slot_id, data.notes, data.source, data.fee)
    return booking_to_dict(b)


@router.get("/my")
def my_bookings(user: User = Depends(require_role("customer")), db: Session = Depends(get_db)):
    rows = db.query(Booking).filter(Booking.customer_id == user.id).order_by(Booking.id.desc()).all()
    return [booking_to_dict(b) for b in rows]


@router.get("/requests")
def worker_requests(user: User = Depends(require_role("worker")), db: Session = Depends(get_db)):
    rows = db.query(Booking).filter(Booking.worker_id == user.id).order_by(Booking.id.desc()).all()
    return [booking_to_dict(b) for b in rows]


@router.patch("/{booking_id}/status")
def change_status(booking_id: int, data: StatusIn, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    b = db.get(Booking, booking_id)
    if not b or user.id not in (b.customer_id, b.worker_id):
        raise HTTPException(404, "Booking not found")

    new = data.status
    if user.role == "worker":
        allowed = {"pending": ["confirmed", "rejected"], "confirmed": ["completed", "rejected"]}
    else:
        allowed = {"pending": ["cancelled"], "confirmed": ["cancelled"]}
    if new not in allowed.get(b.status, []):
        raise HTTPException(400, f"Cannot change {b.status} -> {new} as a {user.role}")

    b.status = new
    if new in ("rejected", "cancelled"):
        b.slot.is_booked = False  # free the slot again
    db.commit()
    return booking_to_dict(b)
