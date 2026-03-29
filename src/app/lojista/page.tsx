"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LojistaIndex() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard');
    }, [router]);

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066FF]"></div>
        </div>
    );
}
