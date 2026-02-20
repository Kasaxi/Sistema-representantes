"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DashboardShell from "@/components/DashboardShell";
import Image from "next/image";

interface Brand {
    id: string;
    name: string;
    commission_value?: number;
    logo_url?: string;
}

interface Sale {
    id: string;
    created_at: string;
    brands?: { name: string, commission_value?: number };
    commission_earned?: number; // Calculated on fly or fetched
}

export default function RewardsPage() {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalBonus, setTotalBonus] = useState(0);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        // 1. Fetch Brands (to show bonus cards)
        const brandsRes = await supabase.from("brands").select("*").order("name");

        // 2. Fetch Sales (Approved only) to calc statement
        const salesRes = await supabase
            .from("sales")
            .select(`
                id,
                created_at,
                brands (name, commission_value)
            `)
            .eq("seller_id", user.id)
            .eq("status", "approved")
            .order("created_at", { ascending: false });

        if (brandsRes.data) setBrands(brandsRes.data);

        if (salesRes.data) {
            // Calculate earnings based on current brand value (MVP approach)
            // Ideally should be historical, but we just added the column
            let total = 0;
            const processedSales = salesRes.data.map((sale: any) => {
                const amount = sale.brands?.commission_value || 0;
                total += amount;
                return {
                    ...sale,
                    commission_earned: amount
                };
            });
            setSales(processedSales);
            setTotalBonus(total);
        }

        setLoading(false);
    };

    return (
        <DashboardShell userRole="representative"> {/* Or dynamic role */}
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header / Saldo */}
                <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
                    <h1 className="text-xl font-medium text-gray-500 mb-2">Olá, Consultor!</h1>
                    <p className="text-4xl font-black text-gray-900 tracking-tight">
                        Seu Bônus Atual: <span className="text-green-600">R$ {totalBonus.toFixed(2).replace(".", ",")}</span>
                    </p>
                </div>

                {/* Brand Cards Grid */}
                <div>
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 pl-1">Oportunidades de Bônus</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {brands.map((brand) => (
                            <div key={brand.id} className="bg-white rounded-xl border border-gray-100 p-6 flex flex-col items-center justify-center gap-4 hover:shadow-md transition-shadow group">
                                <div className="h-12 w-full flex items-center justify-center relative grayscale group-hover:grayscale-0 transition-all opacity-70 group-hover:opacity-100">
                                    {/* If we had logos, we'd use Next Image here. Using text for now */}
                                    <span className="text-xl font-bold text-gray-800">{brand.name}</span>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-gray-500 font-medium mb-1">Bônus por venda</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        R$ {(brand.commission_value || 0).toFixed(2).replace(".", ",")}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Extrato Detail */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="font-bold text-gray-900">Extrato de Recompensas</h2>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {loading ? (
                            <div className="p-8 text-center text-gray-400">Carregando extrato...</div>
                        ) : sales.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">Nenhuma venda com bônus encontrada.</div>
                        ) : (
                            sales.map((sale) => (
                                <div key={sale.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{sale.brands?.name || "Marca Desconhecida"}</p>
                                            <p className="text-xs text-gray-500">
                                                {new Date(sale.created_at).toLocaleDateString()} às {new Date(sale.created_at).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-green-600">+ R$ {(sale.commission_earned || 0).toFixed(2).replace(".", ",")}</p>
                                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 uppercase">
                                            Creditado
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </DashboardShell>
    );
}
