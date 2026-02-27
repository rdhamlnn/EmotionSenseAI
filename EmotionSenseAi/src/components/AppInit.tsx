"use client";

import { useEffect } from "react";
import { seedDemoData } from "@/lib/mock-data";

export default function AppInit() {
    useEffect(() => {
        seedDemoData();
    }, []);
    return null;
}
