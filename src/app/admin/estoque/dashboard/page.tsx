"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DashboardShell from "@/components/DashboardShell";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, ReferenceLine, Label
} from "recharts";
import {
    Package, AlertCircle, DollarSign, TrendingUp,
    Filter, Calendar, Store, Tag
} from "lucide-react";

const COLORS = ["#0066FF", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

export default function AdminInventoryDashboard() {
    const [loading, setLoading] = useState(true);
    const [kpis, setKpis] = useState({
        totalSkus: 0,
        lowStock: 0,
        totalValue: 0,
        avgMarkup: 0,
        markupProductCount: 0
    });
    const [distributionData, setDistributionData] = useState<any[]>([]);
    const [categoryData, setCategoryData] = useState<any[]>([]);
    const [productCategoryData, setProductCategoryData] = useState<any[]>([]);
    const [movementData, setMovementData] = useState<any[]>([]);

    // Filters
    const [optics, setOptics] = useState<any[]>([]);
    const [brands, setBrands] = useState<any[]>([]);
    const [selectedOptic, setSelectedOptic] = useState("all");
    const [selectedBrand, setSelectedBrand] = useState("all");
    const [selectedSegment, setSelectedSegment] = useState("all");
    const [selectedCategory, setSelectedCategory] = useState("all");

    // Date range filter — default: last 30 days
    const defaultFrom = new Date();
    defaultFrom.setDate(defaultFrom.getDate() - 30);
    const [dateFrom, setDateFrom] = useState(defaultFrom.toISOString().split('T')[0]);
    const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        fetchInitialData();
        fetchDashboardData();
    }, [selectedOptic, selectedBrand, selectedSegment, selectedCategory, dateFrom, dateTo]);

    const fetchInitialData = async () => {
        const [opticsRes, brandsRes] = await Promise.all([
            supabase.from("optics").select("id, trade_name").eq("active", true),
            supabase.from("brands").select("id, name")
        ]);
        if (opticsRes.data) setOptics(opticsRes.data);
        if (brandsRes.data) setBrands(brandsRes.data);
    };

    const fetchDashboardData = async () => {
        setLoading(true);

        let inventoryQuery = supabase.from("inventory_configs").select(`
            *,
            products (*, brands (*))
        `);

        if (selectedOptic !== "all") inventoryQuery = inventoryQuery.eq("optic_id", selectedOptic);
        if (selectedBrand !== "all") inventoryQuery = inventoryQuery.filter("products.brand_id", "eq", selectedBrand);
        if (selectedSegment !== "all") inventoryQuery = inventoryQuery.filter("products.brands.category", "eq", selectedSegment);
        if (selectedCategory !== "all") inventoryQuery = inventoryQuery.filter("products.category", "eq", selectedCategory);

        const { data: inventory } = await inventoryQuery;

        if (inventory) {
            // KPIs
            const totalSkus = inventory.length;
            const lowStock = inventory.filter(i => i.current_stock < i.min_stock).length;
            const totalValue = inventory.reduce((acc, i) => acc + (i.current_stock * (i.products?.unit_cost || 0)), 0);

            const productsWithMarkup = inventory.filter(i => i.products?.unit_cost > 0);
            const totalMarkup = productsWithMarkup.reduce((acc, i) => {
                const markup = ((i.products.suggested_price - i.products.unit_cost) / i.products.unit_cost) * 100;
                return acc + markup;
            }, 0);
            const avgMarkup = productsWithMarkup.length > 0 ? totalMarkup / productsWithMarkup.length : 0;

            setKpis({ totalSkus, lowStock, totalValue, avgMarkup, markupProductCount: productsWithMarkup.length });

            // Distribution by Brand
            const brandMap: Record<string, number> = {};
            inventory.forEach(i => {
                const bName = i.products?.brands?.name || "Desconhecido";
                brandMap[bName] = (brandMap[bName] || 0) + i.current_stock;
            });
            setDistributionData(Object.entries(brandMap).map(([name, value]) => ({ name, value })));

            // Distribution by Segment (Luxo, Premium, etc)
            const segMap: Record<string, number> = {};
            inventory.forEach(i => {
                const seg = i.products?.brands?.category || "Outros";
                segMap[seg] = (segMap[seg] || 0) + i.current_stock;
            });
            setCategoryData(Object.entries(segMap).map(([name, value]) => ({ name, value })));

            // Distribution by Product Category (Lente, Armação, etc)
            const prodCatMap: Record<string, number> = {};
            inventory.forEach(i => {
                const cat = i.products?.category || "Outros";
                prodCatMap[cat] = (prodCatMap[cat] || 0) + i.current_stock;
            });
            // We can reuse or create a new state. For now let's add it to a new state if we want two charts, 
            // but let's just make the existing Pie chart switchable or add another one.
            // Actually, let's keep categoryData as the Segment and add productCategoryData.
            setProductCategoryData(Object.entries(prodCatMap).map(([name, value]) => ({ name, value })));
        }

        // Movement Data (filtered by date range)
        let movementQuery = supabase.from("inventory_movements").select("*");
        if (selectedOptic !== "all") movementQuery = movementQuery.eq("optic_id", selectedOptic);

        // Filter by custom date range
        movementQuery = movementQuery
            .gte("movement_date", `${dateFrom}T00:00:00`)
            .lte("movement_date", `${dateTo}T23:59:59`);

        const { data: movements } = await movementQuery;
        if (movements) {
            // Helper: extract YYYY-MM-DD in LOCAL timezone (avoids UTC shift)
            const toLocalDateStr = (d: Date) => {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${day}`;
            };

            // Build all days in the range
            const start = new Date(dateFrom + 'T12:00:00');
            const end = new Date(dateTo + 'T12:00:00');
            const periodDays: string[] = [];
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                periodDays.push(toLocalDateStr(d));
            }

            const moveMap: Record<string, { entrada: number, saida: number }> = {};
            periodDays.forEach(day => moveMap[day] = { entrada: 0, saida: 0 });

            movements.forEach(m => {
                const day = toLocalDateStr(new Date(m.movement_date));
                if (moveMap[day]) {
                    if (m.type === "entrada") moveMap[day].entrada += m.quantity;
                    if (m.type === "saida") moveMap[day].saida += m.quantity;
                }
            });

            setMovementData(Object.entries(moveMap).map(([date, vals]) => ({
                date: new Date(date + 'T12:00:00').toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' }),
                ...vals
            })));
        }

        setLoading(false);
    };

    return (
        <DashboardShell userRole="admin">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Dashboard de Estoque</h1>
                        <p className="text-gray-500 mt-1">Visão analítica de produtos, movimentações e saúde financeira.</p>
                    </div>

                    {/* Quick Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-sm">
                            <Store className="w-4 h-4 text-blue-600" />
                            <select
                                className="text-sm font-bold bg-transparent outline-none"
                                value={selectedOptic}
                                onChange={e => setSelectedOptic(e.target.value)}
                            >
                                <option value="all">Todas as Óticas</option>
                                {optics.map(o => <option key={o.id} value={o.id}>{o.trade_name}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-sm">
                            <Tag className="w-4 h-4 text-blue-600" />
                            <select
                                className="text-sm font-bold bg-transparent outline-none"
                                value={selectedBrand}
                                onChange={e => setSelectedBrand(e.target.value)}
                            >
                                <option value="all">Todas Marcas</option>
                                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-sm">
                            <Filter className="w-4 h-4 text-blue-600" />
                            <select
                                className="text-sm font-bold bg-transparent outline-none"
                                value={selectedSegment}
                                onChange={e => setSelectedSegment(e.target.value)}
                            >
                                <option value="all">Segmento</option>
                                <option value="luxo">Luxo</option>
                                <option value="premium">Premium</option>
                                <option value="frontline">Frontline</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-sm">
                            <Tag className="w-4 h-4 text-blue-600" />
                            <select
                                className="text-sm font-bold bg-transparent outline-none capitalize"
                                value={selectedCategory}
                                onChange={e => setSelectedCategory(e.target.value)}
                            >
                                <option value="all">Tipo de Peça</option>
                                <option value="armação">Armação</option>
                                <option value="lente">Lente</option>
                                <option value="receituário">Receituário</option>
                                <option value="óculos solar">Óculos Solar</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-sm">
                            <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">De</span>
                            <input
                                type="date"
                                className="text-sm font-bold bg-transparent outline-none w-[130px]"
                                value={dateFrom}
                                max={dateTo}
                                onChange={e => setDateFrom(e.target.value)}
                            />
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">Até</span>
                            <input
                                type="date"
                                className="text-sm font-bold bg-transparent outline-none w-[130px]"
                                value={dateTo}
                                min={dateFrom}
                                onChange={e => setDateTo(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard title="Total de SKUs" value={kpis.totalSkus} icon={<Package />} color="blue" />
                    <KpiCard title="Estoque Baixo" value={kpis.lowStock} icon={<AlertCircle />} color="red" suffix=" itens" />
                    <KpiCard title="Valor em Estoque" value={`R$ ${kpis.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`} icon={<DollarSign />} color="emerald" />
                    <KpiCard title="Markup Médio" value={`${kpis.avgMarkup.toFixed(1)}%`} icon={<TrendingUp />} color="purple" subtitle={`Média de ${kpis.markupProductCount} produtos`} />
                </div>

                {/* Charts Area 1: Movements and Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Segment List */}
                    <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 font-black tracking-tight flex items-center gap-2">
                            Estoque por Segmento
                        </h3>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-5 h-[300px]">
                            {categoryData.length > 0 ? categoryData.map((item, index) => {
                                const totalPecas = categoryData.reduce((acc, curr) => acc + curr.value, 0);
                                const percentage = totalPecas > 0 ? (item.value / totalPecas) * 100 : 0;
                                return (
                                    <div key={index} className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-semibold text-gray-600 capitalize truncate pr-2">{item.name}</span>
                                            <span className="font-bold text-gray-900">{item.value} <span className="text-gray-400 font-normal text-xs ml-1">({percentage.toFixed(1)}%)</span></span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                            <div 
                                                className="h-full rounded-full transition-all duration-500" 
                                                style={{ width: `${percentage}%`, backgroundColor: COLORS[index % COLORS.length] }}
                                            />
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="h-full flex items-center justify-center text-sm text-gray-400 font-medium">Nenhum dado</div>
                            )}
                        </div>
                    </div>
                    <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 font-black tracking-tight flex items-center gap-2">
                            Movimentação ({new Date(dateFrom + 'T12:00:00').toLocaleDateString('pt-BR')} — {new Date(dateTo + 'T12:00:00').toLocaleDateString('pt-BR')})
                        </h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={movementData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend />
                                    {movementData.length > 0 && (
                                        <ReferenceLine
                                            y={Math.round(movementData.reduce((sum, d) => sum + d.entrada + d.saida, 0) / movementData.length)}
                                            stroke="#94a3b8"
                                            strokeDasharray="3 3"
                                            label={{ value: 'Média', position: 'insideTopRight', fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                                        />
                                    )}
                                    <Bar dataKey="entrada" fill="#10B981" radius={[4, 4, 0, 0]} name="Entradas" />
                                    <Bar dataKey="saida" fill="#EF4444" radius={[4, 4, 0, 0]} name="Saídas" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>



                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Product Category Dist */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 font-black tracking-tight flex items-center gap-2">
                            Estoque por Categoria
                        </h3>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-5 h-[300px]">
                            {productCategoryData.length > 0 ? productCategoryData.map((item, index) => {
                                const totalPecas = productCategoryData.reduce((acc, curr) => acc + curr.value, 0);
                                const percentage = totalPecas > 0 ? (item.value / totalPecas) * 100 : 0;
                                return (
                                    <div key={index} className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-semibold text-gray-600 capitalize truncate pr-2">{item.name}</span>
                                            <span className="font-bold text-gray-900">{item.value} <span className="text-gray-400 font-normal text-xs ml-1">({percentage.toFixed(1)}%)</span></span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                            <div 
                                                className="h-full rounded-full transition-all duration-500" 
                                                style={{ width: `${percentage}%`, backgroundColor: COLORS[(index + 2) % COLORS.length] }}
                                            />
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="h-full flex items-center justify-center text-sm text-gray-400 font-medium">Nenhum dado</div>
                            )}
                        </div>
                    </div>

                    {/* Brand Dist */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 font-black tracking-tight flex items-center gap-2">
                            Estoque por Marca
                        </h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={distributionData} margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} stroke="#F1F5F9" />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600 }} width={80} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="value" fill="#0066FF" radius={[0, 4, 4, 0]} name="Peças" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Alertas Rápidos */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 font-black tracking-tight flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                            Estoque Baixo
                        </h3>
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {kpis.lowStock === 0 ? (
                                <div className="text-center py-12 text-gray-400 font-medium italic">Todos os níveis saudáveis!</div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                                        <tr>
                                            <th className="pb-2">SKU</th>
                                            <th className="pb-2">Loja</th>
                                            <th className="pb-2 text-center">Saldo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        <tr className="text-xs">
                                            <td className="py-3 font-bold">Verificar Lista</td>
                                            <td className="py-3 text-gray-500" colSpan={2}>Acesse o painel detalhado</td>
                                        </tr>
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardShell>
    );
}

function KpiCard({ title, value, icon, color, suffix = "", subtitle }: any) {
    const colorClasses: any = {
        blue: "bg-blue-50 text-blue-600",
        red: "bg-red-50 text-red-600",
        emerald: "bg-emerald-50 text-emerald-600",
        purple: "bg-purple-50 text-purple-600"
    };

    return (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorClasses[color]}`}>
                {icon}
            </div>
            <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">{title}</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-gray-900">{value}</span>
                    {suffix && <span className="text-xs font-bold text-gray-400">{suffix}</span>}
                </div>
                {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
            </div>
        </div>
    );
}
