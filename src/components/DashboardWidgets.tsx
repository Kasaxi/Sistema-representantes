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
    startDate?: string;
    endDate?: string;
}

export default function DashboardWidgets({ sales, sellers, startDate, endDate }: DashboardWidgetsProps) {

    // 1. Trend Chart Data (Dynamic Range)
    const trendData = useMemo(() => {
        // Helper to get YYYY-MM-DD in UTC
        const toUTCString = (date: Date) => date.toISOString().split('T')[0];

        // Parse bounds correctly
        const start = startDate ? new Date(startDate + 'T00:00:00') : new Date(new Date().setDate(new Date().getDate() - 30));
        const end = endDate ? new Date(endDate + 'T23:59:59') : new Date();

        if (start > end) return [];

        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const daysToDisplay = Math.min(Math.max(diffDays, 1), 60);

        const data = new Array(daysToDisplay).fill(0).map((_, i) => {
            // Create each day offset from the start date (ignoring local setDate logic for safety)
            const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
            const dateStr = toUTCString(d);
            return {
                date: dateStr,
                count: 0,
                label: d.getDate(),
                fullDate: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            };
        });

        const salesMap = new Map();
        const debugSample: string[] = [];

        sales.forEach(s => {
            if (!s.created_at) return;
            try {
                const sDate = toUTCString(new Date(s.created_at));
                salesMap.set(sDate, (salesMap.get(sDate) || 0) + 1);
                if (debugSample.length < 5) debugSample.push(`${s.created_at} -> ${sDate}`);
            } catch (e) {
                console.error("Date Error:", s.created_at, e);
            }
        });

        const result = data.map(d => ({ ...d, count: salesMap.get(d.date) || 0 }));
        const nonZero = result.filter(r => r.count > 0);

        console.log("DashboardWidgets Diagnostics:", {
            totalSales: sales.length,
            mappedSales: Array.from(salesMap.entries()),
            dataPointsCount: result.length,
            nonZeroPoints: nonZero.length,
            sampleMapping: debugSample,
            maxCount: Math.max(...result.map(r => r.count), 0)
        });

        return result;
    }, [sales, startDate, endDate]);

    const maxCount = Math.max(...trendData.map(d => d.count), 1);

    // 2. Quality KPIs
    const kpis = useMemo(() => {
        const totalReviewed = sales.filter(s => s.status !== 'pending').length;
        const approved = sales.filter(s => s.status === 'approved').length;
        const approvalRate = totalReviewed > 0 ? Math.round((approved / totalReviewed) * 100) : 0;
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

    // 4. Activity Feed
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

                {/* Left Column: Chart & Stats */}
                <div className="lg:col-span-2 space-y-6">

                    {/* 1. Trend Chart Area */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <div className="mb-6 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Tendência de Vendas</h3>
                                <p className="text-sm text-gray-500">
                                    {trendData.length > 0
                                        ? `Volume diário (${trendData.length} dias)`
                                        : 'Período inválido'}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                                <span className="text-xs font-medium text-gray-600">Tempo Real</span>
                            </div>
                        </div>

                        {/* SVG Line Chart */}
                        <div className="px-4">
                            <div className="h-48 relative border-b border-gray-100 group/chart mb-8">
                                {(() => {
                                    const getCurvePath = (data: any[], max: number) => {
                                        if (data.length < 2) return "";
                                        const length = Math.max(1, data.length - 1);
                                        const points = data.map((d, i) => ({
                                            x: (i / length) * 100,
                                            y: 100 - (d.count / max) * 85
                                        }));

                                        let path = `M ${points[0].x} ${points[0].y}`;
                                        const tension = 0.2; // Adjusted tension for smoothness without extreme dips

                                        for (let i = 0; i < points.length - 1; i++) {
                                            const p1 = points[i];
                                            const p2 = points[i + 1];

                                            // If both are zero, draw a straight line
                                            if (p1.y === 100 && p2.y === 100) {
                                                path += ` L ${p2.x} ${p2.y}`;
                                                continue;
                                            }

                                            const dx = (p2.x - p1.x) * tension;
                                            path += ` C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;
                                        }
                                        return path;
                                    };

                                    const pathD = getCurvePath(trendData, maxCount);
                                    const areaD = trendData.length > 0 ? `${pathD} L 100 100 L 0 100 Z` : "";

                                    return trendData.length === 0 || sales.length === 0 ? (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <p className="text-gray-400 text-sm font-medium italic">Nenhum dado encontrado para os filtros selecionados.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <svg
                                                className="block w-full h-full overflow-visible"
                                                viewBox="0 0 100 100"
                                                preserveAspectRatio="none"
                                            >
                                                <defs>
                                                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#0066FF" stopOpacity="0.2" />
                                                        <stop offset="100%" stopColor="#0066FF" stopOpacity="0" />
                                                    </linearGradient>
                                                </defs>

                                                <path
                                                    d={areaD}
                                                    fill="url(#chartGradient)"
                                                    className="transition-all duration-700 ease-in-out"
                                                />

                                                <path
                                                    d={pathD}
                                                    fill="none"
                                                    stroke="#0066FF"
                                                    strokeWidth="2.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    vectorEffect="non-scaling-stroke"
                                                    className="transition-all duration-700 ease-in-out"
                                                />
                                            </svg>

                                            {/* Interaction Overlay - Clean Alignment */}
                                            <div className="absolute inset-0 group/overlay pointer-events-none">
                                                {trendData.map((d, i) => {
                                                    const length = Math.max(1, trendData.length - 1);
                                                    const xPct = (i / length) * 100;
                                                    const yPct = 100 - (d.count / maxCount) * 85;

                                                    return (
                                                        <div
                                                            key={i}
                                                            className="absolute top-0 bottom-0 group/point pointer-events-auto"
                                                            style={{
                                                                left: `${xPct}%`,
                                                                width: `${100 / length}%`,
                                                                transform: 'translateX(-50%)'
                                                            }}
                                                        >
                                                            {/* Vertical Guide Line */}
                                                            <div className="absolute inset-x-0 top-0 bottom-0 flex justify-center">
                                                                <div className="w-[1.5px] h-full bg-[#0066FF]/10 opacity-0 group-hover/point:opacity-100 transition-opacity" />
                                                            </div>

                                                            {/* Real CSS Dot - Mathematically Aligned */}
                                                            {d.count > 0 && (
                                                                <div
                                                                    className="absolute left-1/2 w-3 h-3 rounded-full bg-white border-2 border-[#0066FF] shadow-sm z-10 opacity-0 group-hover/overlay:opacity-30 group-hover/point:opacity-100 group-hover/point:scale-110 transition-all duration-200"
                                                                    style={{
                                                                        top: `${yPct}%`,
                                                                        transform: 'translate(-50%, -50%)'
                                                                    }}
                                                                />
                                                            )}

                                                            <div className="absolute opacity-0 group-hover/point:opacity-100 transition-all duration-200 bg-gray-900/95 backdrop-blur-sm text-white text-[10px] px-3 py-2 rounded-xl whitespace-nowrap z-50 pointer-events-none shadow-2xl flex flex-col gap-0.5"
                                                                style={{
                                                                    top: `calc(${yPct}% - 44px)`,
                                                                    left: '50%',
                                                                    transform: 'translateX(-50%)',
                                                                }}>
                                                                <span className="font-bold text-xs leading-none">{d.count} {d.count === 1 ? 'venda' : 'vendas'}</span>
                                                                <span className="text-gray-400 font-medium">{d.fullDate}</span>
                                                            </div>

                                                            {/* X-Axis Label */}
                                                            {(trendData.length <= 15 || i % 5 === 0 || i === trendData.length - 1) && (
                                                                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 font-bold group-hover/point:text-[#0066FF] transition-colors">
                                                                    {d.label}
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* 2. KPIs row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Approval KPI */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-between relative overflow-hidden">
                                <div className="absolute right-0 top-0 h-full w-1 bg-[#0066FF]"></div>
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
                                                    className="h-full bg-[#0066FF]"
                                                    style={{ width: `${brand.percent}%`, opacity: 1 - (i * 0.2) }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Right Column: Sidebar Activity */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-full min-h-[500px]">
                        <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide border-b border-gray-100 pb-2">
                            📡 Atividade Recente
                        </h3>
                        <div className="space-y-4">
                            {activityFeed.map((activity, i) => (
                                <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-600">
                                        {activity.user.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 truncate max-w-[150px]">{activity.user}</p>
                                        <p className="text-[10px] text-gray-500">Enviou nota às {activity.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
