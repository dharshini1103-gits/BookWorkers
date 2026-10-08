from datetime import datetime
from sqlalchemy import (Column, Integer, String, Float, Boolean, Date, Time,
                        DateTime, ForeignKey, Text)
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    role = Column(String(20), nullable=False)  # "customer" | "worker"
    created_at = Column(DateTime, default=datetime.utcnow)

    profile = relationship("WorkerProfile", back_populates="user", uselist=False)


class WorkerProfile(Base):
    __tablename__ = "worker_profiles"
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    job = Column(String(80), index=True, default="")
    location = Column(String(100), index=True, default="")
    bio = Column(Text, default="")
    hourly_rate = Column(Float, nullable=True)
    avg_rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)

    user = relationship("User", back_populates="profile")


class Availability(Base):
    __tablename__ = "availability"
    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    date = Column(Date, index=True, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    is_booked = Column(Boolean, default=False, nullable=False)


class Booking(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    worker_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    slot_id = Column(Integer, ForeignKey("availability.id"), nullable=False)
    # pending | confirmed | rejected | cancelled | completed
    status = Column(String(20), default="pending", nullable=False)
    notes = Column(Text, default="")
    source = Column(String(10), default="manual")  # "manual" | "voice"
    fee = Column(Float, nullable=True)  # fee the customer offers to pay (Rs)
    created_at = Column(DateTime, default=datetime.utcnow)

    slot = relationship("Availability")
    customer = relationship("User", foreign_keys=[customer_id])
    worker = relationship("User", foreign_keys=[worker_id])


class Review(Base):
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), unique=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    worker_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("User", foreign_keys=[customer_id])
