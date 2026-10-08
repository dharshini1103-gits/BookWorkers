"""Run `python seed.py` any time. Adds demo customer + workers (+ reviews) if missing."""
from datetime import date, time, timedelta
from sqlalchemy import func
from app.database import SessionLocal, Base, engine
from app.models import User, WorkerProfile, Availability, Booking, Review
from app.services.auth_service import hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()

def get_or_create_user(name, email, role):
    u = db.query(User).filter(User.email == email).first()
    if u:
        return u, False
    u = User(name=name, email=email, password_hash=hash_password("123456"), role=role)
    db.add(u); db.flush()
    return u, True

customer, _ = get_or_create_user("Demo Customer", "customer@test.com", "customer")

WORKERS = [  # name, email, job, location, rate
    ("Ravi Kumar", "ravi@test.com", "plumber", "Chennai", 300),
    ("Karthik P", "karthik@test.com", "plumber", "Coimbatore", 350),
    ("Arun S", "arun@test.com", "electrician", "Chennai", 400),
    ("Meena R", "meena@test.com", "cleaner", "Coimbatore", 250),
    ("Suresh M", "suresh@test.com", "painter", "Chennai", 500),
    ("Priya D", "priya@test.com", "painter", "Madurai", 450),
    ("Vijay K", "vijay@test.com", "carpenter", "Chennai", 450),
    ("Imran A", "imran@test.com", "mechanic", "Chennai", 600),
]
REVIEWS = [(5, "Very professional and on time."), (4, "Good work, fair price."),
           (5, "Fixed it quickly. Highly recommend!"), (4, "Neat work, polite behaviour.")]

for i, (name, email, job, loc, rate) in enumerate(WORKERS):
    u, created = get_or_create_user(name, email, "worker")
    if not created:
        continue
    db.add(WorkerProfile(user_id=u.id, job=job, location=loc, hourly_rate=rate,
                         bio=f"{name} is an experienced {job} in {loc} with 5+ years of work. "
                             f"Reliable, on time and fair on price."))
    # future availability: next 4 days, 3 slots a day
    for d in range(1, 5):
        for h in (10, 14, 17):
            db.add(Availability(worker_id=u.id, date=date.today() + timedelta(days=d),
                                start_time=time(h), end_time=time(h + 1)))
    # past completed bookings + reviews
    for n in range(3):
        past = Availability(worker_id=u.id, date=date.today() - timedelta(days=n + 2),
                            start_time=time(11), end_time=time(12), is_booked=True)
        db.add(past); db.flush()
        b = Booking(customer_id=customer.id, worker_id=u.id, slot_id=past.id,
                    status="completed", fee=rate, notes="")
        db.add(b); db.flush()
        rating, comment = REVIEWS[(i + n) % len(REVIEWS)]
        db.add(Review(booking_id=b.id, customer_id=customer.id, worker_id=u.id,
                      rating=rating, comment=comment))
    db.flush()
    avg, cnt = db.query(func.avg(Review.rating), func.count(Review.id)).filter(Review.worker_id == u.id).one()
    p = db.get(WorkerProfile, u.id)
    p.avg_rating, p.review_count = float(avg), cnt

db.commit()
print("Seed done. Logins (password 123456): customer@test.com, ravi@test.com, suresh@test.com ...")
