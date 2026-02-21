"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import DashboardShell from "@/components/DashboardShell";

interface Optic {
    id: string;
    corporate_name: string;
    trade_name?: string;
    cnpj: string;
    city?: string;
    state?: string;
    active: boolean;
    created_at: string;
}

export default function AdminOpticsPage() {
    const [optics, setOptics] = useState<Optic[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOptic, setEditingOptic] = useState<Optic | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        corporate_name: "",
        trade_name: "",
        cnpj: "",
        city: "",
        state: "",
    });

    const fetchOptics = async () => {
        const { data } = await supabase
            .from("optics")
            .select("*")
            .order("created_at", { ascending: false });
        if (data) setOptics(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchOptics();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            corporate_name: formData.corporate_name,
            trade_name: formData.trade_name,
            cnpj: formData.cnpj.replace(/\D/g, ""), // Clean CNPJ
            city: formData.city,
            state: formData.state,
        };

        if (editingOptic) {
            const { error } = await supabase.from("optics").update(payload).eq("id", editingOptic.id);
            if (error) console.error(error);
        } else {
            const { error } = await supabase.from("optics").insert([payload]);
            if (error) console.error(error);
        }

        setIsModalOpen(false);
        setEditingOptic(null);
        setFormData({ corporate_name: "", trade_name: "", cnpj: "", city: "", state: "" });
        fetchOptics();
    };

    const openModal = (optic?: Optic) => {
        if (optic) {
            setEditingOptic(optic);
            setFormData({
                corporate_name: optic.corporate_name,
                trade_name: optic.trade_name || "",
                cnpj: optic.cnpj,
                city: optic.city || "",
                state: optic.state || "",
            });
        } else {
            setEditingOptic(null);
            setFormData({ corporate_name: "", trade_name: "", cnpj: "", city: "", state: "" });
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Tem certeza que deseja excluir esta ótica?")) {
            await supabase.from("optics").delete().eq("id", id);
            fetchOptics();
        }
    };

    return (
        <DashboardShell userRole="admin">
            <div className="max-w-6xl mx-auto p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Gerenciar Óticas</h1>
                        <p className="text-gray-500">Cadastre e gerencie as óticas parceiras.</p>
                    </div>
                    <button
                        onClick={() => openModal()}
                        className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black transition-colors"
                    >
                        + Nova Ótica
                    </button>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Razão Social / Fantasia</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Localidade</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">CNPJ</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {optics.map((optic) => (
                                <tr key={optic.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{optic.corporate_name}</div>
                                        {optic.trade_name && <div className="text-xs text-gray-500">{optic.trade_name}</div>}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {optic.city && optic.state ? `${optic.city} - ${optic.state}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{optic.cnpj}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${optic.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {optic.active ? 'Ativa' : 'Inativa'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button onClick={() => openModal(optic)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold">Editar</button>
                                        <button onClick={() => handleDelete(optic.id)} className="text-red-600 hover:text-red-800 text-xs font-semibold">Excluir</button>
                                    </td>
                                </tr>
                            ))}
                            {optics.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        Nenhuma ótica cadastrada.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">{editingOptic ? 'Editar Ótica' : 'Nova Ótica'}</h2>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Razão Social</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#C00000] focus:border-[#C00000]"
                                        value={formData.corporate_name}
                                        onChange={e => setFormData({ ...formData, corporate_name: e.target.value })}
                                        placeholder="Ex: Ótica Visão Ltda"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Fantasia (Opcional)</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#C00000] focus:border-[#C00000]"
                                        value={formData.trade_name}
                                        onChange={e => setFormData({ ...formData, trade_name: e.target.value })}
                                        placeholder="Ex: Ótica Visão"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#C00000] focus:border-[#C00000]"
                                        value={formData.cnpj}
                                        onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                                        placeholder="00.000.000/0000-00"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#C00000] focus:border-[#C00000]"
                                            value={formData.city}
                                            onChange={e => setFormData({ ...formData, city: e.target.value })}
                                            placeholder="Ex: São Paulo"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Estado (UF)</label>
                                        <input
                                            required
                                            type="text"
                                            maxLength={2}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#C00000] focus:border-[#C00000] uppercase"
                                            value={formData.state}
                                            onChange={e => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                                            placeholder="Ex: SP"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 bg-[#C00000] text-white rounded-lg hover:bg-[#A00000] font-bold"
                                    >
                                        Salvar
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
