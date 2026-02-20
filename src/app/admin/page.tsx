"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RealtimeRanking from "@/components/RealtimeRanking";
import DashboardShell from "@/components/DashboardShell";
import DashboardWidgets from "@/components/DashboardWidgets";

export default function AdminDashboard() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ pendingSales: 0, totalSellers: 0, totalSales: 0 });

    useEffect(() => {
        async function checkAdmin() {
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

            if (profileData?.role !== "admin") {
                router.push("/dashboard");
                return;
            }

            setProfile(profileData);

            // Fetch Data for Widgets (Last 30 days approx)
            const { data: recentSales } = await supabase
                .from("sales")
                .select("*, profiles!sales_seller_id_fkey(full_name), brands(name)")
                .order("created_at", { ascending: false })
                .limit(100);

            const { count: pendingCount } = await supabase
                .from("sales")
                .select("*", { count: "exact", head: true })
                .eq("status", "pending");

            const { count: sellersCount } = await supabase
                .from("profiles")
                .select("*", { count: "exact", head: true })
                .in("role", ["seller", "representative"]);

            setStats({
                pendingSales: pendingCount || 0,
                totalSellers: sellersCount || 0,
                totalSales: recentSales?.length || 0, // Simplified for visual
            });

            // Pass full sales data to widgets
            setSalesData(recentSales || []);
            setLoading(false);
        }
        checkAdmin();
    }, [router]);

    // Added state for widget data
    const [salesData, setSalesData] = useState<any[]>([]);

    if (loading) return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C00000]"></div>
        </div>
    );

    return (
        <DashboardShell userRole="admin">

            {/* Header Area */}
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Visão Geral</h1>
                    <p className="text-gray-500 mt-1">Bem-vindo ao centro de comando, {profile?.full_name?.split(' ')[0]}.</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/admin/enviar-aviso" className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black transition-colors">
                        + Novo Aviso
                    </Link>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Link href="/admin/auditoria" className="group block">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer h-full relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <svg className="w-16 h-16 text-[#C00000]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Auditoria</p>
                        <h3 className="text-4xl font-bold text-gray-900 mb-2">{stats.pendingSales}</h3>
                        <p className="text-xs text-[#C00000] font-medium flex items-center gap-1">
                            {stats.pendingSales > 0 ? 'Pendentes de Análise' : 'Tudo em dia'}
                        </p>
                    </div>
                </Link>

                <Link href="/admin/vendedores" className="group block">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer h-full relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <svg className="w-16 h-16 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </div>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Vendedores</p>
                        <h3 className="text-4xl font-bold text-gray-900 mb-2">{stats.totalSellers}</h3>
                        <p className="text-xs text-blue-600 font-medium">Ativos na plataforma</p>
                    </div>
                </Link>

                <div className="bg-gradient-to-br from-[#C00000] to-[#900000] p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-20">
                        <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </div>
                    <p className="text-sm font-medium text-red-100 uppercase tracking-wide mb-1">Volume (30d)</p>
                    <h3 className="text-4xl font-bold mb-2">{stats.totalSales}</h3>
                    <p className="text-xs text-red-100">Notas processadas</p>
                </div>
            </div>

            {/* SUPER DASHBOARD WIDGETS */}
            <DashboardWidgets sales={salesData} sellers={[]} />

            {/* Detailed Tables Area */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <RealtimeRanking brandId={profile?.brand_id} />
                </div>

                {/* System Status / Quick Actions */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide">Acesso Rápido</h3>
                        <div className="space-y-2">
                            <Link href="/admin/auditoria" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group border border-transparent hover:border-gray-200">
                                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900">Auditar Notas</span>
                                <span className="text-gray-400 group-hover:text-[#C00000] text-xs">→</span>
                            </Link>
                            <Link href="/admin/relatorios" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group border border-transparent hover:border-gray-200">
                                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900">Relatórios</span>
                                <span className="text-gray-400 group-hover:text-[#C00000] text-xs">→</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

        </DashboardShell>
    );
}
