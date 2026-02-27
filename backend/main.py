"""
EmotionSense AI — FastAPI Backend
Main entry point.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db, SessionLocal
from routers import auth, diary, notes, messages, students, evaluation
from seed import seed_demo_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables & seed demo data
    init_db()
    db = SessionLocal()
    try:
        seed_demo_data(db)
    finally:
        db.close()
    yield
    # Shutdown: nothing to clean up


app = FastAPI(
    title="EmotionSense AI API",
    description="Backend API untuk sistem klasifikasi emosi buku harian digital berbasis Naive Bayes + TF-IDF",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(diary.router)
app.include_router(notes.router)
app.include_router(messages.router)
app.include_router(students.router)
app.include_router(evaluation.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "EmotionSense AI API is running"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
