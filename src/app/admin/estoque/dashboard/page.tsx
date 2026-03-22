"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DashboardShell from "@/components/DashboardShell";
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    PieChart, Pie, Cell, LineChart, Line 
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
        avgMarkup: 0
    });
    const [distributionData, setDistributionData] = useState<any[]>([]);
    const [categoryData, setCategoryData] = useState<any[]>([]);
    const [movementData, setMovementData] = useState<any[]>([]);
    
    // Filters
    const [optics, setOptics] = useState<any[]>([]);
    const [brands, setBrands] = useState<any[]>([]);
    const [selectedOptic, setSelectedOptic] = useState("all");
    const [selectedBrand, setSelectedBrand] = useState("all");
    const [selectedCategory, setSelectedCategory] = useState("all");

    useEffect(() => {
        fetchInitialData();
        fetchDashboardData();
    }, [selectedOptic, selectedBrand, selectedCategory]);

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
        if (selectedCategory !== "all") inventoryQuery = inventoryQuery.filter("products.brands.category", "eq", selectedCategory);

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

            setKpis({ totalSkus, lowStock, totalValue, avgMarkup });

            // Distribution by Brand
            const brandMap: Record<string, number> = {};
            inventory.forEach(i => {
                const bName = i.products?.brands?.name || "Desconhecido";
                brandMap[bName] = (brandMap[bName] || 0) + i.current_stock;
            });
            setDistributionData(Object.entries(brandMap).map(([name, value]) => ({ name, value })));

            // Distribution by Category
            const catMap: Record<string, number> = {};
            inventory.forEach(i => {
                const cat = i.products?.brands?.category || "Outros";
                catMap[cat] = (catMap[cat] || 0) + i.current_stock;
            });
            setCategoryData(Object.entries(catMap).map(([name, value]) => ({ name, value })));
        }

        // Movement Data (Last 30 days)
        let movementQuery = supabase.from("inventory_movements").select("*");
        if (selectedOptic !== "all") movementQuery = movementQuery.eq("optic_id", selectedOptic);
        
        const { data: movements } = await movementQuery;
        if (movements) {
            const last30Days = [...Array(30)].map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (29 - i));
                return d.toISOString().split("T")[0];
            });

            const moveMap: Record<string, { entrada: number, saida: number }> = {};
            last30Days.forEach(day => moveMap[day] = { entrada: 0, saida: 0 });

            movements.forEach(m => {
                const day = new Date(m.movement_date).toISOString().split("T")[0];
                if (moveMap[day]) {
                    if (m.type === "entrada") moveMap[day].entrada += m.quantity;
                    if (m.type === "saida") moveMap[day].saida += m.quantity;
                }
            });

            setMovementData(Object.entries(moveMap).map(([date, vals]) => ({
                date: new Date(date).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' }),
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
                                value={selectedCategory}
                                onChange={e => setSelectedCategory(e.target.value)}
                            >
                                <option value="all">Categorias</option>
                                <option value="luxo">Luxo</option>
                                <option value="premium">Premium</option>
                                <option value="frontline">Frontline</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard title="Total de SKUs" value={kpis.totalSkus} icon={<Package />} color="blue" />
                    <KpiCard title="Estoque Baixo" value={kpis.lowStock} icon={<AlertCircle />} color="red" suffix=" itens" />
                    <KpiCard title="Valor em Estoque" value={`R$ ${kpis.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`} icon={<DollarSign />} color="emerald" />
                    <KpiCard title="Markup Médio" value={`${kpis.avgMarkup.toFixed(1)}%`} icon={<TrendingUp />} color="purple" />
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Movement Chart */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                             Movimentação (30 dias)
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
                                    <Bar dataKey="entrada" fill="#10B981" radius={[4, 4, 0, 0]} name="Entradas" />
                                    <Bar dataKey="saida" fill="#EF4444" radius={[4, 4, 0, 0]} name="Saídas" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Category Dist */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">Distribuição por Categoria</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Brand Dist */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">Estoque por Marca</h3>
                        <div className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={distributionData} margin={{ left: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} stroke="#F1F5F9" />
                                    <XAxis type="number" axisLine={false} tickLine={false} />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#0066FF" radius={[0, 4, 4, 0]} name="Peças" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Alertas Rápidos */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                            Produtos com Estoque Baixo
                        </h3>
                        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                            {kpis.lowStock === 0 ? (
                                <div className="text-center py-12 text-gray-400 font-medium">Todos os níveis estão saudáveis!</div>
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
                                        {/* Fetch real data here if needed, showing placeholder logic for now */}
                                        <tr className="text-sm">
                                            <td className="py-3 font-bold">Exemplo RB3447</td>
                                            <td className="py-3 text-gray-500">Ótica Matriz</td>
                                            <td className="py-3 text-center font-black text-red-600">2</td>
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

function KpiCard({ title, value, icon, color, suffix = "" }: any) {
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
            </div>
        </div>
    );
}
