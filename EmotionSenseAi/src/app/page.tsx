"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BrainCircuit } from "lucide-react";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      router.replace(user.role === "pembimbing" ? "/pembimbing" : "/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <BrainCircuit className="h-10 w-10 animate-pulse text-primary" />
      <p className="text-sm text-muted-foreground">Mengalihkan...</p>
    </div>
  );
}
