"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
    Brain, Target, BarChart3, Activity, Database, FlaskConical,
    CheckCircle2, Loader2,
} from "lucide-react";
import { apiGetEvaluation, type EvaluationAPI } from "@/lib/api";

const EMOTION_COLORS: Record<string, string> = {
    Happy: "hsl(175, 45%, 40%)",
    Sad: "hsl(220, 60%, 45%)",
    Angry: "hsl(0, 65%, 55%)",
    Fear: "hsl(280, 40%, 50%)",
    Neutral: "hsl(220, 15%, 55%)",
};

const EMOTION_LABELS_ID: Record<string, string> = {
    Happy: "Senang",
    Sad: "Sedih",
    Angry: "Marah",
    Fear: "Takut",
    Neutral: "Netral",
};

function MetricCard({
    label,
    value,
    icon: Icon,
    color,
}: {
    label: string;
    value: number;
    icon: React.ElementType;
    color: string;
}) {
    const pct = (value * 100).toFixed(2);
    return (
        <Card className="shadow-card">
            <CardContent className="flex items-center gap-4 p-5">
                <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${color}18` }}
                >
                    <Icon className="h-6 w-6" style={{ color }} />
                </div>
                <div>
                    <p className="text-2xl font-bold text-foreground">{pct}%</p>
                    <p className="text-sm text-muted-foreground">{label}</p>
                </div>
            </CardContent>
        </Card>
    );
}

export default function EvaluasiPage() {
    const [data, setData] = useState<EvaluationAPI | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        apiGetEvaluation()
            .then(setData)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-secondary" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
                <FlaskConical className="h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-semibold text-foreground">Model belum dilatih</p>
                <p className="max-w-md text-sm text-muted-foreground">
                    {error || "Jalankan training terlebih dahulu: python -m ml.train"}
                </p>
            </div>
        );
    }

    // Prepare chart data for per-class metrics
    const perClassData = data.perClass.map((c) => ({
        name: c.label,
        nameId: EMOTION_LABELS_ID[c.label] || c.label,
        precision: +(c.precision * 100).toFixed(2),
        recall: +(c.recall * 100).toFixed(2),
        f1Score: +(c.f1Score * 100).toFixed(2),
        support: c.support,
    }));

    // Confusion matrix max value for color intensity
    const cmFlat = data.confusionMatrix.flat();
    const cmMax = Math.max(...cmFlat, 1);

    return (
        <div className="py-8 md:py-12">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-wider text-secondary">
                        <FlaskConical className="h-3.5 w-3.5" />
                        Evaluasi Model
                    </div>
                    <h1 className="text-2xl font-bold text-foreground md:text-3xl">
                        Evaluasi Performa <span className="text-gradient">Naive Bayes Classifier</span>
                    </h1>
                    <p className="mt-1 text-muted-foreground">
                        Metrik evaluasi model klasifikasi emosi menggunakan TF-IDF + Multinomial Naive Bayes.
                    </p>
                </div>

                {/* Dataset Info */}
                <Card className="mb-6 border-secondary/20 bg-accent/30 shadow-card">
                    <CardContent className="flex flex-wrap items-center gap-6 p-5">
                        <div className="flex items-center gap-3">
                            <Database className="h-5 w-5 text-secondary" />
                            <div>
                                <p className="text-sm text-muted-foreground">Total Dataset</p>
                                <p className="text-lg font-bold text-foreground">{data.totalDataset.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="h-8 w-px bg-border" />
                        <div>
                            <p className="text-sm text-muted-foreground">Data Latih (80%)</p>
                            <p className="text-lg font-bold text-foreground">{data.trainSize.toLocaleString()}</p>
                        </div>
                        <div className="h-8 w-px bg-border" />
                        <div>
                            <p className="text-sm text-muted-foreground">Data Uji (20%)</p>
                            <p className="text-lg font-bold text-foreground">{data.testSize.toLocaleString()}</p>
                        </div>
                        <div className="h-8 w-px bg-border" />
                        <div>
                            <p className="text-sm text-muted-foreground">Jumlah Kelas</p>
                            <p className="text-lg font-bold text-foreground">{data.labels.length}</p>
                        </div>
                        <div className="h-8 w-px bg-border" />
                        <div>
                            <p className="text-sm text-muted-foreground">Preprocessing</p>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                                {["Case Folding", "Kamus Singkatan", "Stopword Removal", "Stemming", "TF-IDF"].map((s) => (
                                    <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Overall Metrics */}
                <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard label="Accuracy" value={data.accuracy} icon={Target} color="hsl(175, 45%, 40%)" />
                    <MetricCard label="Precision (Weighted)" value={data.precision} icon={CheckCircle2} color="hsl(220, 60%, 45%)" />
                    <MetricCard label="Recall (Weighted)" value={data.recall} icon={Activity} color="hsl(280, 40%, 50%)" />
                    <MetricCard label="F1-Score (Weighted)" value={data.f1Score} icon={Brain} color="hsl(0, 65%, 55%)" />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Confusion Matrix */}
                    <Card className="shadow-card">
                        <CardContent className="p-6">
                            <div className="mb-4 flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-secondary" />
                                <h2 className="text-lg font-semibold text-foreground">Confusion Matrix</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr>
                                            <th className="p-2 text-left text-xs text-muted-foreground">Aktual ↓ / Prediksi →</th>
                                            {data.labels.map((l) => (
                                                <th key={l} className="p-2 text-center text-xs font-semibold" style={{ color: EMOTION_COLORS[l] }}>
                                                    {l}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.confusionMatrix.map((row, ri) => (
                                            <tr key={data.labels[ri]}>
                                                <td className="p-2 text-xs font-semibold" style={{ color: EMOTION_COLORS[data.labels[ri]] }}>
                                                    {data.labels[ri]}
                                                </td>
                                                {row.map((val, ci) => {
                                                    const intensity = val / cmMax;
                                                    const isDiag = ri === ci;
                                                    return (
                                                        <td
                                                            key={ci}
                                                            className="p-2 text-center font-mono text-sm font-bold"
                                                            style={{
                                                                backgroundColor: isDiag
                                                                    ? `hsla(175, 45%, 40%, ${0.1 + intensity * 0.55})`
                                                                    : val > 0
                                                                        ? `hsla(0, 65%, 55%, ${0.05 + intensity * 0.3})`
                                                                        : "transparent",
                                                                color: isDiag && intensity > 0.4
                                                                    ? "white"
                                                                    : "inherit",
                                                                borderRadius: "6px",
                                                            }}
                                                        >
                                                            {val}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="mt-3 text-xs text-muted-foreground">
                                Baris = label aktual, Kolom = label prediksi. Diagonal hijau menunjukkan prediksi benar.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Per-Class Bar Chart */}
                    <Card className="shadow-card">
                        <CardContent className="p-6">
                            <div className="mb-4 flex items-center gap-2">
                                <Activity className="h-5 w-5 text-secondary" />
                                <h2 className="text-lg font-semibold text-foreground">Metrik Per Kelas Emosi</h2>
                            </div>
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={perClassData} layout="vertical">
                                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={60}
                                        tick={{ fontSize: 12 }}
                                    />
                                    <Tooltip
                                        formatter={(value?: number, name?: string) => [`${value ?? 0}%`, (name === "f1Score" ? "F1-Score" : (name ?? "").charAt(0).toUpperCase() + (name ?? "").slice(1))]}
                                    />
                                    <Bar dataKey="precision" fill="hsl(220, 60%, 45%)" name="Precision" radius={[0, 4, 4, 0]} barSize={8} />
                                    <Bar dataKey="recall" fill="hsl(280, 40%, 50%)" name="Recall" radius={[0, 4, 4, 0]} barSize={8} />
                                    <Bar dataKey="f1Score" fill="hsl(175, 45%, 40%)" name="F1-Score" radius={[0, 4, 4, 0]} barSize={8} />
                                </BarChart>
                            </ResponsiveContainer>
                            <div className="mt-3 flex justify-center gap-5 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                    <span className="inline-block h-2.5 w-2.5 rounded" style={{ backgroundColor: "hsl(220, 60%, 45%)" }} />
                                    Precision
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="inline-block h-2.5 w-2.5 rounded" style={{ backgroundColor: "hsl(280, 40%, 50%)" }} />
                                    Recall
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="inline-block h-2.5 w-2.5 rounded" style={{ backgroundColor: "hsl(175, 45%, 40%)" }} />
                                    F1-Score
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Classification Report Table */}
                <Card className="mt-6 shadow-card">
                    <CardContent className="p-6">
                        <div className="mb-4 flex items-center gap-2">
                            <Brain className="h-5 w-5 text-secondary" />
                            <h2 className="text-lg font-semibold text-foreground">Classification Report</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Kelas Emosi</TableHead>
                                        <TableHead className="text-right">Precision</TableHead>
                                        <TableHead className="text-right">Recall</TableHead>
                                        <TableHead className="text-right">F1-Score</TableHead>
                                        <TableHead className="text-right">Support</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.perClass.map((c) => (
                                        <TableRow key={c.label}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="inline-block h-3 w-3 rounded-full"
                                                        style={{ backgroundColor: EMOTION_COLORS[c.label] }}
                                                    />
                                                    <span className="font-medium">{c.label}</span>
                                                    <span className="text-xs text-muted-foreground">({EMOTION_LABELS_ID[c.label]})</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {(c.precision * 100).toFixed(2)}%
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {(c.recall * 100).toFixed(2)}%
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {(c.f1Score * 100).toFixed(2)}%
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-muted-foreground">
                                                {c.support}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {/* Weighted avg row */}
                                    <TableRow className="border-t-2 font-semibold">
                                        <TableCell>
                                            <span className="text-secondary">Weighted Average</span>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {(data.precision * 100).toFixed(2)}%
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {(data.recall * 100).toFixed(2)}%
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {(data.f1Score * 100).toFixed(2)}%
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-muted-foreground">
                                            {data.testSize}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Method Explanation */}
                <Card className="mt-6 border-secondary/20 bg-accent/30 shadow-card">
                    <CardContent className="p-6">
                        <div className="mb-3 flex items-center gap-2">
                            <Brain className="h-5 w-5 text-secondary" />
                            <h2 className="text-lg font-semibold text-foreground">Tentang Metode</h2>
                        </div>
                        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                            <p>
                                <strong className="text-foreground">Naive Bayes Classifier</strong> adalah algoritma klasifikasi probabilistik
                                berdasarkan Teorema Bayes dengan asumsi independensi antar fitur. Dalam konteks klasifikasi teks,
                                algoritma ini menghitung probabilitas posterior setiap kelas berdasarkan kemunculan kata-kata dalam dokumen.
                            </p>
                            <p>
                                <strong className="text-foreground">TF-IDF (Term Frequency-Inverse Document Frequency)</strong> digunakan
                                sebagai metode ekstraksi fitur yang mengukur seberapa penting suatu kata dalam dokumen relatif terhadap
                                seluruh corpus. Kata yang sering muncul di satu dokumen tapi jarang di dokumen lain akan mendapat bobot tinggi.
                            </p>
                            <p>
                                <strong className="text-foreground">Pipeline Preprocessing:</strong> Case Folding → Ekspansi Singkatan
                                (Kamus) → Hapus Tanda Baca & Angka → Stopword Removal → Stemming (Sastrawi) → TF-IDF Vectorization → Naive Bayes Classification.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
