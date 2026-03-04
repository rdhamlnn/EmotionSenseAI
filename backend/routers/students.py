"""Students router: student-counselor assignments, alert system, siswa status."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import (
    User,
    StudentCounselor,
    DiaryEntry,
    EmotionResult,
    AlertOverride,
    generate_uuid,
)
from schemas import (
    UserResponse,
    StudentCounselorResponse,
    AssignRequest,
    SiswaStatusResponse,
    MarkSafeRequest,
    SelfAlertResponse,
)
from auth import get_current_user, require_role

router = APIRouter(prefix="/api/students", tags=["students"])

NEGATIVE_EMOTIONS = ["Sad", "Angry", "Fear"]


# ==================== Helper Functions ====================

def _user_response(u: User) -> UserResponse:
    return UserResponse(
        id=u.id,
        email=u.email,
        nama=u.nama,
        role=u.role,
        usia=u.usia,
        jenisKelamin=u.jenis_kelamin,
        createdAt=u.created_at.isoformat(),
    )


def _get_diary_entries_with_emotion(db: Session, user_id: str):
    """Get diary entries joined with emotion results for a user."""
    return (
        db.query(DiaryEntry)
        .join(EmotionResult, DiaryEntry.id == EmotionResult.diary_entry_id)
        .filter(DiaryEntry.user_id == user_id)
        .order_by(DiaryEntry.created_at.desc())
        .all()
    )


def _calculate_alert_level(entries) -> str:
    if not entries:
        return "safe"

    negative_count = sum(
        1 for e in entries if e.emotion_result and e.emotion_result.label in NEGATIVE_EMOTIONS
    )
    neg_pct = (negative_count / len(entries)) * 100

    # Consecutive negative days
    sorted_entries = sorted(entries, key=lambda e: e.created_at, reverse=True)
    consecutive = 0
    seen_dates = set()
    for entry in sorted_entries:
        date_key = entry.created_at.strftime("%Y-%m-%d")
        if date_key in seen_dates:
            continue
        seen_dates.add(date_key)
        if entry.emotion_result and entry.emotion_result.label in NEGATIVE_EMOTIONS:
            consecutive += 1
        else:
            break

    if neg_pct > 60 or consecutive >= 5:
        return "critical"
    if neg_pct >= 40 or consecutive >= 3:
        return "warning"
    return "safe"


def _is_override_valid(db: Session, siswa_id: str) -> bool:
    override = (
        db.query(AlertOverride)
        .filter(AlertOverride.siswa_id == siswa_id)
        .order_by(AlertOverride.overridden_at.desc())
        .first()
    )
    if not override:
        return False

    entries = _get_diary_entries_with_emotion(db, siswa_id)
    has_new_negative = any(
        e.created_at > override.overridden_at
        and e.emotion_result
        and e.emotion_result.label in NEGATIVE_EMOTIONS
        for e in entries
    )
    return not has_new_negative


def _get_effective_alert(db: Session, entries, siswa_id: str) -> str:
    system_level = _calculate_alert_level(entries)
    if system_level == "safe":
        return "safe"
    if _is_override_valid(db, siswa_id):
        return "safe"
    return system_level


def _build_siswa_status(db: Session, user: User) -> SiswaStatusResponse:
    entries = _get_diary_entries_with_emotion(db, user.id)
    neg_count = sum(
        1 for e in entries if e.emotion_result and e.emotion_result.label in NEGATIVE_EMOTIONS
    )

    sorted_entries = sorted(entries, key=lambda e: e.created_at, reverse=True)
    consecutive = 0
    seen = set()
    for entry in sorted_entries:
        dk = entry.created_at.strftime("%Y-%m-%d")
        if dk in seen:
            continue
        seen.add(dk)
        if entry.emotion_result and entry.emotion_result.label in NEGATIVE_EMOTIONS:
            consecutive += 1
        else:
            break

    return SiswaStatusResponse(
        siswaId=user.id,
        siswaName=user.nama,
        siswaEmail=user.email,
        siswaUsia=user.usia,
        siswaJenisKelamin=user.jenis_kelamin,
        alertLevel=_get_effective_alert(db, entries, user.id),
        totalEntries=len(entries),
        negativePercentage=round((neg_count / len(entries)) * 100) if entries else 0,
        lastEntryDate=entries[0].created_at.isoformat() if entries else "",
        consecutiveNegativeDays=consecutive,
    )


# ==================== Endpoints ====================

@router.get("/all-siswa", response_model=List[UserResponse])
def get_all_siswa(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("pembimbing")),
):
    siswa_list = db.query(User).filter(User.role == "siswa").all()
    return [_user_response(s) for s in siswa_list]


@router.get("/for-pembimbing", response_model=List[UserResponse])
def get_siswa_for_pembimbing(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assigned_ids = (
        db.query(StudentCounselor.siswa_id)
        .filter(StudentCounselor.pembimbing_id == current_user.id)
        .all()
    )
    ids = [a[0] for a in assigned_ids]
    siswa_list = db.query(User).filter(User.id.in_(ids), User.role == "siswa").all()
    return [_user_response(s) for s in siswa_list]


@router.get("/assignments", response_model=List[StudentCounselorResponse])
def get_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("pembimbing")),
):
    scs = db.query(StudentCounselor).filter(
        StudentCounselor.pembimbing_id == current_user.id
    ).all()
    return [
        StudentCounselorResponse(
            id=sc.id,
            siswaId=sc.siswa_id,
            pembimbingId=sc.pembimbing_id,
            assignedAt=sc.assigned_at.isoformat(),
        )
        for sc in scs
    ]


@router.post("/assign", response_model=StudentCounselorResponse)
def assign_siswa(
    req: AssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("pembimbing")),
):
    existing = (
        db.query(StudentCounselor)
        .filter(
            StudentCounselor.siswa_id == req.siswaId,
            StudentCounselor.pembimbing_id == req.pembimbingId,
        )
        .first()
    )
    if existing:
        return StudentCounselorResponse(
            id=existing.id,
            siswaId=existing.siswa_id,
            pembimbingId=existing.pembimbing_id,
            assignedAt=existing.assigned_at.isoformat(),
        )

    sc = StudentCounselor(
        id=generate_uuid(),
        siswa_id=req.siswaId,
        pembimbing_id=req.pembimbingId,
    )
    db.add(sc)
    db.commit()
    db.refresh(sc)
    return StudentCounselorResponse(
        id=sc.id,
        siswaId=sc.siswa_id,
        pembimbingId=sc.pembimbing_id,
        assignedAt=sc.assigned_at.isoformat(),
    )


@router.get("/status/{siswa_id}", response_model=SiswaStatusResponse)
def get_siswa_status(
    siswa_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == siswa_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Siswa tidak ditemukan")
    return _build_siswa_status(db, user)


@router.get("/critical", response_model=List[SiswaStatusResponse])
def get_critical_siswa(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("pembimbing")),
):
    # Get siswa assigned to this pembimbing only
    assigned_ids = (
        db.query(StudentCounselor.siswa_id)
        .filter(StudentCounselor.pembimbing_id == current_user.id)
        .all()
    )
    ids = [a[0] for a in assigned_ids]
    siswa_list = db.query(User).filter(User.id.in_(ids), User.role == "siswa").all()

    statuses = [_build_siswa_status(db, s) for s in siswa_list]
    return [s for s in statuses if s.alertLevel != "safe"]


@router.post("/mark-safe")
def mark_siswa_safe(
    req: MarkSafeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("pembimbing")),
):
    # Remove existing overrides
    db.query(AlertOverride).filter(AlertOverride.siswa_id == req.siswaId).delete()

    override = AlertOverride(
        id=generate_uuid(),
        siswa_id=req.siswaId,
        pembimbing_id=current_user.id,
    )
    db.add(override)
    db.commit()
    return {"success": True}


@router.delete("/remove-override/{siswa_id}")
def remove_override(
    siswa_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("pembimbing")),
):
    db.query(AlertOverride).filter(AlertOverride.siswa_id == siswa_id).delete()
    db.commit()
    return {"success": True}


@router.get("/self-alert/{siswa_id}")
def get_self_alert(
    siswa_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entries = _get_diary_entries_with_emotion(db, siswa_id)
    if not entries:
        return None

    alert_level = _get_effective_alert(db, entries, siswa_id)
    if alert_level == "safe":
        return None

    # Consecutive negative days
    sorted_entries = sorted(entries, key=lambda e: e.created_at, reverse=True)
    consecutive = 0
    seen = set()
    for entry in sorted_entries:
        dk = entry.created_at.strftime("%Y-%m-%d")
        if dk in seen:
            continue
        seen.add(dk)
        if entry.emotion_result and entry.emotion_result.label in NEGATIVE_EMOTIONS:
            consecutive += 1
        else:
            break

    # Calculate negative percentage for message
    negative_count = sum(
        1 for e in entries if e.emotion_result and e.emotion_result.label in NEGATIVE_EMOTIONS
    )
    neg_pct = round((negative_count / len(entries)) * 100) if entries else 0

    if alert_level == "critical":
        if consecutive > 0:
            message = (
                f"Kami mendeteksi emosi negatif yang konsisten selama {consecutive} hari berturut-turut. "
                "Pembimbing Konseling Anda sudah diberitahu dan siap membantu. Jangan ragu untuk menceritakan perasaanmu."
            )
        else:
            message = (
                f"Sebagian besar diary kamu ({neg_pct}%) menunjukkan emosi negatif. "
                "Pembimbing Konseling Anda sudah diberitahu dan siap membantu. Jangan ragu untuk menceritakan perasaanmu."
            )
    else:
        if consecutive > 0:
            message = (
                f"Emosi negatif terdeteksi selama {consecutive} hari terakhir. "
                "Ceritakan perasaanmu di diary — Pembimbing Konseling Anda siap memberikan dukungan."
            )
        else:
            message = (
                f"Pola emosi negatif terdeteksi pada {neg_pct}% diary kamu. "
                "Ceritakan perasaanmu di diary — Pembimbing Konseling Anda siap memberikan dukungan."
            )

    return SelfAlertResponse(level=alert_level, message=message, consecutiveDays=consecutive)


@router.get("/pembimbing-for-siswa/{siswa_id}")
def get_pembimbing_for_siswa(
    siswa_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sc = (
        db.query(StudentCounselor)
        .filter(StudentCounselor.siswa_id == siswa_id)
        .first()
    )
    if sc:
        return {"pembimbingId": sc.pembimbing_id}
    return {"pembimbingId": None}
