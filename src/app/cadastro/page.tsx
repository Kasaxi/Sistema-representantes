"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function CadastroPage() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [optics, setOptics] = useState<any[]>([]);

    useEffect(() => {
        async function fetchData() {
            const { data: opticsData } = await supabase.from("optics").select("*").eq("active", true).order("corporate_name");
            if (opticsData) setOptics(opticsData);
        }
        fetchData();
    }, []);

    const [formData, setFormData] = useState({
        nome: "",
        cpf: "",
        email: "",
        password: "",
        nomeOtica: "",
        cnpj: "",
        reimbursementForm: "pix" as "pix" | "bank",
        chavePix: "",
        bankName: "",
        bankAgency: "",
        bankAccount: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Criar usuário na Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.nome,
                        cpf: formData.cpf,
                    },
                },
            });

            if (authError) throw authError;

            if (authData.user) {
                // 2. Criar perfil na tabela profiles
                const { error: profileError } = await supabase.from("profiles").insert([
                    {
                        id: authData.user.id,
                        email: formData.email,
                        full_name: formData.nome,
                        cpf: formData.cpf.replace(/\D/g, ""), // Remove formatação
                        role: "representative",
                        status: "pending",
                        brand_id: null, // Todos vendem todas as marcas
                        optic_name: formData.nomeOtica, // Maps to optic_name
                        cnpj: formData.cnpj.replace(/\D/g, ""), // Remove formatação
                        reimbursement_form: formData.reimbursementForm,
                        chave_pix: formData.reimbursementForm === "pix" ? formData.chavePix : null,
                        pix_key: formData.reimbursementForm === "pix" ? formData.chavePix : null, // Consistent with other places that might use pix_key
                        bank_name: formData.reimbursementForm === "bank" ? formData.bankName : null,
                        bank_agency: formData.reimbursementForm === "bank" ? formData.bankAgency : null,
                        bank_account: formData.reimbursementForm === "bank" ? formData.bankAccount : null,
                    },
                ]);

                if (profileError) throw profileError;

                setSuccess(true);
            }
        } catch (err: any) {
            console.error(err);
            if (err.message && err.message.includes("rate limit")) {
                setError("Muitas tentativas de cadastro recentes. Por favor, aguarde alguns minutos antes de tentar novamente.");
            } else if (err.message && err.message.includes("User already registered")) {
                setError("E-mail já cadastrado. Tente fazer login.");
            } else {
                setError(err.message || "Erro ao criar conta. Verifique os dados.");
            }
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-xl p-12 max-w-lg text-center border border-gray-100">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Solicitação Enviada!</h2>
                    <p className="text-gray-600 mb-8 leading-relaxed">
                        Seu cadastro foi recebido com sucesso. Nossa equipe analisará suas credenciais e você receberá um e-mail de aprovação em breve.
                    </p>
                    <Link href="/login" className="inline-block w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all">
                        Voltar para Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8F9FA] py-12 px-4 sm:px-6 lg:px-8">

            {/* Header Container */}
            <div className="max-w-5xl mx-auto mb-10 text-center">
                <Link href="/" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-[#0066FF] mb-6 transition-colors">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    Voltar para Página Inicial
                </Link>
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-3">Cadastro de Representante</h1>
                <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                    Preencha o formulário abaixo para solicitar acesso ao painel de incentivos da OpitHub.
                </p>
            </div>

            {/* Main Form Card ("Paper" Layout) */}
            <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">

                {/* Form Header */}
                <div className="bg-gray-50 border-b border-gray-100 px-8 py-6 flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-gray-900">Formulário de Cadastro</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Preencha todos os campos abaixo</p>
                    </div>
                    <div className="text-xs font-medium text-gray-400 uppercase tracking-widest">
                        CONFIDENCIAL
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 md:p-12 lg:p-14">
                    {error && (
                        <div className="mb-8 p-4 bg-blue-50 border-l-4 border-[#0066FF] text-blue-700 text-sm font-medium rounded-r-md">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">

                        {/* COLUMN 1: Personal Info */}
                        <div className="space-y-8">
                            <div className="pb-2 border-b border-gray-100">
                                <h3 className="text-lg font-bold text-gray-900">Credenciais de Acesso</h3>
                                <p className="text-sm text-gray-500">Suas informações de login e identificação.</p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Nome Completo</label>
                                    <input required type="text" placeholder="Ex: João da Silva" className="w-full h-12 px-4 bg-white border border-gray-200 rounded-lg focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition-all placeholder:text-gray-300" onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">CPF</label>
                                    <input required type="text" placeholder="000.000.000-00" className="w-full h-12 px-4 bg-white border border-gray-200 rounded-lg focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition-all placeholder:text-gray-300" onChange={(e) => setFormData({ ...formData, cpf: e.target.value })} />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">E-mail</label>
                                    <input required type="email" placeholder="seu@email.com" className="w-full h-12 px-4 bg-white border border-gray-200 rounded-lg focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition-all placeholder:text-gray-300" onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Senha</label>
                                    <input required type="password" placeholder="Mínimo 8 caracteres" className="w-full h-12 px-4 bg-white border border-gray-200 rounded-lg focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition-all placeholder:text-gray-300" onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        {/* COLUMN 2: Professional Info */}
                        <div className="space-y-8">
                            <div className="pb-2 border-b border-gray-100">
                                <h3 className="text-lg font-bold text-gray-900">Vínculo Comercial</h3>
                                <p className="text-sm text-gray-500">Dados da ótica e pagamento.</p>
                            </div>

                            <div className="space-y-6">
                                {/* Marca Representada removida, representantes vendem todas as marcas */}

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Sua Ótica</label>
                                    <select
                                        required
                                        className="w-full h-12 px-4 bg-white border border-gray-200 rounded-lg focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition-all text-gray-700"
                                        onChange={(e) => {
                                            const selectedOptic = optics.find(o => o.id === e.target.value);
                                            if (selectedOptic) {
                                                setFormData({
                                                    ...formData,
                                                    nomeOtica: selectedOptic.corporate_name, // Store name for now
                                                    cnpj: selectedOptic.cnpj
                                                });
                                            }
                                        }}
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Selecione sua ótica...</option>
                                        {optics.map(optic => (
                                            <option key={optic.id} value={optic.id}>
                                                {optic.corporate_name} {optic.trade_name ? `(${optic.trade_name})` : ''} - {optic.cnpj}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Não encontrou sua ótica? Peça ao administrador para cadastrar.
                                    </p>
                                </div>

                                {/* Hidden fields or Readonly display for confirmation */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                    <div>
                                        <span className="text-xs text-gray-400 block">Razão Social</span>
                                        <span className="text-sm font-medium text-gray-700 block min-h-[20px]">{formData.nomeOtica || "-"}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-400 block">CNPJ</span>
                                        <span className="text-sm font-medium text-gray-700 block min-h-[20px]">{formData.cnpj || "-"}</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-sm font-bold text-gray-700">Forma de Recebimento</label>
                                    <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100 gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, reimbursementForm: "pix" })}
                                            className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${formData.reimbursementForm === 'pix' ? 'bg-white text-[#0066FF] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            PIX
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, reimbursementForm: "bank" })}
                                            className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${formData.reimbursementForm === 'bank' ? 'bg-white text-[#0066FF] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            Conta Bancária
                                        </button>
                                    </div>

                                    {formData.reimbursementForm === 'pix' ? (
                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                            <label className="text-sm font-bold text-gray-700">Chave PIX</label>
                                            <input
                                                required={formData.reimbursementForm === 'pix'}
                                                type="text"
                                                placeholder="CPF, E-mail, Telefone ou Chave Aleatória"
                                                className="w-full h-12 px-4 bg-white border border-gray-200 rounded-lg focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition-all placeholder:text-gray-300"
                                                value={formData.chavePix}
                                                onChange={(e) => setFormData({ ...formData, chavePix: e.target.value })}
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-gray-700">Banco</label>
                                                <input
                                                    required={formData.reimbursementForm === 'bank'}
                                                    type="text"
                                                    placeholder="Ex: Banco do Brasil"
                                                    className="w-full h-12 px-4 bg-white border border-gray-200 rounded-lg focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition-all placeholder:text-gray-300"
                                                    value={formData.bankName}
                                                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold text-gray-700">Agência</label>
                                                    <input
                                                        required={formData.reimbursementForm === 'bank'}
                                                        type="text"
                                                        placeholder="0001"
                                                        className="w-full h-12 px-4 bg-white border border-gray-200 rounded-lg focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition-all placeholder:text-gray-300"
                                                        value={formData.bankAgency}
                                                        onChange={(e) => setFormData({ ...formData, bankAgency: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold text-gray-700">Conta</label>
                                                    <input
                                                        required={formData.reimbursementForm === 'bank'}
                                                        type="text"
                                                        placeholder="12345-6"
                                                        className="w-full h-12 px-4 bg-white border border-gray-200 rounded-lg focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition-all placeholder:text-gray-300"
                                                        value={formData.bankAccount}
                                                        onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-14 pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
                        <p className="text-xs text-gray-400">
                            Ao clicar em registrar, você aceita os <Link href="#" className="underline hover:text-gray-600">Termos e Condições</Link> da OpitHub.
                        </p>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full md:w-auto px-10 h-14 bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold rounded-xl shadow-lg shadow-blue-900/10 transition-all hover:-translate-y-0.5"
                        >
                            {loading ? "Processando..." : "Finalizar Cadastro →"}
                        </button>
                    </div>
                </form>
            </div>

            <div className="mt-12 text-center text-sm text-gray-400">
                © 2026 OpitHub Inc. Todos os direitos reservados.
            </div>
        </div>
    );
}
