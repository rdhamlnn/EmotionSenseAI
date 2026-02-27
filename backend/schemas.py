from datetime import datetime
from typing import Annotated, List, Literal, Optional

from pydantic import BaseModel, BeforeValidator, Field

# Accepts str or UUID, always coerces to str
StrId = Annotated[str, BeforeValidator(lambda v: str(v))]


# ==================== Auth ====================
class RegisterRequest(BaseModel):
    email: str
    nama: str
    password: str
    role: Literal["siswa", "pembimbing"]
    usia: int = Field(ge=5, le=100)
    jenisKelamin: Literal["laki-laki", "perempuan"]


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: StrId
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
    id: StrId
    diaryEntryId: StrId
    label: str
    confidence: float
    probabilities: List[EmotionProbabilitySchema]
    aiExplanation: str
    createdAt: str

    class Config:
        from_attributes = True


# ==================== Diary ====================
class DiaryCreateRequest(BaseModel):
    teks: str = Field(min_length=1, max_length=5000)


class DiaryEntryResponse(BaseModel):
    id: StrId
    userId: StrId
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
    id: StrId
    pembimbingId: StrId
    siswaId: StrId
    note: str
    createdAt: str

    class Config:
        from_attributes = True


# ==================== Messages ====================
class MessageCreateRequest(BaseModel):
    siswaId: str
    message: str


class MessageResponse(BaseModel):
    id: StrId
    senderId: StrId
    senderRole: str
    siswaId: StrId
    message: str
    isRead: bool
    createdAt: str

    class Config:
        from_attributes = True


class MarkReadRequest(BaseModel):
    siswaId: str


# ==================== Student-Counselor ====================
class StudentCounselorResponse(BaseModel):
    id: StrId
    siswaId: StrId
    pembimbingId: StrId
    assignedAt: str

    class Config:
        from_attributes = True


class AssignRequest(BaseModel):
    siswaId: str
    pembimbingId: str


# ==================== Alert ====================
class SiswaStatusResponse(BaseModel):
    siswaId: StrId
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
