from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from .database import Base, engine
from . import models  # noqa: F401  (registers tables)
from .routers import auth, workers, availability, bookings, reviews, voice

Base.metadata.create_all(bind=engine)  # creates all tables on first run

# tiny auto-migration: older databases don't have bookings.fee yet
if "fee" not in [c["name"] for c in inspect(engine).get_columns("bookings")]:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE bookings ADD COLUMN fee FLOAT"))

app = FastAPI(title="Book Worker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # add your deployed URL
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

for r in (auth, workers, availability, bookings, reviews, voice):
    app.include_router(r.router)


@app.get("/")
def root():
    return {"status": "ok", "docs": "/docs"}
