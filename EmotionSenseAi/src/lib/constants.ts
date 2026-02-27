/**
 * Shared constants and utility functions used across multiple pages.
 * Avoids duplication of emotion colors, badge styles, and date formatters.
 */

// ==================== Emotion Chart Colors ====================
export const EMOTION_COLORS: Record<string, string> = {
    Happy: "hsl(175, 45%, 40%)",
    Sad: "hsl(220, 60%, 45%)",
    Angry: "hsl(0, 65%, 55%)",
    Fear: "hsl(280, 40%, 50%)",
    Neutral: "hsl(220, 15%, 55%)",
};

// ==================== Emotion Badge Colors (Tailwind classes) ====================
export const BADGE_COLORS: Record<string, string> = {
    Happy: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    Sad: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    Angry: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    Fear: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    Neutral: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

// ==================== Date Formatters ====================

/** Format ISO date to "27 Feb 2026, 14:30" */
export const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

/** Format ISO date to "27 Feb 2026" (no time). Returns "-" for falsy values. */
export const formatDateOnly = (iso: string) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};
