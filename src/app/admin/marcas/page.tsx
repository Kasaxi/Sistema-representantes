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
    const [formData, setFormData] = useState({
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
            .in("name", ["Nike", "Náutica", "Donna Karan"])
            .order("name");

        if (error) {
            console.error("Erro ao carregar marcas:", error);
            toast.error("Erro ao carregar marcas.");
        } else {
            setBrands(data || []);
        }
        setLoading(false);
    };

    const handleEditClick = (brand: Brand) => {
        setEditingBrand(brand);
        setFormData({
            commission_value: brand.commission_value || "",
            promo_type: brand.promo_type || "",
            promo_value: brand.promo_value || "",
            promo_start_date: brand.promo_start_date ? new Date(brand.promo_start_date).toISOString().slice(0, 16) : "",
            promo_end_date: brand.promo_end_date ? new Date(brand.promo_end_date).toISOString().slice(0, 16) : "",
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBrand) return;

        const payload = {
            commission_value: formData.commission_value === "" ? 0 : formData.commission_value,
            promo_type: formData.promo_type || null,
            promo_value: formData.promo_value === "" ? null : formData.promo_value,
            promo_start_date: formData.promo_start_date ? new Date(formData.promo_start_date).toISOString() : null,
            promo_end_date: formData.promo_end_date ? new Date(formData.promo_end_date).toISOString() : null,
        };

        const { error } = await supabase
            .from("brands")
            .update(payload)
            .eq("id", editingBrand.id);

        if (error) {
            console.error("Erro ao atualizar:", error);
            toast.error("Erro ao atualizar os dados.");
        } else {
            toast.success("Promoção de marca salva!");
            fetchBrands();
            setEditingBrand(null);
        }
    };

    return (
        <DashboardShell userRole="admin">
            <Toaster position="top-right" />
            <div className="max-w-5xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Gestão de Marcas</h1>
                    <p className="text-gray-500 mt-1">Defina o valor da comissão/bônus para cada marca.</p>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    <th className="p-4">Marca</th>
                                    <th className="p-4 text-right">Comissão Padrão</th>
                                    <th className="p-4 text-center">Promoção Ativa</th>
                                    <th className="p-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {brands.map((brand) => (
                                    <tr key={brand.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-medium text-gray-900">{brand.name}</td>
                                        <td className="p-4 text-right font-mono text-gray-600">
                                            R$ {(brand.commission_value || 0).toFixed(2).replace(".", ",")}
                                        </td>
                                        <td className="p-4 text-center text-sm">
                                            {brand.promo_type && brand.promo_value ? (
                                                <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded font-bold">
                                                    {brand.promo_type === 'percentage' ? `+${brand.promo_value}%` : `+ R$ ${brand.promo_value}`}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                            {brand.promo_end_date && <div className="text-xs text-gray-500 mt-1">Até {new Date(brand.promo_end_date).toLocaleDateString()}</div>}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => handleEditClick(brand)}
                                                className="px-3 py-1 bg-[#C00000]/10 text-[#C00000] text-xs font-bold rounded-lg hover:bg-[#C00000]/20 transition-colors"
                                            >
                                                Configurar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {loading && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-gray-400">
                                            Carregando marcas...
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                {/* Modal de Configuração de Promoções */}
                {editingBrand && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Configurar Bônus - {editingBrand.name}</h2>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Comissão Base (R$)</label>
                                    <input
                                        type="number" step="0.01" min="0" required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#C00000] focus:border-[#C00000]"
                                        value={formData.commission_value}
                                        onChange={e => setFormData({ ...formData, commission_value: e.target.value === "" ? "" : parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div className="border-t border-gray-100 pt-4 mt-4">
                                    <h3 className="text-md font-bold text-gray-900 mb-3 text-[#C00000]">Periodo Promocional (Opcional)</h3>

                                    <div className="grid grid-cols-2 gap-4 mb-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Promoção</label>
                                            <select
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#C00000]"
                                                value={formData.promo_type}
                                                onChange={e => setFormData({ ...formData, promo_type: e.target.value as any })}
                                            >
                                                <option value="">Sem promoção extra</option>
                                                <option value="absolute">Valor Fixo (+R$)</option>
                                                <option value="percentage">Adicional em (%)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Valor/Adicional</label>
                                            <input
                                                type="number" step="0.01" min="0"
                                                disabled={!formData.promo_type}
                                                className={`w-full px-3 py-2 border rounded-lg focus:ring-[#C00000] ${!formData.promo_type ? 'bg-gray-100 border-gray-200' : 'border-gray-300'}`}
                                                value={formData.promo_value}
                                                onChange={e => setFormData({ ...formData, promo_value: e.target.value === "" ? "" : parseFloat(e.target.value) })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
                                            <input
                                                type="datetime-local"
                                                disabled={!formData.promo_type}
                                                className={`w-full px-3 py-2 border rounded-lg focus:ring-[#C00000] ${!formData.promo_type ? 'bg-gray-100 border-gray-200' : 'border-gray-300'}`}
                                                value={formData.promo_start_date}
                                                onChange={e => setFormData({ ...formData, promo_start_date: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
                                            <input
                                                type="datetime-local"
                                                disabled={!formData.promo_type}
                                                className={`w-full px-3 py-2 border rounded-lg focus:ring-[#C00000] ${!formData.promo_type ? 'bg-gray-100 border-gray-200' : 'border-gray-300'}`}
                                                value={formData.promo_end_date}
                                                onChange={e => setFormData({ ...formData, promo_end_date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setEditingBrand(null)}
                                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 bg-[#C00000] text-white rounded-lg hover:bg-[#A00000] font-bold shadow"
                                    >
                                        Aplicar
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
