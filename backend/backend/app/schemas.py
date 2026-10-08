from datetime import date, time
from typing import Optional, Literal
from pydantic import BaseModel, Field, model_validator


class SignupIn(BaseModel):
    name: str
    email: str
    password: str = Field(min_length=6)
    role: Literal["customer", "worker"]
    job: Optional[str] = None        # only used for workers
    location: Optional[str] = None   # only used for workers


class LoginIn(BaseModel):
    email: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    name: str


class ProfileUpdate(BaseModel):
    job: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    hourly_rate: Optional[float] = None


class SlotIn(BaseModel):
    date: date
    start_time: time
    end_time: time

    @model_validator(mode="after")
    def check_times(self):
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class BookingIn(BaseModel):
    slot_id: int
    notes: str = ""
    fee: Optional[float] = Field(default=None, ge=0)
    source: Literal["manual", "voice"] = "manual"


class StatusIn(BaseModel):
    status: Literal["confirmed", "rejected", "cancelled", "completed"]


class ReviewIn(BaseModel):
    booking_id: int
    rating: int = Field(ge=1, le=5)
    comment: str = ""


class VoiceIn(BaseModel):
    text: str
    expect: Optional[str] = None  # 'time' when the agent just asked for a time


class CheckIn(BaseModel):
    worker_id: int
    date: date
    time: time
