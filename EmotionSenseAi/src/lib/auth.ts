"use client";

import type { User, UserRole, JenisKelamin } from "./types";
import {
    apiRegister,
    apiLogin,
    apiGetAllSiswa,
    apiGetSiswaForPembimbing,
    setToken,
    clearToken,
} from "./api";

const SESSION_KEY = "emotionsense_session";

// ==================== Auth Functions ====================
export async function register(
    email: string,
    nama: string,
    password: string,
    role: UserRole,
    usia: number,
    jenisKelamin: JenisKelamin
): Promise<{ success: boolean; error?: string; user?: User }> {
    try {
        const res = await apiRegister(email, nama, password, role, usia, jenisKelamin);
        if (!res.success) {
            return { success: false, error: res.error };
        }
        if (res.access_token) {
            setToken(res.access_token);
        }
        if (res.user) {
            const user: User = {
                id: res.user.id,
                email: res.user.email,
                nama: res.user.nama,
                role: res.user.role as UserRole,
                usia: res.user.usia,
                jenisKelamin: res.user.jenisKelamin as JenisKelamin,
                createdAt: res.user.createdAt,
            };
            localStorage.setItem(SESSION_KEY, JSON.stringify(user));
            return { success: true, user };
        }
        return { success: false, error: "Unexpected response" };
    } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : "Terjadi kesalahan" };
    }
}

export async function login(
    email: string,
    password: string
): Promise<{ success: boolean; error?: string; user?: User }> {
    try {
        const res = await apiLogin(email, password);
        if (!res.success) {
            return { success: false, error: res.error };
        }
        if (res.access_token) {
            setToken(res.access_token);
        }
        if (res.user) {
            const user: User = {
                id: res.user.id,
                email: res.user.email,
                nama: res.user.nama,
                role: res.user.role as UserRole,
                usia: res.user.usia,
                jenisKelamin: res.user.jenisKelamin as JenisKelamin,
                createdAt: res.user.createdAt,
            };
            localStorage.setItem(SESSION_KEY, JSON.stringify(user));
            return { success: true, user };
        }
        return { success: false, error: "Unexpected response" };
    } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : "Terjadi kesalahan" };
    }
}

export function logout() {
    localStorage.removeItem(SESSION_KEY);
    clearToken();
}

export function getCurrentUser(): User | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export async function getAllSiswa(): Promise<User[]> {
    try {
        const data = await apiGetAllSiswa();
        return data.map((u) => ({
            id: u.id,
            email: u.email,
            nama: u.nama,
            role: u.role as UserRole,
            usia: u.usia,
            jenisKelamin: u.jenisKelamin as JenisKelamin,
            createdAt: u.createdAt,
        }));
    } catch {
        return [];
    }
}

// Get only siswa assigned to a specific pembimbing via student_counselor table
export async function getSiswaForPembimbing(pembimbingId: string): Promise<User[]> {
    try {
        const data = await apiGetSiswaForPembimbing();
        return data.map((u) => ({
            id: u.id,
            email: u.email,
            nama: u.nama,
            role: u.role as UserRole,
            usia: u.usia,
            jenisKelamin: u.jenisKelamin as JenisKelamin,
            createdAt: u.createdAt,
        }));
    } catch {
        return [];
    }
}
