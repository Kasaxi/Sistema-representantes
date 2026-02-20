"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RealtimeRanking from "@/components/RealtimeRanking";
import DashboardShell from "@/components/DashboardShell";

export default function SellerDashboard() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalSales: 0, pendingPoints: 0 });

    useEffect(() => {
        async function checkUser() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }

            const { data: profileData } = await supabase
                .from("profiles")
                .select("*, brands(id, name)")
                .eq("id", user.id)
                .single();

            if (profileData?.status !== "approved") {
                router.push("/aguardando-aprovacao");
                return;
            }

            setProfile(profileData);

            // Fetch user stats
            const { count: approvedCount } = await supabase
                .from("sales")
                .select('*', { count: 'exact', head: true })
                .eq("seller_id", user.id)
                .eq("status", "approved");

            // Pending for user knowledge
            const { count: pendingCount } = await supabase
                .from("sales")
                .select('*', { count: 'exact', head: true })
                .eq("seller_id", user.id)
                .eq("status", "pending");

            setStats({
                totalSales: approvedCount || 0,
                pendingPoints: pendingCount || 0
            });
            setLoading(false);
        }
        checkUser();
    }, [router]);

    if (loading) return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C00000]"></div>
        </div>
    );

    return (
        <DashboardShell userRole="representative">

            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 mb-8 text-white relative overflow-hidden shadow-lg">
                <div className="relative z-10">
                    <h2 className="text-3xl font-bold mb-2">Olá, {profile.full_name?.split(' ')[0]} 👋</h2>
                    <p className="text-gray-300 max-w-xl">
                        Acompanhe suas vendas e veja sua posição no ranking em tempo real. Continue vendendo para alcançar o topo!
                    </p>
                </div>
                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>
                <div className="absolute bottom-0 right-20 w-32 h-32 bg-[#C00000] opacity-20 rounded-full blur-xl pointer-events-none"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Card 1: Vendas Aprovadas */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-full">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-green-50 rounded-lg text-green-600">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Vendas Confirmadas</p>
                            <h3 className="text-2xl font-bold text-gray-900">{stats.totalSales}</h3>
                        </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '70%' }}></div>
                    </div>
                </div>

                {/* Card 2: Em Análise */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-full">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-yellow-50 rounded-lg text-yellow-600">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Em Análise</p>
                            <h3 className="text-2xl font-bold text-gray-900">{stats.pendingPoints}</h3>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400">Aguardando validação da auditoria.</p>
                </div>

                {/* Card 3: Shortcut */}
                <div className="bg-[#C00000] p-6 rounded-2xl text-white shadow-lg shadow-red-900/20 flex flex-col justify-between h-full relative overflow-hidden group">
                    <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity"></div>
                    <div>
                        <h3 className="text-xl font-bold mb-1">Nova Venda?</h3>
                        <p className="text-red-100 text-sm opacity-90">Envie a nota fiscal agora.</p>
                    </div>
                    <Link href="/enviar-nota" className="mt-4 inline-flex items-center justify-center w-full py-3 bg-white text-[#C00000] font-bold rounded-xl hover:bg-gray-50 transition-colors">
                        Enviar Nota ➜
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Ranking */}
                <div className="space-y-4">
                    <h3 className="font-bold text-gray-900 text-lg">Ranking da Campanha</h3>
                    <RealtimeRanking brandId={profile.brand_id} />
                </div>

                {/* Notices / Communications */}
                <div className="space-y-4">
                    <h3 className="font-bold text-gray-900 text-lg">Mural de Avisos</h3>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold uppercase">Novidade</span>
                            <span className="text-xs text-blue-400">Hoje, 10:00</span>
                        </div>
                        <h4 className="font-bold text-blue-900 mb-2">Campanha de Incentivo Iniciada!</h4>
                        <p className="text-sm text-blue-700 leading-relaxed">
                            A nova temporada de vendas começou. Todas as notas enviadas a partir de hoje contam para o acelerador de bônus trimestral.
                        </p>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-xl p-6 opacity-60 grayscale hover:grayscale-0 transition-all hover:opacity-100 cursor-not-allowed">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold uppercase">Dica</span>
                        </div>
                        <p className="text-sm text-gray-600">
                            Mantenha suas notas fiscais legíveis para agilizar a aprovação pela auditoria.
                        </p>
                    </div>
                </div>
            </div>

        </DashboardShell>
    );
}
