import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Integer,
    Float,
    Boolean,
    Text,
    String,
    JSON,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def _utcnow():
    return datetime.now(timezone.utc)


# ==================== User ====================
class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(Text, unique=True, nullable=False, index=True)
    nama = Column(Text, nullable=False)
    hashed_password = Column(Text, nullable=True)
    role = Column(Text, nullable=False)  # "siswa" | "pembimbing"
    usia = Column(Integer, nullable=False, default=0)
    jenis_kelamin = Column(Text, nullable=False, default="laki-laki")
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    # Relationships
    diary_entries = relationship("DiaryEntry", back_populates="user")
    sent_messages = relationship("Message", back_populates="sender", foreign_keys="Message.sender_id")


# ==================== Student-Counselor ====================
class StudentCounselor(Base):
    __tablename__ = "student_counselor"
    __table_args__ = (
        UniqueConstraint("siswa_id", "pembimbing_id", name="uq_siswa_pembimbing"),
    )

    id = Column(String(36), primary_key=True, default=generate_uuid)
    siswa_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    pembimbing_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_at = Column(DateTime(timezone=True), default=_utcnow)


# ==================== Diary Entry (raw text) ====================
class DiaryEntry(Base):
    __tablename__ = "diary_entries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    teks = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    user = relationship("User", back_populates="diary_entries")
    emotion_result = relationship("EmotionResult", back_populates="diary_entry", uselist=False, cascade="all, delete-orphan")


# ==================== Emotion Result ====================
class EmotionResult(Base):
    __tablename__ = "emotion_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    diary_entry_id = Column(String(36), ForeignKey("diary_entries.id"), nullable=False, unique=True)
    label = Column(Text, nullable=False)
    confidence = Column(Float, nullable=False)
    probabilities = Column(JSON, nullable=False)  # List[{emotion, probability}]
    ai_explanation = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    diary_entry = relationship("DiaryEntry", back_populates="emotion_result")


# ==================== Counselor Note (pembimbing) ====================
class PembimbingNote(Base):
    __tablename__ = "counselor_notes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    pembimbing_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    siswa_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    note = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow)


# ==================== Message ====================
class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    sender_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    sender_role = Column(Text, nullable=False)  # "siswa" | "pembimbing"
    siswa_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    sender = relationship("User", back_populates="sent_messages", foreign_keys=[sender_id])


# ==================== Alert Override ====================
class AlertOverride(Base):
    __tablename__ = "alert_overrides"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    siswa_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    pembimbing_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    overridden_at = Column(DateTime(timezone=True), default=_utcnow)
