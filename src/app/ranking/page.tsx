"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DashboardShell from "@/components/DashboardShell";

export default function RepresentativeRankingPage() {
    const [loading, setLoading] = useState(true);
    const [ranking, setRanking] = useState<any[]>([]);
    const [brands, setBrands] = useState<any[]>([]);
    const [filters, setFilters] = useState({
        brandId: "all",
        period: "current_month" // current_month, last_30_days, all_time
    });
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        fetchCurrentUser();
        fetchBrands();
    }, []);

    useEffect(() => {
        if (currentUserId) {
            fetchRanking();
        }
    }, [filters, currentUserId]);

    const fetchCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setCurrentUserId(user.id);
        }
    };

    const fetchBrands = async () => {
        const { data } = await supabase.from("brands").select("*").order("name");
        if (data) setBrands(data);
    };

    const fetchRanking = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("sales")
                .select(`
                    seller_id,
                    profiles:profiles!sales_seller_id_fkey (full_name, email, brands(name)),
                    created_at,
                    brand_id
                `)
                .eq("status", "approved");

            // Apply Brand Filter
            if (filters.brandId !== "all") {
                query = query.eq("brand_id", filters.brandId);
            }

            // Apply Date Filter
            const now = new Date();
            if (filters.period === "current_month") {
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                query = query.gte("created_at", firstDay);
            } else if (filters.period === "last_30_days") {
                const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30)).toISOString();
                query = query.gte("created_at", thirtyDaysAgo);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Process Ranking
            const counts: Record<string, any> = {};
            data?.forEach((sale: any) => {
                const sid = sale.seller_id;
                if (!counts[sid]) {
                    counts[sid] = {
                        id: sid,
                        name: sale.profiles?.full_name || "Desconhecido",
                        email: sale.profiles?.email,
                        brand: sale.profiles?.brands?.name || "-",
                        count: 0,
                        last_sale: sale.created_at
                    };
                }
                counts[sid].count += 1;
                if (new Date(sale.created_at) > new Date(counts[sid].last_sale)) {
                    counts[sid].last_sale = sale.created_at;
                }
            });

            const sorted = Object.values(counts).sort((a: any, b: any) => b.count - a.count);
            setRanking(sorted);

        } catch (error) {
            console.error("Error fetching ranking:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardShell userRole="representative">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight text-glow">Ranking de Performance</h1>
                        <p className="text-gray-500 mt-1">Veja sua posição em relação aos outros representantes.</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                    <div className="w-full md:w-auto flex-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Filtrar por Marca</label>
                        <select
                            value={filters.brandId}
                            onChange={(e) => setFilters({ ...filters, brandId: e.target.value })}
                            className="w-full bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:ring-[#C00000] focus:border-[#C00000]"
                        >
                            <option value="all">Todas as Marcas</option>
                            {brands.map(brand => (
                                <option key={brand.id} value={brand.id}>{brand.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-full md:w-auto flex-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Período</label>
                        <select
                            value={filters.period}
                            onChange={(e) => setFilters({ ...filters, period: e.target.value })}
                            className="w-full bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:ring-[#C00000] focus:border-[#C00000]"
                        >
                            <option value="current_month">Mês Atual</option>
                            <option value="last_30_days">Últimos 30 Dias</option>
                            <option value="all_time">Todo o Período</option>
                        </select>
                    </div>
                </div>

                {/* Ranking List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#C00000]"></div>
                            <p className="mt-4 text-gray-400 text-sm font-medium">Calculando posições...</p>
                        </div>
                    ) : ranking.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <p>Nenhuma venda encontrada para os filtros selecionados.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {ranking.map((item, index) => {
                                const isCurrentUser = item.id === currentUserId;
                                return (
                                    <div key={item.id} className={`p-6 flex items-center gap-6 transition-colors group relative ${isCurrentUser ? 'bg-red-50/50' : 'hover:bg-gray-50'}`}>
                                        {/* Position Badge */}
                                        <div className={`
                                            flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl font-black
                                            ${index === 0 ? 'bg-yellow-100 text-yellow-600 ring-4 ring-yellow-50' :
                                                index === 1 ? 'bg-gray-100 text-gray-600 ring-4 ring-gray-50' :
                                                    index === 2 ? 'bg-orange-100 text-orange-600 ring-4 ring-orange-50' :
                                                        'bg-white text-gray-400 border border-gray-100'}
                                        `}>
                                            {index + 1}º
                                        </div>

                                        {/* User Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className={`text-lg font-bold truncate ${isCurrentUser ? 'text-[#C00000]' : 'text-gray-900'}`}>
                                                    {item.name} {isCurrentUser && "(Você)"}
                                                </h3>
                                                {index < 3 && (
                                                    <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                                                        Top Performer
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 truncate flex items-center gap-2">
                                                <span>{item.brand}</span>
                                                {/* Representantes normalmente nao precisam ver o email do outro */}
                                            </p>
                                        </div>

                                        {/* Stats */}
                                        <div className="text-right pl-4 border-l border-gray-100">
                                            <div className="text-3xl font-black text-gray-900 leading-none">{item.count}</div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Vendas Aprov.</p>
                                        </div>

                                        {/* Trophy for #1 */}
                                        {index === 0 && (
                                            <div className="absolute right-0 top-0 p-4 opacity-5 pointer-events-none">
                                                <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 001-.89l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" /></svg>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </DashboardShell>
    );
}
