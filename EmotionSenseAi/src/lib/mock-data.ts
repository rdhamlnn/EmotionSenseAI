/**
 * Data layer — delegates to the FastAPI backend via api.ts.
 * Keeps the same exported function names so the rest of the frontend compiles
 * with minimal changes. Functions that hit the network are now async.
 */

import type {
    DiaryEntry,
    Message,
    PembimbingNote,
    SiswaStatus,
    AlertLevel,
    UserRole,
} from "./types";

import {
    apiGetDiaryEntries,
    apiCreateDiaryEntry,
    apiUpdateDiaryEntry,
    apiDeleteDiaryEntry,
    apiGetNotes,
    apiCreateNote,
    apiGetMessages,
    apiSendMessage,
    apiMarkMessagesRead,
    apiGetUnreadCount,
    apiGetSiswaStatus,
    apiGetCriticalSiswa,
    apiGetSelfAlert,
    apiMarkSiswaSafe,
    type DiaryEntryAPI,
    type SiswaStatusAPI,
} from "./api";

// ==================== Helpers: convert API shape → frontend types ====================

function toDiaryEntry(d: DiaryEntryAPI): DiaryEntry {
    return {
        id: d.id,
        userId: d.userId,
        teks: d.teks,
        createdAt: d.createdAt,
        emotionResult: {
            id: d.emotionResult.id,
            diaryEntryId: d.emotionResult.diaryEntryId,
            label: d.emotionResult.label,
            confidence: d.emotionResult.confidence,
            probabilities: d.emotionResult.probabilities,
            aiExplanation: d.emotionResult.aiExplanation,
            createdAt: d.emotionResult.createdAt,
        },
    };
}

function toSiswaStatus(s: SiswaStatusAPI): SiswaStatus {
    return {
        siswaId: s.siswaId,
        siswaName: s.siswaName,
        siswaEmail: s.siswaEmail,
        siswaUsia: s.siswaUsia,
        siswaJenisKelamin: s.siswaJenisKelamin as "laki-laki" | "perempuan",
        alertLevel: s.alertLevel as AlertLevel,
        totalEntries: s.totalEntries,
        negativePercentage: s.negativePercentage,
        lastEntryDate: s.lastEntryDate,
        consecutiveNegativeDays: s.consecutiveNegativeDays,
    };
}

// ==================== Diary ====================

export async function getDiaryEntries(userId?: string): Promise<DiaryEntry[]> {
    try {
        const data = await apiGetDiaryEntries(userId);
        return data.map(toDiaryEntry);
    } catch {
        return [];
    }
}

export async function saveDiaryEntry(userId: string, teks: string): Promise<DiaryEntry> {
    const data = await apiCreateDiaryEntry(teks);
    return toDiaryEntry(data);
}

export async function updateDiaryEntry(entryId: string, teks: string): Promise<DiaryEntry> {
    const data = await apiUpdateDiaryEntry(entryId, teks);
    return toDiaryEntry(data);
}

export async function deleteDiaryEntry(entryId: string): Promise<void> {
    await apiDeleteDiaryEntry(entryId);
}

// ==================== Notes ====================

export async function getNotes(siswaId: string): Promise<PembimbingNote[]> {
    try {
        const data = await apiGetNotes(siswaId);
        return data.map((n) => ({
            id: n.id,
            pembimbingId: n.pembimbingId,
            siswaId: n.siswaId,
            note: n.note,
            createdAt: n.createdAt,
        }));
    } catch {
        return [];
    }
}

export async function saveNote(
    pembimbingId: string,
    siswaId: string,
    note: string
): Promise<PembimbingNote> {
    const data = await apiCreateNote(siswaId, note);
    return {
        id: data.id,
        pembimbingId: data.pembimbingId,
        siswaId: data.siswaId,
        note: data.note,
        createdAt: data.createdAt,
    };
}

// ==================== Messages ====================

export async function getMessages(siswaId: string): Promise<Message[]> {
    try {
        const data = await apiGetMessages(siswaId);
        return data.map((m) => ({
            id: m.id,
            senderId: m.senderId,
            senderRole: m.senderRole as UserRole,
            siswaId: m.siswaId,
            message: m.message,
            isRead: m.isRead,
            createdAt: m.createdAt,
        }));
    } catch {
        return [];
    }
}

export async function sendMessage(
    senderId: string,
    senderRole: UserRole,
    siswaId: string,
    message: string
): Promise<Message> {
    const data = await apiSendMessage(siswaId, message);
    return {
        id: data.id,
        senderId: data.senderId,
        senderRole: data.senderRole as UserRole,
        siswaId: data.siswaId,
        message: data.message,
        isRead: data.isRead,
        createdAt: data.createdAt,
    };
}

export async function markMessagesRead(siswaId: string, readerRole: UserRole): Promise<void> {
    try {
        await apiMarkMessagesRead(siswaId);
    } catch {
        // ignore
    }
}

export async function getUnreadMessageCount(userId: string, role: UserRole): Promise<number> {
    try {
        return await apiGetUnreadCount();
    } catch {
        return 0;
    }
}

// ==================== Alert ====================

export async function getSiswaStatus(siswaId: string): Promise<SiswaStatus> {
    const data = await apiGetSiswaStatus(siswaId);
    return toSiswaStatus(data);
}

export async function getCriticalSiswa(pembimbingId?: string): Promise<SiswaStatus[]> {
    try {
        const data = await apiGetCriticalSiswa();
        return data.map(toSiswaStatus);
    } catch {
        return [];
    }
}

export async function getSiswaSelfAlert(siswaId: string): Promise<{
    level: AlertLevel;
    message: string;
    consecutiveDays: number;
} | null> {
    try {
        const data = await apiGetSelfAlert(siswaId);
        if (!data) return null;
        return {
            level: data.level as AlertLevel,
            message: data.message,
            consecutiveDays: data.consecutiveDays,
        };
    } catch {
        return null;
    }
}

export async function markSiswaSafe(pembimbingId: string, siswaId: string): Promise<void> {
    await apiMarkSiswaSafe(siswaId);
}

// ==================== Filter by Period (client-side, no API needed) ====================
export type FilterPeriod = "daily" | "weekly" | "monthly";

export function filterEntriesByPeriod(
    entries: DiaryEntry[],
    period: FilterPeriod
): DiaryEntry[] {
    const now = new Date();
    let cutoff: Date;

    switch (period) {
        case "daily":
            cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case "weekly":
            cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case "monthly":
            cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
    }

    return entries.filter((e) => new Date(e.createdAt) >= cutoff);
}

// ==================== Seed — no-op, backend handles seeding ====================
export function seedDemoData() {
    // Backend seeds demo data on startup. This is a no-op now.
}
