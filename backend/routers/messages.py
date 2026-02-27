"""Messages router: two-way messaging between siswa and pembimbing."""

from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import User, Message, generate_uuid
from schemas import MessageCreateRequest, MessageResponse, MarkReadRequest
from auth import get_current_user

router = APIRouter(prefix="/api/messages", tags=["messages"])


def _msg_response(m: Message) -> MessageResponse:
    return MessageResponse(
        id=m.id,
        senderId=m.sender_id,
        senderRole=m.sender_role,
        siswaId=m.siswa_id,
        message=m.message,
        isRead=m.is_read,
        createdAt=m.created_at.isoformat(),
    )


@router.get("", response_model=List[MessageResponse])
def get_messages(
    siswaId: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    messages = (
        db.query(Message)
        .filter(Message.siswa_id == siswaId)
        .order_by(Message.created_at.asc())
        .all()
    )
    return [_msg_response(m) for m in messages]


@router.post("", response_model=MessageResponse)
def send_message(
    req: MessageCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = Message(
        id=generate_uuid(),
        sender_id=current_user.id,
        sender_role=current_user.role,
        siswa_id=req.siswaId,
        message=req.message,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return _msg_response(msg)


@router.patch("/read")
def mark_messages_read(
    req: MarkReadRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Mark as read all messages sent by the OTHER role
    opposite_role = "pembimbing" if current_user.role == "siswa" else "siswa"
    db.query(Message).filter(
        Message.siswa_id == req.siswaId,
        Message.sender_role == opposite_role,
        Message.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"success": True}


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "siswa":
        count = (
            db.query(Message)
            .filter(
                Message.siswa_id == current_user.id,
                Message.sender_role == "pembimbing",
                Message.is_read == False,
            )
            .count()
        )
    else:
        # Pembimbing: only count unread from assigned students
        from models import StudentCounselor
        assigned_ids = [
            row[0]
            for row in db.query(StudentCounselor.siswa_id)
            .filter(StudentCounselor.pembimbing_id == current_user.id)
            .all()
        ]
        if not assigned_ids:
            return {"count": 0}
        count = (
            db.query(Message)
            .filter(
                Message.siswa_id.in_(assigned_ids),
                Message.sender_role == "siswa",
                Message.is_read == False,
            )
            .count()
        )
    return {"count": count}
