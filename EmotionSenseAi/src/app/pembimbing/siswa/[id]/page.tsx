"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
    LineChart, Line, PieChart, Pie,
} from "recharts";
import {
    ArrowLeft, TrendingUp, BookOpen, MessageSquare, FileText,
    ShieldCheck, AlertTriangle, ShieldAlert, Loader2, Send,
    StickyNote, Download,
} from "lucide-react";
import Link from "next/link";
import { getCurrentUser, getSiswaForPembimbing } from "@/lib/auth";
import {
    getDiaryEntries, getNotes, saveNote,
    getMessages, sendMessage, markMessagesRead,
    filterEntriesByPeriod, getSiswaStatus,
    markSiswaSafe,
    type FilterPeriod,
} from "@/lib/mock-data";
import type { User, DiaryEntry, PembimbingNote, Message, AlertLevel } from "@/lib/types";
import { EMOTION_COLORS, BADGE_COLORS, formatDate } from "@/lib/constants";
import { toast } from "sonner";

const ALERT_CONFIG: Record<AlertLevel, { label: string; bgColor: string; icon: React.ElementType }> = {
    safe: { label: "Aman", bgColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: ShieldCheck },
    warning: { label: "Perlu Perhatian", bgColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: AlertTriangle },
    critical: { label: "Kritis", bgColor: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: ShieldAlert },
};

const tabs = [
    { id: "tren", label: "Tren Emosi", icon: TrendingUp },
    { id: "diary", label: "Daftar Diary", icon: BookOpen },
    { id: "catatan", label: "Catatan & Pesan", icon: MessageSquare },
    { id: "laporan", label: "Laporan", icon: FileText },
];

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [patient, setPatient] = useState<User | null>(null);
    const [activeTab, setActiveTab] = useState("tren");
    const [entries, setEntries] = useState<DiaryEntry[]>([]);
    const [notes, setNotes] = useState<PembimbingNote[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [trendPeriod, setTrendPeriod] = useState<FilterPeriod>("weekly");
    const [status, setStatus] = useState<import("@/lib/types").SiswaStatus | null>(null);
    const [notFound, setNotFound] = useState(false);

    // Form states
    const [noteText, setNoteText] = useState("");
    const [msgText, setMsgText] = useState("");
    const [savingNote, setSavingNote] = useState(false);
    const [sendingMsg, setSendingMsg] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const currentUser = getCurrentUser();
        if (!currentUser || currentUser.role !== "pembimbing") {
            router.push("/login");
            return;
        }
        setUser(currentUser);

        const loadData = async () => {
            const siswaList = await getSiswaForPembimbing(currentUser.id);
            const found = siswaList.find((p) => p.id === resolvedParams.id);
            if (found) {
                setPatient(found);
                const [diaryData, notesData, msgData] = await Promise.all([
                    getDiaryEntries(found.id),
                    getNotes(found.id),
                    getMessages(found.id),
                ]);
                setEntries(diaryData);
                setNotes(notesData);
                setMessages(msgData);
                await markMessagesRead(found.id, "pembimbing");
                const statusData = await getSiswaStatus(found.id);
                setStatus(statusData);
            } else {
                setNotFound(true);
            }
        };
        loadData();
    }, [router, resolvedParams.id]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSaveNote = async () => {
        if (!noteText.trim() || !user || !patient) return;
        setSavingNote(true);
        try {
            await saveNote(user.id, patient.id, noteText);
            const updated = await getNotes(patient.id);
            setNotes(updated);
            setNoteText("");
            toast.success("Catatan berhasil disimpan!");
        } catch {
            toast.error("Gagal menyimpan catatan");
        } finally {
            setSavingNote(false);
        }
    };

    const handleSendMessage = async () => {
        if (!msgText.trim() || !user || !patient) return;
        setSendingMsg(true);
        try {
            await sendMessage(user.id, "pembimbing", patient.id, msgText);
            const updated = await getMessages(patient.id);
            setMessages(updated);
            setMsgText("");
            toast.success("Pesan berhasil dikirim ke siswa!");
        } catch {
            toast.error("Gagal mengirim pesan");
        } finally {
            setSendingMsg(false);
        }
    };

    const handleMarkSafe = async () => {
        if (!user || !patient) return;
        try {
            await markSiswaSafe(user.id, patient.id);
            toast.success("Status siswa berhasil ditandai sebagai Aman.");
            const [updated, updatedStatus] = await Promise.all([
                getDiaryEntries(patient.id),
                getSiswaStatus(patient.id),
            ]);
            setEntries(updated);
            setStatus(updatedStatus);
        } catch {
            toast.error("Gagal menandai siswa sebagai aman");
        }
    };

    const handleGenerateReport = async () => {
        if (!patient) return;
        try {
        const { jsPDF } = await import("jspdf");
        const status = await getSiswaStatus(patient.id);
        const filtered = filterEntriesByPeriod(entries, trendPeriod);

        const emotionCounts = filtered.reduce((acc, e) => {
            acc[e.emotionResult.label] = (acc[e.emotionResult.label] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const periodLabel = trendPeriod === "daily" ? "Hari Ini" : trendPeriod === "weekly" ? "7 Hari Terakhir" : "30 Hari Terakhir";
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        let y = 20;

        // Helper: add new page if needed
        const checkPage = (needed: number) => {
            if (y + needed > 275) {
                doc.addPage();
                y = 20;
            }
        };

        // ===== HEADER =====
        doc.setFillColor(29, 78, 216);
        doc.rect(0, 0, pageWidth, 40, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text("LAPORAN MONITORING KESEHATAN MENTAL", pageWidth / 2, 18, { align: "center" });
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`EmotionSense AI — ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`, pageWidth / 2, 28, { align: "center" });
        doc.text(`Pembimbing Konseling: ${user?.nama || "-"}`, pageWidth / 2, 34, { align: "center" });

        y = 52;
        doc.setTextColor(0, 0, 0);

        // ===== INFORMASI SISWA =====
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(29, 78, 216);
        doc.text("INFORMASI SISWA", 14, y);
        y += 2;
        doc.setDrawColor(29, 78, 216);
        doc.setLineWidth(0.5);
        doc.line(14, y, pageWidth - 14, y);
        y += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);

        const infoData = [
            ["Nama", patient.nama],
            ["Email", patient.email],
            ["Usia", `${patient.usia} tahun`],
            ["Jenis Kelamin", patient.jenisKelamin === "laki-laki" ? "Laki-laki" : "Perempuan"],
            ["Status", ALERT_CONFIG[status.alertLevel].label],
            ["Total Entri Diary", String(status.totalEntries)],
            ["Persentase Emosi Negatif", `${status.negativePercentage}%`],
            ["Hari Berturut-turut Negatif", String(status.consecutiveNegativeDays)],
        ];

        for (const [label, value] of infoData) {
            doc.setFont("helvetica", "bold");
            doc.text(`${label}:`, 14, y);
            doc.setFont("helvetica", "normal");
            doc.text(value, 75, y);
            y += 7;
        }

        // Status color indicator
        y += 3;
        if (status.alertLevel === "critical") {
            doc.setFillColor(220, 38, 38);
        } else if (status.alertLevel === "warning") {
            doc.setFillColor(217, 119, 6);
        } else {
            doc.setFillColor(22, 163, 74);
        }
        doc.roundedRect(14, y - 5, pageWidth - 28, 10, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(`STATUS: ${ALERT_CONFIG[status.alertLevel].label.toUpperCase()}`, pageWidth / 2, y + 1, { align: "center" });
        y += 15;

        doc.setTextColor(0, 0, 0);

        // ===== DISTRIBUSI EMOSI =====
        checkPage(60);
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(29, 78, 216);
        doc.text(`DISTRIBUSI EMOSI (${periodLabel})`, 14, y);
        y += 2;
        doc.setDrawColor(29, 78, 216);
        doc.line(14, y, pageWidth - 14, y);
        y += 8;

        // Emotion table header
        doc.setFillColor(240, 240, 245);
        doc.rect(14, y - 5, pageWidth - 28, 8, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(80, 80, 80);
        doc.text("Emosi", 18, y);
        doc.text("Jumlah Entri", 80, y);
        doc.text("Persentase", 130, y);
        y += 8;

        const emotionPdfColors: Record<string, [number, number, number]> = {
            Happy: [22, 163, 74],
            Sad: [37, 99, 235],
            Angry: [220, 38, 38],
            Fear: [147, 51, 234],
            Neutral: [107, 114, 128],
        };

        const totalFiltered = filtered.length || 1;
        for (const emotion of ["Happy", "Sad", "Angry", "Fear", "Neutral"]) {
            const count = emotionCounts[emotion] || 0;
            const pct = Math.round((count / totalFiltered) * 100);

            // Color dot
            const [r, g, b] = emotionPdfColors[emotion] || [107, 114, 128];
            doc.setFillColor(r, g, b);
            doc.circle(20, y - 1.5, 2, "F");

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(60, 60, 60);
            doc.text(emotion, 26, y);
            doc.text(`${count} entri`, 80, y);

            // Progress bar
            doc.setFillColor(230, 230, 235);
            doc.roundedRect(130, y - 3.5, 50, 5, 1, 1, "F");
            if (pct > 0) {
                doc.setFillColor(r, g, b);
                doc.roundedRect(130, y - 3.5, Math.max(2, (pct / 100) * 50), 5, 1, 1, "F");
            }
            doc.setFontSize(8);
            doc.text(`${pct}%`, 183, y);

            y += 8;
        }

        y += 5;

        // ===== ENTRI DIARY TERBARU =====
        checkPage(40);
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(29, 78, 216);
        doc.text("ENTRI DIARY TERBARU", 14, y);
        y += 2;
        doc.setDrawColor(29, 78, 216);
        doc.line(14, y, pageWidth - 14, y);
        y += 8;

        const recentEntries = filtered.slice(0, 5);
        if (recentEntries.length === 0) {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(10);
            doc.setTextColor(120, 120, 120);
            doc.text("Tidak ada entri diary pada periode ini.", 14, y);
            y += 10;
        } else {
            for (const entry of recentEntries) {
                checkPage(25);
                // Date + emotion badge
                doc.setFontSize(8);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(120, 120, 120);
                doc.text(formatDate(entry.createdAt), 14, y);

                const [r, g, b] = emotionPdfColors[entry.emotionResult.label] || [107, 114, 128];
                doc.setFillColor(r, g, b);
                doc.roundedRect(70, y - 3.5, 22, 5, 1, 1, "F");
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(7);
                doc.text(entry.emotionResult.label, 81, y - 0.2, { align: "center" });
                y += 6;

                // Diary text (wrap)
                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.setTextColor(60, 60, 60);
                const lines = doc.splitTextToSize(entry.teks, pageWidth - 32);
                doc.text(lines, 14, y);
                y += lines.length * 4.5 + 5;

                // Separator
                doc.setDrawColor(220, 220, 225);
                doc.setLineWidth(0.2);
                doc.line(14, y, pageWidth - 14, y);
                y += 5;
            }
        }

        // ===== CATATAN PEMBIMBING =====
        checkPage(30);
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(29, 78, 216);
        doc.text("CATATAN PEMBIMBING KONSELING", 14, y);
        y += 2;
        doc.setDrawColor(29, 78, 216);
        doc.line(14, y, pageWidth - 14, y);
        y += 8;

        if (notes.length === 0) {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(10);
            doc.setTextColor(120, 120, 120);
            doc.text("Belum ada catatan.", 14, y);
        } else {
            for (const n of notes) {
                checkPage(20);
                doc.setFontSize(8);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(120, 120, 120);
                doc.text(formatDate(n.createdAt), 14, y);
                y += 5;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.setTextColor(60, 60, 60);
                const lines = doc.splitTextToSize(n.note, pageWidth - 32);
                doc.text(lines, 14, y);
                y += lines.length * 4.5 + 5;
                doc.setDrawColor(220, 220, 225);
                doc.setLineWidth(0.2);
                doc.line(14, y, pageWidth - 14, y);
                y += 5;
            }
        }

        // ===== FOOTER =====
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(150, 150, 150);
            doc.text(`EmotionSense AI — Laporan Kesehatan Mental`, 14, 290);
            doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth - 14, 290, { align: "right" });
        }

        doc.save(`Laporan_${patient.nama.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
        toast.success("Laporan PDF berhasil di-download!");
        } catch {
            toast.error("Gagal membuat laporan PDF");
        }
    };

    if (notFound) return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
            <AlertTriangle className="h-12 w-12 text-amber-500" />
            <p className="text-lg text-muted-foreground">Siswa tidak ditemukan atau Anda tidak memiliki akses.</p>
            <Button variant="outline" onClick={() => router.push("/pembimbing")}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
            </Button>
        </div>
    );

    if (!user || !patient || !status) return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );

    const alertConfig = ALERT_CONFIG[status.alertLevel];
    const AlertIcon = alertConfig.icon;

    // Trend data
    const filteredEntries = filterEntriesByPeriod(entries, trendPeriod);
    const emotionCounts = filteredEntries.reduce((acc, e) => {
        acc[e.emotionResult.label] = (acc[e.emotionResult.label] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const pieData = Object.entries(emotionCounts).map(([name, value]) => ({ name, value }));

    const dateGroups = filteredEntries.reduce((acc, e) => {
        const dateKey = new Date(e.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
        if (!acc[dateKey]) acc[dateKey] = { date: dateKey, Happy: 0, Sad: 0, Angry: 0, Fear: 0, Neutral: 0 };
        const key = e.emotionResult.label;
        if (key in acc[dateKey] && key !== "date") {
            (acc[dateKey][key] as number)++;
        }
        return acc;
    }, {} as Record<string, Record<string, number | string>>);
    const lineData = Object.values(dateGroups).reverse();

    return (
        <div className="py-8 md:py-12">
            <div className="container mx-auto px-4">
                {/* Back + Header */}
                <Link href="/pembimbing" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" />
                    Kembali ke Dashboard
                </Link>

                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground md:text-3xl">{patient.nama}</h1>
                        <p className="text-sm text-muted-foreground">{patient.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge className={`${alertConfig.bgColor} border-0 gap-1.5 px-3 py-1.5 text-sm font-semibold`}>
                            <AlertIcon className="h-4 w-4" />
                            {alertConfig.label}
                        </Badge>
                        {status.alertLevel !== "safe" && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleMarkSafe}
                                className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                            >
                                <ShieldCheck className="h-4 w-4" />
                                Tandai Aman
                            </Button>
                        )}
                        <div className="text-right text-sm">
                            <p className="text-muted-foreground">Emosi Negatif</p>
                            <p className={`font-bold ${status.negativePercentage > 60 ? "text-red-600" :
                                status.negativePercentage >= 40 ? "text-amber-600" : "text-emerald-600"
                                }`}>
                                {status.negativePercentage}%
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mb-8 flex gap-1 overflow-x-auto rounded-xl border border-border bg-muted/50 p-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${activeTab === tab.id
                                ? "bg-card text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ===== TAB: TREN EMOSI ===== */}
                {activeTab === "tren" && (
                    <div className="space-y-6">
                        <div className="flex gap-2">
                            {(["daily", "weekly", "monthly"] as FilterPeriod[]).map((p) => (
                                <Button
                                    key={p}
                                    variant={trendPeriod === p ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setTrendPeriod(p)}
                                    className={trendPeriod === p ? "bg-hero-gradient text-primary-foreground" : ""}
                                >
                                    {p === "daily" ? "Hari Ini" : p === "weekly" ? "7 Hari" : "30 Hari"}
                                </Button>
                            ))}
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <Card className="shadow-card">
                                <CardContent className="p-6">
                                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                        Distribusi Emosi
                                    </h3>
                                    {pieData.length === 0 ? (
                                        <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada data.</p>
                                    ) : (
                                        <ResponsiveContainer width="100%" height={250}>
                                            <PieChart>
                                                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                                                    label={(props: any) => `${props.name} ${(props.percent * 100).toFixed(0)}%`}>
                                                    {pieData.map((entry) => (
                                                        <Cell key={entry.name} fill={EMOTION_COLORS[entry.name] || "hsl(220,15%,55%)"} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="shadow-card">
                                <CardContent className="p-6">
                                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                        Tren Per Hari
                                    </h3>
                                    {lineData.length === 0 ? (
                                        <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada data.</p>
                                    ) : (
                                        <ResponsiveContainer width="100%" height={250}>
                                            <LineChart data={lineData}>
                                                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                                <Tooltip />
                                                {Object.keys(EMOTION_COLORS).map((emotion) => (
                                                    <Line key={emotion} type="monotone" dataKey={emotion} stroke={EMOTION_COLORS[emotion]} strokeWidth={2} dot={{ r: 3 }} />
                                                ))}
                                            </LineChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="border-secondary/20 bg-accent/30 shadow-card">
                            <CardContent className="p-6">
                                <h3 className="mb-2 font-semibold text-foreground">Ringkasan Periode</h3>
                                <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                                    {Object.keys(EMOTION_COLORS).map((emotion) => (
                                        <div key={emotion} className="text-center">
                                            <p className="text-2xl font-bold" style={{ color: EMOTION_COLORS[emotion] }}>
                                                {emotionCounts[emotion] || 0}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{emotion}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* ===== TAB: DAFTAR DIARY ===== */}
                {activeTab === "diary" && (
                    <Card className="border-border/50 shadow-card">
                        <CardContent className="p-0">
                            {entries.length === 0 ? (
                                <div className="flex flex-col items-center gap-3 py-16 text-center">
                                    <BookOpen className="h-10 w-10 text-muted-foreground" />
                                    <p className="font-semibold text-foreground">Belum ada diary</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-12">No</TableHead>
                                                <TableHead>Isi Diary</TableHead>
                                                <TableHead className="w-28">Emosi</TableHead>
                                                <TableHead className="w-28 text-right">Confidence</TableHead>
                                                <TableHead className="w-40">Waktu</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {entries.map((item, i) => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                                    <TableCell>
                                                        <p className="max-w-md text-sm text-foreground">{item.teks}</p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={`${BADGE_COLORS[item.emotionResult.label] || ""} border-0 font-semibold`}>
                                                            {item.emotionResult.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        {item.emotionResult.confidence.toFixed(2)}%
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {formatDate(item.createdAt)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* ===== TAB: CATATAN & PESAN ===== */}
                {activeTab === "catatan" && (
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Internal Notes */}
                        <div className="space-y-4">
                            <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                                <StickyNote className="h-5 w-5 text-amber-500" />
                                Catatan Internal
                            </h3>
                            <Card className="shadow-card">
                                <CardContent className="space-y-3 p-5">
                                    <Textarea
                                        placeholder="Tulis catatan tentang siswa ini (hanya bisa dilihat Anda)..."
                                        value={noteText}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNoteText(e.target.value)}
                                        rows={3}
                                        className="resize-none bg-background"
                                    />
                                    <Button onClick={handleSaveNote} disabled={!noteText.trim() || savingNote} size="sm">
                                        {savingNote ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <StickyNote className="mr-2 h-4 w-4" />}
                                        Simpan Catatan
                                    </Button>
                                </CardContent>
                            </Card>
                            {notes.map((n) => (
                                <Card key={n.id} className="border-amber-200/50 bg-amber-50/30 shadow-sm dark:border-amber-800/30 dark:bg-amber-950/10">
                                    <CardContent className="p-4">
                                        <p className="text-sm leading-relaxed text-foreground">{n.note}</p>
                                        <p className="mt-2 text-xs text-muted-foreground">{formatDate(n.createdAt)}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Messages with Patient */}
                        <div className="space-y-4">
                            <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                                <MessageSquare className="h-5 w-5 text-secondary" />
                                Pesan dengan Siswa
                            </h3>
                            <Card className="shadow-card">
                                <CardContent className="flex flex-col p-0" style={{ height: "400px" }}>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                        {messages.length === 0 ? (
                                            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                                                <MessageSquare className="h-8 w-8 text-muted-foreground" />
                                                <p className="text-sm text-muted-foreground">
                                                    Belum ada percakapan. Kirim pesan pertama.
                                                </p>
                                            </div>
                                        ) : (
                                            messages.map((msg) => {
                                                const isMe = msg.senderRole === "pembimbing";
                                                return (
                                                    <div
                                                        key={msg.id}
                                                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                                                    >
                                                        <div
                                                            className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMe
                                                                ? "bg-secondary text-white rounded-br-md"
                                                                : "bg-muted text-foreground rounded-bl-md"
                                                                }`}
                                                        >
                                                            <p className="text-sm leading-relaxed">{msg.message}</p>
                                                            <p className={`mt-1 text-[10px] ${isMe ? "text-white/60" : "text-muted-foreground"
                                                                }`}>
                                                                {isMe ? "Anda" : patient.nama} · {formatDate(msg.createdAt)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                        <div ref={chatEndRef} />
                                    </div>
                                    <div className="border-t border-border p-3">
                                        <div className="flex gap-2">
                                            <Textarea
                                                placeholder={`Tulis pesan ke ${patient.nama}...`}
                                                value={msgText}
                                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMsgText(e.target.value)}
                                                rows={2}
                                                className="resize-none bg-background flex-1"
                                                onKeyDown={(e: React.KeyboardEvent) => {
                                                    if (e.key === "Enter" && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleSendMessage();
                                                    }
                                                }}
                                            />
                                            <Button
                                                onClick={handleSendMessage}
                                                disabled={!msgText.trim() || sendingMsg}
                                                size="icon"
                                                className="h-auto bg-hero-gradient text-primary-foreground hover:opacity-90"
                                            >
                                                {sendingMsg ? <Loader2 className="mr-0 h-4 w-4 animate-spin" /> : <Send className="mr-0 h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {/* ===== TAB: LAPORAN ===== */}
                {activeTab === "laporan" && (
                    <div className="space-y-6">
                        <Card className="shadow-card">
                            <CardContent className="p-6">
                                <h3 className="mb-4 text-lg font-semibold text-foreground">Generate Laporan Siswa</h3>
                                <p className="mb-4 text-sm text-muted-foreground">
                                    Laporan akan berisi ringkasan emosi, distribusi emosi pada periode yang dipilih,
                                    entri diary terbaru, dan catatan pembimbing konseling.
                                </p>

                                <div className="mb-6 rounded-lg border border-border bg-muted/30 p-4">
                                    <h4 className="mb-3 text-sm font-semibold text-foreground">Periode Laporan</h4>
                                    <div className="flex gap-2">
                                        {(["daily", "weekly", "monthly"] as FilterPeriod[]).map((p) => (
                                            <Button
                                                key={p}
                                                variant={trendPeriod === p ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setTrendPeriod(p)}
                                                className={trendPeriod === p ? "bg-hero-gradient text-primary-foreground" : ""}
                                            >
                                                {p === "daily" ? "Hari Ini" : p === "weekly" ? "7 Hari" : "30 Hari"}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                {/* Preview */}
                                <Card className="mb-4 border-border bg-background">
                                    <CardContent className="p-4">
                                        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                            Preview Laporan
                                        </h4>
                                        <div className="space-y-3 text-sm">
                                            <div className="flex justify-between border-b pb-2">
                                                <span className="text-muted-foreground">Siswa</span>
                                                <span className="font-medium text-foreground">{patient.nama}</span>
                                            </div>
                                            <div className="flex justify-between border-b pb-2">
                                                <span className="text-muted-foreground">Status</span>
                                                <Badge className={`${alertConfig.bgColor} border-0 gap-1 text-xs font-semibold`}>
                                                    <AlertIcon className="h-3 w-3" />
                                                    {alertConfig.label}
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between border-b pb-2">
                                                <span className="text-muted-foreground">Total Entri</span>
                                                <span className="font-medium text-foreground">{filteredEntries.length} entri</span>
                                            </div>
                                            <div className="flex justify-between border-b pb-2">
                                                <span className="text-muted-foreground">Emosi Negatif</span>
                                                <span className={`font-semibold ${status.negativePercentage > 60 ? "text-red-600" :
                                                    status.negativePercentage >= 40 ? "text-amber-600" : "text-emerald-600"
                                                    }`}>
                                                    {status.negativePercentage}%
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Catatan Pembimbing</span>
                                                <span className="font-medium text-foreground">{notes.length} catatan</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Button onClick={handleGenerateReport} className="bg-hero-gradient text-primary-foreground hover:opacity-90">
                                    <Download className="mr-2 h-4 w-4" />
                                    Download Laporan PDF
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
