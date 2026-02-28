"""
Emotion classifier using Naive Bayes + TF-IDF.
5 classes: Happy, Sad, Angry, Fear, Neutral

Explanation is generated via Groq API (Llama 3.3 70B) with
static-template fallback when the API is unavailable.
"""

import os
from typing import Dict, List

import joblib
import numpy as np
from openai import OpenAI

from config import settings
from ml.preprocessor import preprocessor

EMOTIONS = ["Happy", "Sad", "Angry", "Fear", "Neutral"]

EMOTION_LABELS_ID: Dict[str, str] = {
    "Happy": "Senang",
    "Sad": "Sedih",
    "Angry": "Marah",
    "Fear": "Takut",
    "Neutral": "Netral",
}


class EmotionClassifier:
    def __init__(self):
        self.pipeline = None
        self.groq_client = None
        self._load_model()
        self._init_groq()

    def _init_groq(self):
        """Initialize Groq client if API key is configured."""
        if settings.GROQ_API_KEY:
            try:
                self.groq_client = OpenAI(
                    api_key=settings.GROQ_API_KEY,
                    base_url="https://api.groq.com/openai/v1",
                )
                print("[INFO] Groq client initialized successfully")
            except Exception as e:
                print(f"[WARNING] Failed to initialize Groq client: {e}")
                self.groq_client = None
        else:
            print("[INFO] GROQ_API_KEY not set — using static template for explanations")

    def _load_model(self):
        path = settings.MODEL_PATH
        if os.path.exists(path):
            self.pipeline = joblib.load(path)
            print(f"[INFO] Model loaded from {path}")
        else:
            print(f"[WARNING] Model not found at {path}. Run train.py first.")

    def reload(self):
        """Reload model from disk (after retraining)."""
        self._load_model()

    def classify(self, text: str) -> Dict:
        """
        Classify a single text and return:
        {label, confidence, probabilities: [{emotion, probability}], aiExplanation}
        """
        cleaned = preprocessor.preprocess(text)

        if self.pipeline is None:
            # Fallback: mock classification if model not trained yet
            return self._mock_classify(text)

        proba = self.pipeline.predict_proba([cleaned])[0]
        classes = list(self.pipeline.classes_)

        # Build probability list aligned to EMOTIONS
        probabilities = []
        for emotion in EMOTIONS:
            if emotion in classes:
                idx = classes.index(emotion)
                probabilities.append({
                    "emotion": emotion,
                    "probability": round(float(proba[idx]) * 100, 2),
                })
            else:
                probabilities.append({"emotion": emotion, "probability": 0.0})

        # Determine the winning label
        best = max(probabilities, key=lambda x: x["probability"])
        label = str(best["emotion"])
        confidence = float(best["probability"])

        ai_explanation = self._get_explanation(text, label, confidence, probabilities)

        return {
            "label": label,
            "confidence": confidence,
            "probabilities": probabilities,
            "aiExplanation": ai_explanation,
        }

    # ------------------------------------------------------------------
    def _mock_classify(self, text: str) -> Dict:
        """Fallback when model is not trained."""
        seed = len(text) % 5
        raw = []
        for i in range(5):
            base = 0.5 + np.random.random() * 0.3 if i == seed else np.random.random() * 0.15
            raw.append(base)
        total = sum(raw)
        normalized = [v / total for v in raw]
        max_idx = int(np.argmax(normalized))

        probabilities = [
            {"emotion": EMOTIONS[i], "probability": round(normalized[i] * 100, 2)}
            for i in range(5)
        ]
        label = EMOTIONS[max_idx]
        confidence = probabilities[max_idx]["probability"]

        return {
            "label": label,
            "confidence": confidence,
            "probabilities": probabilities,
            "aiExplanation": self._get_explanation(text, label, confidence, probabilities),
        }

    # ------------------------------------------------------------------
    def _get_explanation(
        self,
        text: str,
        label: str,
        confidence: float,
        probabilities: List[Dict],
    ) -> str:
        """
        Try Groq API first for a contextual, natural explanation.
        Falls back to the static template if Groq is unavailable.
        """
        if self.groq_client:
            try:
                return self._generate_groq_explanation(text, label, confidence, probabilities)
            except Exception as e:
                print(f"[WARNING] Groq API failed, using template fallback: {e}")
        return self._generate_template_explanation(text, label, confidence, probabilities)

    # ------------------------------------------------------------------
    def _generate_groq_explanation(
        self,
        text: str,
        label: str,
        confidence: float,
        probabilities: List[Dict],
    ) -> str:
        """Generate a contextual explanation using Groq (Llama 3.3 70B)."""
        label_id = EMOTION_LABELS_ID.get(label, label)
        sorted_probs = sorted(probabilities, key=lambda x: x["probability"], reverse=True)
        probs_text = ", ".join(
            f"{p['emotion']} ({EMOTION_LABELS_ID.get(p['emotion'], p['emotion'])}): {p['probability']:.2f}%"
            for p in sorted_probs
        )

        system_prompt = (
            "Kamu adalah asisten konseling sekolah yang ahli dalam psikologi remaja. "
            "Tugasmu adalah menjelaskan hasil klasifikasi emosi dari diary siswa "
            "menggunakan bahasa Indonesia yang empatik, mudah dipahami siswa SMA, dan supportif. "
            "Jangan menyebutkan istilah teknis seperti 'Naive Bayes', 'TF-IDF', atau 'machine learning'. "
            "Fokus pada isi tulisan siswa dan berikan saran yang relevan."
        )

        user_prompt = (
            f"Berikut hasil analisis emosi dari diary seorang siswa:\n\n"
            f"Teks diary: \"{text}\"\n\n"
            f"Emosi terdeteksi: {label} ({label_id}) dengan tingkat kepercayaan {confidence:.1f}%\n"
            f"Distribusi probabilitas: {probs_text}\n\n"
            f"Buatkan penjelasan dengan format berikut:\n"
            f"1. Paragraf pertama: Jelaskan emosi apa yang terdeteksi dan mengapa (berdasarkan kata/konteks dalam teks)\n"
            f"2. Paragraf kedua: Interpretasi kondisi emosional siswa\n"
            f"3. Paragraf ketiga: Saran supportif yang spesifik dan relevan dengan isi diary\n\n"
            f"Gunakan emoji yang sesuai. Maksimal 200 kata. Nada empatik dan hangat."
        )

        response = self.groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=500,
            temperature=0.7,
        )

        groq_text = response.choices[0].message.content.strip()

        # Prepend classification stats
        header = (
            f"📊 **Hasil Analisis Emosi**\n\n"
            f"Emosi terdeteksi: **{label} ({label_id})** — Kepercayaan: **{confidence:.2f}%**\n"
            f"📈 Distribusi: {probs_text}\n\n"
            f"---\n\n"
        )
        return header + groq_text

    # ------------------------------------------------------------------
    @staticmethod
    def _generate_template_explanation(
        text: str,
        label: str,
        confidence: float,
        probabilities: List[Dict],
    ) -> str:
        sorted_probs = sorted(probabilities, key=lambda x: x["probability"], reverse=True)
        top = sorted_probs[0]
        second = sorted_probs[1]

        emotion_desc = {
            "Happy": "kebahagiaan, kegembiraan, atau perasaan positif",
            "Sad": "kesedihan, kekecewaan, atau perasaan kehilangan",
            "Angry": "kemarahan, frustrasi, atau ketidakpuasan",
            "Fear": "ketakutan, kecemasan, atau kekhawatiran",
            "Neutral": "perasaan netral tanpa emosi dominan yang kuat",
        }

        emotion_suggestions = {
            "Happy": "Emosi positif ini menunjukkan kondisi mental yang baik. Terus pertahankan aktivitas yang membuat Anda merasa senang.",
            "Sad": "Pola emosi sedih yang terdeteksi perlu diperhatikan. Disarankan untuk berbicara dengan pembimbing konseling atau orang terdekat tentang perasaan ini.",
            "Angry": "Emosi marah yang terdeteksi dapat mengindikasikan adanya tekanan atau konflik. Teknik relaksasi dan komunikasi asertif dapat membantu mengelola emosi ini.",
            "Fear": "Kecemasan atau ketakutan yang terdeteksi mungkin memerlukan perhatian khusus. Teknik grounding dan mindfulness dapat membantu meredakan perasaan ini.",
            "Neutral": "Tidak ada emosi dominan yang kuat terdeteksi. Ini bisa menunjukkan kondisi stabil atau ekspresi emosi yang terbatas dalam tulisan.",
        }

        label_id = EMOTION_LABELS_ID.get(label, label)
        probs_text = ", ".join(
            f"{p['emotion']} ({EMOTION_LABELS_ID.get(p['emotion'], p['emotion'])}): {p['probability']:.2f}%"
            for p in sorted_probs
        )

        return (
            f"📊 **Hasil Analisis Klasifikasi Emosi (Explainable AI)**\n\n"
            f"Berdasarkan analisis teks menggunakan algoritma Naive Bayes Classifier dengan fitur TF-IDF, "
            f"emosi yang terdeteksi adalah **{label} ({label_id})** dengan tingkat kepercayaan sebesar **{confidence:.2f}%**.\n\n"
            f"🔍 **Mengapa emosi ini terdeteksi?**\n"
            f"Teks yang ditulis mengandung pola kata dan ekspresi yang mengindikasikan {emotion_desc.get(label, 'emosi tertentu')}. "
            f"Algoritma Naive Bayes menghitung probabilitas posterior setiap kelas emosi berdasarkan kemunculan kata-kata dalam teks, "
            f"dan emosi {label} ({label_id}) memiliki probabilitas tertinggi.\n\n"
            f"📈 **Distribusi Probabilitas:**\n{probs_text}\n\n"
            f"Emosi {top['emotion']} unggul dengan selisih {(top['probability'] - second['probability']):.2f}% "
            f"dibandingkan emosi tertinggi kedua ({second['emotion']}).\n\n"
            f"💡 **Interpretasi & Saran:**\n"
            f"{emotion_suggestions.get(label, 'Perhatikan pola emosi ini untuk monitoring kesehatan mental yang berkelanjutan.')}"
        )


# Singleton
classifier = EmotionClassifier()
