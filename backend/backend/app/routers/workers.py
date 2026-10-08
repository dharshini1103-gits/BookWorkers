from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, WorkerProfile, Review
from ..schemas import ProfileUpdate
from ..utils.dependencies import require_role

router = APIRouter(prefix="/workers", tags=["Workers"])


def profile_to_dict(p: WorkerProfile) -> dict:
    return {"user_id": p.user_id, "name": p.user.name, "job": p.job,
            "location": p.location, "bio": p.bio, "hourly_rate": p.hourly_rate,
            "avg_rating": round(p.avg_rating or 0, 2), "review_count": p.review_count}


@router.get("/categories")
def categories(db: Session = Depends(get_db)):
    """Job categories with number of workers, for the customer home screen."""
    rows = (db.query(WorkerProfile.job, func.count(WorkerProfile.user_id),
                     func.avg(WorkerProfile.avg_rating))
              .filter(WorkerProfile.job != "")
              .group_by(WorkerProfile.job)
              .order_by(func.count(WorkerProfile.user_id).desc()).all())
    return [{"job": j, "count": c, "avg_rating": round(a or 0, 2)} for j, c, a in rows]


@router.get("")
def search_workers(name: Optional[str] = None, job: Optional[str] = None,
                   location: Optional[str] = None, min_rating: float = 0,
                   sort: str = Query("rating", pattern="^(rating|reviews|name)$"),
                   db: Session = Depends(get_db)):
    q = db.query(WorkerProfile).join(User, User.id == WorkerProfile.user_id)
    if name:
        q = q.filter(User.name.ilike(f"%{name}%"))
    if job:
        q = q.filter(WorkerProfile.job.ilike(f"%{job}%"))
    if location:
        q = q.filter(WorkerProfile.location.ilike(f"%{location}%"))
    if min_rating:
        q = q.filter(WorkerProfile.avg_rating >= min_rating)
    if sort == "rating":
        q = q.order_by(WorkerProfile.avg_rating.desc(), WorkerProfile.review_count.desc())
    elif sort == "reviews":
        q = q.order_by(WorkerProfile.review_count.desc())
    else:
        q = q.order_by(User.name)
    return [profile_to_dict(p) for p in q.all()]


@router.put("/me/profile")
def update_my_profile(data: ProfileUpdate, user: User = Depends(require_role("worker")),
                      db: Session = Depends(get_db)):
    p = user.profile
    if data.job is not None:
        p.job = data.job.strip().lower()
    if data.location is not None:
        p.location = data.location.strip().title()
    if data.bio is not None:
        p.bio = data.bio
    if data.hourly_rate is not None:
        p.hourly_rate = data.hourly_rate
    db.commit()
    return profile_to_dict(p)


@router.get("/{worker_id}")
def worker_detail(worker_id: int, db: Session = Depends(get_db)):
    p = db.get(WorkerProfile, worker_id)
    if not p:
        raise HTTPException(404, "Worker not found")
    reviews = (db.query(Review).filter(Review.worker_id == worker_id)
                 .order_by(Review.created_at.desc()).all())
    out = profile_to_dict(p)
    out["reviews"] = [{"id": r.id, "rating": r.rating, "comment": r.comment,
                       "customer_name": r.customer.name,
                       "created_at": r.created_at.isoformat()} for r in reviews]
    return out
