"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DashboardShell from "@/components/DashboardShell";
import { 
    Package, AlertTriangle, ArrowUpRight, ArrowDownRight, 
    Search, Filter, ShoppingBag
} from "lucide-react";
import { toast, Toaster } from "sonner";

export default function ShopkeeperInventoryPage() {
    const [loading, setLoading] = useState(true);
    const [inventory, setInventory] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalItems: 0,
        lowStock: 0,
        pendingOrders: 0
    });
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchStoreInventory();
    }, []);

    const fetchStoreInventory = async () => {
        setLoading(true);
        
        // Get user profile to find their cnpj
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
            .from("profiles")
            .select("cnpj")
            .eq("id", user.id)
            .single();

        if (!profile?.cnpj) {
            toast.error("CNPJ não vinculado ao perfil.");
            setLoading(false);
            return;
        }

        // Get optic_id from cnpj
        const { data: optic } = await supabase
            .from("optics")
            .select("id")
            .eq("cnpj", profile.cnpj)
            .single();

        if (!optic) {
            toast.error("Ótica não encontrada para este CNPJ.");
            setLoading(false);
            return;
        }

        // Fetch inventory
        const { data: invData } = await supabase
            .from("inventory_configs")
            .select(`
                *,
                products (*, brands (name))
            `)
            .eq("optic_id", optic.id);

        if (invData) {
            setInventory(invData);
            setStats({
                totalItems: invData.reduce((acc, i) => acc + i.current_stock, 0),
                lowStock: invData.filter(i => i.current_stock < i.min_stock).length,
                pendingOrders: 0 // Placeholder
            });
        }
        setLoading(false);
    };

    const filteredInventory = inventory.filter(i => 
        i.products.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        i.products.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardShell userRole="shopkeeper">
            <Toaster position="top-right" />
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Meu Estoque</h1>
                        <p className="text-gray-500 mt-1">Acompanhe seus níveis de produto e alertas de reposição.</p>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                            <Package className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Saldo Total</p>
                            <p className="text-2xl font-black text-gray-900">{stats.totalItems} <span className="text-sm font-medium text-gray-400">peças</span></p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stats.lowStock > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Itens Críticos</p>
                            <p className="text-2xl font-black text-gray-900">{stats.lowStock}</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 opacity-60">
                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400">
                            <ShoppingBag className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Reposições Pendentes</p>
                            <p className="text-2xl font-black text-gray-900">0</p>
                        </div>
                    </div>
                </div>

                {/* Inventory Table */}
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar no meu estoque..."
                            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <th className="p-6">Produto / SKU</th>
                                    <th className="p-6">Marca</th>
                                    <th className="p-6 text-center">Nível Atual</th>
                                    <th className="p-6 text-center">Mín/Máx</th>
                                    <th className="p-6 text-right">Preço Sug.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr><td colSpan={5} className="p-12 text-center text-gray-400">Carregando seu estoque...</td></tr>
                                ) : filteredInventory.length === 0 ? (
                                    <tr><td colSpan={5} className="p-12 text-center text-gray-400">Nenhum produto em estoque.</td></tr>
                                ) : (
                                    filteredInventory.map(item => {
                                        const isLow = item.current_stock < item.min_stock;
                                        return (
                                            <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="p-6">
                                                    <div className="font-bold text-gray-900">{item.products.sku}</div>
                                                    <div className="text-xs text-gray-500">{item.products.name}</div>
                                                </td>
                                                <td className="p-6">
                                                    <span className="px-2 py-1 bg-gray-100 rounded text-[10px] font-black text-gray-500 uppercase">
                                                        {item.products.brands.name}
                                                    </span>
                                                </td>
                                                <td className="p-6 text-center">
                                                    <div className={`text-xl font-black ${isLow ? 'text-red-600' : 'text-emerald-600'}`}>
                                                        {item.current_stock}
                                                    </div>
                                                    {isLow && <div className="text-[9px] font-bold text-red-500 uppercase mt-1">Reposição Necessária</div>}
                                                </td>
                                                <td className="p-6 text-center text-xs font-bold text-gray-400">
                                                    {item.min_stock} / {item.max_stock}
                                                </td>
                                                <td className="p-6 text-right font-mono font-bold text-blue-600">
                                                    R$ {item.products.suggested_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardShell>
    );
}
