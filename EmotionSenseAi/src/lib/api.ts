/**
 * API client for communicating with the FastAPI backend.
 * All functions return promises; localStorage is no longer the source of truth.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ==================== Token helpers ====================
function getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("emotionsense_token");
}

export function setToken(token: string) {
    localStorage.setItem("emotionsense_token", token);
}

export function clearToken() {
    localStorage.removeItem("emotionsense_token");
}

// ==================== Fetch wrapper ====================
async function apiFetch<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string> || {}),
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // Auto-logout on 401 (token expired / invalid)
        if (res.status === 401 && typeof window !== "undefined") {
            clearToken();
            localStorage.removeItem("emotionsense_user");
            window.location.href = "/login";
        }
        throw new Error(body.detail || `API Error ${res.status}`);
    }

    // Handle 204 or empty body
    const text = await res.text();
    if (!text) return {} as T;
    return JSON.parse(text) as T;
}

// ==================== Auth API ====================
export interface AuthResponseAPI {
    success: boolean;
    error?: string;
    user?: {
        id: string;
        email: string;
        nama: string;
        role: string;
        usia: number;
        jenisKelamin: string;
        createdAt: string;
    };
    access_token?: string;
    token_type?: string;
}

export async function apiRegister(
    email: string,
    nama: string,
    password: string,
    role: string,
    usia: number,
    jenisKelamin: string
): Promise<AuthResponseAPI> {
    return apiFetch<AuthResponseAPI>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, nama, password, role, usia, jenisKelamin }),
    });
}

export async function apiLogin(
    email: string,
    password: string
): Promise<AuthResponseAPI> {
    return apiFetch<AuthResponseAPI>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });
}

export async function apiGetMe() {
    return apiFetch<{
        id: string;
        email: string;
        nama: string;
        role: string;
        usia: number;
        jenisKelamin: string;
        createdAt: string;
    }>("/auth/me");
}

// ==================== Diary API ====================
export interface DiaryEntryAPI {
    id: string;
    userId: string;
    teks: string;
    createdAt: string;
    emotionResult: {
        id: string;
        diaryEntryId: string;
        label: string;
        confidence: number;
        probabilities: { emotion: string; probability: number }[];
        aiExplanation: string;
        createdAt: string;
    };
}

export async function apiGetDiaryEntries(userId?: string): Promise<DiaryEntryAPI[]> {
    const params = userId ? `?userId=${userId}` : "";
    return apiFetch<DiaryEntryAPI[]>(`/diary${params}`);
}

export async function apiCreateDiaryEntry(teks: string): Promise<DiaryEntryAPI> {
    return apiFetch<DiaryEntryAPI>("/diary", {
        method: "POST",
        body: JSON.stringify({ teks }),
    });
}

// ==================== Notes API ====================
export interface NoteAPI {
    id: string;
    pembimbingId: string;
    siswaId: string;
    note: string;
    createdAt: string;
}

export async function apiGetNotes(siswaId: string): Promise<NoteAPI[]> {
    return apiFetch<NoteAPI[]>(`/notes?siswaId=${siswaId}`);
}

export async function apiCreateNote(siswaId: string, note: string): Promise<NoteAPI> {
    return apiFetch<NoteAPI>("/notes", {
        method: "POST",
        body: JSON.stringify({ siswaId, note }),
    });
}

// ==================== Messages API ====================
export interface MessageAPI {
    id: string;
    senderId: string;
    senderRole: string;
    siswaId: string;
    message: string;
    isRead: boolean;
    createdAt: string;
}

export async function apiGetMessages(siswaId: string): Promise<MessageAPI[]> {
    return apiFetch<MessageAPI[]>(`/messages?siswaId=${siswaId}`);
}

export async function apiSendMessage(siswaId: string, message: string): Promise<MessageAPI> {
    return apiFetch<MessageAPI>("/messages", {
        method: "POST",
        body: JSON.stringify({ siswaId, message }),
    });
}

export async function apiMarkMessagesRead(siswaId: string): Promise<void> {
    await apiFetch<unknown>("/messages/read", {
        method: "PATCH",
        body: JSON.stringify({ siswaId }),
    });
}

export async function apiGetUnreadCount(): Promise<number> {
    const res = await apiFetch<{ count: number }>("/messages/unread-count");
    return res.count;
}

// ==================== Students API ====================
export interface UserAPI {
    id: string;
    email: string;
    nama: string;
    role: string;
    usia: number;
    jenisKelamin: string;
    createdAt: string;
}

export interface SiswaStatusAPI {
    siswaId: string;
    siswaName: string;
    siswaEmail: string;
    siswaUsia: number;
    siswaJenisKelamin: string;
    alertLevel: string;
    totalEntries: number;
    negativePercentage: number;
    lastEntryDate: string;
    consecutiveNegativeDays: number;
}

export interface SelfAlertAPI {
    level: string;
    message: string;
    consecutiveDays: number;
}

export async function apiGetAllSiswa(): Promise<UserAPI[]> {
    return apiFetch<UserAPI[]>("/students/all-siswa");
}

export async function apiGetSiswaForPembimbing(): Promise<UserAPI[]> {
    return apiFetch<UserAPI[]>("/students/for-pembimbing");
}

export async function apiGetSiswaStatus(siswaId: string): Promise<SiswaStatusAPI> {
    return apiFetch<SiswaStatusAPI>(`/students/status/${siswaId}`);
}

export async function apiGetCriticalSiswa(): Promise<SiswaStatusAPI[]> {
    return apiFetch<SiswaStatusAPI[]>("/students/critical");
}

export async function apiMarkSiswaSafe(siswaId: string): Promise<void> {
    await apiFetch<unknown>("/students/mark-safe", {
        method: "POST",
        body: JSON.stringify({ siswaId }),
    });
}

export async function apiRemoveOverride(siswaId: string): Promise<void> {
    await apiFetch<unknown>(`/students/remove-override/${siswaId}`, {
        method: "DELETE",
    });
}

export async function apiGetSelfAlert(siswaId: string): Promise<SelfAlertAPI | null> {
    try {
        const data = await apiFetch<SelfAlertAPI | null>(`/students/self-alert/${siswaId}`);
        return data;
    } catch {
        return null;
    }
}

export async function apiGetPembimbingForSiswa(siswaId: string): Promise<string | null> {
    const res = await apiFetch<{ pembimbingId: string | null }>(`/students/pembimbing-for-siswa/${siswaId}`);
    return res.pembimbingId;
}

// ==================== Evaluation API ====================
export interface PerClassMetricsAPI {
    label: string;
    precision: number;
    recall: number;
    f1Score: number;
    support: number;
}

export interface EvaluationAPI {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    labels: string[];
    confusionMatrix: number[][];
    perClass: PerClassMetricsAPI[];
    trainSize: number;
    testSize: number;
    totalDataset: number;
}

export async function apiGetEvaluation(): Promise<EvaluationAPI> {
    return apiFetch<EvaluationAPI>("/evaluation");
}

// ==================== Diary CRUD ====================
export async function apiUpdateDiaryEntry(entryId: string, teks: string): Promise<DiaryEntryAPI> {
    return apiFetch<DiaryEntryAPI>(`/diary/${entryId}`, {
        method: "PUT",
        body: JSON.stringify({ teks }),
    });
}

export async function apiDeleteDiaryEntry(entryId: string): Promise<void> {
    await apiFetch<unknown>(`/diary/${entryId}`, {
        method: "DELETE",
    });
}
