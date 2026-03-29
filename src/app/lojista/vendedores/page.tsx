"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import DashboardShell from "@/components/DashboardShell";
import { Users, Plus, Loader2 } from "lucide-react";

export default function VendedoresPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [opticId, setOpticId] = useState<string | null>(null)
    const [opticCNPJ, setOpticCNPJ] = useState<string>("")
    const [vendedores, setVendedores] = useState<any[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        password: ""
    })

    useEffect(() => {
        initializeData()
    }, [])

    const initializeData = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push('/login')
            return
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("cnpj")
            .eq("id", user.id)
            .single()

        if (!profile?.cnpj) {
            setLoading(false)
            return
        }

        const { data: optic } = await supabase
            .from("optics")
            .select("id")
            .eq("cnpj", profile.cnpj)
            .single()

        if (optic) {
            setOpticId(optic.id)
            setOpticCNPJ(profile.cnpj)
            await fetchVendedores(profile.cnpj)
        }
        
        setLoading(false)
    }

    const fetchVendedores = async (opticCNPJ: string) => {
        const { data } = await supabase
            .from("profiles")
            .select("id, full_name, email, role, created_at")
            .eq("cnpj", opticCNPJ)
            .eq("role", "seller")
            .order("full_name")

        setVendedores(data || [])
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            const response = await fetch('/api/lojista/vendedor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    cnpj: opticCNPJ
                })
            })

            const result = await response.json()

            if (!response.ok) {
                alert(result.error || 'Erro ao criar vendedor')
            } else {
                alert('Vendedor criado com sucesso!')
                setIsModalOpen(false)
                setFormData({ full_name: "", email: "", password: "" })
                fetchVendedores(opticCNPJ)
            }
        } catch (err) {
            alert('Erro ao criar vendedor')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return (
        <DashboardShell userRole="shopkeeper">
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066FF]"></div>
            </div>
        </DashboardShell>
    )

    return (
        <DashboardShell userRole="shopkeeper">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 mb-2">Vendedores</h1>
                        <p className="text-gray-500">Gerencie os vendedores da sua ótica.</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-[#0066FF] text-white font-bold rounded-xl hover:bg-[#0052CC] transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Novo Vendedor
                    </button>
                </div>

                {vendedores.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">Nenhum vendedor cadastrado ainda.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase">Nome</th>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase">Email</th>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase">Cadastro</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {vendedores.map((v) => (
                                    <tr key={v.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{v.full_name}</td>
                                        <td className="px-6 py-4 text-gray-500">{v.email}</td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {new Date(v.created_at).toLocaleDateString('pt-BR')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Modal de Cadastro */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Novo Vendedor</h2>
                            
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                                <p className="text-sm text-blue-800 font-medium">Preencha os dados do vendedor para dar acesso ao sistema.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0066FF]/20 focus:border-[#0066FF] outline-none transition-all font-medium"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        placeholder="João da Silva"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0066FF]/20 focus:border-[#0066FF] outline-none transition-all font-medium"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="joao@otica.com.br"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Senha Temporária</label>
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0066FF]/20 focus:border-[#0066FF] outline-none transition-all font-medium"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="Mínimo 6 caracteres"
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-bold transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 px-4 py-3 bg-[#0066FF] text-white rounded-xl hover:bg-[#0052CC] font-bold shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Criando...
                                            </>
                                        ) : (
                                            'Criar Vendedor'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardShell>
    )
}
