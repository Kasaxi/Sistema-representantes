"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import DashboardShell from "@/components/DashboardShell";

export default function VendasPendentesPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [opticId, setOpticId] = useState<string | null>(null)
    const [pendingSales, setPendingSales] = useState<any[]>([])

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
            await fetchPendingSales(optic.id)
        }
        
        setLoading(false)
    }

    const fetchPendingSales = async (opticId: string) => {
        const { data } = await supabase
            .from('pdv_sales_pending')
            .select('*, products(name, sku), shop_sales(created_at)')
            .eq('optic_id', opticId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

        setPendingSales(data || [])
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
                <h1 className="text-3xl font-black text-gray-900 mb-2">Vendas Pendentes</h1>
                <p className="text-gray-500 mb-8">Vendas que estão aguardando validação do representante.</p>

                {pendingSales.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                        <p className="text-gray-500">Nenhuma venda pendente no momento.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {pendingSales.map((sale) => (
                            <div key={sale.id} className="bg-white rounded-2xl border border-gray-100 p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-gray-900">{sale.products?.name}</h3>
                                        <p className="text-sm text-gray-500">SKU: {sale.products?.sku}</p>
                                        <p className="text-sm text-gray-400">
                                            Vendido em: {new Date(sale.created_at).toLocaleString('pt-BR')}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-lg text-gray-900">
                                            R$ {Number(sale.unit_price * sale.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                        <p className="text-sm text-gray-500">{sale.quantity}x</p>
                                        <span className="inline-block mt-2 px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">
                                            Pendente
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardShell>
    )
}
