"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import DashboardShell from "@/components/DashboardShell";
import { DollarSign, TrendingUp, ShoppingCart, Package, CheckCircle, Clock, BarChart3, Filter } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function FinanceiroPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [opticId, setOpticId] = useState<string | null>(null)
    const [opticName, setOpticName] = useState<string>("")
    const [sales, setSales] = useState<any[]>([])
    const [pendingSales, setPendingSales] = useState<any[]>([])
    
    // Filtros de data
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(1); // Primeiro dia do mês
        return d.toISOString().split('T')[0];
    })
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

    useEffect(() => {
        initializeData()
    }, [])

    useEffect(() => {
        if (opticId) {
            fetchFinancialData()
        }
    }, [opticId, startDate, endDate])

    const initializeData = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push('/login')
            return
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("cnpj")
            .eq("id", user.id)
            .single()

        if (!profile?.cnpj) {
            setLoading(false)
            return
        }

        const { data: optic } = await supabase
            .from("optics")
            .select("id, trade_name")
            .eq("cnpj", profile.cnpj)
            .single()

        if (optic) {
            setOpticId(optic.id)
            setOpticName(optic.trade_name)
        }
        
        setLoading(false)
    }

    const fetchFinancialData = async () => {
        if (!opticId) return

        // Buscar vendas do PDV no período
        const { data: salesData } = await supabase
            .from('shop_sales')
            .select('*, shop_sale_items(*, products(name, category, brands(name)))')
            .eq('optic_id', opticId)
            .eq('status', 'completed')
            .gte('created_at', `${startDate}T00:00:00.000Z`)
            .lte('created_at', `${endDate}T23:59:59.999Z`)
            .order('created_at', { ascending: false })

        // Buscar vendas pendentes
        const { data: pendingData } = await supabase
            .from('pdv_sales_pending')
            .select('*, products(name, category, brands(name))')
            .eq('optic_id', opticId)
            .eq('status', 'pending')

        setSales(salesData || [])
        setPendingSales(pendingData || [])
    }

    // Calcular estatísticas
    const stats = useMemo(() => {
        const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total_amount), 0)
        const salesCount = sales.length
        const ticketMedium = salesCount > 0 ? totalRevenue / salesCount : 0
        const validatedCount = sales.filter(s => !s.needs_validation).length
        const pendingCount = pendingSales.length
        const pendingValue = pendingSales.reduce((sum, p) => sum + Number(p.unit_price * p.quantity), 0)

        // Produto mais vendido
        const productCount: Record<string, { name: string; quantity: number }> = {}
        sales.forEach(sale => {
            sale.shop_sale_items?.forEach((item: any) => {
                const name = item.products?.name || 'Sem produto'
                productCount[name] = (productCount[name] || { name, quantity: 0 }).quantity + item.quantity
            })
        })
        const topProduct = Object.values(productCount).sort((a, b) => b.quantity - a.quantity)[0]

        return {
            totalRevenue,
            salesCount,
            ticketMedium,
            validatedCount,
            pendingCount,
            pendingValue,
            topProduct: topProduct?.name || '-'
        }
    }, [sales, pendingSales])

    // Dados para gráfico de barras (por categoria)
    const categoryData = useMemo(() => {
        const categories: Record<string, number> = {}
        sales.forEach(sale => {
            sale.shop_sale_items?.forEach((item: any) => {
                const cat = item.products?.category || 'Sem categoria'
                categories[cat] = (categories[cat] || 0) + item.quantity
            })
        })
        return Object.entries(categories).map(([name, value]) => ({ name, value }))
    }, [sales])

    // Dados para gráfico de linhas (evolução por dia)
    const lineData = useMemo(() => {
        const daily: Record<string, number> = {}
        sales.forEach(sale => {
            const date = new Date(sale.created_at).toISOString().split('T')[0]
            daily[date] = (daily[date] || 0) + Number(sale.total_amount)
        })
        return Object.entries(daily)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, value]) => ({ date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), value }))
    }, [sales])

    // Dados para gráfico de pizza (por marca)
    const brandData = useMemo(() => {
        const brands: Record<string, number> = {}
        sales.forEach(sale => {
            sale.shop_sale_items?.forEach((item: any) => {
                const brand = item.products?.brands?.name || 'Sem marca'
                brands[brand] = (brands[brand] || 0) + item.quantity
            })
        })
        return Object.entries(brands).map(([name, value]) => ({ name, value }))
    }, [sales])

    if (loading) return (
        <DashboardShell userRole="shopkeeper">
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066FF]"></div>
            </div>
        </DashboardShell>
    )

    return (
        <DashboardShell userRole="shopkeeper">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900">Financeiro</h1>
                        <p className="text-gray-500">Resumo financeiro das vendas do PDV</p>
                    </div>
                    
                    {/* Filtros de Data */}
                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                        <Filter className="w-5 h-5 text-gray-400" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                        <span className="text-gray-400">até</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                    </div>
                </div>

                {/* Cards de KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-green-600" />
                            </div>
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Faturamento</p>
                        <p className="text-xl font-black text-gray-900 mt-1">
                            R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                                <ShoppingCart className="w-5 h-5 text-blue-600" />
                            </div>
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Vendas</p>
                        <p className="text-xl font-black text-gray-900 mt-1">{stats.salesCount}</p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                                <BarChart3 className="w-5 h-5 text-purple-600" />
                            </div>
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Ticket Médio</p>
                        <p className="text-xl font-black text-gray-900 mt-1">
                            R$ {stats.ticketMedium.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-emerald-600" />
                            </div>
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Validadas</p>
                        <p className="text-xl font-black text-gray-900 mt-1">{stats.validatedCount}</p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center">
                                <Clock className="w-5 h-5 text-yellow-600" />
                            </div>
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Pendentes</p>
                        <p className="text-xl font-black text-yellow-600 mt-1">{stats.pendingCount}</p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                                <Package className="w-5 h-5 text-orange-600" />
                            </div>
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Top Produto</p>
                        <p className="text-sm font-black text-gray-900 mt-1 truncate" title={stats.topProduct}>
                            {stats.topProduct.length > 15 ? stats.topProduct.substring(0, 15) + '...' : stats.topProduct}
                        </p>
                    </div>
                </div>

                {/* Gráficos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Gráfico de Barras - Por Categoria */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4">Vendas por Categoria</h3>
                        {categoryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={categoryData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#0066FF" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[250px] flex items-center justify-center text-gray-400">
                                Sem dados no período
                            </div>
                        )}
                    </div>

                    {/* Gráfico de Linhas - Evolução */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4">Evolução de Vendas</h3>
                        {lineData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={lineData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                                    <Line type="monotone" dataKey="value" stroke="#0066FF" strokeWidth={2} dot={{ fill: '#0066FF' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[250px] flex items-center justify-center text-gray-400">
                                Sem dados no período
                            </div>
                        )}
                    </div>
                </div>

                {/* Gráfico de Pizza - Por Marca */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-8">
                    <h3 className="font-bold text-gray-900 mb-4">Vendas por Marca</h3>
                    {brandData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={brandData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={(props: any) => `${props.name || ''} ${((props.percent || 0) * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {brandData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-gray-400">
                            Sem dados no período
                        </div>
                    )}
                </div>

                {/* Tabela de Vendas */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900">Detalhes das Vendas</h2>
                    </div>
                    {sales.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            Nenhuma venda no período selecionado.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase">Data</th>
                                        <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase">Itens</th>
                                        <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase">Produtos</th>
                                        <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase">Status</th>
                                        <th className="text-right px-6 py-3 text-xs font-bold text-gray-400 uppercase">Valor</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {sales.map((sale) => (
                                        <tr key={sale.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                {new Date(sale.created_at).toLocaleString('pt-BR')}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                {sale.shop_sale_items?.length || 0}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                                {sale.shop_sale_items?.map((item: any) => item.products?.name).join(', ')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    sale.needs_validation 
                                                        ? 'bg-yellow-100 text-yellow-700' 
                                                        : 'bg-green-100 text-green-700'
                                                }`}>
                                                    {sale.needs_validation ? 'Pendente' : 'Validado'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                                                R$ {Number(sale.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </DashboardShell>
    )
}
