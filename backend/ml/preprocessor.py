"""
Text preprocessor for Indonesian emotion classification.
Handles:
- Lowercasing
- Abbreviation expansion (kamus_singkatan.csv)
- Punctuation / number removal
- Stopword removal (Indonesian)
- Stemming (Sastrawi)
- Extra whitespace normalization
"""

import re
import csv
import os
from typing import Dict, Set

from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
from config import settings

# Indonesian stopwords — common function words that carry little emotion signal
INDONESIAN_STOPWORDS: Set[str] = {
    "ada", "adalah", "adanya", "adapun", "agak", "agaknya", "agar", "akan",
    "akankah", "akhir", "akhirnya", "aku", "akulah", "amat", "amatlah",
    "anda", "andalah", "antar", "antara", "antaranya", "apa", "apaan",
    "apabila", "apakah", "apalagi", "apatah", "artinya", "asal", "asalkan",
    "atas", "atau", "ataukah", "ataupun", "awal", "awalnya", "bagai",
    "bagaikan", "bagaimana", "bagaimanakah", "bagaimanapun", "bagi",
    "bagian", "bahkan", "bahwa", "bahwasanya", "baik", "bakal", "bakalan",
    "balik", "banyak", "bapak", "baru", "bawah", "beberapa", "begini",
    "beginian", "beginikah", "beginilah", "begitu", "begitukah", "begitulah",
    "begitupun", "belakang", "belakangan", "belum", "belumlah", "benar",
    "benarkah", "benarlah", "berada", "berakhir", "berakhirlah",
    "berakhirnya", "berapa", "berapakah", "berapalah", "berapapun",
    "berarti", "berawal", "berbagai", "berdatangan", "beri", "berikan",
    "berikut", "berikutnya", "berjumlah", "berkali", "berkata", "berkehendak",
    "berkeinginan", "berkenaan", "berlainan", "berlalu", "berlangsung",
    "berlebihan", "bermacam", "bermaksud", "bermula", "bersama", "bersiap",
    "bertanya", "berturut", "bertutur", "berupa", "besar", "betul",
    "betulkah", "biasa", "biasanya", "bila", "bilakah", "bisa", "bisakah",
    "boleh", "bolehkah", "bolehlah", "buat", "bukan", "bukankah",
    "bukanlah", "bukannya", "bulan", "bung", "cara", "caranya", "cukup",
    "cukupkah", "cukuplah", "cuma", "dahulu", "dalam", "dan", "dapat",
    "dari", "daripada", "datang", "dekat", "demi", "demikian", "demikianlah",
    "dengan", "depan", "di", "dia", "diakhiri", "diakhirinya", "dialah",
    "diantara", "diantaranya", "diberi", "diberikan", "diberikannya",
    "dibuat", "dibuatnya", "didapat", "didatangkan", "digunakan", "diibaratkan",
    "diibaratkannya", "diingat", "diingatkan", "diinginkan", "dijadikan",
    "dijadikannya", "dikatakan", "dikatakannya", "dikerjakan", "diketahui",
    "diketahuinya", "dilakukan", "dilalui", "dilihat", "dimaksud",
    "dimaksudkan", "dimaksudkannya", "dimaksudnya", "diminta", "dimintai",
    "dimisalkan", "dimulai", "dimulailah", "dimulainya", "dimungkinkan",
    "dini", "dipastikan", "diperbuat", "diperbuatnya", "dipergunakan",
    "diperkirakan", "diperlihatkan", "diperlukan", "diperlukannya",
    "dipersoalkan", "dipertanyakan", "dipunyai", "diri", "dirinya",
    "disampaikan", "disebut", "disebutkan", "disebutkannya", "disini",
    "disinilah", "ditambahkan", "ditandaskan", "ditanya", "ditanyai",
    "ditanyakan", "ditegaskan", "ditujukan", "ditunjuk", "ditunjuki",
    "ditunjukkan", "ditunjukkannya", "ditunjuknya", "dituturkan",
    "dituturkannya", "diucapkan", "diucapkannya", "diungkapkan", "dong",
    "dua", "dulu", "empat", "enggak", "enggaknya", "entah", "entahlah",
    "guna", "gunakan", "hal", "hampir", "hanya", "hanyalah", "hari",
    "harus", "haruslah", "harusnya", "hendak", "hendaklah", "hendaknya",
    "hingga", "ia", "ialah", "ibarat", "ibaratkan", "ibaratnya", "ibu",
    "ikut", "ingat", "ini", "inikah", "inilah", "itu", "itukah",
    "itulah", "jadi", "jadilah", "jadinya", "jangan", "jangankan",
    "janganlah", "jauh", "jawab", "jawaban", "jawabnya", "jelas",
    "jelaskan", "jelaslah", "jelasnya", "jika", "jikalau", "juga",
    "jumlah", "jumlahnya", "justru", "kala", "kalau", "kalaulah",
    "kalaupun", "kalian", "kami", "kamilah", "kamu", "kamulah", "kan",
    "kapan", "kapankah", "kapanpun", "karena", "karenanya", "kasus",
    "kata", "katakan", "katakanlah", "katanya", "ke", "keadaan",
    "kebetulan", "kecil", "kedua", "keduanya", "keinginan", "kelamaan",
    "kelihatan", "kelihatannya", "kelima", "keluar", "kembali", "kemudian",
    "kemungkinan", "kemungkinannya", "kenapa", "kepada", "kepadanya",
    "kesampaian", "keseluruhan", "keseluruhannya", "keterlaluan", "ketika",
    "khususnya", "kini", "kinilah", "kira", "kiranya", "kita", "kitalah",
    "kok", "kurang", "lagi", "lagian", "lah", "lain", "lainnya",
    "lalu", "lama", "lamanya", "langsung", "lanjut", "lanjutnya",
    "lebih", "leh", "lima", "luar", "macam", "maka", "makanya",
    "makin", "malah", "malahan", "mampu", "mampukah", "mana", "manakala",
    "manalagi", "masa", "masalah", "masalahnya", "masih", "masihkah",
    "masing", "mau", "maupun", "melainkan", "melakukan", "melalui",
    "melihat", "melihatnya", "memang", "memastikan", "memberi",
    "memberikan", "membuat", "memerlukan", "memihak", "meminta",
    "memintakan", "memisalkan", "memperbuat", "mempergunakan",
    "memperkirakan", "memperlihatkan", "mempersiapkan", "mempersoalkan",
    "mempertanyakan", "mempunyai", "memulai", "memungkinkan", "menaiki",
    "menambahkan", "menandaskan", "menanti", "menantikan", "menanya",
    "menanyai", "menanyakan", "mendapat", "mendapatkan", "mendatang",
    "mendatangi", "mendatangkan", "menegaskan", "mengakhiri", "mengapa",
    "mengatakan", "mengatakannya", "mengenai", "mengerjakan", "mengetahui",
    "menggunakan", "menghendaki", "mengibaratkan", "mengibaratkannya",
    "mengingat", "mengingatkan", "menginginkan", "mengira", "mengucapkan",
    "mengucapkannya", "mengungkapkan", "menjadi", "menjawab", "menjelaskan",
    "menuju", "menunjuk", "menunjuki", "menunjukkan", "menunjuknya",
    "menurut", "menuturkan", "menyampaikan", "menyangkut", "menyatakan",
    "menyebutkan", "menyeluruh", "menyiapkan", "merasa", "mereka",
    "merekalah", "merupakan", "meski", "meskipun", "meyakini",
    "meyakinkan", "minta", "mirip", "misal", "misalkan", "misalnya",
    "mula", "mulai", "mulailah", "mulanya", "mungkin", "mungkinkah",
    "nah", "naik", "namun", "nanti", "nantinya", "nyaris", "nyatanya",
    "oleh", "olehnya", "pada", "padahal", "padanya", "pak", "paling",
    "panjang", "pantas", "para", "pasti", "pastilah", "penting",
    "pentingnya", "per", "percuma", "perlu", "perlukah", "perlunya",
    "pernah", "persoalan", "pertama", "pertanyaan", "pertanyakan",
    "pihak", "pihaknya", "pukul", "pula", "pun", "punya", "rasa",
    "rasanya", "rata", "rupanya", "saat", "saatnya", "saja",
    "sajalah", "saling", "sama", "sambil", "sampai", "sana", "sangat",
    "sangatlah", "satu", "saya", "sayalah", "se", "sebab", "sebabnya",
    "sebagai", "sebagaimana", "sebagainya", "sebagian", "sebaik",
    "sebaiknya", "sebaliknya", "sebanyak", "sebegini", "sebegitu",
    "sebelum", "sebelumnya", "sebenarnya", "seberapa", "sebesar",
    "sebetulnya", "sebisanya", "sebuah", "sebut", "sebutlah", "sebutnya",
    "secara", "secukupnya", "sedang", "sedangkan", "sedemikian",
    "sedikit", "sedikitnya", "seenaknya", "segala", "segalanya", "segera",
    "seharusnya", "sehingga", "seingat", "sejak", "sejauh", "sejenak",
    "sejumlah", "sekadar", "sekadarnya", "sekali", "sekalian",
    "sekalipun", "sekarang", "sekaranglah", "sekecil", "seketika",
    "sekiranya", "sekitar", "sekitarnya", "sekurang", "sekurangnya",
    "sela", "selain", "selaku", "selalu", "selama", "selamanya",
    "selanjutnya", "seluruh", "seluruhnya", "semacam", "semakin",
    "semampu", "semampunya", "semasa", "semasih", "semata", "sembari",
    "sementara", "semisal", "semisalnya", "sempat", "semua", "semuanya",
    "semula", "sendiri", "sendirinya", "seolah", "seorang", "sepanjang",
    "sepantasnya", "sepantasnyalah", "seperlunya", "seperti", "sepertinya",
    "sepihak", "sering", "seringnya", "serta", "serupa", "sesaat",
    "sesama", "sesampai", "sesegera", "sesekali", "seseorang", "sesuatu",
    "sesuatunya", "sesudah", "sesudahnya", "setelah", "setempat",
    "setengah", "seterusnya", "setiap", "setiba", "setibanya",
    "setidaknya", "setinggi", "seusai", "sewaktu", "siap", "siapa",
    "siapakah", "siapapun", "sini", "sinilah", "soal", "soalnya",
    "suatu", "sudah", "sudahkah", "sudahlah", "supaya", "tadi",
    "tadinya", "tahu", "tahun", "tak", "tambah", "tambahnya", "tampak",
    "tampaknya", "tandas", "tandasnya", "tanpa", "tanya", "tanyakan",
    "tanyanya", "tapi", "tenang", "tentang", "tentu", "tentulah",
    "tentunya", "tepat", "terakhir", "terasa", "terbanyak", "terdahulu",
    "terdapat", "terdiri", "terhadap", "terhadapnya", "teringat",
    "terjadi", "terjadilah", "terjadinya", "terkira", "terlalu",
    "terlebih", "terlihat", "termasuk", "ternyata", "tersampaikan",
    "tersebut", "tersebutlah", "tertentu", "tertuju", "terus",
    "terutama", "tetap", "tetapi", "tiap", "tiba", "tidakkah",
    "tidaklah", "tiga", "tinggi", "toh", "tunjuk", "turut", "tutur",
    "tuturnya", "ucap", "ucapnya", "ujar", "ujarnya", "umum", "umumnya",
    "ungkap", "ungkapnya", "untuk", "usah", "usai", "waduh", "wah",
    "wahai", "waktu", "walaupun", "wong", "yaitu", "yakin", "yakni",
    "yang",
}


class TextPreprocessor:
    def __init__(self):
        self.kamus: Dict[str, str] = {}
        self._load_kamus()
        factory = StemmerFactory()
        self.stemmer = factory.create_stemmer()
        print("[INFO] Sastrawi stemmer initialized.")

    def _load_kamus(self):
        """Load abbreviation dictionary from CSV."""
        path = settings.KAMUS_PATH
        if not os.path.exists(path):
            print(f"[WARNING] kamus_singkatan.csv not found at {path}")
            return
        with open(path, "r", encoding="utf-8") as f:
            reader = csv.reader(f, delimiter=";")
            for row in reader:
                if len(row) >= 2:
                    self.kamus[row[0].strip().lower()] = row[1].strip().lower()
        print(f"[INFO] Loaded {len(self.kamus)} abbreviation entries.")

    def preprocess(self, text: str) -> str:
        """Full preprocessing pipeline."""
        text = text.lower()
        text = self._remove_urls(text)
        text = self._remove_mentions_hashtags(text)
        text = self._expand_abbreviations(text)
        text = self._remove_punctuation(text)
        text = self._remove_numbers(text)
        text = self._remove_stopwords(text)
        text = self._stem(text)
        text = self._normalize_whitespace(text)
        return text.strip()

    @staticmethod
    def _remove_urls(text: str) -> str:
        return re.sub(r"https?://\S+|www\.\S+", " ", text)

    @staticmethod
    def _remove_mentions_hashtags(text: str) -> str:
        text = re.sub(r"@\w+", " ", text)
        text = re.sub(r"#\w+", " ", text)
        return text

    def _expand_abbreviations(self, text: str) -> str:
        words = text.split()
        expanded = [self.kamus.get(w, w) for w in words]
        return " ".join(expanded)

    @staticmethod
    def _remove_punctuation(text: str) -> str:
        return re.sub(r"[^\w\s]", " ", text)

    @staticmethod
    def _remove_numbers(text: str) -> str:
        return re.sub(r"\d+", " ", text)

    @staticmethod
    def _remove_stopwords(text: str) -> str:
        words = text.split()
        filtered = [w for w in words if w not in INDONESIAN_STOPWORDS]
        return " ".join(filtered)

    def _stem(self, text: str) -> str:
        words = text.split()
        stemmed = [self.stemmer.stem(w) for w in words]
        return " ".join(stemmed)

    @staticmethod
    def _normalize_whitespace(text: str) -> str:
        return re.sub(r"\s+", " ", text)


# Singleton
preprocessor = TextPreprocessor()
