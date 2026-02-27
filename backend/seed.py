"""
Seed demo data into the database.
Creates demo siswa and pembimbing with sample diary entries.
"""

import random
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from models import (
    User,
    StudentCounselor,
    DiaryEntry,
    EmotionResult,
    PembimbingNote,
    Message,
    generate_uuid,
)
from auth import hash_password
from ml.classifier import classifier

EMOTIONS = ["Happy", "Sad", "Angry", "Fear", "Neutral"]


def _now():
    return datetime.now(timezone.utc)


def seed_demo_data(db: Session):
    """Seed demo data if not already present."""
    # Check if demo data exists
    existing = db.query(User).filter(User.email == "siswa@demo.com").first()
    if existing:
        print("[INFO] Demo data already exists, skipping seed.")
        return

    print("[INFO] Seeding demo data...")

    # Create demo siswa
    demo_siswa_id = generate_uuid()
    demo_siswa = User(
        id=demo_siswa_id,
        email="siswa@demo.com",
        nama="Andi Pratama",
        hashed_password=hash_password("demo123"),
        role="siswa",
        usia=16,
        jenis_kelamin="laki-laki",
        created_at=_now() - timedelta(days=30),
    )
    db.add(demo_siswa)

    # Create demo pembimbing
    demo_pembimbing_id = generate_uuid()
    demo_pembimbing = User(
        id=demo_pembimbing_id,
        email="pembimbing@demo.com",
        nama="Dr. Sari Wulandari",
        hashed_password=hash_password("demo123"),
        role="pembimbing",
        usia=35,
        jenis_kelamin="perempuan",
        created_at=_now() - timedelta(days=60),
    )
    db.add(demo_pembimbing)

    # Flush users first so FKs can reference them
    db.flush()

    # Assign siswa to pembimbing
    sc = StudentCounselor(
        id=generate_uuid(),
        siswa_id=demo_siswa_id,
        pembimbing_id=demo_pembimbing_id,
        assigned_at=_now() - timedelta(days=29),
    )
    db.add(sc)

    # Create diary entries
    diary_texts = [
        {"text": "Hari ini saya merasa sangat bahagia karena dapat nilai bagus di ujian.", "daysAgo": 14, "emotion": "Happy"},
        {"text": "Saya senang bisa menghabiskan waktu bersama keluarga di akhir pekan.", "daysAgo": 13, "emotion": "Happy"},
        {"text": "Merasa sedikit cemas tentang presentasi besok, semoga berjalan lancar.", "daysAgo": 12, "emotion": "Fear"},
        {"text": "Presentasi berjalan baik, saya lega dan senang dengan hasilnya.", "daysAgo": 11, "emotion": "Happy"},
        {"text": "Hari biasa saja, tidak ada yang spesial terjadi hari ini.", "daysAgo": 10, "emotion": "Neutral"},
        {"text": "Saya merasa sedih karena teman baik saya pindah ke kota lain.", "daysAgo": 9, "emotion": "Sad"},
        {"text": "Masih merasa kesepian tanpa teman saya, sulit untuk fokus belajar.", "daysAgo": 8, "emotion": "Sad"},
        {"text": "Kesal dengan teman sekelompok yang tidak mau bekerja sama.", "daysAgo": 7, "emotion": "Angry"},
        {"text": "Hari ini agak lebih baik, mencoba untuk berpikir positif.", "daysAgo": 6, "emotion": "Neutral"},
        {"text": "Saya takut tidak bisa menyelesaikan tugas akhir tepat waktu.", "daysAgo": 5, "emotion": "Fear"},
        {"text": "Merasa sangat tertekan dengan banyaknya deadline yang menumpuk.", "daysAgo": 4, "emotion": "Sad"},
        {"text": "Saya menangis tadi malam, merasa tidak mampu menghadapi semua ini.", "daysAgo": 3, "emotion": "Sad"},
        {"text": "Tidak bisa tidur dengan baik, pikiran terus berputar tentang masalah.", "daysAgo": 2, "emotion": "Fear"},
        {"text": "Hari ini sedikit lebih baik, teman-teman memberi semangat.", "daysAgo": 1, "emotion": "Happy"},
        {"text": "Mencoba untuk tetap kuat, tapi kadang merasa lelah secara emosional.", "daysAgo": 0, "emotion": "Sad"},
    ]

    for d in diary_texts:
        diary_id = generate_uuid()
        entry_time = _now() - timedelta(days=d["daysAgo"])
        entry_time = entry_time.replace(
            hour=random.randint(8, 19),
            minute=random.randint(0, 59),
        )

        # Create deterministic probabilities
        probs = []
        for e in EMOTIONS:
            if e == d["emotion"]:
                probs.append(45 + random.random() * 30)
            else:
                probs.append(2 + random.random() * 10)
        total = sum(probs)
        normalized = [round((p / total) * 100, 2) for p in probs]

        probabilities = [
            {"emotion": EMOTIONS[i], "probability": normalized[i]}
            for i in range(5)
        ]

        entry = DiaryEntry(
            id=diary_id,
            user_id=demo_siswa_id,
            teks=d["text"],
            created_at=entry_time,
        )
        db.add(entry)

        # Generate explanation
        from ml.classifier import classifier as clf
        explanation = clf._generate_explanation(
            d["text"], d["emotion"],
            normalized[EMOTIONS.index(d["emotion"])],
            probabilities,
        )

        emotion = EmotionResult(
            id=generate_uuid(),
            diary_entry_id=diary_id,
            label=d["emotion"],
            confidence=normalized[EMOTIONS.index(d["emotion"])],
            probabilities=probabilities,
            ai_explanation=explanation,
            created_at=entry_time,
        )
        db.add(emotion)

    # Flush diary entries + emotion results
    db.flush()

    # Demo messages
    msg1 = Message(
        id=generate_uuid(),
        sender_id=demo_pembimbing_id,
        sender_role="pembimbing",
        siswa_id=demo_siswa_id,
        message="Saya perhatikan emosi Anda cenderung sedih beberapa hari terakhir. Jangan ragu untuk menceritakan apa yang Anda rasakan. Anda tidak sendirian.",
        is_read=False,
        created_at=_now() - timedelta(days=2),
    )
    msg2 = Message(
        id=generate_uuid(),
        sender_id=demo_pembimbing_id,
        sender_role="pembimbing",
        siswa_id=demo_siswa_id,
        message="Bagus sekali Anda tetap menulis diary secara rutin. Ini adalah langkah positif untuk kesehatan mental Anda. Terus semangat!",
        is_read=True,
        created_at=_now() - timedelta(days=5),
    )
    db.add(msg1)
    db.add(msg2)

    # Demo note
    note = PembimbingNote(
        id=generate_uuid(),
        pembimbing_id=demo_pembimbing_id,
        siswa_id=demo_siswa_id,
        note="Siswa menunjukkan pola emosi negatif yang meningkat dalam seminggu terakhir. Perlu monitoring lebih lanjut.",
        created_at=_now() - timedelta(days=1),
    )
    db.add(note)

    db.commit()
    print("[INFO] Demo data seeded successfully.")
    print("[INFO] Demo siswa: siswa@demo.com / demo123")
    print("[INFO] Demo pembimbing: pembimbing@demo.com / demo123")
