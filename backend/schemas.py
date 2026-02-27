from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr


# ==================== Auth ====================
class RegisterRequest(BaseModel):
    email: str
    nama: str
    password: str
    role: str  # "siswa" | "pembimbing"
    usia: int
    jenisKelamin: str  # "laki-laki" | "perempuan"


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    nama: str
    role: str
    usia: int
    jenisKelamin: str
    createdAt: str

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    success: bool
    error: Optional[str] = None
    user: Optional[UserResponse] = None
    access_token: Optional[str] = None
    token_type: str = "bearer"


# ==================== Emotion ====================
class EmotionProbabilitySchema(BaseModel):
    emotion: str
    probability: float


class EmotionResultResponse(BaseModel):
    id: str
    diaryEntryId: str
    label: str
    confidence: float
    probabilities: List[EmotionProbabilitySchema]
    aiExplanation: str
    createdAt: str

    class Config:
        from_attributes = True


# ==================== Diary ====================
class DiaryCreateRequest(BaseModel):
    teks: str


class DiaryEntryResponse(BaseModel):
    id: str
    userId: str
    teks: str
    createdAt: str
    emotionResult: EmotionResultResponse

    class Config:
        from_attributes = True


# ==================== Notes ====================
class NoteCreateRequest(BaseModel):
    siswaId: str
    note: str


class NoteResponse(BaseModel):
    id: str
    pembimbingId: str
    siswaId: str
    note: str
    createdAt: str

    class Config:
        from_attributes = True


# ==================== Messages ====================
class MessageCreateRequest(BaseModel):
    siswaId: str
    message: str


class MessageResponse(BaseModel):
    id: str
    senderId: str
    senderRole: str
    siswaId: str
    message: str
    isRead: bool
    createdAt: str

    class Config:
        from_attributes = True


class MarkReadRequest(BaseModel):
    siswaId: str


# ==================== Student-Counselor ====================
class StudentCounselorResponse(BaseModel):
    id: str
    siswaId: str
    pembimbingId: str
    assignedAt: str

    class Config:
        from_attributes = True


class AssignRequest(BaseModel):
    siswaId: str
    pembimbingId: str


# ==================== Alert ====================
class SiswaStatusResponse(BaseModel):
    siswaId: str
    siswaName: str
    siswaEmail: str
    siswaUsia: int
    siswaJenisKelamin: str
    alertLevel: str  # "safe" | "warning" | "critical"
    totalEntries: int
    negativePercentage: float
    lastEntryDate: str
    consecutiveNegativeDays: int


class MarkSafeRequest(BaseModel):
    siswaId: str


class SelfAlertResponse(BaseModel):
    level: str
    message: str
    consecutiveDays: int


# ==================== Classification ====================
class ClassifyRequest(BaseModel):
    text: str


class ClassifyResponse(BaseModel):
    label: str
    confidence: float
    probabilities: List[EmotionProbabilitySchema]
    aiExplanation: str
