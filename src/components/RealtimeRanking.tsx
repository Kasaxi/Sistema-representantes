"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface RankingItem {
    seller_id: string;
    seller_name: string;
    sales_count: number;
}

export default function RealtimeRanking({ brandId }: { brandId?: string | null }) {
    const [ranking, setRanking] = useState<RankingItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRanking = async () => {
        // Ranking query: Count approved sales grouped by seller
        let query = supabase
            .from("sales")
            .select(`
                seller_id,
                profiles:profiles!sales_seller_id_fkey (full_name)
            `)
            .eq("status", "approved");

        // Only filter by brand if a valid ID is provided
        if (brandId && brandId !== "null") {
            query = query.eq("brand_id", brandId);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Ranking error:", error.message, error.details, error.hint);
            return;
        }

        // Process counts client-side
        const counts: Record<string, { name: string; count: number }> = {};

        if (data) {
            data.forEach((sale: any) => {
                const sid = sale.seller_id;
                const name = sale.profiles?.full_name || "Vendedor";
                if (!counts[sid]) counts[sid] = { name, count: 0 };
                counts[sid].count += 1;
            });
        }

        const sortedRanking = Object.entries(counts)
            .map(([id, info]) => ({
                seller_id: id,
                seller_name: info.name,
                sales_count: info.count,
            }))
            .sort((a, b) => b.sales_count - a.sales_count)
            .slice(0, 5); // Show top 5 only

        setRanking(sortedRanking);
        setLoading(false);
    };

    useEffect(() => {
        fetchRanking();

        const channel = supabase
            .channel("ranking_changes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "sales" },
                () => fetchRanking()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [brandId]);

    if (loading) return (
        <div className="space-y-3">
            {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
        </div>
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-semibold text-gray-800">Ranking de Vendas</h3>
                <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
            </div>

            <div className="divide-y divide-gray-50">
                {ranking.map((item, index) => (
                    <div
                        key={item.seller_id}
                        className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`
                                w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                                ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                    index === 1 ? 'bg-gray-100 text-gray-700' :
                                        index === 2 ? 'bg-orange-100 text-orange-800' : 'bg-white text-gray-400 border border-gray-100'}
                            `}>
                                {index + 1}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">{item.seller_name}</p>
                                {index === 0 && <span className="text-[10px] text-yellow-600 font-medium px-1.5 py-0.5 bg-yellow-50 rounded-full">Líder</span>}
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="block text-lg font-bold text-gray-900 leading-none">{item.sales_count}</span>
                            <span className="text-[10px] text-gray-400 uppercase">Vendas</span>
                        </div>
                    </div>
                ))}

                {ranking.length === 0 && (
                    <div className="p-8 text-center text-gray-400 text-sm">
                        Nenhuma venda registrada este mês.
                    </div>
                )}
            </div>
        </div>
    );
}
