"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface Brand {
    id: string;
    name: string;
}

export default function CadastroPage() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [brands, setBrands] = useState<Brand[]>([]);

    const [optics, setOptics] = useState<any[]>([]);

    useEffect(() => {
        async function fetchData() {
            const { data: brandsData } = await supabase.from("brands").select("id, name");
            if (brandsData) setBrands(brandsData);

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
        marcaId: "",
        nomeOtica: "",
        cnpj: "",
        chavePix: "",
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
                        brand_id: formData.marcaId, // Maps to UUID
                        optic_name: formData.nomeOtica, // Maps to optic_name
                        cnpj: formData.cnpj.replace(/\D/g, ""), // Remove formatação
                        chave_pix: formData.chavePix, // Added column
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
                <Link href="/login" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-[#C00000] mb-6 transition-colors">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    Voltar para Login
                </Link>
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-3">Cadastro de Representante</h1>
                <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                    Preencha o formulário abaixo para solicitar acesso ao painel de incentivos da OptiSales.
                </p>
            </div>

            {/* Main Form Card ("Paper" Layout) */}
            <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">

                {/* Stepper Header */}
                <div className="bg-gray-50 border-b border-gray-100 px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#C00000] text-white flex items-center justify-center font-bold text-sm">1</div>
                        <span className="font-semibold text-gray-900">Dados Pessoais</span>
                        <div className="w-12 h-px bg-gray-300 mx-2"></div>
                        <div className="w-8 h-8 rounded-full bg-white border-2 border-gray-300 text-gray-500 flex items-center justify-center font-bold text-sm">2</div>
                        <span className="font-medium text-gray-500">Dados Comerciais</span>
                    </div>
                    <div className="text-xs font-medium text-gray-400 uppercase tracking-widest">
                        CONFIDENCIAL
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 md:p-12 lg:p-14">
                    {error && (
                        <div className="mb-8 p-4 bg-red-50 border-l-4 border-[#C00000] text-red-700 text-sm font-medium rounded-r-md">
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
                                    <input required type="text" placeholder="Ex: João da Silva" className="w-full h-12 px-4 bg-white border border-gray-200 rounded-lg focus:border-[#C00000] focus:ring-1 focus:ring-[#C00000] outline-none transition-all placeholder:text-gray-300" onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">CPF</label>
                                    <input required type="text" placeholder="000.000.000-00" className="w-full h-12 px-4 bg-white border border-gray-200 rounded-lg focus:border-[#C00000] focus:ring-1 focus:ring-[#C00000] outline-none transition-all placeholder:text-gray-300" onChange={(e) => setFormData({ ...formData, cpf: e.target.value })} />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">E-mail</label>
                                    <input required type="email" placeholder="seu@email.com" className="w-full h-12 px-4 bg-white border border-gray-200 rounded-lg focus:border-[#C00000] focus:ring-1 focus:ring-[#C00000] outline-none transition-all placeholder:text-gray-300" onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Senha</label>
                                    <input required type="password" placeholder="Mínimo 8 caracteres" className="w-full h-12 px-4 bg-white border border-gray-200 rounded-lg focus:border-[#C00000] focus:ring-1 focus:ring-[#C00000] outline-none transition-all placeholder:text-gray-300" onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
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
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Marca Representada</label>
                                    <select
                                        className="w-full h-12 px-4 bg-white border border-gray-200 rounded-lg focus:border-[#C00000] focus:ring-1 focus:ring-[#C00000] outline-none transition-all text-gray-700"
                                        onChange={(e) => setFormData({ ...formData, marcaId: e.target.value })}
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Selecione uma marca...</option>
                                        {brands.map(brand => (
                                            <option key={brand.id} value={brand.id}>{brand.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Sua Ótica</label>
                                    <select
                                        required
                                        className="w-full h-12 px-4 bg-white border border-gray-200 rounded-lg focus:border-[#C00000] focus:ring-1 focus:ring-[#C00000] outline-none transition-all text-gray-700"
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

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Chave PIX (Para Pagamentos)</label>
                                    <input required type="text" placeholder="CPF, E-mail ou Telefone" className="w-full h-12 px-4 bg-white border border-gray-200 rounded-lg focus:border-[#C00000] focus:ring-1 focus:ring-[#C00000] outline-none transition-all placeholder:text-gray-300" onChange={(e) => setFormData({ ...formData, chavePix: e.target.value })} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-14 pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
                        <p className="text-xs text-gray-400">
                            Ao clicar em registrar, você aceita os <Link href="#" className="underline hover:text-gray-600">Termos e Condições</Link> da OptiSales.
                        </p>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full md:w-auto px-10 h-14 bg-[#C00000] hover:bg-[#A00000] text-white font-bold rounded-xl shadow-lg shadow-red-900/10 transition-all hover:-translate-y-0.5"
                        >
                            {loading ? "Processando..." : "Finalizar Cadastro →"}
                        </button>
                    </div>
                </form>
            </div>

            <div className="mt-12 text-center text-sm text-gray-400">
                © 2026 OptiSales Inc. Todos os direitos reservados.
            </div>
        </div>
    );
}
