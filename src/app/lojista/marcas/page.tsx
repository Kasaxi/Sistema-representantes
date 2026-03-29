"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import DashboardShell from "@/components/DashboardShell";
import { Tag } from "lucide-react";

export default function MarcasPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [marcas, setMarcas] = useState<any[]>([])

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

        await fetchMarcas()
        setLoading(false)
    }

    const fetchMarcas = async () => {
        const { data } = await supabase
            .from("brands")
            .select("id, name, is_from_rep, created_at")
            .order("name")

        setMarcas(data || [])
    }

    const toggleIsFromRep = async (marcaId: string, currentValue: boolean) => {
        await supabase
            .from("brands")
            .update({ is_from_rep: !currentValue })
            .eq("id", marcaId)

        await fetchMarcas()
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
                        <h1 className="text-3xl font-black text-gray-900 mb-2">Marcas</h1>
                        <p className="text-gray-500">Gerencie as marcas disponíveis na sua ótica.</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase">Marca</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase">Origem</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {marcas.map((marca) => (
                                <tr key={marca.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{marca.name}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                            marca.is_from_rep 
                                                ? 'bg-purple-100 text-purple-700' 
                                                : 'bg-green-100 text-green-700'
                                        }`}>
                                            {marca.is_from_rep ? 'Representante' : 'Própria'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => toggleIsFromRep(marca.id, marca.is_from_rep)}
                                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                            Alterar origem
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardShell>
    )
}
