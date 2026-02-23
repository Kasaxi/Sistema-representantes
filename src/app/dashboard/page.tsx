"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardWidgets from "@/components/DashboardWidgets";
import RealtimeRanking from "@/components/RealtimeRanking";
import DashboardShell from "@/components/DashboardShell";

export default function SellerDashboard() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(false);
    const [stats, setStats] = useState({ totalSales: 0, pendingPoints: 0 });
    const [salesData, setSalesData] = useState<any[]>([]);

    // Filters for Seller
    const [filters, setFilters] = useState({
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    const fetchSellerData = async (userId: string) => {
        setDataLoading(true);
        console.log("Fetching Seller Data for UserID:", userId, "Filters:", filters);
        try {
            let query = supabase
                .from("sales")
                .select("*, profiles!sales_seller_id_fkey(full_name, cnpj), brands(name)")
                .eq("seller_id", userId);

            if (filters.startDate) {
                query = query.gte("created_at", `${filters.startDate}T00:00:00.000Z`);
            }
            if (filters.endDate) {
                query = query.lte("created_at", `${filters.endDate}T23:59:59.999Z`);
            }

            const { data, error } = await query.order("created_at", { ascending: false });
            if (error) throw error;

            console.log("Seller sales count from DB:", data?.length || 0);
            if (data && data.length > 0) {
                console.log("Sample sale seller_id:", data[0].seller_id);
            }

            setSalesData(data || []);

            // Stats based on filtered data
            const approvedCount = data?.filter(s => s.status === 'approved').length || 0;
            const pendingCount = data?.filter(s => s.status === 'pending').length || 0;

            console.log("Calculated Stats:", { approvedCount, pendingCount });

            setStats({
                totalSales: approvedCount,
                pendingPoints: pendingCount
            });

        } catch (err) {
            console.error("Error fetching seller data:", err);
        } finally {
            setDataLoading(false);
        }
    };

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

            console.log("Profile loaded:", { id: profileData.id, role: profileData.role, status: profileData.status });
            setProfile(profileData);
            await fetchSellerData(user.id);
            setLoading(false);
        }
        checkUser();
    }, [router]);

    // Re-fetch when dates change
    useEffect(() => {
        if (profile?.id) {
            fetchSellerData(profile.id);
        }
    }, [filters.startDate, filters.endDate]);

    if (loading) return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066FF]"></div>
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
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>
                <div className="absolute bottom-0 right-20 w-32 h-32 bg-[#0066FF] opacity-20 rounded-full blur-xl pointer-events-none"></div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-8 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase">Período:</span>
                    <input
                        type="date"
                        className="text-sm border-gray-200 rounded-lg focus:ring-[#0066FF] focus:border-[#0066FF] text-gray-700"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    />
                    <span className="text-gray-400">até</span>
                    <input
                        type="date"
                        className="text-sm border-gray-200 rounded-lg focus:ring-[#0066FF] focus:border-[#0066FF] text-gray-700"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    />
                </div>
                {dataLoading && <span className="text-xs text-[#0066FF] font-medium animate-pulse">Atualizando dados...</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                </div>

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
                </div>

                <div className="bg-[#0066FF] p-6 rounded-2xl text-white shadow-lg shadow-blue-900/20 flex flex-col justify-between h-full relative overflow-hidden group">
                    <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity"></div>
                    <div>
                        <h3 className="text-xl font-bold mb-1">Nova Venda?</h3>
                        <p className="text-blue-100 text-sm opacity-90">Envie a nota fiscal agora.</p>
                    </div>
                    <Link href="/enviar-nota" className="mt-4 inline-flex items-center justify-center w-full py-3 bg-white text-[#0066FF] font-bold rounded-xl hover:bg-gray-50 transition-colors">
                        Enviar Nota ➜
                    </Link>
                </div>
            </div>

            {/* Dynamic Graph */}
            <div className="mb-8">
                <DashboardWidgets
                    sales={salesData}
                    sellers={[]}
                    startDate={filters.startDate}
                    endDate={filters.endDate}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h3 className="font-bold text-gray-900 text-lg">Ranking da Campanha</h3>
                    <RealtimeRanking
                        startDate={filters.startDate}
                        endDate={filters.endDate}
                        sellerId={profile.id}
                    />
                </div>

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
                </div>
            </div>

        </DashboardShell>
    );
}
