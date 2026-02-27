import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BrainCircuit,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  Smile,
  Frown,
  Angry,
  AlertTriangle,
  Minus,
  UserCircle,
  Stethoscope,
  BookOpen,
  TrendingUp,
  ShieldAlert,
  MessageSquare,
  FileText,
  FileInput,
  Filter,
  CheckCircle2,
  Target,
} from "lucide-react";

const emotions = [
  { icon: Smile, label: "Happy", color: "text-emerald-500" },
  { icon: Frown, label: "Sad", color: "text-blue-500" },
  { icon: Angry, label: "Angry", color: "text-red-500" },
  { icon: AlertTriangle, label: "Fear", color: "text-purple-500" },
  { icon: Minus, label: "Neutral", color: "text-gray-500" },
];

const features = [
  {
    icon: BrainCircuit,
    title: "Naive Bayes Classifier",
    desc: "Algoritma probabilistik yang terbukti efektif untuk klasifikasi teks emosi dengan akurasi tinggi.",
  },
  {
    icon: BarChart3,
    title: "TF-IDF Feature Extraction",
    desc: "Ekstraksi fitur otomatis yang mengukur kepentingan setiap kata dalam teks diary siswa.",
  },
  {
    icon: ShieldCheck,
    title: "Monitoring Real-time",
    desc: "Sistem deteksi otomatis untuk memantau kondisi emosional siswa dan memberikan peringatan dini.",
  },
];

const patientFeatures = [
  {
    icon: BookOpen,
    title: "Tulis Diary",
    desc: "Ceritakan perasaan Anda kapan saja. Sistem akan menganalisis emosi secara otomatis.",
  },
  {
    icon: TrendingUp,
    title: "Tren Emosi",
    desc: "Pantau perkembangan emosi Anda dari waktu ke waktu melalui grafik interaktif.",
  },
  {
    icon: MessageSquare,
    title: "Pesan Pembimbing",
    desc: "Dapatkan pesan dan saran langsung dari pembimbing konseling yang memantau Anda.",
  },
];

const psychologistFeatures = [
  {
    icon: ShieldAlert,
    title: "Sistem Alert Otomatis",
    desc: "Deteksi dini siswa berisiko dengan 3 level: Aman 🟢, Perlu Perhatian 🟡, Kritis 🔴.",
  },
  {
    icon: BarChart3,
    title: "Analisis Tren",
    desc: "Pantau distribusi dan tren emosi setiap siswa dengan filter harian, mingguan, bulanan.",
  },
  {
    icon: FileText,
    title: "Laporan PDF",
    desc: "Generate laporan profesional berisi ringkasan emosi, diary, dan catatan konseling.",
  },
];

export default function BerandaPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="pointer-events-none absolute inset-0 bg-hero-gradient opacity-[0.03]" />
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-block rounded-full border border-secondary/30 bg-accent px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-secondary">
              Platform Monitoring Kesehatan Mental
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
              <span className="text-gradient">EmotionSense</span> AI
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              Platform monitoring kesehatan mental berbasis AI yang menghubungkan{" "}
              <span className="font-semibold text-foreground">siswa</span> dan{" "}
              <span className="font-semibold text-foreground">pembimbing konseling</span>{" "}
              melalui analisis emosi otomatis dari diary harian.
            </p>
            <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
              Menggunakan metode Naive Bayes Classifier dengan fitur TF-IDF
              untuk klasifikasi emosi teks secara transparan dan akurat.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                size="lg"
                asChild
                className="bg-hero-gradient text-primary-foreground shadow-lg transition-all hover:opacity-90 hover:shadow-xl"
              >
                <Link href="/login">
                  Mulai Sekarang
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Emotion Labels */}
      <section className="border-y bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <p className="mb-6 text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
            5 Kelas Emosi yang Dianalisis Sistem
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
            {emotions.map((e) => (
              <div
                key={e.label}
                className="flex items-center gap-2 rounded-xl border border-border/50 bg-card px-5 py-3 shadow-sm transition-all hover:shadow-card"
              >
                <e.icon className={`h-5 w-5 ${e.color}`} />
                <span className="text-sm font-semibold text-foreground">
                  {e.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Technology */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              Teknologi di Balik Sistem
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Dibangun dengan pendekatan akademis dan metode machine learning
              yang teruji untuk menghasilkan klasifikasi emosi yang akurat.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((f) => (
              <Card
                key={f.title}
                className="group border-border/50 shadow-card transition-all duration-300 hover:shadow-card-hover"
              >
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-secondary transition-colors group-hover:bg-hero-gradient group-hover:text-primary-foreground">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {f.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Process Flow */}
      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              Alur Kerja Sistem
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Dari teks diary siswa hingga hasil klasifikasi emosi dalam 5 langkah.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-0">
            {[
              { icon: FileInput, label: "Input Teks", desc: "Siswa menulis diary" },
              { icon: Filter, label: "Preprocessing", desc: "Tokenisasi & stemming" },
              { icon: BarChart3, label: "TF-IDF", desc: "Ekstraksi fitur kata" },
              { icon: BrainCircuit, label: "Naive Bayes", desc: "Klasifikasi probabilistik" },
              { icon: CheckCircle2, label: "Hasil Emosi", desc: "Label emosi terdeteksi" },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex items-center">
                <div className="flex w-32 flex-col items-center text-center sm:w-36">
                  <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-hero-gradient text-primary-foreground shadow-lg">
                    <step.icon className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {step.label}
                  </span>
                  <span className="mt-0.5 text-[11px] text-muted-foreground">
                    {step.desc}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div className="hidden h-0.5 w-8 bg-border sm:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About System */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              Tentang Sistem
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Sistem ini dirancang untuk mendukung monitoring kesehatan mental secara transparan dan dapat dijelaskan.
            </p>
          </div>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            <Card className="border-border/50 shadow-card transition-all duration-300 hover:shadow-card-hover">
              <CardContent className="p-6 space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-secondary">
                  <Target className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Tujuan Sistem</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Mengklasifikasikan emosi dari teks diary siswa secara otomatis
                  menggunakan algoritma Naive Bayes Classifier, sehingga pembimbing konseling
                  dapat memantau kondisi emosional siswa dan memberikan intervensi
                  tepat waktu.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-card transition-all duration-300 hover:shadow-card-hover">
              <CardContent className="p-6 space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-secondary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Explainable AI</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Berbeda dengan model black-box, Naive Bayes memberikan transparansi
                  penuh. Setiap prediksi dapat ditelusuri melalui distribusi probabilitas
                  tiap kelas emosi, sehingga hasil klasifikasi dapat dipertanggungjawabkan
                  secara akademis.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Two Roles Section */}
      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              Dua Peran, Satu Tujuan
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Platform dirancang untuk mendukung kolaborasi antara siswa dan
              pembimbing konseling dalam monitoring kesehatan mental.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Patient Card */}
            <Card className="border-border/50 shadow-card overflow-hidden">
              <div className="bg-hero-gradient px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                    <UserCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Untuk Siswa
                    </h3>
                    <p className="text-sm text-white/80">
                      Ekspresikan perasaan & pantau emosi Anda
                    </p>
                  </div>
                </div>
              </div>
              <CardContent className="space-y-4 p-6">
                {patientFeatures.map((f) => (
                  <div key={f.title} className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-secondary">
                      <f.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {f.title}
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Psychologist Card */}
            <Card className="border-border/50 shadow-card overflow-hidden">
              <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                    <Stethoscope className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Untuk Pembimbing Konseling
                    </h3>
                    <p className="text-sm text-white/80">
                      Monitor & beri intervensi tepat waktu
                    </p>
                  </div>
                </div>
              </div>
              <CardContent className="space-y-4 p-6">
                {psychologistFeatures.map((f) => (
                  <div key={f.title} className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                      <f.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {f.title}
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="overflow-hidden border-0 bg-hero-gradient shadow-lg">
            <CardContent className="flex flex-col items-center gap-6 p-10 text-center md:p-16">
              <h2 className="text-2xl font-bold text-primary-foreground md:text-3xl">
                Siap Memulai Monitoring Kesehatan Mental?
              </h2>
              <p className="max-w-lg text-sm leading-relaxed text-primary-foreground/80">
                Daftar sekarang sebagai siswa atau pembimbing konseling dan mulai gunakan
                platform EmotionSense AI untuk monitoring emosi berbasis AI.
              </p>
              <Button
                size="lg"
                asChild
                className="bg-card text-foreground shadow-lg hover:bg-card/90"
              >
                <Link href="/login">
                  Daftar Sekarang
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
