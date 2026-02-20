"use client";


import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function PendingApproval() {
    const router = useRouter();

    useEffect(() => {
        const checkStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from("profiles").select("status").eq("id", user.id).single();
                if (data?.status === 'approved') {
                    router.push('/dashboard');
                }
            }
        };
        const interval = setInterval(checkStatus, 3000); // Check every 3s
        checkStatus();
        return () => clearInterval(interval);
    }, [router]);

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6 font-sans">

            <div className="mb-8 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-10 h-10 bg-[#C00000] rounded-xl flex items-center justify-center shadow-lg shadow-red-900/20">
                        <span className="text-white font-bold text-xl">O</span>
                    </div>
                    <span className="text-2xl font-bold tracking-tight text-gray-900">OptiSales<span className="text-[#C00000]">.</span></span>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-10 max-w-md w-full text-center relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#C00000] opacity-5 rounded-full -mr-16 -mt-16 blur-xl pointer-events-none"></div>

                <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                    <div className="absolute inset-0 rounded-full border-4 border-yellow-100 border-t-[#C00000] animate-spin"></div>
                    <svg className="w-10 h-10 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-3">
                    Cadastro em Análise
                </h1>

                <p className="text-gray-500 text-sm leading-relaxed mb-8">
                    Sua solicitação foi enviada com sucesso e está sob revisão da nossa equipe. Você receberá um e-mail assim que seu acesso for liberado.
                </p>

                <div className="bg-gray-50 rounded-xl p-4 mb-8 border border-gray-100 text-left">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <div>
                            <p className="text-xs font-bold text-gray-700 uppercase mb-1">Status Atual</p>
                            <p className="text-sm text-gray-600">Aguardando aprovação do administrador do sistema.</p>
                        </div>
                    </div>
                </div>

                <Link
                    href="/"
                    className="block w-full py-3 px-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all text-sm shadow-sm"
                >
                    Voltar para Início
                </Link>
            </div>

            <p className="mt-8 text-xs text-gray-400 font-medium">
                © 2026 Techno-Optic Group • Precisa de ajuda? <a href="#" className="text-[#C00000] hover:underline">Entre em contato</a>
            </p>
        </div>
    );
}

