"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import DashboardShell from "@/components/DashboardShell";
import { Copy } from "lucide-react";
import { toast, Toaster } from "sonner";

interface Optic {
    id: string;
    corporate_name: string;
    trade_name?: string;
    cnpj: string;
    city?: string;
    state?: string;
    active: boolean;
    created_at: string;
    shop_subscriptions?: {
        plan: string;
        status: string;
        current_period_end: string | null;
    } | {
        plan: string;
        status: string;
        current_period_end: string | null;
    }[];
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
        // Novos campos para criação de usuário
        full_name: "",
        email: "",
        password: "",
    });

    const fetchOptics = async () => {
        const { data } = await supabase
            .from("optics")
            .select(`
                *,
                shop_subscriptions (
                    plan,
                    status,
                    current_period_end
                )
            `)
            .order("created_at", { ascending: false });
        if (data) setOptics(data as any);
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
            cnpj: formData.cnpj.replace(/\D/g, ""),
            city: formData.city,
            state: formData.state,
        };

        try {
            if (editingOptic) {
                // Apenas atualizar dados da ótica
                const { error } = await supabase.from("optics").update(payload).eq("id", editingOptic.id);
                if (error) throw error;
                alert("Ótica atualizada com sucesso!");
            } else {
                // Criar nova ótica com usuário via API
                if (!formData.email || !formData.password || !formData.full_name) {
                    throw new Error("Preencha todos os campos obrigatórios: Nome, Email e Senha");
                }

                const response = await fetch('/api/admin/lojista', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        full_name: formData.full_name,
                        email: formData.email,
                        password: formData.password,
                        ...payload
                    })
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Erro ao criar lojista');
                }

                alert(`Ótica criada com sucesso!\n\nEmail: ${formData.email}`);
            }

            setIsModalOpen(false);
            setEditingOptic(null);
            setFormData({ corporate_name: "", trade_name: "", cnpj: "", city: "", state: "", full_name: "", email: "", password: "" });
            fetchOptics();
        } catch (err: any) {
            alert(err.message || "Erro ao salvar");
        } finally {
            setLoading(false);
        }
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
                full_name: "",
                email: "",
                password: "",
            });
        } else {
            setEditingOptic(null);
            setFormData({ corporate_name: "", trade_name: "", cnpj: "", city: "", state: "", full_name: "", email: "", password: "" });
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Tem certeza que deseja excluir esta ótica?")) {
            await supabase.from("optics").delete().eq("id", id);
            fetchOptics();
        }
    };

    const getSubscriptionInfo = (optic: Optic) => {
        if (!optic.shop_subscriptions) return null;
        return Array.isArray(optic.shop_subscriptions) ? optic.shop_subscriptions[0] : optic.shop_subscriptions;
    };

    const handleCopyPaymentLink = (opticId: string) => {
        // Substituir esta URL pelo Payment Link gerado no Dashboard do Stripe
        const baseUrl = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "https://buy.stripe.com/SEU_LINK_AQUI";
        const url = `${baseUrl}?client_reference_id=${opticId}`;
        navigator.clipboard.writeText(url);
        toast.success("Link de pagamento copiado!", {
            description: "Você já pode enviar este link para o lojista via WhatsApp."
        });
    };

    return (
        <DashboardShell userRole="admin">
            <Toaster position="top-right" />
            <div className="max-w-7xl mx-auto p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Gerenciar Lojas</h1>
                        <p className="text-gray-500">Cadastre óticas e gerencie o acesso ao módulo SaaS de Estoque.</p>
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
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Loja</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">CNPJ</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status ERP</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Módulo Estoque (SaaS)</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {optics.map((optic) => (
                                <tr key={optic.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{optic.trade_name || optic.corporate_name}</div>
                                        {optic.trade_name && <div className="text-xs text-gray-500 max-w-[200px] truncate">{optic.corporate_name}</div>}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-600">{optic.cnpj}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${optic.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {optic.active ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {(() => {
                                            const sub = getSubscriptionInfo(optic);
                                            if (!sub) {
                                                return <span className="text-gray-400 text-xs font-medium">Free (Bloqueado)</span>;
                                            }
                                            if (sub.plan === 'pro') {
                                                const isActive = sub.status === 'active';
                                                return (
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`inline-flex items-center w-fit px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${isActive ? 'bg-[#0066FF]/10 text-[#0066FF]' : 'bg-red-100 text-red-700'}`}>
                                                            PRO {isActive ? '(Ativo)' : `(${sub.status})`}
                                                        </span>
                                                        {sub.current_period_end && isActive && (
                                                            <span className="text-[10px] font-medium text-gray-400">
                                                                Renova em {new Date(sub.current_period_end).toLocaleDateString('pt-BR')}
                                                            </span>
                                                        )}
                                                    </div>
                                                )
                                            }
                                            return <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Free</span>;
                                        })()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end items-center gap-3">
                                            <button 
                                                onClick={() => handleCopyPaymentLink(optic.id)} 
                                                className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-800 text-[11px] font-black uppercase tracking-wider bg-emerald-50 hover:bg-emerald-100 px-2 py-1.5 rounded transition-colors"
                                                title="Gerar Link de Pagamento com a ID desta loja conectada"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                                Cobrar
                                            </button>
                                            <button onClick={() => openModal(optic)} className="text-blue-600 hover:text-blue-800 text-[11px] font-black uppercase tracking-wider">Editar</button>
                                            <button onClick={() => handleDelete(optic.id)} className="text-red-500 hover:text-red-700 text-[11px] font-black uppercase tracking-wider">Excluir</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {optics.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        Nenhuma loja cadastrada.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                            <h2 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">{editingOptic ? 'Editar Loja' : 'Nova Loja com Acesso'}</h2>
                            
                            {!editingOptic && (
                                <>
                                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                                        <p className="text-sm text-blue-800 font-medium">Preencha os dados do responsável e configure o acesso ao sistema.</p>
                                    </div>
                                    
                                    <div className="space-y-4 mb-6">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo do Responsável</label>
                                            <input
                                                required
                                                type="text"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0066FF]/20 focus:border-[#0066FF] outline-none transition-all font-medium"
                                                value={formData.full_name}
                                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                                placeholder="João da Silva"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                                            <input
                                                required
                                                type="email"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0066FF]/20 focus:border-[#0066FF] outline-none transition-all font-medium"
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="joao@otica.com.br"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Senha Temporária</label>
                                            <input
                                                required
                                                type="password"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0066FF]/20 focus:border-[#0066FF] outline-none transition-all font-medium"
                                                value={formData.password}
                                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                placeholder="Mínimo 6 caracteres"
                                                minLength={6}
                                            />
                                        </div>
                                    </div>

                                    <hr className="my-4 border-gray-200" />
                                </>
                            )}

                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Razão Social</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0066FF]/20 focus:border-[#0066FF] outline-none transition-all font-medium"
                                        value={formData.corporate_name}
                                        onChange={e => setFormData({ ...formData, corporate_name: e.target.value })}
                                        placeholder="Ex: Ótica Visão Ltda"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Nome Fantasia (Opcional)</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0066FF]/20 focus:border-[#0066FF] outline-none transition-all font-medium"
                                        value={formData.trade_name}
                                        onChange={e => setFormData({ ...formData, trade_name: e.target.value })}
                                        placeholder="Ex: Ótica Visão"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">CNPJ</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0066FF]/20 focus:border-[#0066FF] outline-none transition-all font-medium"
                                        value={formData.cnpj}
                                        onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                                        placeholder="00.000.000/0000-00"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Cidade</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0066FF]/20 focus:border-[#0066FF] outline-none transition-all font-medium"
                                            value={formData.city}
                                            onChange={e => setFormData({ ...formData, city: e.target.value })}
                                            placeholder="Ex: São Paulo"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Estado (UF)</label>
                                        <input
                                            required
                                            type="text"
                                            maxLength={2}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0066FF]/20 focus:border-[#0066FF] outline-none transition-all uppercase font-medium"
                                            value={formData.state}
                                            onChange={e => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                                            placeholder="Ex: SP"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-6">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-bold transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-3 bg-[#0066FF] text-white rounded-xl hover:bg-[#0052CC] font-bold shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5"
                                    >
                                        Salvar Loja
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
