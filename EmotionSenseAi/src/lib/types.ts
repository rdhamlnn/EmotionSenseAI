// ==================== User & Auth ====================
export type UserRole = "siswa" | "pembimbing";

export type JenisKelamin = "laki-laki" | "perempuan";

export interface User {
    id: string;
    email: string;
    nama: string;
    role: UserRole;
    usia: number;
    jenisKelamin: JenisKelamin;
    createdAt: string;
}

// ==================== Student-Counselor Relationship ====================
export interface StudentCounselor {
    id: string;
    siswaId: string;
    pembimbingId: string;
    assignedAt: string;
}

// ==================== Diary & Emotions (separate tables) ====================
export interface EmotionProbability {
    emotion: string;
    probability: number;
}

export interface EmotionResult {
    id: string;
    diaryEntryId: string;
    label: string;
    confidence: number;
    probabilities: EmotionProbability[];
    aiExplanation: string;
    createdAt: string;
}

// Raw diary entry as stored (without embedded emotion result)
export interface DiaryEntryRaw {
    id: string;
    userId: string;
    teks: string;
    createdAt: string;
}

// Joined view for UI convenience (diary + emotion result)
export interface DiaryEntry extends DiaryEntryRaw {
    emotionResult: EmotionResult;
}

// ==================== Pembimbing Konseling ====================
export interface PembimbingNote {
    id: string;
    pembimbingId: string;
    siswaId: string;
    note: string;
    createdAt: string;
}

// Messages (two-way messaging, also serves as feedback)
export interface Message {
    id: string;
    senderId: string;
    senderRole: UserRole;
    siswaId: string;     // always the siswa's id (used as conversation key)
    message: string;
    isRead: boolean;
    createdAt: string;
}

// ==================== Alert ====================
export type AlertLevel = "safe" | "warning" | "critical";

export interface AlertOverride {
    id: string;
    siswaId: string;
    pembimbingId: string;
    overriddenAt: string;
}

export interface SiswaStatus {
    siswaId: string;
    siswaName: string;
    siswaEmail: string;
    siswaUsia: number;
    siswaJenisKelamin: JenisKelamin;
    alertLevel: AlertLevel;
    totalEntries: number;
    negativePercentage: number;
    lastEntryDate: string;
    consecutiveNegativeDays: number;
}
