"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
    LineChart, Line, PieChart, Pie,
} from "recharts";
import {
    PenLine, Loader2, History, TrendingUp, MessageSquare,
    Smile, Frown, Angry, AlertTriangle, Minus, BookOpen,
    Calendar, Heart, Activity, Bell, ShieldAlert, X, Send,
    Pencil, Trash2, Check,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
    getDiaryEntries, saveDiaryEntry, updateDiaryEntry, deleteDiaryEntry,
    getMessages, sendMessage, markMessagesRead, getUnreadMessageCount,
    filterEntriesByPeriod, getSiswaSelfAlert,
    type FilterPeriod,
} from "@/lib/mock-data";
import type { User, DiaryEntry, Message, AlertLevel } from "@/lib/types";
import { EMOTION_COLORS, BADGE_COLORS, formatDate } from "@/lib/constants";
import { toast } from "sonner";

const EMOTION_ICONS: Record<string, React.ElementType> = {
    Happy: Smile,
    Sad: Frown,
    Angry: Angry,
    Fear: AlertTriangle,
    Neutral: Minus,
};

const EMOTION_LABELS_ID: Record<string, string> = {
    Happy: "Senang",
    Sad: "Sedih",
    Angry: "Marah",
    Fear: "Takut",
    Neutral: "Netral",
};

const CARD_BG_COLORS: Record<string, string> = {
    Happy: "bg-emerald-50 dark:bg-emerald-900/10",
    Sad: "bg-blue-50 dark:bg-blue-900/10",
    Angry: "bg-red-50 dark:bg-red-900/10",
    Fear: "bg-purple-50 dark:bg-purple-900/10",
    Neutral: "bg-gray-50 dark:bg-gray-900/10",
};

const tabs = [
    { id: "diary", label: "Tulis Diary", icon: PenLine },
    { id: "riwayat", label: "Riwayat", icon: History },
    { id: "tren", label: "Tren Emosi", icon: TrendingUp },
    { id: "pesan", label: "Pesan", icon: MessageSquare },
];

export default function PatientDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [activeTab, setActiveTab] = useState("diary");
    const [entries, setEntries] = useState<DiaryEntry[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);

    // Diary form
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);
    const [lastResult, setLastResult] = useState<DiaryEntry | null>(null);

    // Message form
    const [msgText, setMsgText] = useState("");
    const [sendingMsg, setSendingMsg] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Trend filter
    const [trendPeriod, setTrendPeriod] = useState<FilterPeriod>("weekly");

    // Self alert
    const [selfAlert, setSelfAlert] = useState<{ level: AlertLevel; message: string; consecutiveDays: number } | null>(null);
    const [alertDismissed, setAlertDismissed] = useState(false);

    // Edit / Delete diary
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState("");
    const [editLoading, setEditLoading] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    useEffect(() => {
        const currentUser = getCurrentUser();
        if (!currentUser || currentUser.role !== "siswa") {
            router.push("/login");
            return;
        }
        setUser(currentUser);

        const loadData = async () => {
            const [diaryData, msgData, alertData] = await Promise.all([
                getDiaryEntries(currentUser.id),
                getMessages(currentUser.id),
                getSiswaSelfAlert(currentUser.id),
            ]);
            setEntries(diaryData);
            setMessages(msgData);
            setSelfAlert(alertData);
            await markMessagesRead(currentUser.id, "siswa");
        };
        loadData();
    }, [router]);

    const handleSubmitDiary = async () => {
        if (!text.trim() || !user) return;
        setLoading(true);
        setLastResult(null);
        try {
            const entry = await saveDiaryEntry(user.id, text);
            setLastResult(entry);
            const updated = await getDiaryEntries(user.id);
            setEntries(updated);
            setText("");
            toast.success("Diary berhasil disimpan!");
        } catch {
            toast.error("Gagal menyimpan diary");
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!msgText.trim() || !user) return;
        setSendingMsg(true);
        try {
            await sendMessage(user.id, "siswa", user.id, msgText);
            const updated = await getMessages(user.id);
            setMessages(updated);
            setMsgText("");
            toast.success("Pesan terkirim!");
        } catch {
            toast.error("Gagal mengirim pesan");
        } finally {
            setSendingMsg(false);
        }
    };

    const handleEditDiary = async (entryId: string) => {
        if (!editText.trim() || !user) return;
        setEditLoading(true);
        try {
            await updateDiaryEntry(entryId, editText);
            const updated = await getDiaryEntries(user.id);
            setEntries(updated);
            setEditingId(null);
            setEditText("");
            toast.success("Diary berhasil diperbarui!");
        } catch {
            toast.error("Gagal memperbarui diary");
        } finally {
            setEditLoading(false);
        }
    };

    const handleDeleteDiary = async (entryId: string) => {
        if (!user) return;
        try {
            await deleteDiaryEntry(entryId);
            const updated = await getDiaryEntries(user.id);
            setEntries(updated);
            setDeleteConfirmId(null);
            toast.success("Diary berhasil dihapus!");
        } catch {
            toast.error("Gagal menghapus diary");
        }
    };

    const [unreadCount, setUnreadCount] = useState(0);
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (user) {
            getUnreadMessageCount(user.id, "siswa").then(setUnreadCount);
        }
    }, [user, messages]);

    if (!user) return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );

    // Overview stats
    const weekEntries = filterEntriesByPeriod(entries, "weekly");
    const dominantEmotion = (() => {
        if (weekEntries.length === 0) return null;
        const counts = weekEntries.reduce((acc, e) => {
            acc[e.emotionResult.label] = (acc[e.emotionResult.label] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    })();

    const lastEntry = entries.length > 0 ? entries[0] : null;
    const streak = (() => {
        const daySet = new Set<string>();
        entries.forEach((e) => {
            daySet.add(new Date(e.createdAt).toDateString());
        });
        let count = 0;
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            if (daySet.has(d.toDateString())) {
                count++;
            } else if (i > 0) break;
        }
        return count;
    })();

    // Trend data
    const filteredEntries = filterEntriesByPeriod(entries, trendPeriod);
    const emotionCounts = filteredEntries.reduce((acc, e) => {
        acc[e.emotionResult.label] = (acc[e.emotionResult.label] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const pieData = Object.entries(emotionCounts).map(([name, value]) => ({
        name, value,
    }));

    // Line chart data
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
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-foreground md:text-3xl">
                        Halo, <span className="text-gradient">{user.nama}</span> 👋
                    </h1>
                    <p className="mt-1 text-muted-foreground">
                        Ceritakan apa yang kamu rasakan hari ini.
                    </p>
                </div>

                {/* ===== SELF ALERT BANNER ===== */}
                {selfAlert && !alertDismissed && (
                    <div className={`mb-6 flex items-start gap-3 rounded-xl border p-4 ${selfAlert.level === "critical"
                        ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30"
                        : "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30"
                        }`}>
                        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selfAlert.level === "critical"
                            ? "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400"
                            : "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400"
                            }`}>
                            {selfAlert.level === "critical" ? (
                                <ShieldAlert className="h-5 w-5" />
                            ) : (
                                <AlertTriangle className="h-5 w-5" />
                            )}
                        </div>
                        <div className="flex-1">
                            <p className={`text-sm font-semibold ${selfAlert.level === "critical"
                                ? "text-red-700 dark:text-red-400"
                                : "text-amber-700 dark:text-amber-400"
                                }`}>
                                {selfAlert.level === "critical" ? "Perhatian Penting" : "Perlu Perhatian"}
                            </p>
                            <p className={`mt-1 text-sm ${selfAlert.level === "critical"
                                ? "text-red-600/80 dark:text-red-400/70"
                                : "text-amber-600/80 dark:text-amber-400/70"
                                }`}>
                                {selfAlert.message}
                            </p>
                        </div>
                        <button
                            onClick={() => setAlertDismissed(true)}
                            className={`shrink-0 rounded-lg p-1 transition-colors ${selfAlert.level === "critical"
                                ? "text-red-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50"
                                : "text-amber-400 hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-900/50"
                                }`}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* ===== OVERVIEW CARDS ===== */}
                <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Total Diary */}
                    <Card className="shadow-card">
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                                <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">{entries.length}</p>
                                <p className="text-sm text-muted-foreground">Total Diary</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Streak */}
                    <Card className="shadow-card">
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                                <Calendar className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">{streak} hari</p>
                                <p className="text-sm text-muted-foreground">Streak Menulis</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Dominant Emotion This Week */}
                    <Card className={`shadow-card ${dominantEmotion ? CARD_BG_COLORS[dominantEmotion] || "" : ""}`}>
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/80 dark:bg-white/10">
                                {dominantEmotion && EMOTION_ICONS[dominantEmotion] ? (() => {
                                    const Icon = EMOTION_ICONS[dominantEmotion];
                                    return <Icon className="h-6 w-6" style={{ color: EMOTION_COLORS[dominantEmotion] }} />;
                                })() : (
                                    <Heart className="h-6 w-6 text-muted-foreground" />
                                )}
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">
                                    {dominantEmotion ? EMOTION_LABELS_ID[dominantEmotion] || dominantEmotion : "-"}
                                </p>
                                <p className="text-sm text-muted-foreground">Emosi Dominan Minggu Ini</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Unread Messages */}
                    <Card className={`shadow-card ${unreadCount > 0 ? "border-secondary/30 bg-accent/30" : ""}`}>
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
                                <Bell className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">{unreadCount}</p>
                                <p className="text-sm text-muted-foreground">Pesan Belum Dibaca</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Emotion Summary (last 7 days) */}
                {weekEntries.length > 0 && (
                    <Card className="mb-8 border-secondary/20 shadow-card">
                        <CardContent className="p-5">
                            <div className="mb-3 flex items-center gap-2">
                                <Activity className="h-4 w-4 text-secondary" />
                                <h3 className="text-sm font-semibold text-foreground">Ringkasan Emosi 7 Hari Terakhir</h3>
                            </div>
                            <div className="grid grid-cols-5 gap-3">
                                {["Happy", "Sad", "Angry", "Fear", "Neutral"].map((emotion) => {
                                    const count = weekEntries.filter((e) => e.emotionResult.label === emotion).length;
                                    const pct = weekEntries.length > 0 ? Math.round((count / weekEntries.length) * 100) : 0;
                                    const EmotionIcon = EMOTION_ICONS[emotion];
                                    return (
                                        <div key={emotion} className="text-center space-y-1">
                                            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${EMOTION_COLORS[emotion]}15` }}>
                                                <EmotionIcon className="h-5 w-5" style={{ color: EMOTION_COLORS[emotion] }} />
                                            </div>
                                            <p className="text-lg font-bold" style={{ color: EMOTION_COLORS[emotion] }}>{pct}%</p>
                                            <p className="text-xs text-muted-foreground">{EMOTION_LABELS_ID[emotion]}</p>
                                            <p className="text-[10px] text-muted-foreground">{count} entri</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Last Entry Preview */}
                {lastEntry && (
                    <Card className="mb-8 shadow-card">
                        <CardContent className="p-5">
                            <div className="mb-2 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-foreground">Diary Terakhir</h3>
                                <span className="text-xs text-muted-foreground">{formatDate(lastEntry.createdAt)}</span>
                            </div>
                            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                                {lastEntry.teks}
                            </p>
                            <div className="mt-3 flex items-center gap-2">
                                <Badge className={`${BADGE_COLORS[lastEntry.emotionResult.label] || ""} border-0 font-semibold`}>
                                    {lastEntry.emotionResult.label}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                    Confidence: {lastEntry.emotionResult.confidence.toFixed(1)}%
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                )}

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
                            {tab.id === "pesan" && unreadCount > 0 && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ===== TAB: TULIS DIARY ===== */}
                {activeTab === "diary" && (
                    <div className="space-y-6">
                        <Card className="border-border/50 shadow-card">
                            <CardContent className="space-y-4 p-6">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="h-5 w-5 text-secondary" />
                                    <h2 className="text-lg font-semibold text-foreground">Tulis Diary Baru</h2>
                                </div>
                                <Textarea
                                    placeholder="Ceritakan apa yang kamu rasakan hari ini... Perasaanmu, kejadian yang dialami, atau apapun yang ingin kamu tuliskan."
                                    value={text}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
                                    rows={6}
                                    className="resize-none bg-background text-base leading-relaxed"
                                />
                                <Button
                                    onClick={handleSubmitDiary}
                                    disabled={!text.trim() || loading}
                                    className="w-full bg-hero-gradient text-primary-foreground hover:opacity-90"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Menganalisis emosi...
                                        </>
                                    ) : (
                                        <>
                                            <PenLine className="mr-2 h-4 w-4" />
                                            Simpan & Analisis Emosi
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Result */}
                        {lastResult && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <Card className="border-secondary/30 shadow-card text-center">
                                    <CardContent className="p-8">
                                        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                                            Emosi Terdeteksi
                                        </p>
                                        <div className="mt-3 flex items-center justify-center gap-3">
                                            {EMOTION_ICONS[lastResult.emotionResult.label] && (() => {
                                                const Icon = EMOTION_ICONS[lastResult.emotionResult.label];
                                                return <Icon className="h-8 w-8" style={{ color: EMOTION_COLORS[lastResult.emotionResult.label] }} />;
                                            })()}
                                            <p className="text-4xl font-bold text-gradient">{lastResult.emotionResult.label}</p>
                                        </div>
                                        <p className="mt-2 text-lg text-muted-foreground">
                                            Confidence:{" "}
                                            <span className="font-semibold text-foreground">
                                                {lastResult.emotionResult.confidence.toFixed(2)}%
                                            </span>
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="shadow-card">
                                    <CardContent className="p-6">
                                        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                            Distribusi Probabilitas
                                        </h3>
                                        <ResponsiveContainer width="100%" height={200}>
                                            <BarChart data={lastResult.emotionResult.probabilities} layout="vertical">
                                                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                                                <YAxis dataKey="emotion" type="category" width={60} tick={{ fontSize: 12 }} />
                                                <Tooltip formatter={(v: number | undefined) => `${v ?? 0}%`} />
                                                <Bar dataKey="probability" radius={[0, 6, 6, 0]}>
                                                    {lastResult.emotionResult.probabilities.map((entry) => (
                                                        <Cell key={entry.emotion} fill={EMOTION_COLORS[entry.emotion] || "hsl(220,15%,55%)"} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                {/* AI Explanation */}
                                <Card className="border-secondary/30 shadow-card">
                                    <CardContent className="p-6">
                                        <div className="mb-3 flex items-center gap-2">
                                            <Activity className="h-5 w-5 text-secondary" />
                                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                                Penjelasan AI (Explainable AI)
                                            </h3>
                                        </div>
                                        <div className="prose prose-sm max-w-none text-sm leading-relaxed text-muted-foreground dark:prose-invert">
                                            {lastResult.emotionResult.aiExplanation.split('\n').map((line, idx) => (
                                                <p key={idx} className={`${line.startsWith('**') || line.includes('**') ? 'font-semibold text-foreground' : ''} ${line.trim() === '' ? 'hidden' : 'mb-1'}`}>
                                                    {line.replace(/\*\*/g, '')}
                                                </p>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                )}

                {/* ===== TAB: RIWAYAT ===== */}
                {activeTab === "riwayat" && (
                    <Card className="border-border/50 shadow-card">
                        <CardContent className="p-0">
                            {entries.length === 0 ? (
                                <div className="flex flex-col items-center gap-3 py-16 text-center">
                                    <History className="h-10 w-10 text-muted-foreground" />
                                    <p className="font-semibold text-foreground">Belum ada diary</p>
                                    <p className="text-sm text-muted-foreground">Diary yang kamu tulis akan muncul di sini.</p>
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
                                                <TableHead className="w-24 text-center">Aksi</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {entries.map((item, i) => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                                    <TableCell className="max-w-xs">
                                                        {editingId === item.id ? (
                                                            <div className="flex items-center gap-2">
                                                                <Textarea
                                                                    value={editText}
                                                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditText(e.target.value)}
                                                                    rows={2}
                                                                    className="min-w-[200px] resize-none bg-background text-sm"
                                                                />
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 shrink-0 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                                                    disabled={editLoading || !editText.trim()}
                                                                    onClick={() => handleEditDiary(item.id)}
                                                                >
                                                                    {editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                                                                    onClick={() => { setEditingId(null); setEditText(""); }}
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <p className="truncate text-foreground" title={item.teks}>{item.teks}</p>
                                                        )}
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
                                                    <TableCell className="text-center">
                                                        {deleteConfirmId === item.id ? (
                                                            <div className="flex items-center justify-center gap-1">
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                                                    onClick={() => handleDeleteDiary(item.id)}
                                                                >
                                                                    <Check className="h-3.5 w-3.5" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-7 w-7 text-muted-foreground"
                                                                    onClick={() => setDeleteConfirmId(null)}
                                                                >
                                                                    <X className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-center gap-1">
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-7 w-7 text-muted-foreground hover:text-secondary"
                                                                    onClick={() => {
                                                                        setEditingId(item.id);
                                                                        setEditText(item.teks);
                                                                        setDeleteConfirmId(null);
                                                                    }}
                                                                    title="Edit diary"
                                                                >
                                                                    <Pencil className="h-3.5 w-3.5" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                                    onClick={() => {
                                                                        setDeleteConfirmId(item.id);
                                                                        setEditingId(null);
                                                                    }}
                                                                    title="Hapus diary"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        )}
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
                                        <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada data pada periode ini.</p>
                                    ) : (
                                        <ResponsiveContainer width="100%" height={250}>
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={90}
                                                    label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                                >
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
                                        <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada data pada periode ini.</p>
                                    ) : (
                                        <ResponsiveContainer width="100%" height={250}>
                                            <LineChart data={lineData}>
                                                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                                <Tooltip />
                                                {Object.keys(EMOTION_COLORS).map((emotion) => (
                                                    <Line
                                                        key={emotion}
                                                        type="monotone"
                                                        dataKey={emotion}
                                                        stroke={EMOTION_COLORS[emotion]}
                                                        strokeWidth={2}
                                                        dot={{ r: 3 }}
                                                    />
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

                {/* ===== TAB: PESAN ===== */}
                {activeTab === "pesan" && (
                    <Card className="shadow-card">
                        <CardContent className="flex flex-col p-0" style={{ height: "520px" }}>
                            {/* Messages thread */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-3">
                                {messages.length === 0 ? (
                                    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                                        <MessageSquare className="h-10 w-10 text-muted-foreground" />
                                        <p className="font-semibold text-foreground">Belum ada pesan</p>
                                        <p className="text-sm text-muted-foreground">
                                            Mulai percakapan dengan Pembimbing Konseling Anda di sini.
                                        </p>
                                    </div>
                                ) : (
                                    messages.map((msg) => {
                                        const isMe = msg.senderRole === "siswa";
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
                                                        {isMe ? "Anda" : "Pembimbing"} · {formatDate(msg.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Input area */}
                            <div className="border-t border-border p-4">
                                <div className="flex gap-2">
                                    <Textarea
                                        placeholder="Tulis pesan ke pembimbing konseling..."
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
                                        {sendingMsg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
