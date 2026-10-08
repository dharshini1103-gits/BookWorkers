from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Booking, Review, WorkerProfile
from ..schemas import ReviewIn
from ..utils.dependencies import require_role

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.post("")
def add_review(data: ReviewIn, user: User = Depends(require_role("customer")),
               db: Session = Depends(get_db)):
    b = db.get(Booking, data.booking_id)
    if not b or b.customer_id != user.id:
        raise HTTPException(404, "Booking not found")
    if b.status != "completed":
        raise HTTPException(400, "You can review only completed bookings")
    if db.query(Review).filter(Review.booking_id == b.id).first():
        raise HTTPException(409, "Already reviewed")

    db.add(Review(booking_id=b.id, customer_id=user.id, worker_id=b.worker_id,
                  rating=data.rating, comment=data.comment))
    db.flush()
    avg, cnt = db.query(func.avg(Review.rating), func.count(Review.id)) \
                 .filter(Review.worker_id == b.worker_id).one()
    p = db.get(WorkerProfile, b.worker_id)
    p.avg_rating, p.review_count = float(avg), cnt
    db.commit()
    return {"message": "Review added", "avg_rating": round(p.avg_rating, 2)}
