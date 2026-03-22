"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DashboardShell from "@/components/DashboardShell";
import { toast, Toaster } from "sonner"; // Assuming sonner is installed or we use a simple alert/custom toast

// Definição de tipos
interface Brand {
    id: string;
    name: string;
    commission_value: number;
    category: 'luxo' | 'premium' | 'frontline';
    logo_url?: string;
    promo_type?: 'absolute' | 'percentage' | null;
    promo_value?: number;
    promo_start_date?: string;
    promo_end_date?: string;
}

export default function AdminMarcasPage() {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        category: "frontline" as "luxo" | "premium" | "frontline",
        commission_value: "" as number | "",
        promo_type: "" as "absolute" | "percentage" | "",
        promo_value: "" as number | "",
        promo_start_date: "",
        promo_end_date: "",
    });

    useEffect(() => {
        fetchBrands();
    }, []);

    const fetchBrands = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("brands")
            .select("*")
            .order("name");

        if (error) {
            console.error("Erro ao carregar marcas:", error);
            toast.error("Erro ao carregar marcas.");
        } else {
            setBrands(data || []);
        }
        setLoading(false);
    };

    const handleCreateClick = () => {
        setIsCreating(true);
        setEditingBrand({} as Brand); // Dummy object to trigger modal
        setFormData({
            name: "",
            category: "frontline",
            commission_value: 0,
            promo_type: "",
            promo_value: "",
            promo_start_date: "",
            promo_end_date: "",
        });
    };

    const handleEditClick = (brand: Brand) => {
        setIsCreating(false);
        setEditingBrand(brand);
        setFormData({
            name: brand.name,
            category: brand.category || "frontline",
            commission_value: brand.commission_value || "",
            promo_type: brand.promo_type || "",
            promo_value: brand.promo_value || "",
            promo_start_date: brand.promo_start_date ? new Date(brand.promo_start_date).toISOString().slice(0, 16) : "",
            promo_end_date: brand.promo_end_date ? new Date(brand.promo_end_date).toISOString().slice(0, 16) : "",
        });
    };

    const handleDelete = async (brand: Brand) => {
        if (!window.confirm(`Tem certeza que deseja excluir a marca ${brand.name}? Esta ação poderá falhar se houver produtos ou vendas vinculadas.`)) return;

        const { error } = await supabase
            .from("brands")
            .delete()
            .eq("id", brand.id);

        if (error) {
            console.error("Erro ao excluir:", error);
            toast.error("Erro ao excluir marca. Verifique se existem produtos dependentes.");
        } else {
            toast.success("Marca excluída com sucesso!");
            fetchBrands();
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBrand) return;

        const payload: any = {
            name: formData.name,
            category: formData.category,
            commission_value: formData.commission_value === "" ? 0 : formData.commission_value,
            promo_type: formData.promo_type || null,
            promo_value: formData.promo_value === "" ? null : formData.promo_value,
            promo_start_date: formData.promo_start_date ? new Date(formData.promo_start_date).toISOString() : null,
            promo_end_date: formData.promo_end_date ? new Date(formData.promo_end_date).toISOString() : null,
        };

        let error;
        if (isCreating) {
            const { error: insertError } = await supabase.from("brands").insert(payload);
            error = insertError;
        } else {
            const { error: updateError } = await supabase
                .from("brands")
                .update(payload)
                .eq("id", editingBrand.id);
            error = updateError;
        }

        if (error) {
            console.error("Erro ao salvar:", error);
            toast.error("Erro ao salvar os dados.");
        } else {
            toast.success(isCreating ? "Marca criada!" : "Marca atualizada!");
            fetchBrands();
            setEditingBrand(null);
            setIsCreating(false);
        }
    };

    return (
        <DashboardShell userRole="admin">
            <Toaster position="top-right" />
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Gestão de Marcas</h1>
                        <p className="text-gray-500 mt-1">Cadastre novas marcas ou defina comissões de bônus.</p>
                    </div>
                    <button
                        onClick={handleCreateClick}
                        className="px-6 py-3 bg-[#0066FF] text-white font-bold rounded-xl hover:bg-[#0052CC] transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2"
                    >
                        Nova Marca
                    </button>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden text-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <th className="p-6">Marca</th>
                                    <th className="p-6">Categoria</th>
                                    <th className="p-6 text-right">Comissão Padrão</th>
                                    <th className="p-6 text-center">Promoção Ativa</th>
                                    <th className="p-6 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {brands.map((brand) => (
                                    <tr key={brand.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-6 font-bold text-gray-900">{brand.name}</td>
                                        <td className="p-6 text-[10px] font-black uppercase tracking-widest text-center">
                                            <span className={`px-2 py-1 rounded-lg ${brand.category === 'luxo' ? 'bg-purple-100 text-purple-700' :
                                                brand.category === 'premium' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                {brand.category}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right font-mono text-gray-600 font-bold">
                                            R$ {(brand.commission_value || 0).toFixed(2).replace(".", ",")}
                                        </td>
                                        <td className="p-6 text-center">
                                            {brand.promo_type && brand.promo_value ? (
                                                <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg font-black text-[10px] uppercase">
                                                    {brand.promo_type === 'percentage' ? `+${brand.promo_value}%` : `+ R$ ${brand.promo_value}`}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                            {brand.promo_end_date && <div className="text-[10px] text-gray-400 mt-1 font-bold">Até {new Date(brand.promo_end_date).toLocaleDateString()}</div>}
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleEditClick(brand)}
                                                    className="px-3 py-1.5 bg-[#0066FF]/10 text-[#0066FF] text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[#0066FF]/20 transition-colors"
                                                >
                                                    Configurar
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(brand)}
                                                    className="p-1.5 text-red-300 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                                                    title="Excluir Marca"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {loading && (
                                    <tr>
                                        <td colSpan={5} className="p-20 text-center text-gray-400 font-medium">
                                            Buscando catálogo de marcas...
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modal de CRUD Marcas */}
                {editingBrand && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 animate-in zoom-in-95 duration-200">
                            <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                                {isCreating ? "🚀 Nova Marca" : `⚙️ Configurar ${editingBrand.name}`}
                            </h2>
                            <form onSubmit={handleSave} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Nome da Marca</label>
                                    <input
                                        type="text" required
                                        placeholder="Ex: Ray-Ban, Oakley..."
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#0066FF]/10 focus:bg-white outline-none transition-all font-bold"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Categoria</label>
                                        <select
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#0066FF]/10 focus:bg-white outline-none transition-all font-bold"
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                                        >
                                            <option value="frontline">Frontline</option>
                                            <option value="premium">Premium</option>
                                            <option value="luxo">Luxo</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Comissão Base (R$)</label>
                                        <input
                                            type="number" step="0.01" min="0" required
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#0066FF]/10 focus:bg-white outline-none transition-all font-bold"
                                            value={formData.commission_value}
                                            onChange={e => setFormData({ ...formData, commission_value: e.target.value === "" ? "" : parseFloat(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-6 mt-6">
                                    <h3 className="text-xs font-black text-[#0066FF] uppercase tracking-widest mb-4">Campanha Promocional (Opcional)</h3>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tipo</label>
                                            <select
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#0066FF]/10 focus:bg-white outline-none transition-all font-bold"
                                                value={formData.promo_type}
                                                onChange={e => setFormData({ ...formData, promo_type: e.target.value as any })}
                                            >
                                                <option value="">Sem promoção</option>
                                                <option value="absolute">Fixo (+R$)</option>
                                                <option value="percentage">Adicional (%)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Valor do Bônus</label>
                                            <input
                                                type="number" step="0.01" min="0"
                                                disabled={!formData.promo_type}
                                                className={`w-full px-4 py-3 border rounded-xl outline-none font-bold transition-all ${!formData.promo_type ? 'bg-gray-100 border-transparent text-gray-400' : 'bg-gray-50 border-gray-100 focus:bg-white focus:ring-2 focus:ring-[#0066FF]/10'}`}
                                                value={formData.promo_value}
                                                onChange={e => setFormData({ ...formData, promo_value: e.target.value === "" ? "" : parseFloat(e.target.value) })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Início</label>
                                            <input
                                                type="datetime-local"
                                                disabled={!formData.promo_type}
                                                className={`w-full px-4 py-3 border rounded-xl outline-none font-bold transition-all ${!formData.promo_type ? 'bg-gray-100 border-transparent text-gray-400' : 'bg-gray-50 border-gray-100 focus:bg-white focus:ring-2 focus:ring-[#0066FF]/10'}`}
                                                value={formData.promo_start_date}
                                                onChange={e => setFormData({ ...formData, promo_start_date: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Término</label>
                                            <input
                                                type="datetime-local"
                                                disabled={!formData.promo_type}
                                                className={`w-full px-4 py-3 border rounded-xl outline-none font-bold transition-all ${!formData.promo_type ? 'bg-gray-100 border-transparent text-gray-400' : 'bg-gray-50 border-gray-100 focus:bg-white focus:ring-2 focus:ring-[#0066FF]/10'}`}
                                                value={formData.promo_end_date}
                                                onChange={e => setFormData({ ...formData, promo_end_date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => { setEditingBrand(null); setIsCreating(false); }}
                                        className="flex-1 px-6 py-4 bg-gray-50 text-gray-500 font-bold rounded-2xl hover:bg-gray-100 transition-all active:scale-95"
                                    >
                                        Descartar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-4 bg-[#0066FF] text-white font-bold rounded-2xl hover:bg-[#0052CC] transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                                    >
                                        {isCreating ? "Criar Marca" : "Salvar Alterações"}
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
