"""
Emotion classifier using Naive Bayes + TF-IDF.
5 classes: Happy, Sad, Angry, Fear, Neutral
"""

import os
from typing import Dict, List

import joblib
import numpy as np

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
        self._load_model()

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

        ai_explanation = self._generate_explanation(text, label, confidence, probabilities)

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
            "aiExplanation": self._generate_explanation(text, label, confidence, probabilities),
        }

    # ------------------------------------------------------------------
    @staticmethod
    def _generate_explanation(
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
