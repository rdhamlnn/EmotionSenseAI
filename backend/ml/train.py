"""
Training script for the Naive Bayes + TF-IDF emotion classifier.
Reads DatasetGabungan.csv, trains, and saves model to ml/model.joblib.
Also saves evaluation metrics to ml/evaluation.joblib.

Label mapping from dataset → model classes:
  happy  → Happy
  sadness / sad → Sad
  anger / angry → Angry
  fear   → Fear
  love   → Happy  (grouped with positive)
  neutral→ Neutral (if present)

Run:  python -m ml.train   (from backend/)
"""

import os
import sys

import pandas as pd
import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
)

# Ensure backend/ is on path when run as script
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings
from ml.preprocessor import preprocessor


LABEL_MAP = {
    "happy": "Happy",
    "sadness": "Sad",
    "sad": "Sad",
    "anger": "Angry",
    "angry": "Angry",
    "fear": "Fear",
    "love": "Happy",
    "neutral": "Neutral",
}


def train():
    print("=" * 60)
    print("  EmotionSense AI — Model Training")
    print("=" * 60)

    # 1. Load dataset
    dataset_path = settings.DATASET_PATH
    if not os.path.exists(dataset_path):
        print(f"[ERROR] Dataset not found: {dataset_path}")
        return

    df = pd.read_csv(dataset_path, sep=",", on_bad_lines="skip", engine="python")
    print(f"[INFO] Loaded {len(df)} rows from dataset.")

    # Detect column names
    cols = df.columns.tolist()
    # First column should be label, second should be text
    label_col = cols[0]
    text_col = cols[1] if len(cols) > 1 else cols[0]

    print(f"[INFO] Using columns: label='{label_col}', text='{text_col}'")

    # 2. Clean & map labels
    df = df.dropna(subset=[label_col, text_col])
    df["label_clean"] = df[label_col].astype(str).str.strip().str.lower()
    df["label_mapped"] = df["label_clean"].map(LABEL_MAP)
    df = df.dropna(subset=["label_mapped"])

    print(f"[INFO] After label mapping: {len(df)} rows")
    print(f"[INFO] Label distribution:\n{df['label_mapped'].value_counts()}")

    # 3. Preprocess text
    print("[INFO] Preprocessing text (with stopword removal & stemming)...")
    df["text_clean"] = df[text_col].astype(str).apply(preprocessor.preprocess)

    # 4. Split
    X_train, X_test, y_train, y_test = train_test_split(
        df["text_clean"], df["label_mapped"],
        test_size=0.2,
        random_state=42,
        stratify=df["label_mapped"],
    )
    print(f"[INFO] Train: {len(X_train)}, Test: {len(X_test)}")

    # 5. Build pipeline
    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(max_features=10000, ngram_range=(1, 2))),
        ("nb", MultinomialNB(alpha=0.1)),
    ])

    # 6. Train
    print("[INFO] Training Naive Bayes + TF-IDF...")
    pipeline.fit(X_train, y_train)

    # 7. Evaluate
    y_pred = pipeline.predict(X_test)
    labels = sorted(list(set(y_test.values)))
    report_dict = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    cm = confusion_matrix(y_test, y_pred, labels=labels)

    print("\n[RESULT] Classification Report:")
    print(classification_report(y_test, y_pred, zero_division=0))

    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average="weighted", zero_division=0)
    recall = recall_score(y_test, y_pred, average="weighted", zero_division=0)
    f1 = f1_score(y_test, y_pred, average="weighted", zero_division=0)

    print(f"[RESULT] Accuracy:  {accuracy:.4f}")
    print(f"[RESULT] Precision: {precision:.4f}")
    print(f"[RESULT] Recall:    {recall:.4f}")
    print(f"[RESULT] F1-Score:  {f1:.4f}")

    # 8. Save model
    os.makedirs(os.path.dirname(settings.MODEL_PATH), exist_ok=True)
    joblib.dump(pipeline, settings.MODEL_PATH)
    print(f"[INFO] Model saved to {settings.MODEL_PATH}")

    # 9. Save evaluation metrics
    eval_path = os.path.join(os.path.dirname(settings.MODEL_PATH), "evaluation.joblib")
    evaluation = {
        "accuracy": round(float(accuracy), 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1_score": round(float(f1), 4),
        "labels": labels,
        "confusion_matrix": cm.tolist(),
        "classification_report": report_dict,
        "train_size": len(X_train),
        "test_size": len(X_test),
        "total_dataset": len(df),
    }
    joblib.dump(evaluation, eval_path)
    print(f"[INFO] Evaluation metrics saved to {eval_path}")
    print("=" * 60)


if __name__ == "__main__":
    train()
