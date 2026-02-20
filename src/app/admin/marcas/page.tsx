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
    logo_url?: string; // Caso exista
}

export default function AdminMarcasPage() {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingBrand, setEditingBrand] = useState<string | null>(null);
    const [tempValue, setTempValue] = useState<string>("");

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

    const handleEditClick = (brand: Brand) => {
        setEditingBrand(brand.id);
        setTempValue(brand.commission_value?.toString() || "0");
    };

    const handleSave = async (id: string) => {
        const val = parseFloat(tempValue.replace(",", "."));
        if (isNaN(val) || val < 0) {
            toast.error("Valor inválido.");
            return;
        }

        const { error } = await supabase
            .from("brands")
            .update({ commission_value: val })
            .eq("id", id);

        if (error) {
            console.error("Erro ao atualizar:", error);
            toast.error("Erro ao atualizar valor.");
        } else {
            toast.success("Valor de comissão atualizado!");
            setBrands(brands.map(b => b.id === id ? { ...b, commission_value: val } : b));
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
                                    <th className="p-4 text-right">Bônus por Venda (R$)</th>
                                    <th className="p-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {brands.map((brand) => (
                                    <tr key={brand.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-medium text-gray-900">{brand.name}</td>
                                        <td className="p-4 text-right font-mono text-gray-600">
                                            {editingBrand === brand.id ? (
                                                <input
                                                    type="number"
                                                    value={tempValue}
                                                    onChange={(e) => setTempValue(e.target.value)}
                                                    className="w-24 text-right p-1 border rounded bg-white focus:ring-2 focus:ring-[#C00000] focus:border-transparent outline-none"
                                                    autoFocus
                                                />
                                            ) : (
                                                `R$ ${(brand.commission_value || 0).toFixed(2).replace(".", ",")}`
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            {editingBrand === brand.id ? (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleSave(brand.id)}
                                                        className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-lg hover:bg-green-200 transition-colors"
                                                    >
                                                        Salvar
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingBrand(null)}
                                                        className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleEditClick(brand)}
                                                    className="px-3 py-1 bg-[#C00000]/10 text-[#C00000] text-xs font-bold rounded-lg hover:bg-[#C00000]/20 transition-colors"
                                                >
                                                    Editar
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {loading && (
                                    <tr>
                                        <td colSpan={3} className="p-8 text-center text-gray-400">
                                            Carregando marcas...
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardShell>
    );
}
