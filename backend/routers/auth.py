"""Auth router: register, login, me."""

import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User, StudentCounselor, generate_uuid
from schemas import (
    RegisterRequest,
    LoginRequest,
    AuthResponse,
    UserResponse,
)
from auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _user_response(user: User) -> UserResponse:
    return UserResponse(
        id=str(user.id),
        email=user.email,
        nama=user.nama,
        role=user.role,
        usia=user.usia,
        jenisKelamin=user.jenis_kelamin,
        createdAt=user.created_at.isoformat(),
    )


@router.post("/register", response_model=AuthResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):

    # Validate email format
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', req.email):
        raise HTTPException(status_code=422, detail="Format email tidak valid")

    # Validate password length
    if len(req.password) < 6:
        raise HTTPException(status_code=422, detail="Password minimal 6 karakter")

    # Only allow siswa registration from public endpoint
    if req.role != "siswa":
        raise HTTPException(status_code=403, detail="Hanya siswa yang dapat mendaftar melalui form ini")

    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email sudah terdaftar")

    user = User(
        id=generate_uuid(),
        email=req.email,
        nama=req.nama,
        hashed_password=hash_password(req.password),
        role=req.role,
        usia=req.usia,
        jenis_kelamin=req.jenisKelamin,
    )
    db.add(user)
    db.flush()

    # Auto-assign siswa to all pembimbing (and vice versa)
    if req.role == "siswa":
        pembimbing_list = db.query(User).filter(User.role == "pembimbing").all()
        for p in pembimbing_list:
            sc = StudentCounselor(
                id=generate_uuid(),
                siswa_id=user.id,
                pembimbing_id=p.id,
            )
            db.add(sc)
    elif req.role == "pembimbing":
        siswa_list = db.query(User).filter(User.role == "siswa").all()
        for s in siswa_list:
            sc = StudentCounselor(
                id=generate_uuid(),
                siswa_id=s.id,
                pembimbing_id=user.id,
            )
            db.add(sc)

    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id})
    return AuthResponse(
        success=True,
        user=_user_response(user),
        access_token=token,
    )


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()

    # Generic message to prevent user enumeration
    credentials_error = HTTPException(status_code=401, detail="Email atau password salah")

    if not user:
        raise credentials_error

    if not user.hashed_password:
        raise credentials_error

    if not verify_password(req.password, user.hashed_password):
        raise credentials_error

    token = create_access_token({"sub": user.id})
    return AuthResponse(
        success=True,
        user=_user_response(user),
        access_token=token,
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return _user_response(current_user)
