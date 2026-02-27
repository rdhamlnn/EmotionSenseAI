"""Notes router: CRUD for pembimbing notes."""

from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import User, PembimbingNote, generate_uuid
from schemas import NoteCreateRequest, NoteResponse
from auth import get_current_user, require_role

router = APIRouter(prefix="/api/notes", tags=["notes"])


def _note_response(n: PembimbingNote) -> NoteResponse:
    return NoteResponse(
        id=n.id,
        pembimbingId=n.pembimbing_id,
        siswaId=n.siswa_id,
        note=n.note,
        createdAt=n.created_at.isoformat(),
    )


@router.get("", response_model=List[NoteResponse])
def get_notes(
    siswaId: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notes = (
        db.query(PembimbingNote)
        .filter(PembimbingNote.siswa_id == siswaId)
        .order_by(PembimbingNote.created_at.desc())
        .all()
    )
    return [_note_response(n) for n in notes]


@router.post("", response_model=NoteResponse)
def create_note(
    req: NoteCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("pembimbing")),
):
    note = PembimbingNote(
        id=generate_uuid(),
        pembimbing_id=current_user.id,
        siswa_id=req.siswaId,
        note=req.note,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return _note_response(note)
