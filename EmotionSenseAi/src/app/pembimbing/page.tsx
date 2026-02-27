"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Users, AlertTriangle, ShieldCheck, ShieldAlert,
    Eye, Brain,
} from "lucide-react";
import { getCurrentUser, getSiswaForPembimbing } from "@/lib/auth";
import { getSiswaStatus } from "@/lib/mock-data";
import type { User, SiswaStatus, AlertLevel } from "@/lib/types";
import { Button } from "@/components/ui/button";

const ALERT_CONFIG: Record<AlertLevel, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
    safe: { label: "Aman", color: "text-emerald-700", bgColor: "bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400", icon: ShieldCheck },
    warning: { label: "Perlu Perhatian", color: "text-amber-700", bgColor: "bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400", icon: AlertTriangle },
    critical: { label: "Kritis", color: "text-red-700", bgColor: "bg-red-100 dark:bg-red-900/30 dark:text-red-400", icon: ShieldAlert },
};

const formatDate = (iso: string) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleDateString("id-ID", {
        day: "2-digit", month: "short", year: "numeric",
    });
};

export default function PembimbingDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [siswaStatuses, setSiswaStatuses] = useState<SiswaStatus[]>([]);

    useEffect(() => {
        const currentUser = getCurrentUser();
        if (!currentUser || currentUser.role !== "pembimbing") {
            router.push("/login");
            return;
        }
        setUser(currentUser);

        const loadData = async () => {
            const siswaList = await getSiswaForPembimbing(currentUser.id);
            const statuses = await Promise.all(
                siswaList.map((p) => getSiswaStatus(p.id))
            );
            setSiswaStatuses(statuses);
        };
        loadData();
    }, [router]);

    if (!user) return null;

    const safeCount = siswaStatuses.filter((p) => p.alertLevel === "safe").length;
    const warningCount = siswaStatuses.filter((p) => p.alertLevel === "warning").length;
    const criticalCount = siswaStatuses.filter((p) => p.alertLevel === "critical").length;

    return (
        <div className="py-8 md:py-12">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-wider text-secondary">
                        <Brain className="h-3.5 w-3.5" />
                        Dashboard Pembimbing Konseling
                    </div>
                    <h1 className="text-2xl font-bold text-foreground md:text-3xl">
                        Selamat datang, <span className="text-gradient">{user.nama}</span>
                    </h1>
                    <p className="mt-1 text-muted-foreground">
                        Pantau kondisi emosional siswa Anda.
                    </p>
                </div>

                {/* Summary Cards */}
                <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="shadow-card">
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">{siswaStatuses.length}</p>
                                <p className="text-sm text-muted-foreground">Total Siswa</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-card">
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                                <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-emerald-600">{safeCount}</p>
                                <p className="text-sm text-muted-foreground">Aman</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-card">
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                                <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-amber-600">{warningCount}</p>
                                <p className="text-sm text-muted-foreground">Perlu Perhatian</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-card">
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
                                <ShieldAlert className="h-6 w-6 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
                                <p className="text-sm text-muted-foreground">Kritis</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Patient List */}
                <Card className="border-border/50 shadow-card">
                    <CardContent className="p-0">
                        <div className="border-b px-6 py-4">
                            <h2 className="text-lg font-semibold text-foreground">Daftar Siswa</h2>
                            <p className="text-sm text-muted-foreground">Klik untuk melihat detail emosi siswa</p>
                        </div>
                        {siswaStatuses.length === 0 ? (
                            <div className="flex flex-col items-center gap-3 py-16 text-center">
                                <Users className="h-10 w-10 text-muted-foreground" />
                                <p className="font-semibold text-foreground">Belum ada siswa terdaftar</p>
                                <p className="text-sm text-muted-foreground">
                                    Siswa yang mendaftar akan muncul di sini.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">No</TableHead>
                                            <TableHead>Nama Siswa</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead className="w-20">Usia</TableHead>
                                            <TableHead className="w-20">L/P</TableHead>
                                            <TableHead className="w-36">Status</TableHead>
                                            <TableHead className="w-24 text-center">Entries</TableHead>
                                            <TableHead className="w-28 text-center">% Negatif</TableHead>
                                            <TableHead className="w-36">Entry Terakhir</TableHead>
                                            <TableHead className="w-20 text-center">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {siswaStatuses.map((siswa, i) => {
                                            const config = ALERT_CONFIG[siswa.alertLevel];
                                            const AlertIcon = config.icon;
                                            return (
                                                <TableRow key={siswa.siswaId} className="group">
                                                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                                    <TableCell className="font-medium text-foreground">{siswa.siswaName}</TableCell>
                                                    <TableCell className="text-muted-foreground">{siswa.siswaEmail}</TableCell>
                                                    <TableCell className="text-muted-foreground">{siswa.siswaUsia} th</TableCell>
                                                    <TableCell className="text-muted-foreground">{siswa.siswaJenisKelamin === "laki-laki" ? "L" : "P"}</TableCell>
                                                    <TableCell>
                                                        <Badge className={`${config.bgColor} border-0 gap-1 font-semibold`}>
                                                            <AlertIcon className="h-3 w-3" />
                                                            {config.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center font-medium">{siswa.totalEntries}</TableCell>
                                                    <TableCell className="text-center">
                                                        <span className={`font-semibold ${siswa.negativePercentage > 60 ? "text-red-600" :
                                                                siswa.negativePercentage >= 40 ? "text-amber-600" :
                                                                    "text-emerald-600"
                                                            }`}>
                                                            {siswa.negativePercentage}%
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {formatDate(siswa.lastEntryDate)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Link href={`/pembimbing/siswa/${siswa.siswaId}`}>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-secondary">
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </Link>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
