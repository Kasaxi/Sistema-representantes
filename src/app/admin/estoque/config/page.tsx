"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DashboardShell from "@/components/DashboardShell";
import { toast, Toaster } from "sonner";
import { Save, Search, Store, Package, AlertTriangle } from "lucide-react";

interface Optic {
    id: string;
    trade_name: string;
    corporate_name: string;
    cnpj: string;
}

interface Product {
    id: string;
    name: string;
    sku: string;
    brands: { name: string };
}

interface InventoryConfig {
    id?: string;
    product_id: string;
    min_stock: number;
    max_stock: number;
    current_stock: number;
}

export default function AdminInventoryConfigPage() {
    const [optics, setOptics] = useState<Optic[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedOpticId, setSelectedOpticId] = useState<string>("");
    const [configs, setConfigs] = useState<Record<string, InventoryConfig>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
    const [adjustmentData, setAdjustmentData] = useState({
        quantity: "" as number | "",
        type: 'entrada' as 'entrada' | 'saida' | 'ajuste',
        reason: ''
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        const [opticsRes, productsRes] = await Promise.all([
            supabase.from("optics").select("*").eq("active", true).order("trade_name"),
            supabase.from("products").select("*, brands(name)").eq("is_active", true).order("name")
        ]);

        if (opticsRes.data) setOptics(opticsRes.data);
        if (productsRes.data) setProducts(productsRes.data);
        setLoading(false);
    };

    const fetchConfigs = async (opticId: string) => {
        if (!opticId) {
            setConfigs({});
            return;
        }
        setLoading(true);
        const { data } = await supabase
            .from("inventory_configs")
            .select("*")
            .eq("optic_id", opticId);

        const configMap: Record<string, InventoryConfig> = {};
        data?.forEach(c => {
            configMap[c.product_id] = c;
        });
        setConfigs(configMap);
        setLoading(false);
    };

    const handleOpticChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setSelectedOpticId(id);
        fetchConfigs(id);
    };

    const handleConfigChange = (productId: string, field: keyof InventoryConfig, value: number) => {
        setConfigs(prev => ({
            ...prev,
            [productId]: {
                ...(prev[productId] || { product_id: productId, min_stock: 0, max_stock: 100, current_stock: 0 }),
                [field]: value
            }
        }));
    };

    const handleSaveLimits = async (productId: string) => {
        if (!selectedOpticId) return;
        setSaving(true);
        const config = configs[productId];
        
        const payload = {
            optic_id: selectedOpticId,
            product_id: productId,
            min_stock: config.min_stock,
            max_stock: config.max_stock,
            current_stock: config.current_stock
        };

        const { error } = await supabase
            .from("inventory_configs")
            .upsert(payload, { onConflict: 'optic_id,product_id' });

        if (error) {
            toast.error("Erro ao salvar limites.");
        } else {
            toast.success("Limites atualizados!");
            fetchConfigs(selectedOpticId);
        }
        setSaving(false);
    };

    const handleStockAdjustment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOpticId || !adjustingProduct) return;
        setSaving(true);

        const config = configs[adjustingProduct.id] || { current_stock: 0 };
        const qty = Number(adjustmentData.quantity) || 0;
        
        const newStock = adjustmentData.type === 'entrada' 
            ? config.current_stock + qty 
            : adjustmentData.type === 'saida' 
                ? config.current_stock - qty 
                : qty; // Ajuste direto

        // 1. Atualizar ou Criar Inventário
        const { error: invError } = await supabase
            .from("inventory_configs")
            .upsert({
                optic_id: selectedOpticId,
                product_id: adjustingProduct.id,
                current_stock: newStock,
                min_stock: (configs[adjustingProduct.id] as any)?.min_stock || 0,
                max_stock: (configs[adjustingProduct.id] as any)?.max_stock || 100,
            }, { onConflict: 'optic_id,product_id' });

        if (invError) {
            toast.error("Erro ao atualizar estoque.");
            setSaving(false);
            return;
        }

        // 2. Registrar Movimentação
        const { error: movError } = await supabase
            .from("inventory_movements")
            .insert({
                optic_id: selectedOpticId,
                product_id: adjustingProduct.id,
                type: adjustmentData.type,
                quantity: adjustmentData.type === 'ajuste' ? newStock : qty,
                observation: adjustmentData.reason
            });

        if (movError) {
            toast.error("Erro ao registrar movimentação.");
        } else {
            toast.success("Estoque abastecido com sucesso!");
            fetchConfigs(selectedOpticId);
            setAdjustingProduct(null);
            setAdjustmentData({ quantity: "", type: 'entrada', reason: '' });
        }
        setSaving(false);
    };

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardShell userRole="admin">
            <Toaster position="top-right" />
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Suprimento & Limites</h1>
                        <p className="text-gray-500 mt-1">Configure o estoque e adicione produtos às lojas.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="col-span-1 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                        <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <Store className="w-4 h-4 text-blue-600" />
                            Loja de Destino
                        </label>
                        <select
                            className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500/10 outline-none transition-all font-bold text-gray-900"
                            value={selectedOpticId}
                            onChange={handleOpticChange}
                        >
                            <option value="">Escolha uma ótica...</option>
                            {optics.map(o => (
                                <option key={o.id} value={o.id}>{o.trade_name || o.corporate_name}</option>
                            ))}
                        </select>
                        {selectedOpticId && (
                            <div className="pt-4 border-t border-gray-100 mt-4">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">CNPJ da Unidade</p>
                                <p className="text-sm font-black text-gray-900 mt-1">{optics.find(o => o.id === selectedOpticId)?.cnpj}</p>
                            </div>
                        )}
                    </div>

                    <div className="col-span-2 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Buscar produtos para abastecer..."
                                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-3xl focus:ring-2 focus:ring-blue-500/10 outline-none transition-all shadow-sm font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {!selectedOpticId ? (
                            <div className="bg-blue-50/50 p-16 rounded-3xl border border-blue-100/50 text-center">
                                <Store className="w-16 h-16 text-blue-200 mx-auto mb-4" />
                                <h3 className="text-blue-900 font-black text-xl">Selecione uma Loja</h3>
                                <p className="text-blue-600/70 text-sm mt-2 max-w-xs mx-auto">Para gerenciar os níveis de estoque e realizar abastecimentos, primeiro escolha uma ótica.</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden text-sm font-bold">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50/50 border-b border-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                <th className="p-6">Produto</th>
                                                <th className="p-6 text-center">Mín</th>
                                                <th className="p-6 text-center">Máx</th>
                                                <th className="p-6 text-center">Saldo</th>
                                                <th className="p-6 text-right">Ação</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {loading ? (
                                                <tr><td colSpan={5} className="p-12 text-center text-gray-400">Carregando estoque...</td></tr>
                                            ) : filteredProducts.length === 0 ? (
                                                <tr><td colSpan={5} className="p-12 text-center text-gray-400">Nenhum produto encontrado.</td></tr>
                                            ) : (
                                                filteredProducts.map(p => {
                                                    const config = configs[p.id] || { product_id: p.id, min_stock: 0, max_stock: 100, current_stock: 0 };
                                                    const isUnderMin = config.current_stock < config.min_stock;
                                                    
                                                    return (
                                                        <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                                                            <td className="p-6">
                                                                <div className="text-gray-900 font-black">{p.sku}</div>
                                                                <div className="text-[10px] text-gray-400 uppercase tracking-wider">{p.brands.name}</div>
                                                            </td>
                                                            <td className="p-6">
                                                                <input
                                                                    type="number"
                                                                    className="w-16 mx-auto block px-2 py-2 bg-gray-50 border border-gray-100 rounded-lg text-center text-xs focus:ring-2 focus:ring-blue-500/10 focus:bg-white outline-none transition-all font-black"
                                                                    value={config.min_stock}
                                                                    onChange={e => handleConfigChange(p.id, 'min_stock', parseInt(e.target.value) || 0)}
                                                                />
                                                            </td>
                                                            <td className="p-6">
                                                                <input
                                                                    type="number"
                                                                    className="w-16 mx-auto block px-2 py-2 bg-gray-50 border border-gray-100 rounded-lg text-center text-xs focus:ring-2 focus:ring-blue-500/10 focus:bg-white outline-none transition-all font-black"
                                                                    value={config.max_stock}
                                                                    onChange={e => handleConfigChange(p.id, 'max_stock', parseInt(e.target.value) || 0)}
                                                                />
                                                            </td>
                                                            <td className="p-6">
                                                                <div className="flex flex-col items-center">
                                                                    <div className={`text-base font-black px-2 py-0.5 rounded-lg ${isUnderMin ? 'bg-red-50 text-red-600' : 'text-gray-900'}`}>
                                                                        {config.current_stock}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-6 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <button
                                                                        title="Abastecer / Ajustar"
                                                                        onClick={() => setAdjustingProduct(p)}
                                                                        className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm shadow-blue-500/5 active:scale-95"
                                                                    >
                                                                        <Package className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        title="Salvar Limites"
                                                                        disabled={saving}
                                                                        onClick={() => handleSaveLimits(p.id)}
                                                                        className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-900 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                                                                    >
                                                                        <Save className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal de Abastecimento */}
                {adjustingProduct && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
                            <h2 className="text-2xl font-black text-gray-900 mb-2 flex items-center gap-3">
                                📦 Abastecer Estoque
                            </h2>
                            <p className="text-gray-500 text-sm mb-6">
                                Ajuste o saldo de <span className="font-black text-blue-600">{adjustingProduct.sku}</span> para a loja selecionada.
                            </p>
                            
                            <form onSubmit={handleStockAdjustment} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Tipo de Operação</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'entrada', label: 'Entrada', color: 'bg-green-50 text-green-700' },
                                            { id: 'saida', label: 'Saída', color: 'bg-red-50 text-red-700' },
                                            { id: 'ajuste', label: 'Saldo Fixo', color: 'bg-gray-100 text-gray-700' }
                                        ].map(t => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => setAdjustmentData({ ...adjustmentData, type: t.id as any })}
                                                className={`py-3 rounded-xl font-bold text-xs border-2 transition-all ${adjustmentData.type === t.id ? `border-blue-600 ${t.color}` : 'border-transparent bg-gray-50 text-gray-400'}`}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Quantidade</label>
                                        <input
                                            type="number" min="0" required
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white outline-none transition-all font-black text-lg"
                                            value={adjustmentData.quantity}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setAdjustmentData({ ...adjustmentData, quantity: val === "" ? "" : parseInt(val) || 0 });
                                            }}
                                        />
                                    </div>
                                    <div className="flex flex-col justify-end pb-1">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Saldo Atual</p>
                                        <p className="text-xl font-black text-gray-900">{(configs[adjustingProduct.id] as any)?.current_stock || 0}</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Motivo / Observação</label>
                                    <textarea
                                        rows={2} placeholder="Ex: Compra de reposição, ajuste de inventário..."
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white outline-none transition-all font-medium text-sm"
                                        value={adjustmentData.reason}
                                        onChange={e => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
                                    />
                                </div>

                                <div className="flex gap-4 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setAdjustingProduct(null)}
                                        className="flex-1 px-6 py-4 bg-gray-50 text-gray-500 font-bold rounded-2xl hover:bg-gray-100 transition-all active:scale-95"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving || adjustmentData.quantity === "" || adjustmentData.quantity <= 0}
                                        className="flex-1 px-6 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:shadow-none"
                                    >
                                        Confirmar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardShell>
    );
}
