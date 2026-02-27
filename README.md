# EmotionSense AI

Sistem klasifikasi emosi buku harian digital berbasis Naive Bayes + TF-IDF.

---

## Prasyarat

Pastikan sudah terinstall di komputer Anda:

- **Python** 3.10+ → [Download](https://www.python.org/downloads/)
- **Node.js** 18+ & npm → [Download](https://nodejs.org/)
- **Git** → [Download](https://git-scm.com/)

---

## 1. Clone Repository

```bash
git clone <url-repository>
cd project
```

---

## 2. Setup & Jalankan Backend (FastAPI)

### a. Buat virtual environment

```bash
cd backend
python -m venv ../.venv
```

### b. Aktifkan virtual environment

**Windows (PowerShell):**

```powershell
..\.venv\Scripts\Activate.ps1
```

**Windows (CMD):**

```cmd
..\.venv\Scripts\activate.bat
```

**macOS / Linux:**

```bash
source ../.venv/bin/activate
```

### c. Install dependencies

```bash
pip install -r requirements.txt
```

### d. Buat file `.env`

Buat file `backend/.env` dan isi dengan konfigurasi berikut:

```env
SECRET_KEY=your-secret-key-here
SUPABASE_REF=your-supabase-ref
SUPABASE_PASSWORD=your-supabase-password
SUPABASE_URL=https://your-ref.supabase.co
SUPABASE_KEY=your-supabase-anon-key
```

> **Catatan:** Jika Supabase tidak tersedia (offline/belum dikonfigurasi), backend akan otomatis menggunakan SQLite lokal (`dev.db`) sebagai fallback.

### e. Jalankan backend

```bash
python main.py
```

Backend berjalan di: **http://localhost:8000**
Dokumentasi API: **http://localhost:8000/docs**

---

## 3. Setup & Jalankan Frontend (Next.js)

Buka **terminal baru** (biarkan backend tetap berjalan).

### a. Install dependencies

```bash
cd EmotionSenseAi
npm install
```

### b. Jalankan frontend

```bash
npm run dev
```

Frontend berjalan di: **http://localhost:3000**

---

## Ringkasan Perintah Cepat

| Terminal 1 (Backend)                  | Terminal 2 (Frontend)        |
| ------------------------------------- | ---------------------------- |
| `cd backend`                          | `cd EmotionSenseAi`         |
| `python -m venv ../.venv`            | `npm install`                |
| `..\.venv\Scripts\Activate.ps1`      | `npm run dev`                |
| `pip install -r requirements.txt`    |                              |
| `python main.py`                      |                              |

---

## Struktur Proyek

```
project/
├── backend/          # FastAPI backend (Python)
│   ├── main.py       # Entry point
│   ├── ml/           # Machine learning (model & preprocessor)
│   ├── routers/      # API routes
│   └── .env          # Environment variables (buat manual)
├── EmotionSenseAi/   # Next.js frontend
│   ├── src/          # Source code React
│   └── public/       # Static assets
└── README.md
```