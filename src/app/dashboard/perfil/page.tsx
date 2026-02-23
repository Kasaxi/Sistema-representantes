"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DashboardShell from "@/components/DashboardShell";
import { toast, Toaster } from "sonner";

export default function ProfilePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        full_name: "",
        cpf: "",
        reimbursementForm: "pix" as "pix" | "bank",
        pix_key: "",
        bank_name: "",
        bank_agency: "",
        bank_account: "",
        email: "",
        password: "",
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            const { data: profile } = await supabase
                .from("profiles")
                .select("full_name, cpf, pix_key, chave_pix, reimbursement_form, bank_name, bank_agency, bank_account")
                .eq("id", user.id)
                .single();

            setFormData({
                full_name: profile?.full_name || "",
                cpf: profile?.cpf || "",
                reimbursementForm: (profile?.reimbursement_form as "pix" | "bank") || "pix",
                pix_key: profile?.chave_pix || profile?.pix_key || "",
                bank_name: profile?.bank_name || "",
                bank_agency: profile?.bank_agency || "",
                bank_account: profile?.bank_account || "",
                email: user.email || "",
                password: "", // Não buscamos a senha
            });
        }
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        try {
            // 1. Atualizar informações básicas (Profiles)
            const { error: profileError } = await supabase
                .from("profiles")
                .update({
                    full_name: formData.full_name,
                    cpf: formData.cpf.replace(/\D/g, ""),
                    reimbursement_form: formData.reimbursementForm,
                    pix_key: formData.reimbursementForm === "pix" ? formData.pix_key : null,
                    chave_pix: formData.reimbursementForm === "pix" ? formData.pix_key : null,
                    bank_name: formData.reimbursementForm === "bank" ? formData.bank_name : null,
                    bank_agency: formData.reimbursementForm === "bank" ? formData.bank_agency : null,
                    bank_account: formData.reimbursementForm === "bank" ? formData.bank_account : null,
                })
                .eq("id", user.id);

            if (profileError) throw new Error("Erro ao atualizar dados do perfil.");

            // 2. Atualizar Auth (Email & Senha se preenchidos/diferentes)
            const authUpdates: any = {};
            if (formData.email !== user.email) {
                authUpdates.email = formData.email;
            }
            if (formData.password.trim() !== "") {
                authUpdates.password = formData.password;
            }

            if (Object.keys(authUpdates).length > 0) {
                const { error: authError } = await supabase.auth.updateUser(authUpdates);
                if (authError) {
                    throw new Error("Erro ao atualizar credenciais: " + authError.message);
                } else if (authUpdates.email) {
                    toast.warning("Um e-mail de confirmação foi enviado para o novo endereço.");
                }
            }

            toast.success("Perfil atualizado com sucesso!");
            setFormData(prev => ({ ...prev, password: "" })); // Limpa campo de senha
        } catch (err: any) {
            toast.error(err.message || "Ocorreu um erro ao salvar o perfil.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <DashboardShell userRole="representative">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066FF]"></div>
                </div>
            </DashboardShell>
        );
    }

    return (
        <DashboardShell userRole="representative">
            <Toaster position="top-right" />
            <div className="max-w-3xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Meu Perfil</h1>
                    <p className="text-gray-500 mt-1">Atualize suas informações pessoais e credenciais de acesso.</p>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <form onSubmit={handleSave} className="p-8 space-y-6">

                        {/* INFORMAÇÕES PESSOAIS */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Informações Pessoais</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                                    <input
                                        type="text" required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#0066FF] focus:border-[#0066FF]"
                                        value={formData.full_name}
                                        onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                        placeholder="Seu nome completo"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                                    <input
                                        type="text" required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#0066FF] focus:border-[#0066FF]"
                                        value={formData.cpf}
                                        onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                                        placeholder="000.000.000-00"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-4">
                                    <label className="block text-sm font-medium text-gray-700">Forma de Recebimento</label>
                                    <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, reimbursementForm: "pix" })}
                                            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${formData.reimbursementForm === 'pix' ? 'bg-white text-[#0066FF] shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                        >
                                            PIX
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, reimbursementForm: "bank" })}
                                            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${formData.reimbursementForm === 'bank' ? 'bg-white text-[#0066FF] shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                        >
                                            CONTA BANCÁRIA
                                        </button>
                                    </div>

                                    {formData.reimbursementForm === 'pix' ? (
                                        <div className="animate-in fade-in slide-in-from-top-1">
                                            <input
                                                type="text"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#0066FF] focus:border-[#0066FF]"
                                                value={formData.pix_key}
                                                onChange={e => setFormData({ ...formData, pix_key: e.target.value })}
                                                placeholder="Telefone, E-mail, CPF ou Chave Aleatória"
                                            />
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-1">
                                            <div className="md:col-span-3">
                                                <input
                                                    type="text"
                                                    placeholder="Nome do Banco"
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#0066FF] focus:border-[#0066FF]"
                                                    value={formData.bank_name}
                                                    onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Agência"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#0066FF] focus:border-[#0066FF]"
                                                value={formData.bank_agency}
                                                onChange={e => setFormData({ ...formData, bank_agency: e.target.value })}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Número da Conta"
                                                className="md:col-span-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#C00000] focus:border-[#C00000]"
                                                value={formData.bank_account}
                                                onChange={e => setFormData({ ...formData, bank_account: e.target.value })}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ACESSO */}
                        <div className="mt-8">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Acesso</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                                    <input
                                        type="email" required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#0066FF] focus:border-[#0066FF]"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                                    <input
                                        type="password"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#0066FF] focus:border-[#0066FF]"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="Deixe em branco para não alterar"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 flex justify-end">
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-3 bg-[#0066FF] text-white font-bold rounded-lg hover:bg-[#0052CC] shadow-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Salvando...</span>
                                    </>
                                ) : "Salvar Alterações"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardShell>
    );
}
