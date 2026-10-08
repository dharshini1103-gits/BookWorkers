from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, WorkerProfile
from ..schemas import SignupIn, LoginIn, TokenOut
from ..services.auth_service import hash_password, verify_password, create_token
from ..utils.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/signup", response_model=TokenOut)
def signup(data: SignupIn, db: Session = Depends(get_db)):
    email = data.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(400, "Email already registered")
    user = User(name=data.name.strip(), email=email,
                password_hash=hash_password(data.password), role=data.role)
    db.add(user)
    db.flush()
    if data.role == "worker":
        db.add(WorkerProfile(user_id=user.id, job=(data.job or "").strip().lower(),
                             location=(data.location or "").strip().title()))
    db.commit()
    return TokenOut(access_token=create_token(user.id, user.role),
                    role=user.role, user_id=user.id, name=user.name)


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower().strip()).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Wrong email or password")
    return TokenOut(access_token=create_token(user.id, user.role),
                    role=user.role, user_id=user.id, name=user.name)


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}
