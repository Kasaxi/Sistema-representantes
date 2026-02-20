"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({ email: "", password: "" });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            });

            if (authError) throw authError;

            if (data.user) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("role, status")
                    .eq("id", data.user.id)
                    .single();

                if (profile?.status === "pending") {
                    router.push("/aguardando-aprovacao");
                } else if (profile?.role === "admin") {
                    router.push("/admin");
                } else {
                    router.push("/dashboard");
                }
            }
        } catch (err: any) {
            setError(err.message || "Credenciais inválidas.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-white">

            {/* LEFT SIDE: Brand & Visual (Split Screen) */}
            <div className="hidden lg:flex w-1/2 bg-gray-900 relative items-center justify-center p-12 overflow-hidden">
                {/* Abstract Background */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-gray-800 via-gray-900 to-black z-0" />
                <div className="absolute top-0 right-0 w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] z-0 pointer-events-none" />

                <div className="relative z-10 max-w-lg text-left">
                    <div className="w-16 h-16 bg-[#C00000] rounded-xl flex items-center justify-center shadow-lg shadow-red-900/30 mb-8">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                    </div>
                    <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
                        Domine suas <br />
                        <span className="text-gray-400">Metas de Venda.</span>
                    </h1>
                    <p className="text-lg text-gray-400 leading-relaxed">
                        A plataforma definitiva para representantes que buscam maximizar incentivos e acompanhar resultados em tempo real.
                    </p>

                    <div className="mt-12 flex items-center gap-4">
                        <div className="flex -space-x-2">
                            <div className="w-10 h-10 rounded-full bg-gray-700 border-2 border-gray-900" />
                            <div className="w-10 h-10 rounded-full bg-gray-600 border-2 border-gray-900" />
                            <div className="w-10 h-10 rounded-full bg-gray-500 border-2 border-gray-900" />
                        </div>
                        <p className="text-sm text-gray-400 font-medium">Junte-se a +2.500 representantes</p>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE: Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 bg-white relative">
                <div className="w-full max-w-md space-y-10">

                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Bem-vindo de volta</h2>
                        <p className="mt-2 text-gray-500">Insira suas credenciais para acessar o painel.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-red-50 border-l-4 border-[#C00000] text-red-700 text-sm font-medium rounded-r-md">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">E-mail Corporativo</label>
                            <input
                                type="email"
                                required
                                placeholder="seunome@empresa.com"
                                className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:border-[#C00000] focus:ring-1 focus:ring-[#C00000] outline-none transition-all placeholder:text-gray-400"
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-semibold text-gray-700">Senha</label>
                                <Link href="#" className="text-sm text-[#C00000] font-semibold hover:underline">Esqueceu?</Link>
                            </div>
                            <input
                                type="password"
                                required
                                placeholder="Sua senha segura"
                                className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:border-[#C00000] focus:ring-1 focus:ring-[#C00000] outline-none transition-all placeholder:text-gray-400"
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 bg-[#C00000] hover:bg-[#A00000] text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all active:scale-[0.98] text-base flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span>Acessando...</span>
                            ) : (
                                <>
                                    Entrar no Painel
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="pt-6 border-t border-gray-100 text-center">
                        <p className="text-gray-500">
                            Não tem uma conta?{" "}
                            <Link href="/cadastro" className="font-bold text-[#C00000] hover:text-[#A00000] transition-colors">
                                Criar Cadastro Agora
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Mobile-only Footer */}
                <div className="absolute bottom-6 text-center w-full lg:hidden text-xs text-gray-400">
                    © 2026 OptiSales Inc.
                </div>
            </div>
        </div>
    );
}
