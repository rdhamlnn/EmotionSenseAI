"use client";

import { Brain, Menu, X, LogOut, User as UserIcon, Bell, AlertTriangle, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { getCurrentUser, logout } from "@/lib/auth";
import { getUnreadMessageCount, getCriticalSiswa } from "@/lib/mock-data";
import type { User, SiswaStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";

const publicNavItems = [
    { label: "Beranda", path: "/beranda" },
    { label: "Evaluasi Model", path: "/evaluasi" },
];

const siswaNavItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Evaluasi Model", path: "/evaluasi" },
];

const pembimbingNavItems = [
    { label: "Dashboard", path: "/pembimbing" },
    { label: "Evaluasi Model", path: "/evaluasi" },
];

const Navbar = () => {
    const pathname = usePathname();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    // Pembimbing alert notification
    const [alertSiswa, setAlertSiswa] = useState<SiswaStatus[]>([]);
    const [showAlertDropdown, setShowAlertDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const currentUser = getCurrentUser();
        setUser(currentUser);

        const loadData = async () => {
            if (currentUser?.role === "siswa") {
                const count = await getUnreadMessageCount(currentUser.id, "siswa");
                setUnreadCount(count);
            }
            if (currentUser?.role === "pembimbing") {
                const critical = await getCriticalSiswa(currentUser.id);
                setAlertSiswa(critical);
            }
        };
        loadData();
    }, [pathname]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowAlertDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const navItems = user
        ? user.role === "pembimbing"
            ? pembimbingNavItems
            : siswaNavItems
        : publicNavItems;

    const handleLogout = () => {
        logout();
        setUser(null);
        router.push("/login");
    };

    const criticalCount = alertSiswa.filter((p) => p.alertLevel === "critical").length;
    const warningCount = alertSiswa.filter((p) => p.alertLevel === "warning").length;

    return (
        <nav className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link href={user ? (user.role === "pembimbing" ? "/pembimbing" : "/dashboard") : "/"} className="flex items-center gap-2">
                    <Brain className="h-6 w-6 text-secondary" />
                    <span className="text-lg font-bold text-foreground">EmotionSense AI</span>
                </Link>

                {/* Desktop */}
                <div className="hidden items-center gap-1 md:flex">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={cn(
                                "relative rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                                pathname === item.path
                                    ? "bg-accent text-primary"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            {item.label}
                            {item.label === "Dashboard" && user?.role === "siswa" && unreadCount > 0 && (
                                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                                    {unreadCount}
                                </span>
                            )}
                        </Link>
                    ))}

                    {/* Alert bell for pembimbing */}
                    {user?.role === "pembimbing" && (
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setShowAlertDropdown(!showAlertDropdown)}
                                className={cn(
                                    "relative ml-1 rounded-lg p-2 text-sm transition-colors hover:bg-muted",
                                    alertSiswa.length > 0
                                        ? "text-foreground"
                                        : "text-muted-foreground"
                                )}
                            >
                                <Bell className="h-4.5 w-4.5" />
                                {alertSiswa.length > 0 && (
                                    <span className={cn(
                                        "absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white",
                                        criticalCount > 0 ? "bg-red-500" : "bg-amber-500"
                                    )}>
                                        {alertSiswa.length}
                                    </span>
                                )}
                            </button>

                            {/* Dropdown */}
                            {showAlertDropdown && (
                                <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card shadow-lg">
                                    <div className="border-b border-border px-4 py-3">
                                        <h3 className="text-sm font-semibold text-foreground">Notifikasi Alert</h3>
                                        <p className="text-xs text-muted-foreground">
                                            Siswa yang membutuhkan perhatian
                                        </p>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {alertSiswa.length === 0 ? (
                                            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                                                Tidak ada alert saat ini ✓
                                            </div>
                                        ) : (
                                            alertSiswa.map((siswa) => (
                                                <Link
                                                    key={siswa.siswaId}
                                                    href={`/pembimbing/siswa/${siswa.siswaId}`}
                                                    onClick={() => setShowAlertDropdown(false)}
                                                    className="flex items-start gap-3 border-b border-border/50 px-4 py-3 transition-colors last:border-0 hover:bg-muted/50"
                                                >
                                                    <div className={cn(
                                                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                                        siswa.alertLevel === "critical"
                                                            ? "bg-red-500/10 text-red-500"
                                                            : "bg-amber-500/10 text-amber-500"
                                                    )}>
                                                        {siswa.alertLevel === "critical" ? (
                                                            <ShieldAlert className="h-4 w-4" />
                                                        ) : (
                                                            <AlertTriangle className="h-4 w-4" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium text-foreground">
                                                                {siswa.siswaName}
                                                            </span>
                                                            <span className={cn(
                                                                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                                                                siswa.alertLevel === "critical"
                                                                    ? "bg-red-500/10 text-red-500"
                                                                    : "bg-amber-500/10 text-amber-500"
                                                            )}>
                                                                {siswa.alertLevel === "critical" ? "Kritis" : "Perhatian"}
                                                            </span>
                                                        </div>
                                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                                            {siswa.negativePercentage}% emosi negatif · {siswa.consecutiveNegativeDays} hari berturut
                                                        </p>
                                                    </div>
                                                </Link>
                                            ))
                                        )}
                                    </div>
                                    {alertSiswa.length > 0 && (
                                        <div className="border-t border-border px-4 py-2.5">
                                            <div className="flex gap-3 text-xs text-muted-foreground">
                                                {criticalCount > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        <span className="h-2 w-2 rounded-full bg-red-500" />
                                                        {criticalCount} Kritis
                                                    </span>
                                                )}
                                                {warningCount > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                                                        {warningCount} Perlu Perhatian
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Auth buttons */}
                    {user ? (
                        <div className="ml-3 flex items-center gap-2 border-l border-border pl-3">
                            <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-1.5">
                                <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-medium text-foreground">{user.nama}</span>
                                <span className="rounded-full bg-secondary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-secondary">
                                    {user.role === "pembimbing" ? "Pembimbing" : "Siswa"}
                                </span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                <LogOut className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <Link href="/login" className="ml-3">
                            <Button size="sm" className="bg-hero-gradient text-primary-foreground hover:opacity-90">
                                Masuk
                            </Button>
                        </Link>
                    )}
                </div>

                {/* Mobile toggle */}
                <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
                    {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </div>

            {/* Mobile menu */}
            {open && (
                <div className="border-t bg-card px-4 pb-4 md:hidden">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            href={item.path}
                            onClick={() => setOpen(false)}
                            className={cn(
                                "block rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                                pathname === item.path
                                    ? "bg-accent text-primary"
                                    : "text-muted-foreground hover:bg-muted"
                            )}
                        >
                            {item.label}
                        </Link>
                    ))}

                    {/* Mobile alert for pembimbing */}
                    {user?.role === "pembimbing" && alertSiswa.length > 0 && (
                        <div className="mt-2 rounded-lg border border-border bg-muted/30 px-4 py-2.5">
                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                <Bell className="h-4 w-4" />
                                Alert Siswa
                                <span className={cn(
                                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white",
                                    criticalCount > 0 ? "bg-red-500" : "bg-amber-500"
                                )}>
                                    {alertSiswa.length}
                                </span>
                            </div>
                            <div className="mt-2 space-y-1.5">
                                {alertSiswa.map((s) => (
                                    <Link
                                        key={s.siswaId}
                                        href={`/pembimbing/siswa/${s.siswaId}`}
                                        onClick={() => setOpen(false)}
                                        className="flex items-center justify-between rounded-md bg-card px-3 py-2 text-xs transition-colors hover:bg-muted"
                                    >
                                        <span className="font-medium text-foreground">{s.siswaName}</span>
                                        <span className={cn(
                                            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                                            s.alertLevel === "critical"
                                                ? "bg-red-500/10 text-red-500"
                                                : "bg-amber-500/10 text-amber-500"
                                        )}>
                                            {s.alertLevel === "critical" ? "Kritis" : "Perhatian"}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {user ? (
                        <div className="mt-2 border-t border-border pt-2">
                            <div className="flex items-center gap-2 px-4 py-2">
                                <UserIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{user.nama}</span>
                                <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-secondary">
                                    {user.role === "pembimbing" ? "Pembimbing" : "Siswa"}
                                </span>
                            </div>
                            <button
                                onClick={() => { handleLogout(); setOpen(false); }}
                                className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
                            >
                                <LogOut className="h-4 w-4" />
                                Keluar
                            </button>
                        </div>
                    ) : (
                        <Link
                            href="/login"
                            onClick={() => setOpen(false)}
                            className="mt-2 block rounded-lg bg-hero-gradient px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground"
                        >
                            Masuk
                        </Link>
                    )}
                </div>
            )}
        </nav>
    );
};

export default Navbar;
