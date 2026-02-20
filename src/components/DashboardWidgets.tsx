"use client";

import { useMemo } from "react";

interface Sale {
    id: string;
    created_at: string;
    status: string;
    brand_id: string;
    reviewed_at?: string;
    brands?: { name: string };
    profiles?: { full_name: string };
}

interface DashboardWidgetsProps {
    sales: Sale[];
    sellers: any[];
}

export default function DashboardWidgets({ sales, sellers }: DashboardWidgetsProps) {

    // 1. Trend Chart Data (Last 30 Days)
    const trendData = useMemo(() => {
        const days = 30;
        const data = new Array(days).fill(0).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (days - 1 - i));
            return { date: d.toISOString().split('T')[0], count: 0, label: d.getDate() };
        });

        const salesMap = new Map();
        sales.forEach(s => {
            const date = s.created_at.split('T')[0];
            salesMap.set(date, (salesMap.get(date) || 0) + 1);
        });

        return data.map(d => ({ ...d, count: salesMap.get(d.date) || 0 }));
    }, [sales]);

    const maxCount = Math.max(...trendData.map(d => d.count), 1);

    // 2. Quality KPIs
    const kpis = useMemo(() => {
        const totalReviewed = sales.filter(s => s.status !== 'pending').length;
        const approved = sales.filter(s => s.status === 'approved').length;
        const approvalRate = totalReviewed > 0 ? Math.round((approved / totalReviewed) * 100) : 0;

        // Approx Analysis Time (Mocked logic if reviewed_at is missing, else calc diff)
        // Simplification: just showing approved rate for now to ensure robustness
        return { approvalRate };
    }, [sales]);

    // 3. Brand Mix
    const brandMix = useMemo(() => {
        const counts: Record<string, number> = {};
        let total = 0;
        sales.forEach(s => {
            if (s.brands?.name) {
                counts[s.brands.name] = (counts[s.brands.name] || 0) + 1;
                total++;
            }
        });
        return Object.entries(counts)
            .map(([name, count]) => ({ name, count, percent: Math.round((count / total) * 100) }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 4); // Top 4 brands
    }, [sales]);

    // 4. Activity Feed (Combined Sales + New Sellers - Mocked unification for now from sales)
    const activityFeed = useMemo(() => {
        return sales.slice(0, 5).map(s => ({
            id: s.id,
            type: 'sale',
            user: s.profiles?.full_name || 'Desconhecido',
            time: new Date(s.created_at).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            status: s.status
        }));
    }, [sales]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 1. Trend Chart Area */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
                    <div className="mb-6 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Tendência de Vendas</h3>
                            <p className="text-sm text-gray-500">Volume diário (30 dias)</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                            <span className="text-xs font-medium text-gray-600">Tempo Real</span>
                        </div>
                    </div>

                    {/* CSS Bar Chart (Simple & Robust) */}
                    <div className="flex items-end justify-between h-40 gap-1">
                        {trendData.map((d, i) => (
                            <div key={i} className="flex flex-col items-center gap-1 flex-1 group">
                                <div
                                    className="w-full bg-[#C00000]/10 rounded-t-sm transition-all duration-500 hover:bg-[#C00000] relative group-hover:shadow-lg"
                                    style={{ height: `${(d.count / maxCount) * 100}%` }}
                                >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                        {d.count} vendas em {d.date.split('-')[2]}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Side Stats (KPIs & Brand Mix) */}
                <div className="space-y-6">

                    {/* Approval KPI */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-between relative overflow-hidden">
                        <div className="absolute right-0 top-0 h-full w-1 bg-[#C00000]"></div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Qualidade</p>
                            <h3 className="text-3xl font-bold text-gray-900">{kpis.approvalRate}%</h3>
                            <p className="text-xs text-green-600 font-medium">Taxa de Aprovação</p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                    </div>

                    {/* Brand Mix */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">Mix de Marcas</h3>
                        <div className="space-y-4">
                            {brandMix.map((brand, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-medium text-gray-700">{brand.name}</span>
                                        <span className="text-gray-500">{brand.percent}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[#C00000]"
                                            style={{ width: `${brand.percent}%`, opacity: 1 - (i * 0.2) }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Live Feed Footer */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide border-b border-gray-100 pb-2">
                        📡 Atividade Recente
                    </h3>
                    <div className="flex flex-col md:flex-row gap-4 overflow-x-auto pb-2">
                        {activityFeed.map((activity, i) => (
                            <div key={activity.id} className="min-w-[200px] flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-xs text-gray-600">
                                    {activity.user.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-900 truncate max-w-[120px]">{activity.user}</p>
                                    <p className="text-[10px] text-gray-500">Enviou nota às {activity.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
}
