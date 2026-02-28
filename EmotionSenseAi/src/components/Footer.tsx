import { Brain } from "lucide-react";

const Footer = () => (
    <footer className="border-t bg-card py-10">
        <div className="container mx-auto px-4 text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
                <Brain className="h-5 w-5 text-secondary" />
                <span className="font-semibold text-foreground">EmotionSense AI</span>
            </div>
            <p className="text-sm text-muted-foreground">
                Sistem Klasifikasi Emosi Buku Harian Digital Berbasis Web
            </p>
            <p className="text-xs text-muted-foreground">
                Copyright @2026
            </p>
        </div>
    </footer>
);

export default Footer;
