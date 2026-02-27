"""
Debug script untuk menguji klasifikasi emosi secara interaktif.
Menampilkan setiap tahap preprocessing dan hasil klasifikasi secara detail.

Cara pakai:
  python debug_classify.py
  python debug_classify.py "Aku sedih sekali hari ini"
"""

import sys
import os
import re
import json
from typing import Optional

# ── pastikan import dari root backend ──────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ml.preprocessor import TextPreprocessor
from ml.classifier import EmotionClassifier, EMOTIONS, EMOTION_LABELS_ID

# ── Warna terminal (ANSI) ─────────────────────────────────────────
class C:
    HEADER  = "\033[95m"
    BLUE    = "\033[94m"
    CYAN    = "\033[96m"
    GREEN   = "\033[92m"
    YELLOW  = "\033[93m"
    RED     = "\033[91m"
    BOLD    = "\033[1m"
    UNDERLINE = "\033[4m"
    END     = "\033[0m"


def color(text: str, code: str) -> str:
    return f"{code}{text}{C.END}"


EMOTION_COLOR = {
    "Happy":   C.GREEN,
    "Sad":     C.BLUE,
    "Angry":   C.RED,
    "Fear":    C.YELLOW,
    "Neutral": C.CYAN,
}


# ── Step-by-step preprocessing ─────────────────────────────────────
def debug_preprocess(preprocessor: TextPreprocessor, text: str) -> str:
    """Jalankan preprocessing tahap demi tahap dan tampilkan perubahan."""
    separator = color("─" * 60, C.CYAN)

    print(separator)
    print(color("  TAHAP PREPROCESSING", C.BOLD + C.CYAN))
    print(separator)

    step = 0

    def show(label: str, result: str, changed: bool = True):
        nonlocal step
        step += 1
        status = color("✔ berubah", C.GREEN) if changed else color("─ tetap", C.YELLOW)
        print(f"  {color(f'[{step}]', C.BOLD)} {label}  {status}")
        print(f"      → {color(repr(result), C.CYAN)}\n")

    # 0. Original
    print(f"\n  {color('Input asli:', C.BOLD)}")
    print(f"      {color(repr(text), C.YELLOW)}\n")

    # 1. Lowercase
    prev = text
    result = text.lower()
    show("Lowercasing", result, result != prev)

    # 2. Remove URLs
    prev = result
    result = re.sub(r"https?://\S+|www\.\S+", " ", result)
    show("Hapus URL", result, result != prev)

    # 3. Remove mentions & hashtags
    prev = result
    result = re.sub(r"@\w+", " ", result)
    result = re.sub(r"#\w+", " ", result)
    show("Hapus @mention & #hashtag", result, result != prev)

    # 4. Expand abbreviations
    prev = result
    words = result.split()
    expanded_words = []
    changed_abbr = []
    for w in words:
        replacement = preprocessor.kamus.get(w, w)
        if replacement != w:
            changed_abbr.append(f"{w} → {replacement}")
        expanded_words.append(replacement)
    result = " ".join(expanded_words)
    show("Ekspansi singkatan (kamus)", result, result != prev)
    if changed_abbr:
        print(f"      {color('Singkatan diekspansi:', C.GREEN)}")
        for abbr in changed_abbr:
            print(f"        • {abbr}")
        print()

    # 5. Remove punctuation
    prev = result
    result = re.sub(r"[^\w\s]", " ", result)
    show("Hapus tanda baca", result, result != prev)

    # 6. Remove numbers
    prev = result
    result = re.sub(r"\d+", " ", result)
    show("Hapus angka", result, result != prev)

    # 7. Normalize whitespace
    prev = result
    result = re.sub(r"\s+", " ", result).strip()
    show("Normalisasi spasi", result, result != prev)

    print(f"  {color('Hasil akhir preprocessing:', C.BOLD + C.GREEN)}")
    print(f"      {color(repr(result), C.GREEN)}\n")

    return result


# ── Klasifikasi & debug ────────────────────────────────────────────
def debug_classify(classifier_obj: EmotionClassifier, cleaned_text: str, original_text: str):
    """Jalankan klasifikasi dan tampilkan hasil lengkap."""
    separator = color("─" * 60, C.CYAN)

    print(separator)
    print(color("  HASIL KLASIFIKASI EMOSI", C.BOLD + C.CYAN))
    print(separator)

    if classifier_obj.pipeline is None:
        print(color("\n  ⚠  Model belum di-train! Jalankan: python -m ml.train\n", C.RED))
        return

    # Dapatkan probabilitas mentah
    proba = classifier_obj.pipeline.predict_proba([cleaned_text])[0]
    classes = list(classifier_obj.pipeline.classes_)

    # Prediksi
    predicted = classifier_obj.pipeline.predict([cleaned_text])[0]

    print(f"\n  {color('Predicted class:', C.BOLD)} {color(predicted, EMOTION_COLOR.get(predicted, C.CYAN))}"
          f" ({EMOTION_LABELS_ID.get(predicted, predicted)})\n")

    # Tabel probabilitas
    print(f"  {color('Distribusi Probabilitas:', C.BOLD)}\n")
    print(f"    {'Emosi':<10} {'(ID)':<10} {'Probabilitas':>12}   Bar")
    print(f"    {'─'*10} {'─'*10} {'─'*12}   {'─'*25}")

    probabilities = []
    for emotion in EMOTIONS:
        if emotion in classes:
            idx = classes.index(emotion)
            prob = proba[idx] * 100
        else:
            prob = 0.0
        probabilities.append({"emotion": emotion, "probability": round(prob, 2)})

    sorted_probs = sorted(probabilities, key=lambda x: x["probability"], reverse=True)

    for p in sorted_probs:
        emotion = p["emotion"]
        prob = p["probability"]
        label_id = EMOTION_LABELS_ID.get(emotion, emotion)
        bar_len = int(prob / 4)  # scale: 25 chars = 100%
        bar = "█" * bar_len + "░" * (25 - bar_len)
        marker = " ◄── PREDICTED" if emotion == predicted else ""
        clr = EMOTION_COLOR.get(emotion, C.CYAN)
        print(f"    {color(emotion, clr):<22} {label_id:<10} {prob:>10.2f}%   {color(bar, clr)}{marker}")

    print()

    # Selisih top-1 vs top-2
    top1 = sorted_probs[0]
    top2 = sorted_probs[1]
    gap = top1["probability"] - top2["probability"]
    confidence_note = (
        color("Tinggi", C.GREEN) if gap > 20
        else color("Sedang", C.YELLOW) if gap > 5
        else color("Rendah (ambigu)", C.RED)
    )
    print(f"  Selisih Top-1 vs Top-2: {color(f'{gap:.2f}%', C.BOLD)}  ({confidence_note})")
    print()

    # TF-IDF feature debug
    print(separator)
    print(color("  DEBUG TF-IDF FEATURES", C.BOLD + C.CYAN))
    print(separator)

    try:
        # Pipeline: tfidf -> clf
        tfidf = classifier_obj.pipeline.named_steps.get("tfidf") or classifier_obj.pipeline[0]
        clf = classifier_obj.pipeline.named_steps.get("clf") or classifier_obj.pipeline[1]

        # Transform text
        tfidf_vector = tfidf.transform([cleaned_text])
        feature_names = tfidf.get_feature_names_out()

        # Non-zero features
        nonzero_indices = tfidf_vector.nonzero()[1]
        nonzero_features = [(feature_names[i], tfidf_vector[0, i]) for i in nonzero_indices]
        nonzero_features.sort(key=lambda x: x[1], reverse=True)

        print(f"\n  Jumlah fitur non-zero: {color(str(len(nonzero_features)), C.BOLD)}")
        print(f"  Total fitur vocabulary: {color(str(len(feature_names)), C.BOLD)}\n")

        if nonzero_features:
            print(f"  {color('Top fitur TF-IDF dari teks ini:', C.BOLD)}\n")
            print(f"    {'No':<5} {'Fitur':<25} {'TF-IDF Score':>12}")
            print(f"    {'─'*5} {'─'*25} {'─'*12}")
            for i, (feat, score) in enumerate(nonzero_features[:20], 1):
                print(f"    {i:<5} {color(feat, C.YELLOW):<33} {score:>10.6f}")
            if len(nonzero_features) > 20:
                print(f"    ... dan {len(nonzero_features) - 20} fitur lainnya")
        else:
            print(color("  ⚠  Tidak ada fitur yang cocok di vocabulary!", C.RED))
            print("     Teks mungkin terlalu pendek atau mengandung kata-kata yang tidak ada di training data.")

        print()

        # Top words yang berkontribusi untuk setiap emosi
        print(separator)
        print(color("  KONTRIBUSI FITUR PER EMOSI", C.BOLD + C.CYAN))
        print(separator)
        print()

        if hasattr(clf, 'feature_log_prob_'):
            for emotion in EMOTIONS:
                if emotion in classes:
                    class_idx = classes.index(emotion)
                    log_probs = clf.feature_log_prob_[class_idx]

                    # Hanya fitur yang aktif di teks ini
                    if len(nonzero_indices) > 0:
                        active_contributions = [
                            (feature_names[i], log_probs[i])
                            for i in nonzero_indices
                        ]
                        active_contributions.sort(key=lambda x: x[1], reverse=True)

                        clr = EMOTION_COLOR.get(emotion, C.CYAN)
                        print(f"  {color(emotion, clr + C.BOLD)} ({EMOTION_LABELS_ID.get(emotion, emotion)}):")
                        for feat, lp in active_contributions[:5]:
                            print(f"    • {feat:<20} log-prob: {lp:.4f}")
                        print()

    except Exception as e:
        print(color(f"\n  ⚠  Tidak dapat mengekstrak fitur TF-IDF: {e}", C.RED))

    # XAI Explanation
    print(separator)
    print(color("  PENJELASAN AI (XAI)", C.BOLD + C.CYAN))
    print(separator)
    explanation = classifier_obj._generate_explanation(
        original_text, predicted, top1["probability"], probabilities
    )
    # Strip markdown bold for terminal
    explanation_clean = explanation.replace("**", "")
    print(f"\n{explanation_clean}\n")


# ── JSON output ────────────────────────────────────────────────────
def print_api_response(classifier_obj: EmotionClassifier, text: str):
    """Tampilkan response persis seperti yang dikembalikan API."""
    separator = color("─" * 60, C.CYAN)
    print(separator)
    print(color("  API RESPONSE (JSON)", C.BOLD + C.CYAN))
    print(separator)

    result = classifier_obj.classify(text)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    print()


# ── Main ───────────────────────────────────────────────────────────
def main():
    print()
    print(color("╔══════════════════════════════════════════════════════════╗", C.BOLD + C.CYAN))
    print(color("║       EmotionSense AI — Debug Klasifikasi Emosi        ║", C.BOLD + C.CYAN))
    print(color("╚══════════════════════════════════════════════════════════╝", C.BOLD + C.CYAN))
    print()

    # Load preprocessor & classifier
    prep = TextPreprocessor()
    cls = EmotionClassifier()

    # Jika ada argumen command line, klasifikasi langsung
    if len(sys.argv) > 1:
        text = " ".join(sys.argv[1:])
        cleaned = debug_preprocess(prep, text)
        debug_classify(cls, cleaned, text)
        print_api_response(cls, text)
        return

    # Mode interaktif
    print(color("  Mode interaktif. Ketik teks untuk diklasifikasi.", C.BOLD))
    print(color("  Ketik 'quit' atau 'exit' untuk keluar.\n", C.YELLOW))

    while True:
        try:
            text = input(color("  📝 Masukkan teks: ", C.BOLD + C.GREEN))
        except (EOFError, KeyboardInterrupt):
            print(color("\n\n  Sampai jumpa! 👋\n", C.CYAN))
            break

        text = text.strip()
        if not text:
            continue
        if text.lower() in ("quit", "exit", "q"):
            print(color("\n  Sampai jumpa! 👋\n", C.CYAN))
            break

        print()
        cleaned = debug_preprocess(prep, text)
        debug_classify(cls, cleaned, text)
        print_api_response(cls, text)


if __name__ == "__main__":
    main()
