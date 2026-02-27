"""Diary router: CRUD diary entries (with classification) and list entries."""

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User, DiaryEntry, EmotionResult, generate_uuid
from schemas import DiaryCreateRequest, DiaryEntryResponse, EmotionResultResponse, EmotionProbabilitySchema
from auth import get_current_user
from ml.classifier import classifier

router = APIRouter(prefix="/api/diary", tags=["diary"])


def _emotion_response(er: EmotionResult) -> EmotionResultResponse:
    return EmotionResultResponse(
        id=er.id,
        diaryEntryId=er.diary_entry_id,
        label=er.label,
        confidence=er.confidence,
        probabilities=[EmotionProbabilitySchema(**p) for p in er.probabilities],
        aiExplanation=er.ai_explanation,
        createdAt=er.created_at.isoformat(),
    )


def _diary_response(entry: DiaryEntry) -> DiaryEntryResponse:
    return DiaryEntryResponse(
        id=entry.id,
        userId=entry.user_id,
        teks=entry.teks,
        createdAt=entry.created_at.isoformat(),
        emotionResult=_emotion_response(entry.emotion_result),
    )


@router.get("", response_model=List[DiaryEntryResponse])
def get_diary_entries(
    userId: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(DiaryEntry).filter(DiaryEntry.emotion_result != None)

    if current_user.role == "siswa":
        # Siswa can only see their own entries
        query = query.filter(DiaryEntry.user_id == current_user.id)
    elif userId:
        # Pembimbing requesting specific student — verify assignment
        from models import StudentCounselor
        is_assigned = (
            db.query(StudentCounselor)
            .filter(
                StudentCounselor.pembimbing_id == current_user.id,
                StudentCounselor.siswa_id == userId,
            )
            .first()
        )
        if not is_assigned:
            raise HTTPException(status_code=403, detail="Siswa ini tidak ditugaskan kepada Anda")
        query = query.filter(DiaryEntry.user_id == userId)

    entries = query.order_by(DiaryEntry.created_at.desc()).offset(offset).limit(limit).all()
    return [_diary_response(e) for e in entries]


@router.post("", response_model=DiaryEntryResponse)
def create_diary_entry(
    req: DiaryCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    diary_id = generate_uuid()

    # Classify emotion
    result = classifier.classify(req.teks)

    # Save diary entry
    entry = DiaryEntry(
        id=diary_id,
        user_id=current_user.id,
        teks=req.teks,
        created_at=now,
    )
    db.add(entry)

    # Save emotion result
    emotion = EmotionResult(
        id=generate_uuid(),
        diary_entry_id=diary_id,
        label=result["label"],
        confidence=result["confidence"],
        probabilities=result["probabilities"],
        ai_explanation=result["aiExplanation"],
        created_at=now,
    )
    db.add(emotion)

    db.commit()
    db.refresh(entry)
    return _diary_response(entry)


@router.put("/{entry_id}", response_model=DiaryEntryResponse)
def update_diary_entry(
    entry_id: str,
    req: DiaryCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = db.query(DiaryEntry).filter(DiaryEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Diary entry tidak ditemukan")
    if entry.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Tidak diizinkan mengedit diary orang lain")

    now = datetime.now(timezone.utc)

    # Re-classify emotion
    result = classifier.classify(req.teks)

    # Update diary text
    entry.teks = req.teks

    # Update or create emotion result
    if entry.emotion_result:
        entry.emotion_result.label = result["label"]
        entry.emotion_result.confidence = result["confidence"]
        entry.emotion_result.probabilities = result["probabilities"]
        entry.emotion_result.ai_explanation = result["aiExplanation"]
        entry.emotion_result.created_at = now
    else:
        emotion = EmotionResult(
            id=generate_uuid(),
            diary_entry_id=entry_id,
            label=result["label"],
            confidence=result["confidence"],
            probabilities=result["probabilities"],
            ai_explanation=result["aiExplanation"],
            created_at=now,
        )
        db.add(emotion)

    db.commit()
    db.refresh(entry)
    return _diary_response(entry)


@router.delete("/{entry_id}")
def delete_diary_entry(
    entry_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = db.query(DiaryEntry).filter(DiaryEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Diary entry tidak ditemukan")
    if entry.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Tidak diizinkan menghapus diary orang lain")

    # Delete associated emotion result first
    if entry.emotion_result:
        db.delete(entry.emotion_result)

    db.delete(entry)
    db.commit()
    return {"success": True}
